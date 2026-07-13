# Importing every model here populates Base.metadata in one place.
# Alembic's env.py imports this package to see the full schema.
from app.models.post import Post, post_tags
from app.models.tag import Tag
from app.models.user import User

__all__ = ["Post", "Tag", "User", "post_tags"]
