"""
campuspick.py - Campuspick (campuspick.com) contests crawler

Approach:
  - Use the public JSON endpoint used by the web page:
      POST https://api2.campuspick.com/find/activity/list
  - target=1 means contests.
  - Parse API payload directly (stable, no browser needed).
"""

import os
import re
import time
from typing import Optional

import requests

from utils import logger
from utils.normalize import (
    clean_str,
    normalize_date,
    generate_slug,
    default_apply_end_at,
    today_str,
)

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------

SOURCE_SITE = "campuspick"
BASE_URL = "https://www.campuspick.com"
API_BASE_URL = "https://api2.campuspick.com"
API_LIST_URL = f"{API_BASE_URL}/find/activity/list"
LIST_URL = f"{BASE_URL}/contest"

TARGET_CONTEST = "1"  # contest
MAX_PAGES = 3
PAGE_SIZE = 20
REQUEST_DELAY = 1.0
REQUEST_TIMEOUT = 15

QUALITY_MIN_COUNT = 5
QUALITY_MIN_AVG_LEN = 8

CONTEST_STATUS_UPCOMING = "upcoming"
CONTEST_STATUS_ONGOING = "ongoing"
CONTEST_STATUS_CLOSED = "closed"
CONTEST_STATUS_CANCELED = "canceled"
ALLOWED_STATUSES = {
    CONTEST_STATUS_UPCOMING,
    CONTEST_STATUS_ONGOING,
    CONTEST_STATUS_CLOSED,
    CONTEST_STATUS_CANCELED,
}
CRAWLED_DEFAULT_STATUS = CONTEST_STATUS_ONGOING

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Origin": BASE_URL,
    "Referer": LIST_URL,
}

DEBUG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "debug"
)

_NOISE_TITLE_EXACT = {
    "전체",
    "인기 공모전",
    "팀원 모집 중",
    "소개",
    "댓글",
}
_NOISE_PREFIXES = (
    "카테고리",
    "필터",
    "메뉴",
)


# ------------------------------------------------------------------
# Debug helpers
# ------------------------------------------------------------------

def _save_debug_json(data: dict, filename: str) -> None:
    """Save the first API response for troubleshooting."""
    import json

    try:
        os.makedirs(DEBUG_DIR, exist_ok=True)
        filepath = os.path.join(DEBUG_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"[campuspick] debug json saved: {filepath}")
    except Exception as e:
        logger.warning(f"[campuspick] debug json save failed: {e}")


# ------------------------------------------------------------------
# API
# ------------------------------------------------------------------

