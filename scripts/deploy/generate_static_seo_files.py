"""
Generate static robots.txt and sitemap.xml for Cloudflare deployment.

Keeping these crawl-critical files in public/ lets Cloudflare serve them as
assets instead of spending Worker CPU on App Router metadata routes.
"""

from __future__ import annotations

import html
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from utils.supabase_client import get_supabase_client  # noqa: E402

BASE_URL = "https://gongmozip.com"
PUBLIC_DIR = ROOT_DIR / "public"
AGGREGATOR_HOST_KEYWORDS = (
    "campuspick.com",
    "wevity.com",
    "all-con.co.kr",
    "allcon.co.kr",
    "contestkorea.com",
    "linkareer.com",
    "thinkcontest.com",
    "detizen.com",
)
PLACEHOLDER_IMAGE_MARKERS = (
    "noimg",
    "noimgs",
    "no-image",
    "no_image",
    "placeholder",
    "default-image",
    "main_img",
)


def today_key() -> str:
    return datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()


def slugify(value: str | None) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^0-9a-z가-힣]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "contest"


def has_public_thumbnail(row: dict) -> bool:
    url = str(row.get("poster_image_url") or "").strip().lower()
    return url.startswith("http") and not any(marker in url for marker in PLACEHOLDER_IMAGE_MARKERS)


def is_aggregator_url(value: str | None) -> bool:
    url = (value or "").strip().lower()
    return any(keyword in url for keyword in AGGREGATOR_HOST_KEYWORDS)


def get_official_url(row: dict) -> str:
    for key in ("official_url", "official_source_url"):
        value = str(row.get(key) or "").strip()
        if value.startswith(("http://", "https://")) and not is_aggregator_url(value):
            return value
    return ""


def public_contest_rows(rows: list[dict]) -> list[dict]:
    today = today_key()
    selected: dict[tuple[str, str, str], dict] = {}
    order: list[tuple[str, str, str]] = []

    for row in rows:
        if int(row.get("verified_level") or 0) < 1:
            continue
        if row.get("status") not in ("ongoing", "upcoming"):
            continue
        if str(row.get("apply_end_at") or "") <= today:
            continue
        if not has_public_thumbnail(row):
            continue
        if not get_official_url(row):
            continue
        if not (row.get("crawled_at") or row.get("updated_at")):
            continue

        key = (
            slugify(row.get("title")),
            slugify(row.get("organizer")),
            str(row.get("apply_end_at") or "")[:10],
        )
        current = selected.get(key)
        if current is None:
            selected[key] = row
            order.append(key)
            continue

        current_score = int(current.get("review_score") or -1)
        next_score = int(row.get("review_score") or -1)
        if next_score > current_score:
            selected[key] = row

    return [selected[key] for key in order]


def guide_slugs() -> list[str]:
    guides_path = ROOT_DIR / "src" / "data" / "guides.ts"
    text = guides_path.read_text(encoding="utf-8")
    return re.findall(r'slug:\s*"([^"]+)"', text)


def contest_slug(row: dict) -> str:
    slug = str(row.get("slug") or "").strip()
    if slug:
        return slug
    return slugify(row.get("title"))


def sitemap_url(loc: str, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>"
        f"<loc>{html.escape(loc)}</loc>"
        f"<lastmod>{html.escape(lastmod)}</lastmod>"
        f"<changefreq>{changefreq}</changefreq>"
        f"<priority>{priority}</priority>"
        "</url>"
    )


def write_robots() -> None:
    body = "\n".join(
        [
            "User-agent: Googlebot",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /admin/*",
            "Disallow: /adsense-readiness",
            "",
            "User-agent: AdsBot-Google",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /admin/*",
            "Disallow: /adsense-readiness",
            "",
            "User-agent: Mediapartners-Google",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /admin/*",
            "Disallow: /adsense-readiness",
            "",
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /admin/*",
            "Disallow: /adsense-readiness",
            "",
            f"Sitemap: {BASE_URL}/sitemap.xml",
            "",
        ]
    )
    (PUBLIC_DIR / "robots.txt").write_text(body, encoding="utf-8", newline="\n")


def write_sitemap() -> None:
    client = get_supabase_client()
    rows = (
        client.table("contests")
        .select(
            "id,slug,title,organizer,apply_end_at,status,verified_level,poster_image_url,"
            "official_url,official_source_url,crawled_at,updated_at,review_score"
        )
        .limit(5000)
        .execute()
        .data
        or []
    )

    now = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
    urls = [
        sitemap_url(f"{BASE_URL}/", now, "daily", "1.0"),
        sitemap_url(f"{BASE_URL}/guides", now, "weekly", "0.75"),
        sitemap_url(f"{BASE_URL}/about", now, "monthly", "0.5"),
        sitemap_url(f"{BASE_URL}/privacy", now, "monthly", "0.4"),
        sitemap_url(f"{BASE_URL}/terms", now, "monthly", "0.4"),
        sitemap_url(f"{BASE_URL}/contact", now, "monthly", "0.4"),
    ]

    for slug in guide_slugs():
        urls.append(sitemap_url(f"{BASE_URL}/guide/{slug}", now, "monthly", "0.65"))

    for row in public_contest_rows(rows):
        updated = str(row.get("updated_at") or now)[:10]
        urls.append(
            sitemap_url(
                f"{BASE_URL}/contests/{quote(contest_slug(row), safe='')}",
                updated,
                "weekly",
                "0.6",
            )
        )

    body = "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            *urls,
            "</urlset>",
            "",
        ]
    )
    (PUBLIC_DIR / "sitemap.xml").write_text(body, encoding="utf-8", newline="\n")
    print(f"wrote public/sitemap.xml with {len(urls)} urls")


def main() -> None:
    write_robots()
    write_sitemap()


if __name__ == "__main__":
    main()
