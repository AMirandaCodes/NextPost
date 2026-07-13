from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Post, User
from app.models.enums import PostStatus

UPCOMING_LIMIT = 5


def get_stats(db: Session, user: User) -> dict:
    status_counts: dict[PostStatus, int] = dict(
        db.execute(
            select(Post.status, func.count())
            .where(Post.user_id == user.id)
            .group_by(Post.status)
        ).all()
    )

    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end = week_start + timedelta(days=7)
    posts_this_week = db.scalar(
        select(func.count())
        .select_from(Post)
        .where(
            Post.user_id == user.id,
            Post.scheduled_at >= week_start,
            Post.scheduled_at < week_end,
        )
    )

    upcoming_posts = list(
        db.scalars(
            select(Post)
            .where(
                Post.user_id == user.id,
                Post.status == PostStatus.SCHEDULED,
                Post.scheduled_at >= now,
            )
            .order_by(Post.scheduled_at.asc())
            .limit(UPCOMING_LIMIT)
            .options(selectinload(Post.tags))
        )
    )

    return {
        "total_posts": sum(status_counts.values()),
        "draft_count": status_counts.get(PostStatus.DRAFT, 0),
        "scheduled_count": status_counts.get(PostStatus.SCHEDULED, 0),
        "published_count": status_counts.get(PostStatus.PUBLISHED, 0),
        "posts_this_week": posts_this_week,
        "upcoming_posts": upcoming_posts,
    }
