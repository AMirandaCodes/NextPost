from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.tag import TagRead
from app.services import tag_service

router = APIRouter()


@router.get("", response_model=list[TagRead])
def list_tags(current_user: CurrentUser, db: DbSession) -> list[TagRead]:
    """The user's tag vocabulary, sorted by name. Tags are created implicitly
    when saving posts and kept after their last post is deleted."""
    return tag_service.list_tags(db, current_user)
