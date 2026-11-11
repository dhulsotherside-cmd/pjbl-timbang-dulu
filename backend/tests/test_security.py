from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing_and_verification():
    raw_password = "PasswordSangatAman123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("PasswordSalah", hashed) is False


def test_jwt_token_creation_and_decoding():
    user_id = 42
    token = create_access_token(subject=str(user_id))

    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == str(user_id)
    assert "exp" in payload


def test_invalid_jwt_token_decoding():
    payload = decode_access_token("token_rusak_atau_palsu.xyz.123")
    assert payload is None
