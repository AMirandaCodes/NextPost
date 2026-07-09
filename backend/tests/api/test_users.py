from datetime import timedelta

from app.core.security import create_access_token, hash_password
from app.models import User

ME_URL = "/api/v1/users/me"
PASSWORD_URL = "/api/v1/users/me/password"


class TestAuthGuard:
    def test_no_token_unauthorized(self, client):
        assert client.get(ME_URL).status_code == 401

    def test_garbage_token_unauthorized(self, client):
        response = client.get(ME_URL, headers={"Authorization": "Bearer garbage"})
        assert response.status_code == 401

    def test_expired_token_unauthorized(self, client, user):
        token = create_access_token(user.id, expires_delta=timedelta(minutes=-1))
        response = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401

    def test_token_for_deleted_user_unauthorized(self, client, db_session, user):
        token = create_access_token(user.id)
        db_session.delete(user)
        db_session.commit()
        response = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401


class TestProfile:
    def test_read_profile(self, client, auth_headers, user):
        response = client.get(ME_URL, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == user.id

    def test_update_full_name(self, client, auth_headers):
        response = client.patch(ME_URL, json={"full_name": "Renamed"}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["full_name"] == "Renamed"

    def test_update_email(self, client, auth_headers):
        response = client.patch(ME_URL, json={"email": "New@Example.com"}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "new@example.com"

    def test_update_email_to_own_current_email_is_not_a_conflict(
        self, client, auth_headers, user
    ):
        response = client.patch(ME_URL, json={"email": user.email}, headers=auth_headers)
        assert response.status_code == 200

    def test_update_email_to_taken_address_conflict(self, client, db_session, auth_headers):
        db_session.add(
            User(
                email="taken@example.com",
                full_name="Other",
                hashed_password=hash_password("password123"),
            )
        )
        db_session.commit()
        response = client.patch(ME_URL, json={"email": "taken@example.com"}, headers=auth_headers)
        assert response.status_code == 409


class TestChangePassword:
    def test_change_password_success(self, client, auth_headers, user):
        response = client.put(
            PASSWORD_URL,
            json={"current_password": "password123", "new_password": "new-password-456"},
            headers=auth_headers,
        )
        assert response.status_code == 204

        old_login = client.post(
            "/api/v1/auth/login", json={"email": user.email, "password": "password123"}
        )
        assert old_login.status_code == 401
        new_login = client.post(
            "/api/v1/auth/login", json={"email": user.email, "password": "new-password-456"}
        )
        assert new_login.status_code == 200

    def test_wrong_current_password_rejected(self, client, auth_headers):
        response = client.put(
            PASSWORD_URL,
            json={"current_password": "wrong", "new_password": "new-password-456"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_short_new_password_rejected(self, client, auth_headers):
        response = client.put(
            PASSWORD_URL,
            json={"current_password": "password123", "new_password": "short"},
            headers=auth_headers,
        )
        assert response.status_code == 422
