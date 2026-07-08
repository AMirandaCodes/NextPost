from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import DashboardStats
from app.services import dashboard_service

router = APIRouter()


@router.get("", response_model=DashboardStats)
def get_dashboard(current_user: CurrentUser, db: DbSession) -> DashboardStats:
    """Summary counts and the next few scheduled posts. Intentionally not an
    analytics endpoint; 'this week' is Monday–Sunday in UTC."""
    return DashboardStats(**dashboard_service.get_stats(db, current_user))
