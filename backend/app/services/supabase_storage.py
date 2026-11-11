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

_supabase_client = None


def get_supabase_client():
    """
    Lazy initialization Supabase Client agar tidak crash saat startup
    jika konfigurasi belum terisi.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if (
        not settings.SUPABASE_URL
        or not settings.SUPABASE_KEY
        or "mock" in settings.SUPABASE_URL.lower()
        or "your-project" in settings.SUPABASE_URL.lower()
    ):
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        logger.warning("Inisialisasi Supabase client gagal: %s", e)
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


async def upload_image_to_supabase(file: UploadFile) -> str:
    """
    Mengunggah berkas citra ke Supabase Storage Bucket dengan nama unik acak (UUID).
    Mengembalikan Public URL berkas citra yang berhasil diunggah.
    """
    file_ext = validate_image_file(file)
    file_bytes = await file.read()

    # Reset pointer file agar dapat dibaca ulang jika diperlukan oleh pipeline lain
    await file.seek(0)

    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    bucket = settings.SUPABASE_BUCKET_NAME
    client = get_supabase_client()

    if client is not None:
        try:
            client.storage.from_(bucket).upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": file.content_type or "image/jpeg"}
            )
            public_url = client.storage.from_(bucket).get_public_url(unique_filename)
            return public_url
        except Exception as e:
            logger.error("Gagal mengunggah ke Supabase Storage: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mengunggah citra ke Supabase Storage: {str(e)}"
            )

    # Fallback saat mode mock atau credentials belum disetup
    logger.info("Menggunakan Mock Supabase Storage URL untuk berkas: %s", unique_filename)
    clean_url = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else "https://your-supabase.supabase.co"
    return f"{clean_url}/storage/v1/object/public/{bucket}/{unique_filename}"
