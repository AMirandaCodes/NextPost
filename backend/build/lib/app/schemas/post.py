from datetime import datetime

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.models.enums import Platform, PostStatus
from app.schemas.tag import TagRead


def _normalise_tags(tags: list[str]) -> list[str]:
    """Strip, lowercase and de-duplicate tag names, preserving order."""
    cleaned: list[str] = []
    for name in tags:
        name = name.strip().lower()
        if not name:
            raise ValueError("tag names cannot be blank")
        if len(name) > 50:
            raise ValueError("tag names must be 50 characters or fewer")
        if name not in cleaned:
            cleaned.append(name)
    return cleaned


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=5000)
    platform: Platform
    status: PostStatus = PostStatus.DRAFT
    scheduled_at: AwareDatetime | None = None  # AwareDatetime: naive timestamps are rejected
    tags: list[str] = Field(default_factory=list, max_length=10)

    _normalise = field_validator("tags")(_normalise_tags)

    @model_validator(mode="after")
    def scheduled_requires_date(self) -> "PostCreate":
        if self.status == PostStatus.SCHEDULED and self.scheduled_at is None:
            raise ValueError("scheduled_at is required when status is 'scheduled'")
        return self


class PostUpdate(BaseModel):
    """Partial update: only fields present in the request body are applied.
    scheduled_at may be explicitly null (unschedule); the other fields may not."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=5000)
    platform: Platform | None = None
    status: PostStatus | None = None
    scheduled_at: AwareDatetime | None = None
    tags: list[str] | None = Field(default=None, max_length=10)

    @field_validator("tags")
    @classmethod
    def normalise_tags(cls, tags: list[str] | None) -> list[str] | None:
        return None if tags is None else _normalise_tags(tags)

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> "PostUpdate":
        for field in ("title", "content", "platform", "status", "tags"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    platform: Platform
    status: PostStatus
    scheduled_at: datetime | None
    published_at: datetime | None
    image_path: str | None
    tags: list[TagRead]
    created_at: datetime
    updated_at: datetime
