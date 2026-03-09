"""
crawl_all.py - Run all configured source crawlers and upsert to Supabase.
"""

import os
import sys

# Make `scripts/` importable from project root execution.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils import logger
from utils.dedupe_report import build_dedupe_report, _print_dedupe_summary
from utils.supabase_client import (
    close_expired_contests,
    get_supabase_client,
    upsert_contests_bulk,
)
from sources.allcon import fetch_allcon_contests
from sources.campuspick import fetch_campuspick_contests
from sources.wevity import fetch_wevity_contests


SOURCES = [
    ("wevity", fetch_wevity_contests),
    ("allcon", fetch_allcon_contests),
    ("campuspick", fetch_campuspick_contests),
]

ALLOWED_STATUSES = {"upcoming", "ongoing", "closed", "canceled"}


def _status_guard(source_name: str, contests: list[dict]) -> list[dict]:
    """
    Enforce allowed status set before DB upsert.
    """
    fixed = 0
    for c in contests:
        status = c.get("status")
        if status not in ALLOWED_STATUSES:
            c["status"] = "ongoing"
            fixed += 1
    if fixed > 0:
        logger.warning(
            f"[{source_name}] invalid status fixed: {fixed} -> ongoing "
            f"(allowed={sorted(ALLOWED_STATUSES)})"
        )
    return contests


def _sample_rows(contests: list[dict], limit: int = 3) -> list[dict]:
    """
    Keep up to `limit` sample rows for final verification report.
    """
    samples: list[dict] = []
    for c in contests[:limit]:
        samples.append(
            {
                "title": c.get("title", ""),
                "organizer": c.get("organizer", ""),
                "apply_end_at": c.get("apply_end_at", ""),
            }
        )
    return samples


def main():
    logger.info("=" * 55)
    logger.info("공모전 수집 통합 실행 시작")
    logger.info("=" * 55)

    try:
        client = get_supabase_client()
        logger.info("Supabase 연결 성공")
    except ValueError as e:
        logger.error(f"Supabase 연결 실패: {e}")
        sys.exit(1)

    source_summaries: list[dict] = []
    total_inserted = 0
    total_updated = 0
    total_failed = 0

    for source_name, fetch_fn in SOURCES:
        logger.info("")
        logger.info(f"── [{source_name}] 수집 시작 ──")

        try:
            contests = fetch_fn()
        except Exception as e:
            logger.error(f"[{source_name}] 수집 중 예외 발생: {e}")
            contests = []

        collected = len(contests)
        logger.info(f"[{source_name}] 수집 공고: {collected}건")

        result = {"inserted": 0, "updated": 0, "errors": 0}
        if contests:
            contests = _status_guard(source_name, contests)
            logger.info(f"[{source_name}] DB 저장 시작...")
            result = upsert_contests_bulk(client, contests)
        else:
            logger.warning(f"[{source_name}] 수집 결과 없음 -> 저장 건너뜀")

        source_summary = {
            "source": source_name,
            "collected": collected,
            "inserted": result["inserted"],
            "updated": result["updated"],
            "failed": result["errors"],
            "samples": _sample_rows(contests, limit=3),
        }
        source_summaries.append(source_summary)

        total_inserted += result["inserted"]
        total_updated += result["updated"]
        total_failed += result["errors"]

        logger.info(
            f"[{source_name}] 저장 완료 | "
            f"inserted={result['inserted']} updated={result['updated']} failed={result['errors']}"
        )

        samples = source_summary["samples"]
        if samples:
            logger.info(f"[{source_name}] sample 3건 (title | organizer | apply_end_at):")
            for idx, s in enumerate(samples, 1):
                logger.info(
                    f"  [{idx}] {s['title'][:45]} | {s['organizer'][:20]} | {s['apply_end_at']}"
                )

    logger.info("")
    logger.info("=" * 55)
    logger.info("전체 수집/저장 완료")
    logger.info(f"  inserted: {total_inserted}")
    logger.info(f"  updated : {total_updated}")
    logger.info(f"  failed  : {total_failed}")
    logger.info("=" * 55)

    logger.info("")
    logger.info("── 마감 처리 시작 (close_expired_contests) ──")
    close_summary = {"checked": 0, "updated": 0, "failed": 0}
    try:
        close_summary = close_expired_contests(client, source_site=None, dry_run=False)
    except Exception as e:
        logger.error(f"마감 처리 중 예외 발생: {e}")

    logger.info("")
    logger.info("── 중복 후보 탐지 시작 (dedupe_report) ──")
    dedupe_summary = {"candidates": 0, "sample_pairs": []}
    try:
        source_names = [name for name, _ in SOURCES]
        dedupe_summary = build_dedupe_report(
            client,
            source_sites=source_names,
            limit=10,
        )
        _print_dedupe_summary(dedupe_summary)
    except Exception as e:
        logger.error(f"중복 후보 탐지 중 예외 발생: {e}")

    logger.info("")
    logger.info("=== CRAWL ALL FINAL SUMMARY ===")
    logger.info("sources:")
    for s in source_summaries:
        logger.info(
            f"  - {s['source']}: inserted={s['inserted']}, "
            f"updated={s['updated']}, failed={s['failed']}, collected={s['collected']}"
        )
    logger.info("close_expired:")
    logger.info(f"  checked={close_summary.get('checked', 0)}")
    logger.info(f"  updated={close_summary.get('updated', 0)}")
    logger.info(f"  failed={close_summary.get('failed', 0)}")
    logger.info("duplicates:")
    logger.info(f"  candidates={dedupe_summary.get('candidates', 0)}")
    logger.info(f"  sample_pairs={len(dedupe_summary.get('sample_pairs', []) or [])}")


if __name__ == "__main__":
    main()
