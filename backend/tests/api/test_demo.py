import pytest

from app.core.config import settings
from app.services import demo_service

DEMO_URL = "/api/v1/auth/demo"
ME_URL = "/api/v1/users/me"


@pytest.fixture
def demo_mode(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)


class TestDemoLogin:
    def test_hidden_when_demo_mode_disabled(self, client):
        assert client.post(DEMO_URL).status_code == 404

    def test_creates_seeds_and_logs_in(self, client, demo_mode, upload_dir):
        response = client.post(DEMO_URL)
        assert response.status_code == 200
        token = response.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        me = client.get(ME_URL, headers=headers).json()
        assert me["email"] == settings.DEMO_USER_EMAIL

        posts = client.get("/api/v1/posts?page_size=100", headers=headers).json()
        assert posts["total"] == 7
        # seeded images exist on disk and are served
        with_image = [p for p in posts["items"] if p["image_path"]]
        assert len(with_image) == 2
        image = client.get(f"/api/v1/posts/{with_image[0]['id']}/image", headers=headers)
        assert image.status_code == 200
        assert image.headers["content-type"] == "image/png"

    def test_second_login_reuses_the_same_account(self, client, demo_mode):
        first = client.post(DEMO_URL)
        second = client.post(DEMO_URL)
        assert first.status_code == second.status_code == 200

        headers = {"Authorization": f"Bearer {second.json()['access_token']}"}
        posts = client.get("/api/v1/posts?page_size=100", headers=headers).json()
        assert posts["total"] == 7  # not seeded twice


class TestDemoReset:
    def test_reset_restores_deleted_posts_and_images(
        self, client, demo_mode, db_session, upload_dir
    ):
        token = client.post(DEMO_URL).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # A visitor deletes everything they can see.
        posts = client.get("/api/v1/posts?page_size=100", headers=headers).json()["items"]
        for post in posts:
            assert client.delete(f"/api/v1/posts/{post['id']}", headers=headers).status_code == 204
        assert client.get("/api/v1/posts", headers=headers).json()["total"] == 0
        assert list(upload_dir.iterdir()) == []

        demo_service.reset_demo_data(db_session)

        restored = client.get("/api/v1/posts?page_size=100", headers=headers).json()
        assert restored["total"] == 7
        assert len(list(upload_dir.iterdir())) == 2

    def test_reset_restores_scheduled_statuses(self, client, demo_mode, db_session):
        demo_service.reset_demo_data(db_session)
        token = client.post(DEMO_URL).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        posts = client.get("/api/v1/posts?page_size=100", headers=headers).json()["items"]
        statuses = sorted(p["status"] for p in posts)
        assert statuses.count("scheduled") == 4
        assert statuses.count("draft") == 2
        assert statuses.count("published") == 1
        # scheduled dates are relative to "now", so the calendar always has content
        dashboard = client.get("/api/v1/dashboard", headers=headers).json()
        assert dashboard["upcoming_posts"] != []


class TestDemoProfileLock:
    def test_demo_profile_updates_are_forbidden(self, client, demo_mode):
        token = client.post(DEMO_URL).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        rename = client.patch(ME_URL, json={"full_name": "Hacked"}, headers=headers)
        assert rename.status_code == 403

        password = client.put(
            f"{ME_URL}/password",
            json={"current_password": "irrelevant", "new_password": "irrelevant-1"},
            headers=headers,
        )
        assert password.status_code == 403

    def test_regular_users_are_unaffected(self, client, demo_mode, auth_headers):
        response = client.patch(ME_URL, json={"full_name": "Still works"}, headers=auth_headers)
        assert response.status_code == 200
