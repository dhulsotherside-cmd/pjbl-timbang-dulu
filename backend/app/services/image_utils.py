import io
import logging
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


def compress_to_webp(image_bytes: bytes, max_size: int = 1280, quality: int = 80) -> bytes:
    """
    Mengompresi berkas citra menjadi format WebP:
    - Menerapkan auto-orientasi EXIF (ImageOps.exif_transpose) agar foto tidak miring.
    - Mengonversi ke kanal RGB.
    - Melakukan resize proporsional jika dimensi terpanjang > max_size px.
    - Menyimpan sebagai WebP dengan kualitas teroptimasi (default 80%).
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")

        w, h = img.size
        max_dim = max(w, h)
        if max_dim > max_size:
            scale = max_size / float(max_dim)
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            logger.info("Citra di-resize dari %dx%d menjadi %dx%d", w, h, new_w, new_h)

        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=4)
        compressed = buffer.getvalue()
        logger.info(
            "Kompresi WebP selesai: %d bytes -> %d bytes (kompresi %.1f%%)",
            len(image_bytes),
            len(compressed),
            (1.0 - len(compressed) / max(len(image_bytes), 1)) * 100
        )
        return compressed
