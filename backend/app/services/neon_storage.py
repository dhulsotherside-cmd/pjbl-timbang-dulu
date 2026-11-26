import logging
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import boto3
from botocore.config import Config
from fastapi import HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import BACKEND_DIR, settings

logger = logging.getLogger(__name__)
UPLOAD_DIR = BACKEND_DIR / "uploads"
LOCAL_URL_PREFIX = "/uploads/"
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


@lru_cache(maxsize=1)
def get_neon_s3_client():
    credentials = (settings.AWS_ENDPOINT_URL_S3, settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY)
    if not any(credentials):
        return None
    if not all(credentials):
        raise HTTPException(503, "Konfigurasi penyimpanan foto Neon belum lengkap.")
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_ENDPOINT_URL_S3,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 3, "mode": "standard"}),
    )


def validate_image_file(file: UploadFile) -> str:
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    if file.content_type not in ALLOWED_MIME_TYPES or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Format foto tidak didukung. Unggah JPG, JPEG, PNG, atau WebP.")
    return extension


def _store_image(data: bytes, filename: str, content_type: str) -> str:
    client = get_neon_s3_client()
    if client is None:
        UPLOAD_DIR.mkdir(exist_ok=True)
        path = UPLOAD_DIR / filename
        try:
            path.write_bytes(data)
        except OSError:
            path.unlink(missing_ok=True)
            raise
        return LOCAL_URL_PREFIX + filename

    bucket = settings.NEON_STORAGE_BUCKET_NAME
    client.put_object(Bucket=bucket, Key=filename, Body=data, ContentType=content_type)
    return f"{settings.AWS_ENDPOINT_URL_S3.rstrip('/')}/{bucket}/{filename}"


async def upload_image_to_neon(file: UploadFile) -> str:
    extension = validate_image_file(file)
    await file.seek(0)
    data = await file.read()
    try:
        return await run_in_threadpool(_store_image, data, f"{uuid4()}.{extension}", file.content_type)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal menyimpan foto penimbangan")
        raise HTTPException(503, "Foto gagal disimpan. Silakan coba lagi.") from None


async def delete_uploaded_image(url: str) -> None:
    """Batalkan unggahan yang sudah selesai ketika transaksi penimbangan gagal."""
    filename = url.rsplit("/", 1)[-1]
    try:
        if url == LOCAL_URL_PREFIX + filename:
            await run_in_threadpool((UPLOAD_DIR / filename).unlink, missing_ok=True)
        else:
            client = get_neon_s3_client()
            await run_in_threadpool(client.delete_object, Bucket=settings.NEON_STORAGE_BUCKET_NAME, Key=filename)
    except Exception:
        logger.exception("Gagal membersihkan unggahan %s", filename)
