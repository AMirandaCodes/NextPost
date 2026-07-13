import logging
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Post, Tag, User
from app.models.enums import Platform, PostStatus
from app.schemas.post import PostCreate, PostUpdate
from app.services import image_service, tag_service
from app.services.exceptions import PostNotFound, ScheduledDateRequired

logger = logging.getLogger("app.posts")

# Whitelist of sortable columns — sort_by is validated against this mapping's keys
# at the API layer (Literal type), never interpolated from raw input (ADR 0006).
SORTABLE_COLUMNS = {
    "created_at": Post.created_at,
    "updated_at": Post.updated_at,
    "scheduled_at": Post.scheduled_at,
    "title": Post.title,
}


def _escape_like(term: str) -> str:
    """Escape LIKE wildcards so a search for '100%' matches the literal text."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def get_post(db: Session, user: User, post_id: int) -> Post:
    post = db.scalar(
        select(Post)
        .where(Post.id == post_id, Post.user_id == user.id)
        .options(selectinload(Post.tags))
    )
    if post is None:
        raise PostNotFound(post_id)
    return post


def list_posts(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    platform: Platform | None = None,
    status: PostStatus | None = None,
    tag: str | None = None,
    search: str | None = None,
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Post], int]:
    stmt = select(Post).where(Post.user_id == user.id)
    if platform is not None:
        stmt = stmt.where(Post.platform == platform)
    if status is not None:
        stmt = stmt.where(Post.status == status)
    if tag is not None:
        stmt = stmt.where(Post.tags.any(Tag.name == tag.strip().lower()))
    if search is not None:
        pattern = f"%{_escape_like(search)}%"
        stmt = stmt.where(
            or_(
                Post.title.ilike(pattern, escape="\\"),
                Post.content.ilike(pattern, escape="\\"),
            )
        )
    if scheduled_from is not None:
        stmt = stmt.where(Post.scheduled_at >= scheduled_from)
    if scheduled_to is not None:
        stmt = stmt.where(Post.scheduled_at <= scheduled_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))

    column = SORTABLE_COLUMNS[sort_by]
    order = column.asc().nulls_last() if sort_order == "asc" else column.desc().nulls_last()
    stmt = (
        stmt.order_by(order, Post.id.desc())  # id as tiebreaker for stable pages
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(selectinload(Post.tags))
    )
    return list(db.scalars(stmt)), total


def create_post(db: Session, user: User, data: PostCreate) -> Post:
    post = Post(
        user_id=user.id,
        title=data.title,
        content=data.content,
        platform=data.platform,
        status=data.status,
        scheduled_at=data.scheduled_at,
        tags=tag_service.get_or_create_tags(db, user, data.tags),
    )
    if data.status == PostStatus.PUBLISHED:
        post.published_at = datetime.now(timezone.utc)
    db.add(post)
    db.commit()
    db.refresh(post)
    logger.info(
        "post created", extra={"event": "posts.created", "user_id": user.id}
    )
    return post


def update_post(db: Session, user: User, post_id: int, data: PostUpdate) -> Post:
    post = get_post(db, user, post_id)
    provided = data.model_fields_set

    # Validate the post's *resulting* state, mixing new values with existing ones.
    new_status = data.status if "status" in provided else post.status
    new_scheduled_at = data.scheduled_at if "scheduled_at" in provided else post.scheduled_at
    if new_status == PostStatus.SCHEDULED and new_scheduled_at is None:
        raise ScheduledDateRequired()

    if "title" in provided:
        post.title = data.title
    if "content" in provided:
        post.content = data.content
    if "platform" in provided:
        post.platform = data.platform
    if "scheduled_at" in provided:
        post.scheduled_at = data.scheduled_at
    if "tags" in provided:
        post.tags = tag_service.get_or_create_tags(db, user, data.tags)

    # published_at records the manual publish action; it is cleared if the post
    # is moved back out of the published state.
    if new_status == PostStatus.PUBLISHED and post.status != PostStatus.PUBLISHED:
        post.published_at = datetime.now(timezone.utc)
    elif new_status != PostStatus.PUBLISHED:
        post.published_at = None
    post.status = new_status

    db.commit()
    db.refresh(post)
    logger.info(
        "post updated", extra={"event": "posts.updated", "user_id": user.id}
    )
    return post


def delete_post(db: Session, user: User, post_id: int) -> None:
    post = get_post(db, user, post_id)
    image_service.delete_image(post.image_path)  # a deleted post leaves no orphaned file
    db.delete(post)  # hard delete; post_tags rows cascade
    db.commit()
    logger.info(
        "post deleted", extra={"event": "posts.deleted", "user_id": user.id}
    )


def set_post_image(
    db: Session, user: User, post_id: int, data: bytes, original_filename: str
) -> Post:
    """Attach an image to a post, replacing (and removing) any previous one."""
    post = get_post(db, user, post_id)
    new_filename = image_service.save_image(data, original_filename)
    image_service.delete_image(post.image_path)  # after the new file is safely stored
    post.image_path = new_filename
    db.commit()
    db.refresh(post)
    logger.info("post image set", extra={"event": "posts.image_set", "user_id": user.id})
    return post


def remove_post_image(db: Session, user: User, post_id: int) -> None:
    post = get_post(db, user, post_id)
    image_service.delete_image(post.image_path)
    post.image_path = None
    db.commit()
    logger.info("post image removed", extra={"event": "posts.image_removed", "user_id": user.id})
