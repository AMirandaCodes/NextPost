from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.core.security import create_access_token
from app.schemas.auth import Token, UserLogin, UserRegister
from app.schemas.user import UserRead
from app.services import auth_service
from app.services.exceptions import EmailAlreadyRegistered, InvalidCredentials

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: DbSession) -> UserRead:
    try:
        return auth_service.register_user(db, payload)
    except EmailAlreadyRegistered:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email is already registered")


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: DbSession) -> Token:
    try:
        user = auth_service.authenticate_user(db, payload.email, payload.password)
    except InvalidCredentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user.id))
