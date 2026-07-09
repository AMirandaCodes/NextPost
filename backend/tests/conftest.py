import os

# Must be set before app.core.config is imported: the API-test client enters the
# app lifespan, and tests must never start the real background scheduler.
os.environ.setdefault("SCHEDULER_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.main import app
from app.models import Post, Tag, User
from app.models.enums import Platform, PostStatus

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://nextpost:nextpost@db:5432/nextpost_test"
)


def _ensure_test_database() -> None:
    """Create the test database if it does not exist yet."""
    admin_url, _, db_name = TEST_DATABASE_URL.rpartition("/")
    admin_engine = create_engine(f"{admin_url}/postgres", isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": db_name}
        )
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine():
    _ensure_test_database()
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    """Isolate image storage per test so uploads never leak between tests."""
    directory = tmp_path / "uploads"
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(directory))
    return directory


@pytest.fixture
def db_session(engine):
    """Session wrapped in an outer transaction that is always rolled back, so each
    test sees a clean database even though services call commit()."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user(db_session) -> User:
    user = User(
        email="alice@example.com",
        full_name="Alice Example",
        hashed_password=hash_password("password123"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
def other_user(db_session) -> User:
    user = User(
        email="bob@example.com",
        full_name="Bob Other",
        hashed_password=hash_password("password123"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def post_factory(db_session):
    """Create posts directly in the DB, bypassing the API, for arranging test data."""

    def _create(
        owner: User,
        *,
        title: str = "A post title",
        content: str = "Some post content.",
        platform: Platform = Platform.LINKEDIN,
        status: PostStatus = PostStatus.DRAFT,
        scheduled_at=None,
        published_at=None,
        tags: tuple[str, ...] = (),
    ) -> Post:
        resolved_tags = []
        for name in tags:
            tag = db_session.scalar(
                select(Tag).where(Tag.user_id == owner.id, Tag.name == name)
            )
            resolved_tags.append(tag or Tag(user_id=owner.id, name=name))
        post = Post(
            user_id=owner.id,
            title=title,
            content=content,
            platform=platform,
            status=status,
            scheduled_at=scheduled_at,
            published_at=published_at,
            tags=resolved_tags,
        )
        db_session.add(post)
        db_session.commit()
        db_session.refresh(post)
        return post

    return _create
