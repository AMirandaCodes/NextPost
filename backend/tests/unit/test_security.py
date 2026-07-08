from datetime import timedelta

import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify_roundtrip(self):
        hashed = hash_password("s3cret-password")
        assert hashed != "s3cret-password"
        assert verify_password("s3cret-password", hashed)

    def test_wrong_password_fails(self):
        assert not verify_password("wrong", hash_password("right"))

    def test_same_password_hashes_differently(self):
        assert hash_password("same") != hash_password("same")  # random salt

    def test_malformed_hash_returns_false(self):
        assert not verify_password("anything", "not-a-bcrypt-hash")


class TestAccessToken:
    def test_roundtrip(self):
        assert decode_access_token(create_access_token(42)) == 42

    def test_expired_token_rejected(self):
        token = create_access_token(42, expires_delta=timedelta(minutes=-5))
        assert decode_access_token(token) is None

    def test_tampered_token_rejected(self):
        token = create_access_token(42)
        header, payload, signature = token.split(".")
        assert decode_access_token(f"{header}.{payload}.AAAA{signature[4:]}") is None

    def test_garbage_token_rejected(self):
        assert decode_access_token("not-a-token") is None

    def test_token_signed_with_other_key_rejected(self):
        forged = jwt.encode({"sub": "42"}, "x" * 64, algorithm=settings.JWT_ALGORITHM)
        assert decode_access_token(forged) is None
