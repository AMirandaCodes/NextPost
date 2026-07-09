from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, Response, UploadFile
from fastapi import status as http_status
from fastapi.responses import FileResponse
from pydantic import AwareDatetime

from app.api.deps import CurrentUser, DbSession
from app.models.enums import Platform, PostStatus
from app.schemas.common import Page
from app.schemas.post import PostCreate, PostRead, PostUpdate
from app.services import image_service, post_service
from app.services.exceptions import PostNotFound, ScheduledDateRequired
from app.services.image_service import InvalidImage

router = APIRouter()

SortBy = Literal["created_at", "updated_at", "scheduled_at", "title"]
SortOrder = Literal["asc", "desc"]


@router.post("", response_model=PostRead, status_code=http_status.HTTP_201_CREATED)
def create_post(payload: PostCreate, current_user: CurrentUser, db: DbSession) -> PostRead:
    return post_service.create_post(db, current_user, payload)


@router.get("", response_model=Page[PostRead])
def list_posts(
    current_user: CurrentUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    platform: Platform | None = None,
    status: PostStatus | None = None,
    tag: Annotated[str | None, Query(max_length=50)] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    scheduled_from: AwareDatetime | None = None,
    scheduled_to: AwareDatetime | None = None,
    sort_by: SortBy = "created_at",
    sort_order: SortOrder = "desc",
) -> Page[PostRead]:
    items, total = post_service.list_posts(
        db,
        current_user,
        page=page,
        page_size=page_size,
        platform=platform,
        status=status,
        tag=tag,
        search=search,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return Page(items=items, page=page, page_size=page_size, total=total)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: int, current_user: CurrentUser, db: DbSession) -> PostRead:
    try:
        return post_service.get_post(db, current_user, post_id)
    except PostNotFound:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post not found")


@router.patch("/{post_id}", response_model=PostRead)
def update_post(
    post_id: int, payload: PostUpdate, current_user: CurrentUser, db: DbSession
) -> PostRead:
    try:
        return post_service.update_post(db, current_user, post_id, payload)
    except PostNotFound:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post not found")
    except ScheduledDateRequired:
        raise HTTPException(
            http_status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="scheduled_at is required when status is 'scheduled'",
        )


@router.delete("/{post_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, current_user: CurrentUser, db: DbSession) -> Response:
    try:
        post_service.delete_post(db, current_user, post_id)
    except PostNotFound:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post not found")
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)


@router.put("/{post_id}/image", response_model=PostRead)
async def upload_post_image(
    post_id: int, file: UploadFile, current_user: CurrentUser, db: DbSession
) -> PostRead:
    """Attach or replace the post's image. The previous image file is deleted."""
    # Read one byte past the limit so oversized uploads are rejected without
    # buffering arbitrarily large bodies.
    data = await file.read(image_service.MAX_IMAGE_BYTES + 1)
    try:
        return post_service.set_post_image(db, current_user, post_id, data, file.filename or "")
    except PostNotFound:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post not found")
    except InvalidImage as exc:
        raise HTTPException(http_status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.get("/{post_id}/image")
def get_post_image(post_id: int, current_user: CurrentUser, db: DbSession) -> FileResponse:
    try:
        post = post_service.get_post(db, current_user, post_id)
    except PostNotFound:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.image_path is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post has no image")
    path = image_service.image_path(post.image_path)
    if not path.is_file():
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Image file is missing")
    return FileResponse(path, media_type=image_service.media_type(post.image_path))


@router.delete("/{post_id}/image", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_post_image(post_id: int, current_user: CurrentUser, db: DbSession) -> Response:
    try:
        post_service.remove_post_image(db, current_user, post_id)
    except PostNotFound:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Post not found")
    return Response(status_code=http_status.HTTP_204_NO_CONTENT)
