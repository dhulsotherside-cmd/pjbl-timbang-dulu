import asyncio
from io import BytesIO
from pathlib import Path

import numpy as np
import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.services import ai_inference as ai


def photo(value):
    data = BytesIO()
    Image.new("RGB", (20, 16), (value, 0, 255)).save(data, format="PNG")
    data.seek(0)
    return UploadFile(data, filename="foto.png")


def predict(file, view="samping"):
    return asyncio.run(ai.CattleVisionService.predict_weight(file, view))


def test_single_photo_feeds_segmentation_then_weight_model(monkeypatch):
    def classify(rgb, training):
        assert not training
        assert rgb.shape == (1, 224, 224, 3)
        np.testing.assert_equal(rgb[:, 0, 0, 0], [64])
        return [[0.8]]

    def segment(rgb, training):
        assert not training
        np.testing.assert_allclose(rgb[:, 0, 0, 0], np.array([64]) / 255)
        return np.full((1, 224, 224, 1), 0.2)

    def regress(data, training):
        assert not training
        assert data.shape == (1, 224, 224, 4)
        np.testing.assert_allclose(data[:, 0, 0, 3], [0.2])
        np.testing.assert_allclose(data[:, 0, 0, 0], np.array([64]) / 255)
        return [[170.379]]

    monkeypatch.setattr(ai.settings, "CATTLE_CLASSIFIER_PATH", Path("classifier.keras"))
    models = {ai.settings.CATTLE_CLASSIFIER_PATH: classify,
              ai.settings.CATTLE_SEGMENTATION_PATH: segment,
              ai.settings.CATTLE_REGRESSION_PATH: regress}
    monkeypatch.setattr(ai, "_keras_model", models.__getitem__)
    file = photo(64)
    assert predict(file) == 170.38
    assert file.file.tell() == 0


@pytest.mark.parametrize("angle", ["samping", "belakang"])
def test_non_cattle_stops_before_weight_models(monkeypatch, angle):
    monkeypatch.setattr(ai, "_cattle_scores", lambda photo, rgb: np.array([[0.1]]))
    monkeypatch.setattr(ai, "_keras_model", lambda path: pytest.fail("Model bobot dipanggil"))
    with pytest.raises(HTTPException) as caught:
        predict(photo(64), angle)
    assert caught.value.status_code == 422
    assert f"{angle} bukan sapi" in caught.value.detail


def test_corrupt_photo_identifies_view():
    with pytest.raises(HTTPException) as caught:
        predict(UploadFile(BytesIO(b"invalid image bytes")), "belakang")
    assert caught.value.status_code == 422
    assert "belakang" in caught.value.detail


def test_missing_classifier_does_not_generate_weight(monkeypatch):
    def load_missing(path):
        raise FileNotFoundError(path)

    monkeypatch.setattr(ai.settings, "CATTLE_CLASSIFIER_PATH", Path("missing.keras"))
    monkeypatch.setattr(ai, "_keras_model", load_missing)
    with pytest.raises(HTTPException) as caught:
        predict(photo(64))
    assert caught.value.status_code == 503


@pytest.mark.parametrize(("winner", "is_cattle"), [(13, True), (9, False)])
def test_pytorch_uses_notebook_winning_class(monkeypatch, winner, is_cattle):
    torch = pytest.importorskip("torch")
    monkeypatch.setattr(ai.settings, "CATTLE_CLASSIFIER_PATH", Path("classifier.pth"))
    logits = torch.zeros(1, 1000)
    logits[0, winner] = 1
    monkeypatch.setattr(ai, "_pytorch_model", lambda path: lambda images: logits)
    assert ai._cattle_scores(Image.new("RGB", (30, 20)), None).item() == is_cattle
