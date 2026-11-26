import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional
from uuid import uuid4

import boto3
from botocore.config import Config
from fastapi import HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def validate_storage_config() -> None:
    """
    Validasi fail-fast untuk memastikan seluruh konfigurasi wajib
    Neon Object Storage telah terdefinisi di environment.
    """
    missing_vars = []
    if not settings.AWS_ENDPOINT_URL_S3 or not settings.AWS_ENDPOINT_URL_S3.strip():
        missing_vars.append("AWS_ENDPOINT_URL_S3")
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_ACCESS_KEY_ID.strip():
        missing_vars.append("AWS_ACCESS_KEY_ID")
    if not settings.AWS_SECRET_ACCESS_KEY or not settings.AWS_SECRET_ACCESS_KEY.strip():
        missing_vars.append("AWS_SECRET_ACCESS_KEY")
    if not settings.NEON_STORAGE_BUCKET_NAME or not settings.NEON_STORAGE_BUCKET_NAME.strip():
        missing_vars.append("NEON_STORAGE_BUCKET_NAME")

    if missing_vars:
        error_msg = (
            f"Kredensial Neon Object Storage belum lengkap. Variabel berikut wajib diisi: "
            f"{', '.join(missing_vars)}. Arsitektur strict menolak penyimpanan lokal."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)


@lru_cache(maxsize=1)
def get_neon_s3_client():
    """
    Mengembalikan client boto3 S3-compatible yang terhubung ke Neon Object Storage.
    Menerapkan fail-fast validation: jika konfigurasi belum lengkap, langsung lempar RuntimeError.
    """
    validate_storage_config()

    s3_config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
        retries={"max_attempts": 3, "mode": "standard"},
    )

    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_ENDPOINT_URL_S3,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=s3_config,
    )


def validate_image_file(file: UploadFile) -> str:
    """
    Validasi format dan ekstensi berkas citra.
    Mengembalikan ekstensi yang dinormalisasi (tanpa titik).
    """
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    content_type = (file.content_type or "").lower()

    if content_type not in ALLOWED_MIME_TYPES or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format foto tidak didukung. Unggah citra JPG, JPEG, PNG, atau WebP."
        )
    return extension


def extract_object_key(url_or_key: str) -> str:
    """
    Mengekstrak object key S3 dari full URL atau string key.
    Mendukung format path-style: https://<endpoint>/<bucket>/<key>
    """
    bucket = settings.NEON_STORAGE_BUCKET_NAME
    bucket_marker = f"/{bucket}/"
    if bucket_marker in url_or_key:
        return url_or_key.split(bucket_marker, 1)[1]
    if url_or_key.startswith("http://") or url_or_key.startswith("https://"):
        return url_or_key.rsplit("/", 1)[-1]
    return url_or_key.lstrip("/")


def get_public_url(object_key: str) -> str:
    """
    Menghasilkan Public URL untuk objek pada bucket Neon berakses public_read.
    Format path-style: https://<endpoint>/<bucket>/<key>
    """
    endpoint = settings.AWS_ENDPOINT_URL_S3.rstrip("/")
    bucket = settings.NEON_STORAGE_BUCKET_NAME
    clean_key = object_key.lstrip("/")
    return f"{endpoint}/{bucket}/{clean_key}"


def generate_presigned_url(object_key_or_url: str, expiration_seconds: int = 3600) -> str:
    """
    Menghasilkan Presigned URL bertanda tangan (GET) untuk akses objek privat atau publik.
    """
    client = get_neon_s3_client()
    key = extract_object_key(object_key_or_url)
    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.NEON_STORAGE_BUCKET_NAME,
            "Key": key,
        },
        ExpiresIn=expiration_seconds,
    )


def _store_image_to_s3(data: bytes, object_key: str, content_type: str) -> str:
    """
    Eksekusi sinkron upload ke Neon Object Storage via boto3.
    """
    client = get_neon_s3_client()
    bucket = settings.NEON_STORAGE_BUCKET_NAME

    client.put_object(
        Bucket=bucket,
        Key=object_key,
        Body=data,
        ContentType=content_type,
    )
    return get_public_url(object_key)


def _put_bytes_to_s3(data: bytes, object_key: str, content_type: str) -> str:
    client = get_neon_s3_client()
    bucket = settings.NEON_STORAGE_BUCKET_NAME
    client.put_object(
        Bucket=bucket,
        Key=object_key,
        Body=data,
        ContentType=content_type,
    )
    return object_key


async def upload_bytes_to_neon(
    data: bytes,
    object_key: str,
    content_type: str = "image/webp"
) -> str:
    """
    Mengunggah raw bytes (misal hasil kompresi WebP) ke Neon Object Storage
    dan mengembalikan relative object key.
    """
    try:
        return await run_in_threadpool(_put_bytes_to_s3, data, object_key, content_type)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gagal menyimpan berkas bytes ke Neon Object Storage: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Foto gagal disimpan ke penyimpanan cloud Neon. Silakan coba lagi."
        ) from exc


async def upload_image_to_neon(
    file: UploadFile,
    id_sapi: Optional[int] = None,
    view: Optional[str] = None
) -> str:
    """
    Mengunggah berkas citra sapi ke Neon Object Storage Bucket `cattle-images`.
    Struktur path:
      - Sapi terdaftar: sapi/<id_sapi>/<sudut>_<uuid>.<ext>
      - Sapi baru (onboarding): sapi/onboarding/<sudut>_<uuid>.<ext>
    """
    extension = validate_image_file(file)
    await file.seek(0)
    data = await file.read()

    sudut = (view or "foto").lower()
    unique_id = uuid4().hex
    filename = f"{sudut}_{unique_id}.{extension}"

    if id_sapi is not None:
        object_key = f"sapi/{id_sapi}/{filename}"
    else:
        object_key = f"sapi/onboarding/{filename}"

    content_type = file.content_type or f"image/{extension}"

    try:
        return await run_in_threadpool(_store_image_to_s3, data, object_key, content_type)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gagal menyimpan foto penimbangan ke Neon Object Storage: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Foto gagal disimpan ke penyimpanan cloud Neon. Silakan coba lagi."
        ) from exc


async def delete_uploaded_image(url_or_key: str) -> None:
    """
    Rollback compensation: Menghapus objek yang sudah terunggah ke Neon Object Storage
    apabila transaksi database berikutnya mengalami kegagalan.
    """
    if not url_or_key:
        return

    object_key = extract_object_key(url_or_key)

    def _delete():
        client = get_neon_s3_client()
        client.delete_object(
            Bucket=settings.NEON_STORAGE_BUCKET_NAME,
            Key=object_key,
        )

    try:
        await run_in_threadpool(_delete)
        logger.info("Berhasil membersihkan objek uji / rollback: %s", object_key)
    except Exception as exc:
        logger.exception("Gagal membersihkan unggahan Neon Object Storage '%s': %s", object_key, exc)
