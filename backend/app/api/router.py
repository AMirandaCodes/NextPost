from fastapi import APIRouter

from app.api.routes import auth, dashboard, posts, tags, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
