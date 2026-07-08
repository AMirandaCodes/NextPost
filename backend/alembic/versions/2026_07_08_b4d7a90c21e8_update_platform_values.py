"""update platform values: twitter becomes x, add other

Hand-written migration: Alembic autogenerate does not detect CHECK constraint
changes. This is the constraint-swap pattern that storing enums as VARCHAR
(ADR 0005) was chosen to enable.

Revision ID: b4d7a90c21e8
Revises: ef31e44db3b6
Create Date: 2026-07-08 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b4d7a90c21e8'
down_revision: Union[str, None] = 'ef31e44db3b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # op.f() marks names as final so the metadata naming convention isn't re-applied.
    op.drop_constraint(op.f("ck_posts_platform"), "posts", type_="check")
    op.execute("UPDATE posts SET platform = 'x' WHERE platform = 'twitter'")
    op.create_check_constraint(
        op.f("ck_posts_platform"),
        "posts",
        "platform IN ('facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'other')",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_posts_platform"), "posts", type_="check")
    op.execute("UPDATE posts SET platform = 'twitter' WHERE platform = 'x'")
    # 'other' has no pre-upgrade equivalent; downgrading discards those rows.
    op.execute("DELETE FROM posts WHERE platform = 'other'")
    op.create_check_constraint(
        op.f("ck_posts_platform"),
        "posts",
        "platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok')",
    )
