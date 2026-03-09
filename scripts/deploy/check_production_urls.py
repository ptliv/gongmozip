"""
check_production_urls.py

Production URL health checker for the Next.js + Supabase deployment.

Checks:
  - fixed routes: /, /contests, /deadline, /deadline/7days, /bookmarks
  - infra routes: /sitemap.xml, /robots.txt
  - dynamic samples: /contests/<slug>, /field/<field>, /target/<target>, /host/<host>

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
from dataclasses import asdict, dataclass
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
    "Mozilla/5.0 (compatible; GongmozipProductionChecker/1.0; +https://gongmozip.com)"
)

STATIC_PATHS = [
    "/",
    "/contests",
    "/deadline",
    "/deadline/7days",
    "/bookmarks",
    "/sitemap.xml",
    "/robots.txt",
]

ERROR_MARKERS = [
    "internal server error",
    "application error",
    "unhandled runtime error",
    "cannot read properties of",
    "chunkloaderror",
    "referenceerror",
    "typeerror",
    "error: failed to fetch",
    "500 - internal server error",
]


@dataclass
class UrlCheckResult:
    path: str
    request_url: str
    final_url: str | None
    status_code: int | None
    redirected: bool
    is_html: bool
    title_exists: bool | None
    canonical_exists: bool | None
    canonical_href: str | None
    canonical_base_match: bool | None
    has_fatal_error_marker: bool
    pass_status: bool
    error: str | None


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


def load_env() -> None:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")


def build_url(base_url: str, path: str) -> str:
    return urljoin(f"{base_url}/", path.lstrip("/"))


def is_html_response(path: str, response: requests.Response) -> bool:
    content_type = (response.headers.get("content-type") or "").lower()
    if "text/html" in content_type:
        return True
    if path.endswith(".xml") or path.endswith(".txt"):
        return False
    snippet = (response.text or "")[:500].lower()
    return "<html" in snippet


def detect_fatal_error_marker(text: str) -> bool:
    lower = (text or "").lower()
    return any(marker in lower for marker in ERROR_MARKERS)


def get_canonical_href(soup: BeautifulSoup) -> str | None:
    for tag in soup.find_all("link"):
        rel = tag.get("rel")
        if not rel:
            continue
        rel_values = [str(v).strip().lower() for v in (rel if isinstance(rel, list) else [rel])]
        if "canonical" in rel_values:
            href = (tag.get("href") or "").strip()
            return href or None
    return None


def normalize_path_from_url(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path or "/"


def parse_target_candidates(target_value: Any) -> list[str]:
    if target_value is None:
        return []
    if isinstance(target_value, list):
        return [str(v).strip() for v in target_value if str(v).strip()]
    if isinstance(target_value, str):
        text = target_value.strip()
        if not text:
            return []
        # Handles PostgreSQL array text format: {"A","B"}
        if text.startswith("{") and text.endswith("}"):
            inner = text[1:-1]
            parts = [p.strip().strip('"') for p in inner.split(",")]
            return [p for p in parts if p]
        # Generic split fallback
        parts = [p.strip() for p in re.split(r"[,/|]", text)]
        return [p for p in parts if p]
    return [str(target_value).strip()]


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
                sub_path = normalize_path_from_url(sub_loc)
                if sub_path and sub_path not in seen:
                    seen.add(sub_path)
                    paths.append(sub_path)
            continue

        path = normalize_path_from_url(loc)
        if path and path not in seen:
            seen.add(path)
            paths.append(path)

    return paths, True, None


def pick_first_prefixed_path(paths: list[str], prefix: str) -> str | None:
    for path in paths:
        if path.startswith(prefix) and path != prefix.rstrip("/"):
            return path
    return None


def collect_prefixed_paths(paths: list[str], prefix: str, max_count: int = 50) -> list[str]:
    out: list[str] = []
    for path in paths:
        if not path.startswith(prefix):
            continue
        if path == prefix.rstrip("/"):
            continue
        if path not in out:
            out.append(path)
        if len(out) >= max_count:
            break
    return out


def extract_paths_from_html(html: str, prefix: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    found: list[str] = []
    for a_tag in soup.find_all("a", href=True):
        href = (a_tag.get("href") or "").strip()
        if not href:
            continue
        if href.startswith(prefix):
            found.append(href)
            continue
        parsed = urlparse(href)
        if parsed.path.startswith(prefix):
            found.append(parsed.path)
    deduped = list(dict.fromkeys(found))
    return deduped


def fetch_home_based_dynamic_paths(
    session: requests.Session,
    base_url: str,
    timeout: int,
) -> dict[str, str]:
    home_url = build_url(base_url, "/")
    response, err = fetch_url(session, home_url, timeout)
    if err or response is None or response.status_code != 200:
        return {}

    html = response.text or ""
    out: dict[str, str] = {}
    for label, prefix in (
        ("field", "/field/"),
        ("target", "/target/"),
        ("host", "/host/"),
        ("contest", "/contests/"),
    ):
        paths = extract_paths_from_html(html, prefix)
        picked = None
        for path in paths:
            if prefix == "/contests/" and path.rstrip("/") == "/contests":
                continue
            picked = path
            break
        if picked:
            out[label] = picked
    return out


def fetch_db_based_dynamic_paths(timeout: int) -> dict[str, str]:
    url = (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    anon_key = (os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "").strip()
    if not url or not anon_key:
        return {}

    endpoint = f"{url.rstrip('/')}/rest/v1/contests"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }
    params = {
        "select": "slug,field,target,organizer,status,updated_at",
        "status": "in.(ongoing,upcoming)",
        "order": "updated_at.desc",
        "limit": "500",
    }

    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=timeout)
    except requests.RequestException:
        return {}

    if response.status_code != 200:
        return {}

    try:
        rows = response.json()
    except ValueError:
        return {}
    if not isinstance(rows, list):
        return {}

    contest_path: str | None = None
    field_path: str | None = None
    target_path: str | None = None
    host_path: str | None = None

    for row in rows:
        if not isinstance(row, dict):
            continue

        if not contest_path:
            slug = slugify_text(str(row.get("slug") or ""))
            if slug:
                contest_path = f"/contests/{slug}"

        if not field_path:
            field = str(row.get("field") or "").strip()
            field_slug = slugify_text(field)
            if field_slug:
                field_path = f"/field/{field_slug}"

        if not target_path:
            target_values = parse_target_candidates(row.get("target"))
            for target in target_values:
                target_slug = slugify_text(target)
                if target_slug:
                    target_path = f"/target/{target_slug}"
                    break

        if not host_path:
            organizer = re.sub(r"\s+", " ", str(row.get("organizer") or "")).strip()
            host_slug = slugify_text(organizer)
            if host_slug:
                host_path = f"/host/{host_slug}"

        if contest_path and field_path and target_path and host_path:
            break

    out: dict[str, str] = {}
    if contest_path:
        out["contest"] = contest_path
    if field_path:
        out["field"] = field_path
    if target_path:
        out["target"] = target_path
    if host_path:
        out["host"] = host_path
    return out


def build_dynamic_path_candidates(
    sitemap_paths: list[str],
    home_paths: dict[str, str],
    db_paths: dict[str, str],
) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {
        "contest": collect_prefixed_paths(sitemap_paths, "/contests/", max_count=80),
        "field": collect_prefixed_paths(sitemap_paths, "/field/", max_count=30),
        "target": collect_prefixed_paths(sitemap_paths, "/target/", max_count=30),
        "host": collect_prefixed_paths(sitemap_paths, "/host/", max_count=30),
    }

    for key in ("contest", "field", "target", "host"):
        if home_paths.get(key) and home_paths[key] not in out[key]:
            out[key].append(home_paths[key])
        if db_paths.get(key) and db_paths[key] not in out[key]:
            out[key].append(db_paths[key])
    return out


def probe_status_code(
    session: requests.Session,
    base_url: str,
    path: str,
    timeout: int,
) -> int | None:
    response, err = fetch_url(session, build_url(base_url, path), timeout)
    if err or response is None:
        return None
    return response.status_code


def resolve_dynamic_paths(
    session: requests.Session,
    base_url: str,
    candidates: dict[str, list[str]],
    timeout: int,
) -> dict[str, str | None]:
    resolved: dict[str, str | None] = {}
    for key in ("contest", "field", "target", "host"):
        selected: str | None = None
        for path in candidates.get(key, []):
            status = probe_status_code(session, base_url, path, timeout)
            if status == 200:
                selected = path
                break
        if not selected:
            selected = candidates.get(key, [None])[0] if candidates.get(key) else None
        resolved[key] = selected
    return resolved


def check_single_url(
    session: requests.Session,
    base_url: str,
    path: str,
    timeout: int,
) -> UrlCheckResult:
    request_url = build_url(base_url, path)
    response, err = fetch_url(session, request_url, timeout)
    if err or response is None:
        return UrlCheckResult(
            path=path,
            request_url=request_url,
            final_url=None,
            status_code=None,
            redirected=False,
            is_html=False,
            title_exists=None,
            canonical_exists=None,
            canonical_href=None,
            canonical_base_match=None,
            has_fatal_error_marker=False,
            pass_status=False,
            error=err or "request failed",
        )

    final_url = response.url
    redirected = final_url.rstrip("/") != request_url.rstrip("/")
    status_code = response.status_code
    is_html = is_html_response(path, response)
    title_exists: bool | None = None
    canonical_exists: bool | None = None
    canonical_href: str | None = None
    canonical_base_match: bool | None = None

    if is_html:
        soup = BeautifulSoup(response.text or "", "lxml")
        title_exists = bool(soup.title and (soup.title.get_text(strip=True) or "").strip())
        canonical_href = get_canonical_href(soup)
        canonical_exists = bool(canonical_href)
        canonical_base_match = (
            canonical_href.startswith(base_url) if canonical_href else False
        )

    has_fatal = detect_fatal_error_marker(response.text or "")
    pass_status = (
        status_code == 200
        and not has_fatal
        and (not is_html or bool(title_exists))
    )

    return UrlCheckResult(
        path=path,
        request_url=request_url,
        final_url=final_url,
        status_code=status_code,
        redirected=redirected,
        is_html=is_html,
        title_exists=title_exists,
        canonical_exists=canonical_exists,
        canonical_href=canonical_href,
        canonical_base_match=canonical_base_match,
        has_fatal_error_marker=has_fatal,
        pass_status=pass_status,
        error=None,
    )


def write_debug_outputs(
    base_url: str,
    env_match: bool,
    paths_checked: list[str],
    results: list[UrlCheckResult],
    seo_summary: dict[str, bool],
    failures: list[str],
) -> tuple[Path, Path]:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = DEBUG_DIR / f"production_url_check_{stamp}.log"
    json_path = DEBUG_DIR / f"production_url_check_{stamp}.json"

    lines: list[str] = []
    lines.append(f"base_url={base_url}")
    lines.append(f"NEXT_PUBLIC_SITE_URL_match={'PASS' if env_match else 'FAIL'}")
    lines.append("paths_checked:")
    for path in paths_checked:
        lines.append(f"  - {path}")
    lines.append("results:")
    for item in results:
        lines.append(
            "  - "
            f"path={item.path} status={item.status_code} pass={item.pass_status} "
            f"redirect={item.redirected} title_exists={item.title_exists} "
            f"canonical_exists={item.canonical_exists} canonical_base_match={item.canonical_base_match} "
            f"fatal_marker={item.has_fatal_error_marker} error={item.error or ''}"
        )
    lines.append("seo:")
    for key, value in seo_summary.items():
        lines.append(f"  {key}={'PASS' if value else 'FAIL'}")
    lines.append("failures:")
    for fail in failures:
        lines.append(f"  - {fail}")

    log_path.write_text("\n".join(lines), encoding="utf-8")
    json_path.write_text(
        json.dumps(
            {
                "base_url": base_url,
                "env_site_url_match": env_match,
                "paths_checked": paths_checked,
                "results": [asdict(r) for r in results],
                "seo": seo_summary,
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return log_path, json_path


def print_summary(
    base_url: str,
    env_match: bool,
    url_lines: list[tuple[str, int | None, bool]],
    seo_summary: dict[str, bool],
    failures: list[str],
) -> None:
    overall = env_match and all(v for _, _, v in url_lines) and all(seo_summary.values())

    print("")
    print("=== PRODUCTION CHECK SUMMARY ===")
    print(f"base_url: {base_url}")
    print("env_expected:")
    print(f"  NEXT_PUBLIC_SITE_URL_match: {'PASS' if env_match else 'FAIL'}")
    print("urls:")
    for path, status, passed in url_lines:
        status_text = str(status) if status is not None else "N/A"
        print(f"  - {path} : {status_text} {'PASS' if passed else 'FAIL'}")
    print("seo:")
    print(f"  robots_ok: {'PASS' if seo_summary['robots_ok'] else 'FAIL'}")
    print(f"  sitemap_ok: {'PASS' if seo_summary['sitemap_ok'] else 'FAIL'}")
    print(f"  canonical_ok: {'PASS' if seo_summary['canonical_ok'] else 'FAIL'}")
    print(f"  deadline_in_sitemap: {'PASS' if seo_summary['deadline_in_sitemap'] else 'FAIL'}")
    print(
        f"  deadline_soon_excluded: "
        f"{'PASS' if seo_summary['deadline_soon_excluded'] else 'FAIL'}"
    )
    print("failures:")
    print(f"  count={len(failures)}")
    sample = failures[:5]
    print(f"  samples={sample if sample else []}")
    print("overall:")
    print(f"  {'PASS' if overall else 'FAIL'}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Production URL health check")
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

    env_site_url = normalize_base_url(os.getenv("NEXT_PUBLIC_SITE_URL", base_url))
    env_match = env_site_url == base_url

    logger.info(f"[prod-check] base_url={base_url}")
    logger.info(f"[prod-check] NEXT_PUBLIC_SITE_URL={env_site_url}")

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})

    sitemap_paths, sitemap_ok, sitemap_err = fetch_sitemap_paths(session, base_url, timeout)
    if sitemap_ok:
        logger.info(f"[prod-check] sitemap paths discovered: {len(sitemap_paths)}")
    else:
        logger.warning(f"[prod-check] sitemap parse failed: {sitemap_err}")

    home_paths = fetch_home_based_dynamic_paths(session, base_url, timeout)
    db_paths = fetch_db_based_dynamic_paths(timeout)
    dynamic_candidates = build_dynamic_path_candidates(sitemap_paths, home_paths, db_paths)
    dynamic_paths = resolve_dynamic_paths(session, base_url, dynamic_candidates, timeout)
    logger.info(f"[prod-check] dynamic candidates={dynamic_candidates}")
    logger.info(f"[prod-check] dynamic selected={dynamic_paths}")

    check_paths = list(STATIC_PATHS)
    for key in ("field", "target", "host", "contest"):
        path = dynamic_paths.get(key)
        if path and path not in check_paths:
            check_paths.append(path)

    results: list[UrlCheckResult] = []
    failures: list[str] = []

    for path in check_paths:
        result = check_single_url(session, base_url, path, timeout)
        results.append(result)
        logger.info(
            f"[prod-check] {path} status={result.status_code} pass={result.pass_status} "
            f"redirect={result.redirected} title={result.title_exists} canonical={result.canonical_exists}"
        )
        if not result.pass_status:
            failures.append(
                f"{path} status={result.status_code} error={result.error or ''} "
                f"fatal={result.has_fatal_error_marker} title={result.title_exists}"
            )

    # Ensure required dynamic checks are represented.
    for required_key, prefix in (
        ("field", "/field/..."),
        ("target", "/target/..."),
        ("host", "/host/..."),
        ("contest", "/contests/..."),
    ):
        if not dynamic_paths.get(required_key):
            failures.append(f"missing dynamic sample for {required_key} ({prefix})")

    canonical_rows = [
        r
        for r in results
        if r.is_html and r.path not in ("/robots.txt", "/sitemap.xml")
    ]
    canonical_ok = bool(canonical_rows) and all(
        bool(r.canonical_exists) and bool(r.canonical_base_match) for r in canonical_rows
    )

    path_set = set(sitemap_paths)
    seo_summary = {
        "robots_ok": any(r.path == "/robots.txt" and r.status_code == 200 for r in results),
        "sitemap_ok": any(r.path == "/sitemap.xml" and r.status_code == 200 for r in results)
        and sitemap_ok,
        "canonical_ok": canonical_ok,
        "deadline_in_sitemap": "/deadline" in path_set,
        "deadline_soon_excluded": "/deadline-soon" not in path_set
        and "/deadline-soon/" not in path_set,
    }

    # Build summary list including placeholders for missing dynamic paths.
    by_path = {r.path: r for r in results}
    url_lines: list[tuple[str, int | None, bool]] = []
    for path in STATIC_PATHS:
        row = by_path.get(path)
        if row:
            url_lines.append((path, row.status_code, row.pass_status))
        else:
            url_lines.append((path, None, False))

    for key, placeholder in (
        ("field", "/field/..."),
        ("target", "/target/..."),
        ("host", "/host/..."),
        ("contest", "/contests/..."),
    ):
        actual = dynamic_paths.get(key)
        if actual:
            row = by_path.get(actual)
            if row:
                url_lines.append((actual, row.status_code, row.pass_status))
            else:
                url_lines.append((actual, None, False))
                failures.append(f"{actual} not checked")
        else:
            url_lines.append((placeholder, None, False))

    log_path, json_path = write_debug_outputs(
        base_url=base_url,
        env_match=env_match,
        paths_checked=check_paths,
        results=results,
        seo_summary=seo_summary,
        failures=failures,
    )
    logger.info(f"[prod-check] debug log saved: {log_path}")
    logger.info(f"[prod-check] debug json saved: {json_path}")

    print_summary(
        base_url=base_url,
        env_match=env_match,
        url_lines=url_lines,
        seo_summary=seo_summary,
        failures=failures,
    )

    overall = env_match and all(v for _, _, v in url_lines) and all(seo_summary.values())
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
