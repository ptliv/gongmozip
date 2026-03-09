"""
slugify_contest.py - SEO-friendly slug helpers for contest pages.
"""

import re
import unicodedata
from typing import Optional


def slugify_title(title: str) -> str:
    """
    Build slug from title.

    Rules:
      - keep Korean/English/number
      - replace spaces/special chars with hyphen
      - collapse repeated hyphens
      - lowercase English
    """
    if title is None:
        return "contest"

    text = unicodedata.normalize("NFKC", str(title)).strip().lower()
    text = re.sub(r"[^0-9a-z가-힣]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "contest"


def build_contest_slug(
    title: str,
    source_site: Optional[str] = None,
    external_id: Optional[str] = None,
    with_suffix: bool = False,
) -> str:
    """
    Build final slug for DB save / page URL.

    Example:
      build_contest_slug("2026 대한민국 AI 콘텐츠 페스티벌")
      -> "2026-대한민국-ai-콘텐츠-페스티벌"

      build_contest_slug(..., "wevity", "105407", with_suffix=True)
      -> "2026-대한민국-ai-콘텐츠-페스티벌-wevity-105407"
    """
    base = slugify_title(title)
    if not with_suffix:
        return base

    site = slugify_title(source_site or "")
    ext = slugify_title(str(external_id or ""))
    suffix_parts = [p for p in [site, ext] if p]
    if not suffix_parts:
        return base
    return f"{base}-{'-'.join(suffix_parts)}"
