"""
check_seo_surface.py

SEO surface checker for production deployment.

Checks:
  1) robots.txt reachable
  2) robots.txt includes sitemap
  3) robots.txt disallow /admin
  4) sitemap.xml reachable
  5) sitemap includes /deadline
  6) sitemap excludes /deadline-soon
  7) /contests canonical points to production domain
  8) /contests/<slug> canonical points to production domain + same slug path

Output:
  - stdout summary
  - debug log + json in scripts/debug/
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
SCRIPTS_ROOT = CURRENT_DIR.parent
PROJECT_ROOT = SCRIPTS_ROOT.parent
DEBUG_DIR = SCRIPTS_ROOT / "debug"

if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from utils import logger  # noqa: E402


DEFAULT_TIMEOUT = 15
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (compatible; GongmozipSeoChecker/1.0; +https://gongmozip.com)"
)


def load_env() -> None:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")


def normalize_base_url(base_url: str) -> str:
    value = (base_url or "").strip()
    if not value:
        raise ValueError("base_url is required")
    if not re.match(r"^https?://", value, flags=re.IGNORECASE):
        value = f"https://{value}"
    return value.rstrip("/")


def slugify_text(value: str) -> str:
    if not value:
        return ""
    normalized = value.strip().lower()
    normalized = re.sub(r"[^0-9a-z\uac00-\ud7a3]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    if normalized == "contest":
        return ""
    return normalized


def build_url(base_url: str, path: str) -> str:
    return urljoin(f"{base_url}/", path.lstrip("/"))


def fetch_url(
    session: requests.Session,
    url: str,
    timeout: int,
) -> tuple[requests.Response | None, str | None]:
    try:
        response = session.get(url, timeout=timeout, allow_redirects=True)
        return response, None
    except requests.RequestException as exc:
        return None, str(exc)


def parse_sitemap_locations(xml_text: str) -> list[str]:
    locations: list[str] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return locations

    ns = {}
    if root.tag.startswith("{"):
        ns_uri = root.tag.split("}", 1)[0].strip("{")
        ns = {"sm": ns_uri}
        loc_tags = root.findall(".//sm:loc", ns)
    else:
        loc_tags = root.findall(".//loc")

    for tag in loc_tags:
        text = (tag.text or "").strip()
        if text:
            locations.append(text)
    return locations


def fetch_sitemap_paths(
    session: requests.Session,
    base_url: str,
    timeout: int,
) -> tuple[list[str], bool, str | None]:
    sitemap_url = build_url(base_url, "/sitemap.xml")
    response, err = fetch_url(session, sitemap_url, timeout)
    if err or response is None:
        return [], False, err or "sitemap request failed"
    if response.status_code != 200:
        return [], False, f"sitemap status={response.status_code}"

    paths: list[str] = []
    seen: set[str] = set()
    root_locations = parse_sitemap_locations(response.text)
    for loc in root_locations:
        parsed = urlparse(loc)
        if parsed.path.endswith(".xml"):
            sub_resp, sub_err = fetch_url(session, loc, timeout)
            if sub_err or sub_resp is None or sub_resp.status_code != 200:
                continue
            for sub_loc in parse_sitemap_locations(sub_resp.text):
                path = urlparse(sub_loc).path or "/"
                if path not in seen:
                    seen.add(path)
                    paths.append(path)
            continue

        path = parsed.path or "/"
        if path not in seen:
            seen.add(path)
            paths.append(path)

    return paths, True, None


def parse_canonical_href(html: str) -> str | None:
    soup = BeautifulSoup(html or "", "lxml")
    for tag in soup.find_all("link"):
        rel = tag.get("rel")
        if not rel:
            continue
        rel_values = [str(v).strip().lower() for v in (rel if isinstance(rel, list) else [rel])]
        if "canonical" in rel_values:
            href = (tag.get("href") or "").strip()
            return href or None
    return None


def extract_prefixed_paths_from_html(html: str, prefix: str) -> list[str]:
    soup = BeautifulSoup(html or "", "lxml")
    out: list[str] = []
    for a_tag in soup.find_all("a", href=True):
        href = (a_tag.get("href") or "").strip()
        if not href:
            continue
        if href.startswith(prefix) and href not in out:
            out.append(href)
            continue
        parsed = urlparse(href)
        if parsed.path.startswith(prefix) and parsed.path not in out:
            out.append(parsed.path)
    return out


def get_detail_path_from_db(timeout: int) -> str | None:
    url = (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    anon_key = (os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "").strip()
    if not url or not anon_key:
        return None

    endpoint = f"{url.rstrip('/')}/rest/v1/contests"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }
    params = {
        "select": "slug,status,updated_at",
        "status": "in.(ongoing,upcoming)",
        "order": "updated_at.desc",
        "limit": "100",
    }

    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=timeout)
    except requests.RequestException:
        return None
    if response.status_code != 200:
        return None

    try:
        rows: Any = response.json()
    except ValueError:
        return None
    if not isinstance(rows, list):
        return None

    for row in rows:
        if not isinstance(row, dict):
            continue
        slug = slugify_text(str(row.get("slug") or ""))
        if slug:
            return f"/contests/{slug}"
    return None


def pick_first_working_path(
    session: requests.Session,
    base_url: str,
    candidates: list[str],
    timeout: int,
) -> str | None:
    for path in candidates:
        url = build_url(base_url, path)
        response, err = fetch_url(session, url, timeout)
        if err or response is None:
            continue
        if response.status_code == 200:
            return path
    return candidates[0] if candidates else None


def save_debug_log(payload: dict[str, Any]) -> tuple[Path, Path]:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = DEBUG_DIR / f"seo_surface_check_{stamp}.log"
    json_path = DEBUG_DIR / f"seo_surface_check_{stamp}.json"

    lines: list[str] = []
    lines.append(f"base_url={payload['base_url']}")
    for key, value in payload["checks"].items():
        lines.append(f"{key}={'PASS' if value else 'FAIL'}")
    lines.append(f"detail_path={payload.get('detail_path') or ''}")
    lines.append(f"list_canonical={payload.get('list_canonical') or ''}")
    lines.append(f"detail_canonical={payload.get('detail_canonical') or ''}")
    if payload.get("errors"):
        lines.append("errors:")
        for err in payload["errors"]:
            lines.append(f"  - {err}")
    log_path.write_text("\n".join(lines), encoding="utf-8")
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return log_path, json_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Production SEO surface checks")
    parser.add_argument(
        "--base-url",
        default=os.getenv("NEXT_PUBLIC_SITE_URL", "https://gongmozip.com"),
        help="Production base URL (default: NEXT_PUBLIC_SITE_URL or https://gongmozip.com)",
    )
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="HTTP timeout seconds")
    args = parser.parse_args()

    load_env()
    base_url = normalize_base_url(args.base_url)
    timeout = max(3, int(args.timeout))

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})

    checks: dict[str, bool] = {}
    errors: list[str] = []

    robots_url = build_url(base_url, "/robots.txt")
    robots_resp, robots_err = fetch_url(session, robots_url, timeout)
    robots_text = ""
    checks["robots_accessible"] = bool(robots_resp and robots_resp.status_code == 200)
    if robots_err:
        errors.append(f"robots request failed: {robots_err}")
    if robots_resp is not None:
        robots_text = robots_resp.text or ""
    robots_lower = robots_text.lower()
    checks["robots_has_sitemap"] = "sitemap:" in robots_lower
    checks["robots_disallow_admin"] = (
        "disallow: /admin" in robots_lower
        or "disallow:/admin" in robots_lower
    )

    sitemap_paths, sitemap_ok, sitemap_err = fetch_sitemap_paths(session, base_url, timeout)
    checks["sitemap_accessible"] = sitemap_ok
    if sitemap_err:
        errors.append(f"sitemap parse failed: {sitemap_err}")
    sitemap_set = set(sitemap_paths)
    checks["deadline_in_sitemap"] = "/deadline" in sitemap_set
    checks["deadline_soon_excluded"] = (
        "/deadline-soon" not in sitemap_set and "/deadline-soon/" not in sitemap_set
    )

    contests_url = build_url(base_url, "/contests")
    contests_resp, contests_err = fetch_url(session, contests_url, timeout)
    list_canonical = None
    if contests_err:
        errors.append(f"/contests request failed: {contests_err}")
    if contests_resp is not None and contests_resp.status_code == 200:
        list_canonical = parse_canonical_href(contests_resp.text or "")
    expected_list_canonical = f"{base_url}/contests"
    checks["list_canonical_ok"] = bool(
        list_canonical and list_canonical.rstrip("/") == expected_list_canonical.rstrip("/")
    )

    list_detail_candidates: list[str] = []
    if contests_resp is not None and contests_resp.status_code == 200:
        list_detail_candidates = extract_prefixed_paths_from_html(
            contests_resp.text or "",
            "/contests/",
        )[:80]

    sitemap_detail_candidates = [
        path
        for path in sitemap_paths
        if path.startswith("/contests/") and path.rstrip("/") != "/contests"
    ][:200]
    db_detail = get_detail_path_from_db(timeout)

    detail_candidates: list[str] = []
    for path in list_detail_candidates + sitemap_detail_candidates + ([db_detail] if db_detail else []):
        if path not in detail_candidates:
            detail_candidates.append(path)
    detail_path = pick_first_working_path(session, base_url, detail_candidates, timeout)
    detail_canonical = None
    if not detail_path:
        checks["detail_canonical_ok"] = False
        errors.append("detail path sample not found from sitemap/db")
    else:
        detail_url = build_url(base_url, detail_path)
        detail_resp, detail_err = fetch_url(session, detail_url, timeout)
        if detail_err:
            checks["detail_canonical_ok"] = False
            errors.append(f"{detail_path} request failed: {detail_err}")
        elif detail_resp is None or detail_resp.status_code != 200:
            checks["detail_canonical_ok"] = False
            errors.append(
                f"{detail_path} status={detail_resp.status_code if detail_resp is not None else 'N/A'}"
            )
        else:
            detail_canonical = parse_canonical_href(detail_resp.text or "")
            parsed = urlparse(detail_canonical or "")
            expected_path = detail_path
            checks["detail_canonical_ok"] = bool(
                detail_canonical
                and detail_canonical.startswith(base_url)
                and parsed.path == expected_path
            )

    overall = all(checks.values())

    payload = {
        "base_url": base_url,
        "checks": checks,
        "detail_path": detail_path,
        "list_canonical": list_canonical,
        "detail_canonical": detail_canonical,
        "errors": errors,
        "overall": overall,
    }
    log_path, json_path = save_debug_log(payload)
    logger.info(f"[seo-check] debug log saved: {log_path}")
    logger.info(f"[seo-check] debug json saved: {json_path}")

    print("")
    print("=== SEO SURFACE CHECK SUMMARY ===")
    print(f"base_url: {base_url}")
    print("checks:")
    for key in (
        "robots_accessible",
        "robots_has_sitemap",
        "robots_disallow_admin",
        "sitemap_accessible",
        "deadline_in_sitemap",
        "deadline_soon_excluded",
        "list_canonical_ok",
        "detail_canonical_ok",
    ):
        print(f"  {key}: {'PASS' if checks.get(key) else 'FAIL'}")
    print("samples:")
    print(f"  detail_path: {detail_path or 'N/A'}")
    print(f"  list_canonical: {list_canonical or 'N/A'}")
    print(f"  detail_canonical: {detail_canonical or 'N/A'}")
    print("errors:")
    print(f"  count={len(errors)}")
    print(f"  samples={errors[:5] if errors else []}")
    print("overall:")
    print(f"  {'PASS' if overall else 'FAIL'}")

    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
