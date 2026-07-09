REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"


class TestRegister:
    def test_register_success(self, client):
        response = client.post(
            REGISTER_URL,
            json={"email": "new@example.com", "full_name": "New User", "password": "password123"},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["email"] == "new@example.com"
        assert body["full_name"] == "New User"
        assert "password" not in body and "hashed_password" not in body

    def test_email_is_normalised_to_lowercase(self, client):
        response = client.post(
            REGISTER_URL,
            json={"email": "MiXeD@Example.COM", "full_name": "Mixed", "password": "password123"},
        )
        assert response.status_code == 201
        assert response.json()["email"] == "mixed@example.com"

    def test_duplicate_email_conflict(self, client, user):
        response = client.post(
            REGISTER_URL,
            json={"email": user.email, "full_name": "Dupe", "password": "password123"},
        )
        assert response.status_code == 409

    def test_invalid_email_rejected(self, client):
        response = client.post(
            REGISTER_URL,
            json={"email": "not-an-email", "full_name": "X", "password": "password123"},
        )
        assert response.status_code == 422

    def test_short_password_rejected(self, client):
        response = client.post(
            REGISTER_URL,
            json={"email": "short@example.com", "full_name": "X", "password": "short"},
        )
        assert response.status_code == 422


class TestLogin:
    def test_login_returns_working_token(self, client, user):
        response = client.post(LOGIN_URL, json={"email": user.email, "password": "password123"})
        assert response.status_code == 200
        token = response.json()["access_token"]

        me = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == user.email

    def test_login_email_is_case_insensitive(self, client, user):
        response = client.post(
            LOGIN_URL, json={"email": "ALICE@Example.COM", "password": "password123"}
        )
        assert response.status_code == 200

    def test_wrong_password_unauthorized(self, client, user):
        response = client.post(LOGIN_URL, json={"email": user.email, "password": "wrong-pass"})
        assert response.status_code == 401

    def test_unknown_email_unauthorized(self, client):
        response = client.post(
            LOGIN_URL, json={"email": "ghost@example.com", "password": "password123"}
        )
        assert response.status_code == 401

    def test_error_message_does_not_reveal_which_field_was_wrong(self, client, user):
        wrong_password = client.post(LOGIN_URL, json={"email": user.email, "password": "wrong"})
        unknown_email = client.post(
            LOGIN_URL, json={"email": "ghost@example.com", "password": "wrong"}
        )
        assert wrong_password.json() == unknown_email.json()
