from enum import StrEnum


class Platform(StrEnum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    X = "x"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    OTHER = "other"


class PostStatus(StrEnum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
