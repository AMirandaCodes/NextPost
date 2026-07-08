from datetime import datetime, timedelta, timezone

from app.models.enums import PostStatus

DASHBOARD_URL = "/api/v1/dashboard"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TestDashboard:
    def test_empty_dashboard(self, client, auth_headers):
        response = client.get(DASHBOARD_URL, headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {
            "total_posts": 0,
            "draft_count": 0,
            "scheduled_count": 0,
            "published_count": 0,
            "posts_this_week": 0,
            "upcoming_posts": [],
        }

    def test_status_counts(self, client, auth_headers, user, post_factory):
        post_factory(user, status=PostStatus.DRAFT)
        post_factory(user, status=PostStatus.DRAFT)
        post_factory(user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(days=2))
        post_factory(user, status=PostStatus.PUBLISHED, published_at=_now())
        body = client.get(DASHBOARD_URL, headers=auth_headers).json()
        assert body["total_posts"] == 4
        assert body["draft_count"] == 2
        assert body["scheduled_count"] == 1
        assert body["published_count"] == 1

    def test_posts_this_week_uses_scheduled_date(self, client, auth_headers, user, post_factory):
        post_factory(user, status=PostStatus.SCHEDULED, scheduled_at=_now())
        post_factory(
            user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(days=14)
        )
        post_factory(user)  # draft without a date
        body = client.get(DASHBOARD_URL, headers=auth_headers).json()
        assert body["posts_this_week"] == 1

    def test_upcoming_limited_to_five_soonest_first(
        self, client, auth_headers, user, post_factory
    ):
        for days in (7, 3, 5, 1, 6, 4, 2):
            post_factory(
                user,
                title=f"In {days} days",
                status=PostStatus.SCHEDULED,
                scheduled_at=_now() + timedelta(days=days),
            )
        body = client.get(DASHBOARD_URL, headers=auth_headers).json()
        titles = [p["title"] for p in body["upcoming_posts"]]
        assert titles == ["In 1 days", "In 2 days", "In 3 days", "In 4 days", "In 5 days"]

    def test_upcoming_excludes_past_and_drafts(self, client, auth_headers, user, post_factory):
        post_factory(
            user,
            title="Yesterday",
            status=PostStatus.SCHEDULED,
            scheduled_at=_now() - timedelta(days=1),
        )
        post_factory(user, title="Draft", scheduled_at=_now() + timedelta(days=1))
        body = client.get(DASHBOARD_URL, headers=auth_headers).json()
        assert body["upcoming_posts"] == []

    def test_only_own_posts_counted(self, client, auth_headers, other_user, post_factory):
        post_factory(other_user)
        body = client.get(DASHBOARD_URL, headers=auth_headers).json()
        assert body["total_posts"] == 0
