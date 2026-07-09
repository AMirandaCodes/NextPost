from datetime import datetime, timedelta, timezone

import pytest

from app.models.enums import PostStatus
from app.services import email_service, reminder_service


def _now() -> datetime:
    return datetime.now(timezone.utc)


@pytest.fixture
def sent_reminders(monkeypatch):
    """Capture reminder sends instead of talking to a real SMTP server."""
    sent: list[int] = []
    monkeypatch.setattr(email_service, "send_reminder", lambda post: sent.append(post.id))
    return sent


class TestSelection:
    def test_scheduled_post_due_within_window_is_selected(
        self, db_session, user, post_factory, sent_reminders
    ):
        post = post_factory(
            user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=3)
        )
        summary = reminder_service.send_due_reminders(db_session)

        assert summary == {"found": 1, "sent": 1, "failed": 0}
        assert sent_reminders == [post.id]

    def test_post_beyond_window_not_selected(self, db_session, user, post_factory, sent_reminders):
        post_factory(user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=30))
        summary = reminder_service.send_due_reminders(db_session)
        assert summary["found"] == 0
        assert sent_reminders == []

    def test_post_in_past_not_selected(self, db_session, user, post_factory, sent_reminders):
        post_factory(user, status=PostStatus.SCHEDULED, scheduled_at=_now() - timedelta(hours=1))
        assert reminder_service.send_due_reminders(db_session)["found"] == 0

    def test_draft_and_published_posts_not_selected(
        self, db_session, user, post_factory, sent_reminders
    ):
        due = _now() + timedelta(hours=3)
        post_factory(user, status=PostStatus.DRAFT, scheduled_at=due)
        post_factory(user, status=PostStatus.PUBLISHED, scheduled_at=due, published_at=_now())
        assert reminder_service.send_due_reminders(db_session)["found"] == 0

    def test_already_reminded_post_not_selected(
        self, db_session, user, post_factory, sent_reminders
    ):
        post = post_factory(
            user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=3)
        )
        post.reminder_sent_at = _now() - timedelta(minutes=10)
        db_session.commit()

        assert reminder_service.send_due_reminders(db_session)["found"] == 0
        assert sent_reminders == []


class TestSendBehaviour:
    def test_successful_send_stamps_reminder_sent_at(self, db_session, user, post_factory, sent_reminders):
        post = post_factory(
            user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=3)
        )
        assert post.reminder_sent_at is None

        reminder_service.send_due_reminders(db_session)
        db_session.refresh(post)
        assert post.reminder_sent_at is not None

    def test_running_twice_sends_once(self, db_session, user, post_factory, sent_reminders):
        post_factory(user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=3))

        first = reminder_service.send_due_reminders(db_session)
        second = reminder_service.send_due_reminders(db_session)

        assert first["sent"] == 1
        assert second == {"found": 0, "sent": 0, "failed": 0}
        assert len(sent_reminders) == 1

    def test_failed_send_leaves_timestamp_unset_for_retry(
        self, db_session, user, post_factory, monkeypatch
    ):
        post = post_factory(
            user, status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=3)
        )

        def broken(_post):
            raise ConnectionError("smtp down")

        monkeypatch.setattr(email_service, "send_reminder", broken)
        summary = reminder_service.send_due_reminders(db_session)

        assert summary == {"found": 1, "sent": 0, "failed": 1}
        db_session.refresh(post)
        assert post.reminder_sent_at is None

        # SMTP recovers → the next run picks the same post up again.
        sent: list[int] = []
        monkeypatch.setattr(email_service, "send_reminder", lambda p: sent.append(p.id))
        retry = reminder_service.send_due_reminders(db_session)
        assert retry["sent"] == 1
        assert sent == [post.id]

    def test_one_failure_does_not_block_other_reminders(
        self, db_session, user, post_factory, monkeypatch
    ):
        bad = post_factory(
            user, title="Bad", status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=2)
        )
        good = post_factory(
            user, title="Good", status=PostStatus.SCHEDULED, scheduled_at=_now() + timedelta(hours=4)
        )

        def flaky(post):
            if post.id == bad.id:
                raise ConnectionError("smtp hiccup")

        monkeypatch.setattr(email_service, "send_reminder", flaky)
        summary = reminder_service.send_due_reminders(db_session)

        assert summary == {"found": 2, "sent": 1, "failed": 1}
        db_session.refresh(bad)
        db_session.refresh(good)
        assert bad.reminder_sent_at is None
        assert good.reminder_sent_at is not None
