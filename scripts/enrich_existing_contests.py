"""
Rebuild existing contest descriptions with detail/official-page enrichment.

This is useful after improving the enrichment rules because it updates rows
that were crawled before the richer description pipeline existed.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from typing import Callable, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sources.allcon import fetch_allcon_detail
from sources.campuspick import fetch_campuspick_detail
from sources.wevity import fetch_wevity_detail
from utils import logger
from utils.ai_content_enrichment import (
    enrich_contest_with_vertex_ai,
    has_vertex_environment,
    load_ai_enrichment_settings_from_env,
)
from utils.auto_score import decide_verified_level, score_contest
from utils.content_enrichment import enrich_contest_content, is_expired, strip_html
from utils.normalize import normalize_date
from utils.supabase_client import get_supabase_client


DETAIL_FETCHERS: dict[str, Callable[[dict], Optional[dict]]] = {
    "allcon": fetch_allcon_detail,
    "campuspick": fetch_campuspick_detail,
    "wevity": fetch_wevity_detail,
}

UPDATE_FIELDS = {
    "summary",
    "description",
    "poster_image_url",
    "official_url",
    "raw_payload",
    "review_score",
    "verified_level",
}


def _should_update(row: dict, min_description_chars: int) -> bool:
    if is_expired(row):
        return False
    if int(row.get("verified_level") or 0) < 1:
        return False
    return len(strip_html(row.get("description"))) < min_description_chars


def _normalize_dates(row: dict) -> None:
    for field in ("apply_start_at", "apply_end_at"):
        normalized = normalize_date(row.get(field) or "")
        if normalized:
            row[field] = normalized


def enrich_existing_contests(
    *,
    source_site: str | None = None,
    limit: int = 80,
    min_description_chars: int = 600,
    dry_run: bool = False,
    delay: float = 0.8,
) -> dict:
    client = get_supabase_client()
    query = (
        client.table("contests")
        .select("*")
        .gte("verified_level", 1)
        .order("updated_at", desc=True)
        .limit(limit)
    )
    if source_site:
        query = query.eq("source_site", source_site)

    rows = query.execute().data or []
    summary = {
        "checked": len(rows),
        "targeted": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
    }
    logger.info(
        f"[enrich_existing] 시작 | rows={len(rows)} source={source_site or 'all'} "
        f"min_description_chars={min_description_chars} dry_run={dry_run}"
    )
    ai_settings = load_ai_enrichment_settings_from_env()
    ai_vertex_ready = has_vertex_environment()
    if ai_settings.enabled and ai_vertex_ready:
        logger.info(f"[enrich_existing][ai] Gemini 보강 활성화: model={ai_settings.model}")
    elif ai_settings.enabled:
        logger.warning("[enrich_existing][ai] Vertex 환경변수 누락으로 Gemini 보강을 건너뜁니다.")

    for index, row in enumerate(rows, start=1):
        title = (row.get("title") or "")[:42]
        if not _should_update(row, min_description_chars):
            summary["skipped"] += 1
            continue

        summary["targeted"] += 1
        try:
            _normalize_dates(row)
            fetcher = DETAIL_FETCHERS.get(str(row.get("source_site") or ""))
            if fetcher:
                detail_update = fetcher(dict(row))
                if detail_update:
                    row.update(detail_update)

            enrich_contest_content(row)
            if ai_settings.enabled and ai_vertex_ready:
                outcome = enrich_contest_with_vertex_ai(row, settings=ai_settings)
                logger.info(
                    f"[enrich_existing][ai] [{index}/{len(rows)}] "
                    f"{outcome.reason} | {title}"
                )
            score = score_contest(row)
            payload = {
                field: row.get(field)
                for field in UPDATE_FIELDS
                if field in row and row.get(field) is not None
            }
            payload["review_score"] = score
            if int(row.get("verified_level") or 0) < 2:
                payload["verified_level"] = decide_verified_level(score, row)

            logger.info(
                f"[enrich_existing] [{index}/{len(rows)}] "
                f"score={score} desc={len(strip_html(row.get('description')))} | {title}"
            )
            if not dry_run:
                client.table("contests").update(payload).eq("id", row["id"]).execute()
            summary["updated"] += 1
        except Exception as exc:
            summary["failed"] += 1
            logger.error(f"[enrich_existing] 실패 | {title} | {exc}")

        if delay and index < len(rows):
            time.sleep(delay)

    logger.info(f"[enrich_existing] 완료 | {summary}")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich existing contest descriptions.")
    parser.add_argument("--source", default=None, help="source_site filter, e.g. campuspick")
    parser.add_argument("--limit", type=int, default=80)
    parser.add_argument("--min-description-chars", type=int, default=600)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--delay", type=float, default=0.8)
    args = parser.parse_args()

    enrich_existing_contests(
        source_site=args.source,
        limit=args.limit,
        min_description_chars=args.min_description_chars,
        dry_run=args.dry_run,
        delay=args.delay,
    )


if __name__ == "__main__":
    main()
