"""Portfolio demo mode (ADR 0014).

Maintains a shared demo account whose data — posts, tags, images — is recreated
from a fixed seed at startup and on an interval. Visitors may change anything;
nothing they change survives the next reset. Because images are generated here
with Pillow, the deployment needs no persistent disk at all.
"""

import logging
import secrets
from datetime import datetime, time, timedelta, timezone
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import Post, Tag, User
from app.models.enums import Platform, PostStatus
from app.services import image_service

logger = logging.getLogger("app.demo")

DEMO_FULL_NAME = "Demo User"

# (title, content, platform, status, days_from_now | None, hour, tags, banner)
_SEED_POSTS: list[tuple] = [
    (
        "Summer launch teaser",
        "Big reveal next week. Keep an eye on this space — the new range lands soon.",
        Platform.X,
        PostStatus.SCHEDULED,
        1,
        10,
        ("launch", "summer"),
        ("Summer Launch", "Something big lands this week", (67, 56, 202), (14, 165, 183)),
    ),
    (
        "Customer story: how Acme Ltd cut packaging waste by 30%",
        "A look at the numbers behind Acme's switch to recycled film, and what other "
        "customers can learn from it.",
        Platform.LINKEDIN,
        PostStatus.SCHEDULED,
        5,
        11,
        ("case-study",),
        None,
    ),
    (
        "Behind the scenes: a day in the print room",
        "Photo tour of the print room, from plate mounting to the finished reel.",
        Platform.INSTAGRAM,
        PostStatus.SCHEDULED,
        7,
        15,
        ("culture", "team"),
        ("Behind the scenes", "A day in the print room", (3, 105, 161), (99, 102, 241)),
    ),
    (
        "Product tips #3: choosing the right film thickness",
        "Thread: the three questions we ask before recommending a film gauge.",
        Platform.X,
        PostStatus.SCHEDULED,
        12,
        9,
        ("tips",),
        None,
    ),
    (
        "We are hiring: junior account manager",
        "Join our commercial team. Full training provided, hybrid working, apply by the "
        "end of the month.",
        Platform.LINKEDIN,
        PostStatus.DRAFT,
        None,
        0,
        ("hiring",),
        None,
    ),
    (
        "Team summer social",
        "Save the date for the summer social. Details to follow nearer the time.",
        Platform.INSTAGRAM,
        PostStatus.DRAFT,
        15,
        18,
        ("culture",),
        None,
    ),
    (
        "Monthly recap: what we shipped",
        "New extrusion line commissioned, two product launches, and a record month for "
        "recycled resin.",
        Platform.FACEBOOK,
        PostStatus.PUBLISHED,
        -2,
        16,
        ("recap",),
        None,
    ),
]


def _banner_png(title: str, subtitle: str, start_rgb: tuple, end_rgb: tuple) -> bytes:
    """A simple gradient banner so the demo has real images without binary assets."""
    width, height = 1200, 630
    gradient = Image.new("RGB", (2, 1))
    gradient.putpixel((0, 0), start_rgb)
    gradient.putpixel((1, 0), end_rgb)
    image = gradient.resize((width, height), Image.Resampling.BILINEAR)

    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.load_default(size=72)
        subtitle_font = ImageFont.load_default(size=32)
    except TypeError:  # very old Pillow fallback; size arg exists on >=10.1
        title_font = subtitle_font = ImageFont.load_default()
    draw.text((80, 240), title, fill=(255, 255, 255), font=title_font)
    draw.text((84, 350), subtitle, fill=(255, 255, 255, 220), font=subtitle_font)

    buffer = BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


def _get_demo_user(db: Session) -> User | None:
    return db.scalar(select(User).where(User.email == settings.DEMO_USER_EMAIL))


def ensure_demo_user(db: Session) -> User:
    """Return the demo account, creating and seeding it on first use."""
    user = _get_demo_user(db)
    if user is None:
        user = User(
            email=settings.DEMO_USER_EMAIL,
            full_name=DEMO_FULL_NAME,
            # Never used: demo sessions get tokens from /auth/demo, not passwords.
            hashed_password=hash_password(secrets.token_hex(16)),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        _seed_posts(db, user)
        logger.info("demo user created and seeded", extra={"event": "demo.created"})
    return user


def reset_demo_data(db: Session) -> dict[str, int]:
    """Restore the demo account to its seeded state: profile, posts, tags, images."""
    user = ensure_demo_user(db)

    user.full_name = DEMO_FULL_NAME
    user.email = settings.DEMO_USER_EMAIL

    old_image_paths = list(
        db.scalars(
            select(Post.image_path).where(Post.user_id == user.id, Post.image_path.is_not(None))
        )
    )
    for path in old_image_paths:
        image_service.delete_image(path)
    db.execute(delete(Post).where(Post.user_id == user.id))  # post_tags cascade in the DB
    db.execute(delete(Tag).where(Tag.user_id == user.id))
    db.commit()

    created = _seed_posts(db, user)
    logger.info(
        "demo data reset",
        extra={"event": "demo.reset", "found": len(old_image_paths), "sent": created},
    )
    return {"posts": created}


def _seed_posts(db: Session, user: User) -> int:
    now = datetime.now(timezone.utc)
    tags_by_name: dict[str, Tag] = {}

    for title, content, platform, status, day_offset, hour, tag_names, banner in _SEED_POSTS:
        scheduled_at = None
        if day_offset is not None:
            scheduled_at = datetime.combine(
                (now + timedelta(days=day_offset)).date(), time(hour=hour), tzinfo=timezone.utc
            )
        post = Post(
            user_id=user.id,
            title=title,
            content=content,
            platform=platform,
            status=status,
            scheduled_at=scheduled_at,
            published_at=scheduled_at if status == PostStatus.PUBLISHED else None,
        )
        for name in tag_names:
            tag = tags_by_name.get(name)
            if tag is None:
                tag = Tag(user_id=user.id, name=name)
                tags_by_name[name] = tag
            post.tags.append(tag)
        if banner is not None:
            post.image_path = image_service.save_image(_banner_png(*banner), "banner.png")
        db.add(post)

    db.commit()
    return len(_SEED_POSTS)
