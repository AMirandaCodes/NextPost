"""All post-image file handling: validation, storage, deletion, lookup.

Nothing outside this module touches the filesystem for images, so swapping
local disk for object storage later means reimplementing only this file.
"""

import logging
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image, UnidentifiedImageError

from app.core.config import settings

logger = logging.getLogger("app.images")

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# The stored extension comes from what Pillow actually decoded, not from the
# (attacker-controlled) original filename — so the served MIME type is truthful.
_FORMAT_TO_EXTENSION = {"JPEG": ".jpg", "PNG": ".png", "GIF": ".gif", "WEBP": ".webp"}
_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


class InvalidImage(Exception):
    """The uploaded file is not an acceptable image; str(exc) is user-safe."""


def _upload_dir() -> Path:
    directory = Path(settings.UPLOAD_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def save_image(data: bytes, original_filename: str) -> str:
    """Validate and store an uploaded image; return the generated filename."""
    extension = Path(original_filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise InvalidImage("Only JPEG, PNG, GIF or WebP images are allowed")
    if len(data) == 0:
        raise InvalidImage("The uploaded file is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise InvalidImage(f"Images must be {MAX_IMAGE_BYTES // (1024 * 1024)} MB or smaller")

    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()  # rejects renamed/corrupted/truncated files
            detected_format = image.format
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImage("The file is not a valid image") from exc

    stored_extension = _FORMAT_TO_EXTENSION.get(detected_format or "")
    if stored_extension is None:
        raise InvalidImage("Only JPEG, PNG, GIF or WebP images are allowed")

    filename = f"{uuid4().hex}{stored_extension}"
    (_upload_dir() / filename).write_bytes(data)
    logger.info("image saved", extra={"event": "images.saved"})
    return filename


def delete_image(filename: str | None) -> None:
    """Remove a stored image; tolerates None and already-missing files."""
    if not filename:
        return
    # Stored names are always bare UUID filenames; .name guards path traversal anyway.
    (_upload_dir() / Path(filename).name).unlink(missing_ok=True)
    logger.info("image deleted", extra={"event": "images.deleted"})


def image_path(filename: str) -> Path:
    return _upload_dir() / Path(filename).name


def media_type(filename: str) -> str:
    return _MEDIA_TYPES.get(Path(filename).suffix.lower(), "application/octet-stream")
