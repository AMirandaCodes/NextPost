import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.user import UserUpdate
from app.services.auth_service import get_user_by_email
from app.services.exceptions import DemoProfileLocked, EmailAlreadyRegistered, IncorrectPassword

logger = logging.getLogger("app.users")


def _guard_demo_profile(user: User) -> None:
    # Posts/tags/images are free to change in demo mode (a reset restores them),
    # but the demo account's identity is infrastructure — changing its email or
    # password would break the auto-login every visitor depends on.
    if settings.DEMO_MODE and user.email == settings.DEMO_USER_EMAIL:
        raise DemoProfileLocked()


def update_profile(db: Session, user: User, data: UserUpdate) -> User:
    _guard_demo_profile(user)
    if data.email is not None:
        email = data.email.lower()
        if email != user.email and get_user_by_email(db, email) is not None:
            raise EmailAlreadyRegistered(email)
        user.email = email
    if data.full_name is not None:
        user.full_name = data.full_name
    db.commit()
    db.refresh(user)
    logger.info("profile updated", extra={"event": "users.profile_updated", "user_id": user.id})
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    _guard_demo_profile(user)
    if not verify_password(current_password, user.hashed_password):
        raise IncorrectPassword()
    user.hashed_password = hash_password(new_password)
    db.commit()
    logger.info("password changed", extra={"event": "users.password_changed", "user_id": user.id})
