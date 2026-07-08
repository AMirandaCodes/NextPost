from pydantic import BaseModel

from app.schemas.post import PostRead


class DashboardStats(BaseModel):
    total_posts: int
    draft_count: int
    scheduled_count: int
    published_count: int
    posts_this_week: int  # posts with scheduled_at in the current week (Mon–Sun, UTC)
    upcoming_posts: list[PostRead]  # next 5 scheduled posts from now
