from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tag, User


def list_tags(db: Session, user: User) -> list[Tag]:
    return list(db.scalars(select(Tag).where(Tag.user_id == user.id).order_by(Tag.name)))


def get_or_create_tags(db: Session, user: User, names: list[str]) -> list[Tag]:
    """Resolve normalised tag names to Tag rows, creating any that don't exist yet.
    Names are already normalised (lowercase, stripped, unique) by schema validation."""
    if not names:
        return []
    existing = db.scalars(
        select(Tag).where(Tag.user_id == user.id, Tag.name.in_(names))
    ).all()
    by_name = {tag.name: tag for tag in existing}
    tags = []
    for name in names:
        tag = by_name.get(name)
        if tag is None:
            tag = Tag(user_id=user.id, name=name)
            db.add(tag)
        tags.append(tag)
    return tags
