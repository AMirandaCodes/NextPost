from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin
from app.models.enums import Platform, PostStatus

if TYPE_CHECKING:
    from app.models.tag import Tag
    from app.models.user import User

# Association table for the posts <-> tags many-to-many relationship.
post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Post(TimestampMixin, Base):
    __tablename__ = "posts"
    __table_args__ = (
        # A post can only be marked as scheduled if it actually has a date.
        CheckConstraint(
            "status != 'scheduled' OR scheduled_at IS NOT NULL",
            name="scheduled_requires_date",
        ),
        # Calendar view: posts for one user within a date range.
        Index("ix_posts_user_scheduled", "user_id", "scheduled_at"),
        # Dashboard and list-view filters.
        Index("ix_posts_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    # Stored as VARCHAR + CHECK constraint rather than a native PG enum, so adding
    # a value later is a constraint swap instead of ALTER TYPE. values_callable
    # makes SQLAlchemy bind the enum *value* ("draft"), not the member name ("DRAFT").
    platform: Mapped[Platform] = mapped_column(
        SAEnum(
            Platform,
            native_enum=False,
            create_constraint=True,
            length=20,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    status: Mapped[PostStatus] = mapped_column(
        SAEnum(
            PostStatus,
            native_enum=False,
            create_constraint=True,
            length=20,
            values_callable=lambda e: [m.value for m in e],
        ),
        default=PostStatus.DRAFT,
        server_default=PostStatus.DRAFT.value,
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    image_path: Mapped[str | None] = mapped_column(String(255))
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="posts")
    tags: Mapped[list["Tag"]] = relationship(secondary=post_tags, back_populates="posts")

    def __repr__(self) -> str:
        return f"<Post id={self.id} title={self.title!r} status={self.status}>"
