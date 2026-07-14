from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.core.config import settings
from app.core.security import create_access_token
from app.schemas.auth import Token, UserLogin, UserRegister
from app.schemas.user import UserRead
from app.services import auth_service, demo_service
from app.services.exceptions import EmailAlreadyRegistered, InvalidCredentials

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: DbSession) -> UserRead:
    try:
        return auth_service.register_user(db, payload)
    except EmailAlreadyRegistered:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email is already registered")


@router.post("/demo", response_model=Token)
def demo_login(db: DbSession) -> Token:
    """Portfolio demo mode (ADR 0014): hand out a session for the shared demo
    account. Hidden (404) unless the deployment explicitly enables it."""
    if not settings.DEMO_MODE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Not Found")
    user = demo_service.ensure_demo_user(db)
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: DbSession) -> Token:
    try:
        user = auth_service.authenticate_user(db, payload.email, payload.password)
    except InvalidCredentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user.id))
