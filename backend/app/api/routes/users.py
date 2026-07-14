from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import PasswordChange, UserRead, UserUpdate
from app.services import user_service
from app.services.exceptions import DemoProfileLocked, EmailAlreadyRegistered, IncorrectPassword

_DEMO_LOCKED_MESSAGE = "The shared demo profile can't be modified."

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_profile(current_user: CurrentUser) -> UserRead:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_profile(payload: UserUpdate, current_user: CurrentUser, db: DbSession) -> UserRead:
    try:
        return user_service.update_profile(db, current_user, payload)
    except DemoProfileLocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=_DEMO_LOCKED_MESSAGE)
    except EmailAlreadyRegistered:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email is already registered")


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: PasswordChange, current_user: CurrentUser, db: DbSession) -> Response:
    try:
        user_service.change_password(db, current_user, payload.current_password, payload.new_password)
    except DemoProfileLocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=_DEMO_LOCKED_MESSAGE)
    except IncorrectPassword:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
