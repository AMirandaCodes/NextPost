import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models import Post
from app.models.enums import PostStatus
from app.services import email_service

logger = logging.getLogger("app.reminders")


def find_due_posts(db: Session) -> list[Post]:
    """Scheduled posts due within the reminder window that haven't been reminded."""
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=settings.REMINDER_LEAD_HOURS)
    return list(
        db.scalars(
            select(Post)
            .where(
                Post.status == PostStatus.SCHEDULED,
                Post.reminder_sent_at.is_(None),
                Post.scheduled_at >= now,
                Post.scheduled_at <= window_end,
            )
            .options(joinedload(Post.user))
            .order_by(Post.scheduled_at)
        )
    )


def send_due_reminders(db: Session) -> dict[str, int]:
    """Send reminders for all due posts. Idempotent: a successful send stamps
    reminder_sent_at (committed per post); a failed send leaves it NULL so the
    next run retries it."""
    posts = find_due_posts(db)
    sent = 0
    failed = 0
    for post in posts:
        try:
            email_service.send_reminder(post)
        except Exception:
            failed += 1
            db.rollback()
            logger.exception(
                "reminder failed",
                extra={"event": "reminders.failed", "post_id": post.id, "user_id": post.user_id},
            )
            continue
        post.reminder_sent_at = datetime.now(timezone.utc)
        db.commit()
        sent += 1
        logger.info(
            "reminder sent",
            extra={"event": "reminders.sent", "post_id": post.id, "user_id": post.user_id},
        )
    summary = {"found": len(posts), "sent": sent, "failed": failed}
    logger.info("reminder run complete", extra={"event": "reminders.summary", **summary})
    return summary
