# ADR 0009 — Image storage and authenticated serving

**Date:** 2026-07-09 · **Status:** Accepted

## Context

Posts can have one image. Requirements: UUID filenames, strict validation (extension
allow-list, size cap, content verification), no orphaned files when images are replaced or
posts deleted, and serving that stays behind authentication. The storage backend should be
swappable later without touching business logic.

## Decision

1. **All file handling lives in `image_service`** — validation, naming, writing, deleting,
   path/MIME resolution. The posts service orchestrates ("replace then delete old",
   "delete post → delete file") but never touches the filesystem itself. Swapping local
   disk for S3-compatible storage means reimplementing one module.
2. **Local disk storage** under `UPLOAD_DIR` (a setting), filenames are `uuid4().hex` plus
   an extension derived from **what Pillow actually decoded**, not the client's filename —
   so the served `Content-Type` is always truthful (a PNG uploaded as `photo.jpg` is
   stored and served as PNG). Validation: extension allow-list → 5 MB cap (the route reads
   at most limit+1 bytes, so oversized bodies aren't buffered) → `Image.verify()` rejects
   renamed, corrupted and truncated files.
3. **Images are a sub-resource of posts**: `PUT/GET/DELETE /posts/{id}/image`. `PUT`
   replaces atomically from the client's perspective (new file stored before the old one
   is unlinked). All three require the owner's token; foreign posts are 404.
4. **The frontend fetches image bytes through the authenticated Axios client** and renders
   an object URL (`AuthImage`), because `<img src>` cannot send an `Authorization` header.
   Blobs are cached by TanStack Query keyed on `image_path`, so replacing an image busts
   the cache naturally; object URLs are revoked on unmount.

## Consequences

- No orphaned files: replacement deletes the predecessor, post deletion deletes the file,
  and a failed upload never removes the existing image.
- Local disk binds image availability to the single backend instance — same accepted
  boundary as ADR 0004. The service seam makes S3 the drop-in upgrade.
- Authenticated blob fetching costs a little frontend code versus public URLs, but keeps
  uploaded content genuinely private.
- No thumbnails/resizing by design; originals are capped at 5 MB, which is acceptable to
  serve as-is at this scale.
