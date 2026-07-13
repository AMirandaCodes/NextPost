from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin
from app.models.post import post_tags

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class Tag(TimestampMixin, Base):
    __tablename__ = "tags"
    __table_args__ = (
        # Tags are private to each user; the same name may exist for different users.
        UniqueConstraint("user_id", "name", name="uq_tags_user_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(50))

    user: Mapped["User"] = relationship(back_populates="tags")
    posts: Mapped[list["Post"]] = relationship(secondary=post_tags, back_populates="tags")

    def __repr__(self) -> str:
        return f"<Tag id={self.id} name={self.name!r}>"