def _fetch_page(offset: int) -> Optional[dict]:
    """
    Fetch one page from Campuspick API.

    Request payload:
      target=1, limit=20, offset=0/20/40...
    """
    payload = {
        "target": TARGET_CONTEST,
        "limit": str(PAGE_SIZE),
        "offset": str(offset),
    }
    try:
        r = requests.post(
            API_LIST_URL,
            headers=HEADERS,
            data=payload,
            timeout=REQUEST_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        logger.error(f"[campuspick] API request failed (offset={offset}): {e}")
        return None
    except Exception as e:
        logger.error(f"[campuspick] API parse failed (offset={offset}): {e}")
        return None


# ------------------------------------------------------------------
# Parse and mapping
# ------------------------------------------------------------------

def _clean_title(title: str) -> Optional[str]:
    """Normalize title and remove obvious non-contest noise."""
    s = clean_str(title)
    if not s:
        return None
    s = re.sub(r"\s+", " ", s).strip()
    return s if s else None


def _is_noise_title(title: str) -> bool:
    """Exclude filter/menu-like titles."""
    if title in _NOISE_TITLE_EXACT:
        return True
    return any(title.startswith(prefix) for prefix in _NOISE_PREFIXES)


def _build_contest_dict(
    title: str,
    organizer: str,
    apply_start_at: str,
    apply_end_at: str,
    source_url: str,
    external_id: str,
    poster_image_url: Optional[str],
    raw_payload: dict,
) -> dict:
    """Create DB-upsert payload with the same style as existing sources."""
    slug = generate_slug(title, external_id=f"campuspick-{external_id}")
    return {
        "slug": slug,
        "title": title,
        "organizer": organizer,
        "summary": title,
        "description": title,
        "type": "공모전",
        "category": "기타",
        "field": "기타",
        "target": ["누구나"],
        "region": "무관",
        "online_offline": "온·오프라인",
        "team_allowed": False,
        "apply_start_at": apply_start_at,
        "apply_end_at": apply_end_at,
        "status": CRAWLED_DEFAULT_STATUS,
        "benefit": {"types": []},
        "official_source_url": source_url,
        "aggregator_source_url": None,
        "poster_image_url": poster_image_url,
        "verified_level": 0,
        "source_site": SOURCE_SITE,
        "source_url": source_url,
        "official_url": None,
        "external_id": str(external_id),
        "raw_payload": raw_payload,
    }


def _parse_activity(activity: dict) -> Optional[dict]:
    """Parse one activity item from API result."""
    try:
        external_id = str(activity.get("id", "")).strip()
        if not external_id:
            return None
        if not external_id.isdigit():
            return None

        title = _clean_title(activity.get("title", ""))
        if not title:
            return None
        if _is_noise_title(title):
            return None
        if len(title) < 6:
            return None

        organizer = clean_str(activity.get("company", "")) or "미상"
        organizer = organizer[:80]

        raw_end_date = clean_str(activity.get("endDate", ""))
        apply_end_at = normalize_date(raw_end_date) if raw_end_date else None
        if not apply_end_at:
            apply_end_at = default_apply_end_at(months_ahead=3)
        apply_start_at = today_str()
        if apply_end_at < apply_start_at:
            # Keep dates valid for DB check constraint (start <= end).
            apply_start_at = apply_end_at

        source_url = f"{BASE_URL}/contest/view?id={external_id}"
        poster_image_url = clean_str(activity.get("image", "")) or None

        return _build_contest_dict(
            title=title,
            organizer=organizer,
            apply_start_at=apply_start_at,
            apply_end_at=apply_end_at,
            source_url=source_url,
            external_id=external_id,
            poster_image_url=poster_image_url,
            raw_payload={
                "raw_end_date": raw_end_date,
                "categories": activity.get("categories", []),
                "viewCount": activity.get("viewCount"),
                "commentCount": activity.get("commentCount"),
                "teamCount": activity.get("teamCount"),
                "image": activity.get("image"),
            },
        )
    except Exception as e:
        logger.error(f"[campuspick] activity parse error: {e} | activity={activity}")
        return None


# ------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------

def _quality_ok(contests: list[dict], label: str) -> bool:
    """Quality gate for fetched contests."""
    if not contests:
        logger.warning(f"[campuspick] quality [{label}]: 0 -> FAIL")
        return False
    if len(contests) < QUALITY_MIN_COUNT:
        logger.warning(
            f"[campuspick] quality [{label}]: {len(contests)} < {QUALITY_MIN_COUNT} -> FAIL"
        )
        return False
    avg_len = sum(len(c.get("title", "")) for c in contests) / len(contests)
    if avg_len < QUALITY_MIN_AVG_LEN:
        logger.warning(
            f"[campuspick] quality [{label}]: avg title {avg_len:.1f} < {QUALITY_MIN_AVG_LEN} -> FAIL"
        )
        return False
    logger.info(
        f"[campuspick] quality [{label}]: {len(contests)} items, avg title {avg_len:.1f} -> OK"
    )
    return True


def _pre_save_filter(contests: list[dict]) -> list[dict]:
    """
    Final validation before DB upsert.

    Rules:
      - non-empty, non-noise title
      - numeric external_id
      - detail URL pattern guard
      - status must be one of allowed values
    """
    valid: list[dict] = []
    dropped: dict[str, int] = {}

    for c in contests:
        title = c.get("title", "") or ""
        external_id = str(c.get("external_id", "") or "").strip()
        source_url = c.get("official_source_url", "") or c.get("source_url", "") or ""

        if not title:
            dropped["empty_title"] = dropped.get("empty_title", 0) + 1
            continue
        if _is_noise_title(title):
            dropped["noise_title"] = dropped.get("noise_title", 0) + 1
            continue
        if len(title) < 6:
            dropped["title_too_short"] = dropped.get("title_too_short", 0) + 1
            continue
        if not external_id or not external_id.isdigit():
            dropped["bad_external_id"] = dropped.get("bad_external_id", 0) + 1
            continue
        if "/contest/view?id=" not in source_url:
            dropped["bad_source_url"] = dropped.get("bad_source_url", 0) + 1
            continue

        status = c.get("status", CRAWLED_DEFAULT_STATUS) or CRAWLED_DEFAULT_STATUS
        if status not in ALLOWED_STATUSES:
            status = CRAWLED_DEFAULT_STATUS
        c["status"] = status

        if not c.get("organizer"):
            c["organizer"] = "미상"

        valid.append(c)

    if dropped:
        logger.warning(f"[campuspick] [pre_save_filter] dropped: {dropped}")
    logger.info(f"[campuspick] [pre_save_filter] to_save: {len(valid)}")
    return valid


def _dedupe(contests: list[dict]) -> list[dict]:
    """Deduplicate by external_id."""
    seen: set[str] = set()
    unique: list[dict] = []
    for c in contests:
        eid = c.get("external_id")
        if eid and eid not in seen:
            seen.add(eid)
            unique.append(c)
    if len(unique) != len(contests):
        logger.info(f"[campuspick] dedupe: {len(contests)} -> {len(unique)}")
    return unique


# ------------------------------------------------------------------
# Public fetch function
# ------------------------------------------------------------------

def fetch_campuspick_contests() -> list[dict]:
    """
    Fetch contests from Campuspick API and return normalized dict list.
    """
    logger.info(
        f"[campuspick] fetch start | max_pages={MAX_PAGES} | page_size={PAGE_SIZE} | status='{CRAWLED_DEFAULT_STATUS}'"
    )

    all_contests: list[dict] = []
    offset = 0
    first_response_saved = False

    for page in range(1, MAX_PAGES + 1):
        logger.info(f"[campuspick] page {page} request (offset={offset})")
        data = _fetch_page(offset=offset)
        if not data:
            logger.warning(f"[campuspick] page {page}: empty response -> stop")
            break

        status = data.get("status")
        if status != "success":
            logger.warning(f"[campuspick] page {page}: API status={status!r} -> stop")
            break

        result = data.get("result", {}) or {}
        activities = result.get("activities", []) or []

        if not first_response_saved:
            _save_debug_json(data, "campuspick_p1.json")
            first_response_saved = True

        logger.info(
            f"[campuspick] page {page}: activities={len(activities)} "
            f"popular={len(result.get('popularActivities', []) or [])} "
            f"team={len(result.get('teamActivities', []) or [])}"
        )

        if not activities:
            logger.warning(f"[campuspick] page {page}: no activities -> stop")
            break

        parsed = [c for c in (_parse_activity(a) for a in activities) if c]
        logger.info(f"[campuspick] page {page}: parsed={len(parsed)}")

        for i, c in enumerate(parsed[:3], 1):
            logger.info(
                f"  [{i}] id={c['external_id']:<8} end={c['apply_end_at']} "
                f"org={c['organizer'][:12]:<12} | {c['title'][:50]}"
            )

        all_contests.extend(parsed)

        if len(activities) < PAGE_SIZE:
            logger.info(
                f"[campuspick] last page reached ({len(activities)} < {PAGE_SIZE}) -> stop"
            )
            break

        offset += len(activities)
        if page < MAX_PAGES:
            time.sleep(REQUEST_DELAY)

    all_contests = _dedupe(all_contests)
    all_contests = _pre_save_filter(all_contests)
    _quality_ok(all_contests, label="fetch")
    _log_collect_summary(all_contests)
    return all_contests


def _log_collect_summary(contests: list[dict]) -> None:
    """Collection summary logs."""
    logger.info("=" * 60)
    logger.info("  CAMPUSPICK COLLECT SUMMARY")
    logger.info(f"  raw_collected: {len(contests)}")
    if contests:
        logger.info("  sample_titles:")
        for i, c in enumerate(contests[:10], 1):
            logger.info(f"    [{i:02d}] {c['title']}")
        logger.info("  sample_urls:")
        for i, c in enumerate(contests[:10], 1):
            logger.info(f"    [{i:02d}] {c.get('official_source_url', 'N/A')}")
    logger.info("=" * 60)


# ------------------------------------------------------------------
# Full pipeline (fetch + upsert)
# ------------------------------------------------------------------

def run_campuspick_pipeline() -> dict:
    """
    Run full Campuspick pipeline: fetch + Supabase upsert.
    """
    from utils.supabase_client import get_supabase_client, upsert_contest

    summary: dict = {
        "source": SOURCE_SITE,
        "raw_collected": 0,
        "to_save": 0,
        "inserted": 0,
        "updated": 0,
        "failed": 0,
        "failed_samples": [],
        "success_samples": [],
    }

    contests = fetch_campuspick_contests()
    summary["raw_collected"] = len(contests)
    summary["to_save"] = len(contests)

    if not contests:
        logger.error("[campuspick] fetch result is empty -> skip upsert")
        _print_final_summary(summary)
        return summary

    logger.info(f"[campuspick] Supabase upsert start: {len(contests)}")
    client = get_supabase_client()

    for i, contest in enumerate(contests, start=1):
        title = contest.get("title", "(no title)")
        logger.info(f"  [{i}/{len(contests)}] upserting: {title[:50]}")
        outcome = upsert_contest(client, contest)

        if outcome["action"] == "insert":
            summary["inserted"] += 1
            summary["success_samples"].append(
                {
                    "action": "insert",
                    "title": title,
                    "deadline": contest.get("apply_end_at", "N/A"),
                    "organizer": contest.get("organizer", "N/A"),
                    "url": contest.get("official_source_url", ""),
                    "id": outcome.get("id"),
                }
            )
            logger.info(f"    -> INSERT (id: {outcome.get('id')})")
        elif outcome["action"] == "update":
            summary["updated"] += 1
            summary["success_samples"].append(
                {
                    "action": "update",
                    "title": title,
                    "deadline": contest.get("apply_end_at", "N/A"),
                    "organizer": contest.get("organizer", "N/A"),
                    "url": contest.get("official_source_url", ""),
                    "id": outcome.get("id"),
                }
            )
            logger.info(f"    -> UPDATE (id: {outcome.get('id')})")
        else:
            summary["failed"] += 1
            err = outcome.get("error", "unknown error")
            summary["failed_samples"].append(
                {
                    "title": title,
                    "error": err,
                    "ext_id": contest.get("external_id"),
                }
            )
            logger.error(f"    -> FAIL: {err[:120]}")

    _print_final_summary(summary)
    return summary


def _print_final_summary(summary: dict) -> None:
    """Final summary block."""
    logger.info("")
    logger.info("=" * 60)
    logger.info("=== CAMPUSPICK FINAL SUMMARY ===")
    logger.info(f"  source          : {summary.get('source', SOURCE_SITE)}")
    logger.info(f"  pages_fetched   : (MAX_PAGES={MAX_PAGES})")
    logger.info(f"  raw_collected   : {summary['raw_collected']}")
    logger.info(f"  after_filter    : {summary['to_save']}")
    logger.info(f"  inserted        : {summary['inserted']}")
    logger.info(f"  updated         : {summary['updated']}")
    logger.info(f"  failed          : {summary['failed']}")

    if summary["failed_samples"]:
        logger.info("  failed_samples (max 5):")
        for s in summary["failed_samples"][:5]:
            logger.info(f"    ext_id={s['ext_id']} error={s['error'][:80]}")

    samples = summary["success_samples"][:10]
    logger.info("  sample_titles:")
    for s in samples:
        logger.info(f"    [{s['action']}] {s['title'][:60]}")
    logger.info("  sample_deadlines:")
    for s in samples:
        logger.info(f"    {s.get('deadline', 'N/A')}")
    logger.info("  sample_organizers:")
    for s in samples:
        logger.info(f"    {s.get('organizer', 'N/A')}")
    logger.info("=" * 60)
