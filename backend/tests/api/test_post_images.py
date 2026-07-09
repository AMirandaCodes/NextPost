from io import BytesIO

from PIL import Image

from app.services import image_service

POSTS_URL = "/api/v1/posts"


def make_image_bytes(fmt: str = "PNG", size: tuple[int, int] = (4, 4)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, "red").save(buffer, fmt)
    return buffer.getvalue()


def upload(client, headers, post_id, *, content: bytes | None = None, filename: str = "pic.png"):
    return client.put(
        f"{POSTS_URL}/{post_id}/image",
        files={"file": (filename, content if content is not None else make_image_bytes())},
        headers=headers,
    )


class TestUploadImage:
    def test_upload_png_stores_file_and_sets_path(
        self, client, auth_headers, user, post_factory, upload_dir
    ):
        post = post_factory(user)
        response = upload(client, auth_headers, post.id)
        assert response.status_code == 200
        image_path = response.json()["image_path"]
        assert image_path is not None
        assert image_path.endswith(".png")
        assert (upload_dir / image_path).is_file()

    def test_stored_extension_comes_from_content_not_filename(
        self, client, auth_headers, user, post_factory
    ):
        post = post_factory(user)
        # A real PNG uploaded with a .jpg name is stored (and served) as PNG.
        response = upload(
            client, auth_headers, post.id, content=make_image_bytes("PNG"), filename="photo.jpg"
        )
        assert response.status_code == 200
        assert response.json()["image_path"].endswith(".png")

    def test_disallowed_extension_rejected(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        response = upload(client, auth_headers, post.id, filename="notes.txt")
        assert response.status_code == 422
        assert "JPEG, PNG, GIF or WebP" in response.json()["detail"]

    def test_renamed_non_image_rejected(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        response = upload(client, auth_headers, post.id, content=b"MZ this is not an image")
        assert response.status_code == 422
        assert "not a valid image" in response.json()["detail"]

    def test_corrupted_image_rejected(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        truncated = make_image_bytes("PNG", size=(64, 64))[:40]
        response = upload(client, auth_headers, post.id, content=truncated)
        assert response.status_code == 422

    def test_empty_file_rejected(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        response = upload(client, auth_headers, post.id, content=b"")
        assert response.status_code == 422
        assert "empty" in response.json()["detail"]

    def test_valid_image_in_unsupported_format_rejected(
        self, client, auth_headers, user, post_factory
    ):
        post = post_factory(user)
        # A real, valid BMP renamed to .png: passes Pillow verification but the
        # decoded format is outside the allow-list.
        response = upload(client, auth_headers, post.id, content=make_image_bytes("BMP"))
        assert response.status_code == 422
        assert "JPEG, PNG, GIF or WebP" in response.json()["detail"]

    def test_oversized_image_rejected(
        self, client, auth_headers, user, post_factory, monkeypatch
    ):
        monkeypatch.setattr(image_service, "MAX_IMAGE_BYTES", 100)
        post = post_factory(user)
        response = upload(client, auth_headers, post.id, content=make_image_bytes("PNG", (64, 64)))
        assert response.status_code == 422
        assert "smaller" in response.json()["detail"]

    def test_replacing_image_deletes_previous_file(
        self, client, auth_headers, user, post_factory, upload_dir
    ):
        post = post_factory(user)
        first = upload(client, auth_headers, post.id).json()["image_path"]
        second = upload(
            client, auth_headers, post.id, content=make_image_bytes("JPEG"), filename="new.jpg"
        ).json()["image_path"]

        assert first != second
        assert not (upload_dir / first).exists()
        assert (upload_dir / second).is_file()
        assert len(list(upload_dir.iterdir())) == 1

    def test_upload_to_other_users_post_is_404(
        self, client, auth_headers, other_user, post_factory
    ):
        post = post_factory(other_user)
        assert upload(client, auth_headers, post.id).status_code == 404


class TestServeImage:
    def test_image_served_with_correct_media_type(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        content = make_image_bytes("PNG")
        upload(client, auth_headers, post.id, content=content)

        response = client.get(f"{POSTS_URL}/{post.id}/image", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.content == content

    def test_unauthenticated_request_is_401(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        upload(client, auth_headers, post.id)
        assert client.get(f"{POSTS_URL}/{post.id}/image").status_code == 401

    def test_other_users_image_is_404(
        self, client, auth_headers, other_user, post_factory, db_session
    ):
        from app.core.security import create_access_token

        post = post_factory(other_user)
        other_headers = {"Authorization": f"Bearer {create_access_token(other_user.id)}"}
        upload(client, other_headers, post.id)
        assert client.get(f"{POSTS_URL}/{post.id}/image", headers=auth_headers).status_code == 404

    def test_post_without_image_is_404(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        response = client.get(f"{POSTS_URL}/{post.id}/image", headers=auth_headers)
        assert response.status_code == 404

    def test_image_file_missing_on_disk_is_404(
        self, client, auth_headers, user, post_factory, upload_dir
    ):
        post = post_factory(user)
        filename = upload(client, auth_headers, post.id).json()["image_path"]
        (upload_dir / filename).unlink()  # DB row says image exists, disk disagrees

        response = client.get(f"{POSTS_URL}/{post.id}/image", headers=auth_headers)
        assert response.status_code == 404
        assert "missing" in response.json()["detail"]


class TestDeleteImage:
    def test_delete_image_removes_file_and_clears_path(
        self, client, auth_headers, user, post_factory, upload_dir
    ):
        post = post_factory(user)
        filename = upload(client, auth_headers, post.id).json()["image_path"]

        response = client.delete(f"{POSTS_URL}/{post.id}/image", headers=auth_headers)
        assert response.status_code == 204
        assert not (upload_dir / filename).exists()

        detail = client.get(f"{POSTS_URL}/{post.id}", headers=auth_headers).json()
        assert detail["image_path"] is None

    def test_delete_image_on_missing_post_is_404(self, client, auth_headers):
        response = client.delete(f"{POSTS_URL}/99999/image", headers=auth_headers)
        assert response.status_code == 404

    def test_deleting_post_deletes_its_image_file(
        self, client, auth_headers, user, post_factory, upload_dir
    ):
        post = post_factory(user)
        filename = upload(client, auth_headers, post.id).json()["image_path"]
        assert (upload_dir / filename).is_file()

        assert client.delete(f"{POSTS_URL}/{post.id}", headers=auth_headers).status_code == 204
        assert not (upload_dir / filename).exists()
