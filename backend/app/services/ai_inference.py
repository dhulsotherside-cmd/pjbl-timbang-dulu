import logging
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import BinaryIO

import numpy as np
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps
from starlette.concurrency import run_in_threadpool

from app.core.config import settings

logger = logging.getLogger(__name__)

# Input and decision threshold in model_prediksi/cattle_check_meta.json.
IMAGE_SIZE = (224, 224)
CATTLE_THRESHOLD = 0.5
# ImageFolder sorts the 64 animal folders in klasifikasi_sapibukan.ipynb.
COW_CLASS_INDEX = 13
_model_lock = Lock()


def _prepare_photo(stream: BinaryIO, view: str) -> tuple[Image.Image, np.ndarray]:
    import tensorflow as tf

    try:
        stream.seek(0)
        with Image.open(stream, formats=("JPEG", "PNG", "WEBP")) as source:
            photo = ImageOps.exif_transpose(source).convert("RGB")
            # Keep Pillow RGB for torchvision and use the notebook's JPEG decoder for Keras.
            if source.format == "JPEG" and source.getexif().get(274, 1) == 1:
                stream.seek(0)
                pixels = tf.io.decode_jpeg(stream.read(), channels=3)
            else:
                pixels = np.asarray(photo)
            return photo, tf.image.resize(pixels, IMAGE_SIZE)[None].numpy()
    except (OSError, ValueError, Image.DecompressionBombError, tf.errors.InvalidArgumentError) as exc:
        raise HTTPException(422, f"Foto {view} tidak dapat dibaca. Silakan unggah ulang.") from exc
    finally:
        stream.seek(0)


@lru_cache(maxsize=3)
def _keras_model(path: Path):
    from keras.models import load_model

    # Training-only metrics, including dice_coef, are unnecessary for inference.
    return load_model(path, compile=False)


@lru_cache(maxsize=1)
def _pytorch_model(path: Path):
    import torch
    from torch import nn
    from torchvision.models.resnet import Bottleneck, ResNet

    # The supplied checkpoint serializes a complete DataParallel ResNet on CUDA.
    types = [set, nn.DataParallel, ResNet, Bottleneck, nn.Sequential, nn.Conv2d,
             nn.BatchNorm2d, nn.ReLU, nn.MaxPool2d, nn.AdaptiveAvgPool2d, nn.Linear]
    with torch.serialization.safe_globals(types):
        model = torch.load(path, map_location="cpu", weights_only=True)
    if isinstance(model, nn.DataParallel):
        model = model.module
    return model.eval()


def _cattle_scores(photo: Image.Image, keras_rgb: np.ndarray) -> np.ndarray:
    path = settings.CATTLE_CLASSIFIER_PATH
    if path.suffix.lower() == ".keras":
        # This model performs MobileNet's rescaling internally.
        return np.asarray(_keras_model(path)(keras_rgb, training=False))
    if path.suffix.lower() != ".pth":
        raise ValueError("CATTLE_CLASSIFIER_PATH harus menunjuk berkas .keras atau .pth")

    import torch
    from torchvision.transforms.functional import normalize

    rgb = np.array(photo.resize(IMAGE_SIZE, Image.Resampling.BILINEAR))[None]
    tensors = torch.from_numpy(rgb).permute(0, 3, 1, 2) / 255.0
    tensors = normalize(tensors, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    with torch.inference_mode():
        logits = _pytorch_model(path)(tensors)
        if logits.ndim != 2 or logits.shape[1] <= COW_CLASS_INDEX or not torch.isfinite(logits).all():
            raise ValueError("Keluaran classifier PyTorch tidak sesuai dengan checkpoint pelatihan")
        # The training notebook uses the winning class across the full ResNet output.
        return (logits.argmax(dim=1, keepdim=True) == COW_CLASS_INDEX).numpy()


def _predict(stream: BinaryIO, view: str) -> float:
    try:
        # Serialize model loading and execution per worker to bound memory use.
        with _model_lock:
            photo, rgb = _prepare_photo(stream, view)
            scores = _cattle_scores(photo, rgb)
            if (scores.shape != (1, 1) or not np.isfinite(scores).all()
                    or (scores < 0).any() or (scores > 1).any()):
                raise ValueError("Keluaran model klasifikasi tidak valid")
            if scores[0, 0] < CATTLE_THRESHOLD:
                raise HTTPException(422, f"Foto {view} bukan sapi. Silakan ganti foto tersebut.")

            rgb /= 255.0
            masks = np.asarray(_keras_model(settings.CATTLE_SEGMENTATION_PATH)(rgb, training=False))
            if masks.shape != (*rgb.shape[:3], 1) or not np.isfinite(masks).all():
                raise ValueError("Keluaran model segmentasi tidak valid")
            # Deployment uses the continuous predicted mask as the fourth channel.
            images_with_masks = np.concatenate([rgb, masks], axis=-1)
            weights = np.asarray(_keras_model(settings.CATTLE_REGRESSION_PATH)(images_with_masks, training=False))
            if weights.shape != (1, 1) or not np.isfinite(weights).all() or weights[0, 0] <= 0:
                raise ValueError("Keluaran model regresi tidak valid")
            return round(float(weights[0, 0]), 2)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gagal menjalankan model penimbangan")
        raise HTTPException(503, "Model penimbangan tidak tersedia. Periksa konfigurasi model di backend.") from exc


class CattleVisionService:
    @staticmethod
    async def predict_weight(photo: UploadFile, view: str) -> float:
        return await run_in_threadpool(_predict, photo.file, view)
