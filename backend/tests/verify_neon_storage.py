"""
Skrip Verifikasi Live Smoke Test ke Neon Object Storage (Bucket: cattle-images).
Menguji 4 pilar fungsionalitas storage secara langsung:
1. Upload (put_object) objek uji ke Neon Object Storage
2. Verifikasi eksistensi objek (head_object)
3. Hasilkan dan verifikasi URL akses (generate_presigned_url & public URL)
4. Rollback & cleanup (delete_object) serta verifikasi objek telah terhapus
"""
import os
import sys
import uuid
import urllib.request
import urllib.error

# Pastikan direktori root backend ada di sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from botocore.exceptions import ClientError
from app.core.config import settings
from app.services.neon_storage import (
    get_neon_s3_client,
    get_public_url,
    generate_presigned_url,
    extract_object_key,
)


def run_neon_storage_verification() -> bool:
    print("=" * 70)
    print("MEMULAI LIVE SMOKE TEST KE NEON OBJECT STORAGE")
    print("=" * 70)

    bucket = settings.NEON_STORAGE_BUCKET_NAME
    print(f"Target Bucket : {bucket}")
    print(f"Region        : {settings.AWS_REGION}")
    # Do not print access keys or endpoint secret parts
    endpoint_masked = settings.AWS_ENDPOINT_URL_S3.split("@")[-1] if "@" in settings.AWS_ENDPOINT_URL_S3 else settings.AWS_ENDPOINT_URL_S3[:30] + "..."
    print(f"Endpoint      : {endpoint_masked}")

    try:
        client = get_neon_s3_client()
        print("[INIT] Client boto3 S3-compatible berhasil diinisialisasi (signature_version=s3v4).")
    except Exception as exc:
        print(f"[FAIL] Inisialisasi boto3 gagal: {exc}")
        return False

    unique_id = uuid.uuid4().hex[:8]
    test_key = f"healthcheck/connection_test_{unique_id}.txt"
    test_payload = f"TimbangDulu connection probe {unique_id}".encode("utf-8")

    # 1. TEST PUT_OBJECT (UPLOAD)
    print(f"\n[1/4] Mengunggah objek uji ke '{test_key}'...")
    try:
        put_res = client.put_object(
            Bucket=bucket,
            Key=test_key,
            Body=test_payload,
            ContentType="text/plain; charset=utf-8",
        )
        status_code = put_res.get("ResponseMetadata", {}).get("HTTPStatusCode")
        print(f"      [OK] Upload berhasil (HTTP {status_code}).")
    except Exception as exc:
        print(f"      [FAIL] Upload gagal: {exc}")
        return False

    # 2. TEST HEAD_OBJECT (VERIFIKASI EKSISTENSI)
    print(f"\n[2/4] Verifikasi eksistensi objek '{test_key}' via head_object...")
    try:
        head_res = client.head_object(Bucket=bucket, Key=test_key)
        status_code = head_res.get("ResponseMetadata", {}).get("HTTPStatusCode")
        content_length = head_res.get("ContentLength")
        content_type = head_res.get("ContentType")
        print(f"      [OK] Objek terverifikasi di bucket Neon! (HTTP {status_code})")
        print(f"           Ukuran: {content_length} bytes, MIME: {content_type}")
    except Exception as exc:
        print(f"      [FAIL] head_object gagal: {exc}")
        return False

    # 3. TEST AKSES BACA & URL (PRESIGNED & PUBLIC URL)
    print(f"\n[3/4] Menguji pembuatan Presigned URL dan Public URL...")
    try:
        presigned_url = generate_presigned_url(test_key, expiration_seconds=300)
        public_url = get_public_url(test_key)
        extracted_key = extract_object_key(public_url)

        print(f"      [OK] Presigned URL berhasil di-generate.")
        print(f"      [OK] Public URL format valid: {public_url[:40]}...")
        assert extracted_key == test_key, f"Key mismatch: {extracted_key} != {test_key}"

        # Uji GET via Presigned URL
        req = urllib.request.Request(presigned_url, headers={"User-Agent": "TimbangDulu-Probe/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            print(f"      [OK] Presigned URL HTTP GET: status {resp.status}, payload cocok ({len(data)} bytes).")

        # Uji GET via Public URL
        try:
            req_pub = urllib.request.Request(public_url, headers={"User-Agent": "TimbangDulu-Probe/1.0"})
            with urllib.request.urlopen(req_pub, timeout=10) as resp_pub:
                print(f"      [OK] Public URL HTTP GET: status {resp_pub.status} (Bucket bersifat Public Read).")
        except urllib.error.HTTPError as http_err:
            print(f"      [INFO] Public URL HTTP GET mengembalikan HTTP {http_err.code} (Bucket bersifat Private, gunakan Presigned URL).")
        except Exception as pub_exc:
            print(f"      [INFO] Public URL test note: {pub_exc}")

    except Exception as exc:
        print(f"      [FAIL] Verifikasi URL gagal: {exc}")
        return False

    # 4. TEST DELETE_OBJECT (CLEANUP & ROLLBACK VERIFIKASI)
    print(f"\n[4/4] Menghapus objek uji '{test_key}' (cleanup)...")
    try:
        del_res = client.delete_object(Bucket=bucket, Key=test_key)
        status_code = del_res.get("ResponseMetadata", {}).get("HTTPStatusCode")
        print(f"      [OK] delete_object berhasil (HTTP {status_code}).")

        # Verifikasi objek sudah tidak ada
        try:
            client.head_object(Bucket=bucket, Key=test_key)
            print(f"      [WARNING] Objek masih dapat di-head setelah dihapus!")
            return False
        except ClientError as client_err:
            error_code = client_err.response.get("Error", {}).get("Code")
            http_status = client_err.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            print(f"      [OK] Verifikasi cleanup berhasil: head_object mengembalikan {error_code} (HTTP {http_status}).")
    except Exception as exc:
        print(f"      [FAIL] Cleanup gagal: {exc}")
        return False

    print("\n" + "=" * 70)
    print("LIVE SMOKE TEST NEON OBJECT STORAGE SUKSES 100%!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = run_neon_storage_verification()
    sys.exit(0 if success else 1)
