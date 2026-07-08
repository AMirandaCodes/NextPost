from typing import Generic, TypeVar

from pydantic import BaseModel

ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    """Envelope returned by every paginated endpoint (see ADR 0006)."""

    items: list[ItemT]
    page: int
    page_size: int
    total: int
