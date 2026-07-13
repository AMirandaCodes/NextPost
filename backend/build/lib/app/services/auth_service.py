import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.auth import UserRegister
from app.services.exceptions import EmailAlreadyRegistered, InvalidCredentials

logger = logging.getLogger("app.auth")

# Verified against when the email is unknown, so login takes the same time whether
# or not the account exists (prevents user enumeration by response timing).
_DUMMY_HASH = hash_password("timing-equalisation-dummy")


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def register_user(db: Session, data: UserRegister) -> User:
    email = data.email.lower()
    if get_user_by_email(db, email) is not None:
        raise EmailAlreadyRegistered(email)
    user = User(email=email, full_name=data.full_name, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("user registered", extra={"event": "auth.register", "user_id": user.id})
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        logger.warning("login failed: unknown email", extra={"event": "auth.login_failed"})
        raise InvalidCredentials()
    if not verify_password(password, user.hashed_password):
        logger.warning(
            "login failed: wrong password",
            extra={"event": "auth.login_failed", "user_id": user.id},
        )
        raise InvalidCredentials()
    logger.info("login succeeded", extra={"event": "auth.login", "user_id": user.id})
    return user
