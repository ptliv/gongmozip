from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath
from urllib.parse import urlparse


PUBLIC_POSTER_HOSTS = frozenset({"images.gongmozip.com"})

_EXT_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

_CONTENT_TYPE_BY_EXT = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}


@dataclass(frozen=True)
class PosterMigrationPlan:
    contest_id: str
    source_url: str
    object_key: str
    public_url: str


def is_external_poster_url(
    url: str | None,
    *,
    public_hosts: frozenset[str] = PUBLIC_POSTER_HOSTS,
) -> bool:
    if not url:
        return False

    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False

    return parsed.hostname not in public_hosts


def extension_from_content_type(content_type: str | None, fallback_url: str) -> str:
    normalized = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized in _EXT_BY_CONTENT_TYPE:
        return _EXT_BY_CONTENT_TYPE[normalized]

    suffix = PurePosixPath(urlparse(fallback_url).path).suffix.lower().lstrip(".")
    if suffix == "jpeg":
        return "jpg"
    if suffix in _CONTENT_TYPE_BY_EXT:
        return suffix

    return "jpg"


def content_type_for_extension(extension: str) -> str:
    return _CONTENT_TYPE_BY_EXT.get(extension.lower().lstrip("."), "image/jpeg")


def build_poster_key(contest_id: str, extension: str) -> str:
    clean_id = contest_id.strip()
    clean_extension = extension.lower().lstrip(".").strip() or "jpg"
    return f"posters/{clean_id}.{clean_extension}"


def build_public_url(base_url: str, object_key: str) -> str:
    return f"{base_url.rstrip('/')}/{object_key.lstrip('/')}"


def build_plan(
    *,
    contest_id: str,
    source_url: str,
    content_type: str | None,
    public_base_url: str,
) -> PosterMigrationPlan:
    extension = extension_from_content_type(content_type, source_url)
    object_key = build_poster_key(contest_id, extension)
    return PosterMigrationPlan(
        contest_id=contest_id,
        source_url=source_url,
        object_key=object_key,
        public_url=build_public_url(public_base_url, object_key),
    )
