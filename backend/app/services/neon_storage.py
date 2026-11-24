import logging
import uuid
from typing import Optional
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# Allowed image MIME types and extensions
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

_s3_client = None


def get_neon_s3_client():
    """
    Lazy initialization Neon S3-compatible Client (via boto3).
    Aman saat startup jika variabel lingkungan belum terisi (fallback ke mode simulasi).
    """
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    if (
        not settings.AWS_ENDPOINT_URL_S3
        or not settings.AWS_ACCESS_KEY_ID
        or not settings.AWS_SECRET_ACCESS_KEY
        or "your-neon-endpoint" in settings.AWS_ENDPOINT_URL_S3.lower()
    ):
        return None

    try:
        import boto3
        from botocore.config import Config

        s3_config = Config(
            s3={"addressing_style": "path"},
            retries={"max_attempts": 3, "mode": "standard"}
        )

        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_ENDPOINT_URL_S3,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION or "us-east-2",
            config=s3_config
        )
        return _s3_client
    except Exception as e:
        logger.warning("Inisialisasi Neon S3 storage client gagal: %s", e)
        return None


def validate_image_file(file: UploadFile) -> str:
    """
    Validasi berkas upload berupa format gambar yang diperbolehkan.
    Mengembalikan ekstensi berkas yang dinormalisasi.
    """
    content_type = file.content_type or ""
    if not any(content_type.startswith(mime) for mime in ALLOWED_MIME_TYPES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format berkas tidak valid ('{content_type}'). Harap unggah citra .jpg, .jpeg, atau .png."
        )

    filename = file.filename or "image.jpg"
    ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ekstensi berkas '.{ext}' tidak didukung. Harap unggah .jpg, .jpeg, atau .png."
        )

    return ext


async def upload_image_to_neon(file: UploadFile) -> str:
    """
    Mengunggah berkas citra ke Neon Object Storage Bucket (S3-compatible) dengan nama unik acak (UUID).
    Mengembalikan Public URL berkas citra yang berhasil diunggah.
    """
    file_ext = validate_image_file(file)
    file_bytes = await file.read()

    # Reset pointer file agar dapat dibaca ulang jika diperlukan oleh pipeline inferensi
    await file.seek(0)

    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    bucket = settings.NEON_STORAGE_BUCKET_NAME
    client = get_neon_s3_client()

    if client is not None:
        try:
            client.put_object(
                Bucket=bucket,
                Key=unique_filename,
                Body=file_bytes,
                ContentType=file.content_type or "image/jpeg"
            )
            # URL publik berbasis S3 path-style
            endpoint = settings.AWS_ENDPOINT_URL_S3.rstrip("/")
            public_url = f"{endpoint}/{bucket}/{unique_filename}"
            return public_url
        except Exception as e:
            logger.error("Gagal mengunggah ke Neon Object Storage: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mengunggah citra ke Neon Object Storage: {str(e)}"
            )

    # Fallback mode simulasi/lokal jika kredensial storage Neon belum dikonfigurasi
    logger.info("Menggunakan Mock Neon Object Storage URL untuk berkas: %s", unique_filename)
    return f"https://neon.tech/storage/{bucket}/{unique_filename}"
