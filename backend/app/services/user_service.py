import logging

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.user import UserUpdate
from app.services.auth_service import get_user_by_email
from app.services.exceptions import EmailAlreadyRegistered, IncorrectPassword

logger = logging.getLogger("app.users")


def update_profile(db: Session, user: User, data: UserUpdate) -> User:
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
    if not verify_password(current_password, user.hashed_password):
        raise IncorrectPassword()
    user.hashed_password = hash_password(new_password)
    db.commit()
    logger.info("password changed", extra={"event": "users.password_changed", "user_id": user.id})
