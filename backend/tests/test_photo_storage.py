import asyncio
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.core.config import settings
from app.services import neon_storage


class MockS3Client:
    def __init__(self):
        self.objects = {}

    def put_object(self, Bucket, Key, Body, ContentType=None):
        self.objects[Key] = {"body": Body, "content_type": ContentType}
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def delete_object(self, Bucket, Key):
        self.objects.pop(Key, None)
        return {"ResponseMetadata": {"HTTPStatusCode": 204}}

    def generate_presigned_url(self, ClientMethod, Params, ExpiresIn=3600):
        key = Params.get("Key", "")
        return f"{settings.AWS_ENDPOINT_URL_S3.rstrip('/')}/{Params.get('Bucket')}/{key}?signature=mock_token"


def test_neon_upload_and_cleanup_mocked(monkeypatch):
    mock_client = MockS3Client()
    monkeypatch.setattr(neon_storage, "get_neon_s3_client", lambda: mock_client)
    monkeypatch.setattr(neon_storage, "validate_storage_config", lambda: None)

    stream = BytesIO(b"dummy image bytes")
    photo = UploadFile(stream, filename="cattle_side.jpg", headers=Headers({"Content-Type": "image/jpeg"}))

    # Test upload with id_sapi and view
    url = asyncio.run(neon_storage.upload_image_to_neon(photo, id_sapi=42, view="samping"))

    assert f"/{settings.NEON_STORAGE_BUCKET_NAME}/sapi/42/samping_" in url
    assert url.endswith(".jpg")
    assert len(mock_client.objects) == 1

    uploaded_key = list(mock_client.objects.keys())[0]
    assert uploaded_key.startswith("sapi/42/samping_")
    assert mock_client.objects[uploaded_key]["body"] == b"dummy image bytes"

    # Test cleanup
    asyncio.run(neon_storage.delete_uploaded_image(url))
    assert len(mock_client.objects) == 0


def test_neon_upload_onboarding_without_id_sapi(monkeypatch):
    mock_client = MockS3Client()
    monkeypatch.setattr(neon_storage, "get_neon_s3_client", lambda: mock_client)
    monkeypatch.setattr(neon_storage, "validate_storage_config", lambda: None)

    stream = BytesIO(b"dummy rear bytes")
    photo = UploadFile(stream, filename="cattle_rear.png", headers=Headers({"Content-Type": "image/png"}))

    url = asyncio.run(neon_storage.upload_image_to_neon(photo, view="belakang"))
    assert f"/{settings.NEON_STORAGE_BUCKET_NAME}/sapi/onboarding/belakang_" in url
    assert url.endswith(".png")


def test_fail_fast_validation_raises_runtime_error(monkeypatch):
    neon_storage.get_neon_s3_client.cache_clear()
    monkeypatch.setattr(settings, "AWS_ENDPOINT_URL_S3", "")
    with pytest.raises(RuntimeError) as exc_info:
        neon_storage.validate_storage_config()
    assert "Kredensial Neon Object Storage belum lengkap" in str(exc_info.value)
    assert "AWS_ENDPOINT_URL_S3" in str(exc_info.value)


def test_extract_object_key():
    bucket = settings.NEON_STORAGE_BUCKET_NAME
    url = f"https://myproject.storage.neon.tech/{bucket}/sapi/15/samping_abc123.jpg"
    assert neon_storage.extract_object_key(url) == "sapi/15/samping_abc123.jpg"

    raw_key = "sapi/15/belakang_xyz789.png"
    assert neon_storage.extract_object_key(raw_key) == "sapi/15/belakang_xyz789.png"


def test_generate_presigned_url(monkeypatch):
    mock_client = MockS3Client()
    monkeypatch.setattr(neon_storage, "get_neon_s3_client", lambda: mock_client)
    monkeypatch.setattr(neon_storage, "validate_storage_config", lambda: None)

    presigned = neon_storage.generate_presigned_url("sapi/1/foto_test.jpg", expiration_seconds=600)
    assert "signature=mock_token" in presigned
    assert "sapi/1/foto_test.jpg" in presigned


def test_invalid_mime_type_rejected():
    stream = BytesIO(b"not an image")
    doc = UploadFile(stream, filename="document.pdf", headers=Headers({"Content-Type": "application/pdf"}))
    with pytest.raises(HTTPException) as exc_info:
        neon_storage.validate_image_file(doc)
    assert exc_info.value.status_code == 400
    assert "Format foto tidak didukung" in exc_info.value.detail
