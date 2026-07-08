from datetime import datetime, timedelta, timezone

from app.models.enums import Platform, PostStatus

POSTS_URL = "/api/v1/posts"


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _future(days: int = 1) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


class TestCreatePost:
    def test_create_draft_with_tags(self, client, auth_headers):
        response = client.post(
            POSTS_URL,
            json={
                "title": "Launch teaser",
                "content": "Something big is coming.",
                "platform": "linkedin",
                "tags": ["Launch", "  q3  ", "launch"],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "draft"
        assert body["published_at"] is None
        # tags normalised: stripped, lowercased, de-duplicated
        assert [t["name"] for t in body["tags"]] == ["launch", "q3"]

    def test_scheduled_without_date_rejected(self, client, auth_headers):
        response = client.post(
            POSTS_URL,
            json={"title": "T", "content": "C", "platform": "x", "status": "scheduled"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_scheduled_with_date_created(self, client, auth_headers):
        response = client.post(
            POSTS_URL,
            json={
                "title": "T",
                "content": "C",
                "platform": "x",
                "status": "scheduled",
                "scheduled_at": _iso(_future()),
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_naive_datetime_rejected(self, client, auth_headers):
        response = client.post(
            POSTS_URL,
            json={
                "title": "T",
                "content": "C",
                "platform": "x",
                "status": "scheduled",
                "scheduled_at": "2030-01-01T10:00:00",  # no timezone offset
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_invalid_platform_rejected(self, client, auth_headers):
        response = client.post(
            POSTS_URL,
            json={"title": "T", "content": "C", "platform": "myspace"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_published_sets_published_at(self, client, auth_headers):
        response = client.post(
            POSTS_URL,
            json={"title": "T", "content": "C", "platform": "other", "status": "published"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["published_at"] is not None


class TestGetPost:
    def test_get_own_post(self, client, auth_headers, user, post_factory):
        post = post_factory(user, title="Mine")
        response = client.get(f"{POSTS_URL}/{post.id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["title"] == "Mine"

    def test_other_users_post_is_404(self, client, auth_headers, other_user, post_factory):
        post = post_factory(other_user)
        response = client.get(f"{POSTS_URL}/{post.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_missing_post_is_404(self, client, auth_headers):
        assert client.get(f"{POSTS_URL}/99999", headers=auth_headers).status_code == 404


class TestListPosts:
    def test_pagination_envelope(self, client, auth_headers, user, post_factory):
        for i in range(3):
            post_factory(user, title=f"Post {i}")
        response = client.get(f"{POSTS_URL}?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["page"] == 1
        assert body["page_size"] == 2
        assert body["total"] == 3
        assert len(body["items"]) == 2

        page2 = client.get(f"{POSTS_URL}?page=2&page_size=2", headers=auth_headers).json()
        assert len(page2["items"]) == 1

    def test_only_own_posts_listed(self, client, auth_headers, user, other_user, post_factory):
        post_factory(user, title="Mine")
        post_factory(other_user, title="Not mine")
        body = client.get(POSTS_URL, headers=auth_headers).json()
        assert [p["title"] for p in body["items"]] == ["Mine"]

    def test_filter_by_platform_and_status(self, client, auth_headers, user, post_factory):
        post_factory(user, platform=Platform.X, status=PostStatus.PUBLISHED,
                     published_at=datetime.now(timezone.utc))
        post_factory(user, platform=Platform.TIKTOK)
        response = client.get(
            f"{POSTS_URL}?platform=x&status=published", headers=auth_headers
        )
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["platform"] == "x"

    def test_filter_by_tag(self, client, auth_headers, user, post_factory):
        post_factory(user, title="Tagged", tags=("campaign",))
        post_factory(user, title="Untagged")
        body = client.get(f"{POSTS_URL}?tag=campaign", headers=auth_headers).json()
        assert [p["title"] for p in body["items"]] == ["Tagged"]

    def test_search_is_case_insensitive_and_covers_content(
        self, client, auth_headers, user, post_factory
    ):
        post_factory(user, title="Summer SALE announcement")
        post_factory(user, title="Other", content="the summer collection drops")
        post_factory(user, title="Unrelated")
        body = client.get(f"{POSTS_URL}?search=summer", headers=auth_headers).json()
        assert body["total"] == 2

    def test_search_escapes_like_wildcards(self, client, auth_headers, user, post_factory):
        post_factory(user, title="Sale: 100% off shipping")
        post_factory(user, title="Sale: 100 units left")
        body = client.get(f"{POSTS_URL}?search=100%25", headers=auth_headers).json()
        assert body["total"] == 1
        assert "100%" in body["items"][0]["title"]

    def test_sort_by_title_asc(self, client, auth_headers, user, post_factory):
        for title in ("Banana", "Apple", "Cherry"):
            post_factory(user, title=title)
        body = client.get(
            f"{POSTS_URL}?sort_by=title&sort_order=asc", headers=auth_headers
        ).json()
        assert [p["title"] for p in body["items"]] == ["Apple", "Banana", "Cherry"]

    def test_unknown_sort_field_rejected(self, client, auth_headers):
        response = client.get(f"{POSTS_URL}?sort_by=hashed_password", headers=auth_headers)
        assert response.status_code == 422

    def test_scheduled_date_range_filter(self, client, auth_headers, user, post_factory):
        post_factory(user, title="Soon", status=PostStatus.SCHEDULED, scheduled_at=_future(1))
        post_factory(user, title="Later", status=PostStatus.SCHEDULED, scheduled_at=_future(30))
        body = client.get(
            POSTS_URL,
            params={"scheduled_from": _iso(_future(0)), "scheduled_to": _iso(_future(7))},
            headers=auth_headers,
        ).json()
        assert [p["title"] for p in body["items"]] == ["Soon"]


class TestUpdatePost:
    def test_partial_update_keeps_other_fields(self, client, auth_headers, user, post_factory):
        post = post_factory(user, title="Before", content="Body")
        response = client.patch(
            f"{POSTS_URL}/{post.id}", json={"title": "After"}, headers=auth_headers
        )
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "After"
        assert body["content"] == "Body"

    def test_tags_are_replaced_not_merged(self, client, auth_headers, user, post_factory):
        post = post_factory(user, tags=("old", "shared"))
        response = client.patch(
            f"{POSTS_URL}/{post.id}", json={"tags": ["shared", "new"]}, headers=auth_headers
        )
        assert [t["name"] for t in response.json()["tags"]] == ["shared", "new"]

    def test_schedule_requires_date_against_existing_state(
        self, client, auth_headers, user, post_factory
    ):
        post = post_factory(user)  # draft, no scheduled_at
        response = client.patch(
            f"{POSTS_URL}/{post.id}", json={"status": "scheduled"}, headers=auth_headers
        )
        assert response.status_code == 422

    def test_schedule_with_date_in_same_request(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        response = client.patch(
            f"{POSTS_URL}/{post.id}",
            json={"status": "scheduled", "scheduled_at": _iso(_future())},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "scheduled"

    def test_publish_sets_published_at_and_unpublish_clears_it(
        self, client, auth_headers, user, post_factory
    ):
        post = post_factory(user)
        published = client.patch(
            f"{POSTS_URL}/{post.id}", json={"status": "published"}, headers=auth_headers
        ).json()
        assert published["published_at"] is not None

        redrafted = client.patch(
            f"{POSTS_URL}/{post.id}", json={"status": "draft"}, headers=auth_headers
        ).json()
        assert redrafted["published_at"] is None

    def test_explicit_null_title_rejected(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        response = client.patch(
            f"{POSTS_URL}/{post.id}", json={"title": None}, headers=auth_headers
        )
        assert response.status_code == 422

    def test_other_users_post_is_404(self, client, auth_headers, other_user, post_factory):
        post = post_factory(other_user)
        response = client.patch(
            f"{POSTS_URL}/{post.id}", json={"title": "Hijack"}, headers=auth_headers
        )
        assert response.status_code == 404


class TestDeletePost:
    def test_delete_then_gone(self, client, auth_headers, user, post_factory):
        post = post_factory(user)
        assert client.delete(f"{POSTS_URL}/{post.id}", headers=auth_headers).status_code == 204
        assert client.get(f"{POSTS_URL}/{post.id}", headers=auth_headers).status_code == 404

    def test_other_users_post_is_404(self, client, auth_headers, other_user, post_factory):
        post = post_factory(other_user)
        assert client.delete(f"{POSTS_URL}/{post.id}", headers=auth_headers).status_code == 404

    def test_tags_survive_post_deletion(self, client, auth_headers, user, post_factory):
        post = post_factory(user, tags=("keeper",))
        client.delete(f"{POSTS_URL}/{post.id}", headers=auth_headers)
        tags = client.get("/api/v1/tags", headers=auth_headers).json()
        assert [t["name"] for t in tags] == ["keeper"]
