import asyncio
from io import BytesIO

from fastapi import UploadFile
from starlette.datastructures import Headers

from app.services import neon_storage


def test_local_upload_and_cleanup(tmp_path, monkeypatch):
    monkeypatch.setattr(neon_storage, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(neon_storage, "get_neon_s3_client", lambda: None)
    stream = BytesIO(b"photo bytes")
    stream.read()
    photo = UploadFile(stream, filename="example.jpg", headers=Headers({"Content-Type": "image/jpeg"}))
    url = asyncio.run(neon_storage.upload_image_to_neon(photo))
    path = tmp_path / url.removeprefix("/uploads/")
    assert path.read_bytes() == b"photo bytes"
    asyncio.run(neon_storage.delete_uploaded_image(url))
    assert not path.exists()
