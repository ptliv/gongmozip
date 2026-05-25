"""
crawl_all.py - Run all configured source crawlers and upsert to Supabase.
"""

import os
import sys
import time

# Make `scripts/` importable from project root execution.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils import logger
from utils.dedupe_report import build_dedupe_report, _print_dedupe_summary
from utils.supabase_client import (
    close_expired_contests,
    get_supabase_client,
    purge_expired_contests,
    rescore_contests,
    upsert_contests_bulk,
)
from utils.content_enrichment import enrich_contest_content, is_expired, today_key
from sources.allcon import fetch_allcon_contests, fetch_allcon_detail
from sources.campuspick import fetch_campuspick_contests, fetch_campuspick_detail
from sources.wevity import fetch_wevity_contests, fetch_wevity_detail


SOURCES = [
    ("wevity", fetch_wevity_contests, fetch_wevity_detail),
    ("allcon", fetch_allcon_contests, fetch_allcon_detail),
    ("campuspick", fetch_campuspick_contests, fetch_campuspick_detail),
]

# 상세 페이지 수집 설정
ENABLE_DETAIL_FETCH = True   # False로 끄면 목록 정보만 저장
DETAIL_REQUEST_DELAY = 1.2   # 상세 요청 간 딜레이 (초)

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


def _discard_expired(source_name: str, contests: list[dict]) -> list[dict]:
    """
    마감/취소 공고는 신규 저장 대상에서 제외합니다.
    이미 저장된 마감 공고는 purge_expired_contests()에서 폐기합니다.
    """
    today = today_key()
    kept: list[dict] = []
    discarded = 0
    for contest in contests:
        status = contest.get("status")
        if status in {"closed", "canceled"} or is_expired(contest, today):
            discarded += 1
            continue
        kept.append(contest)

    if discarded:
        logger.info(f"[{source_name}] 마감/취소 공고 폐기: {discarded}건")
    return kept


def _enrich_with_detail(source_name: str, contests: list[dict], fetch_detail_fn) -> list[dict]:
    """
    상세 페이지에서 추가 정보를 수집해 contest dict를 업데이트합니다.

    업데이트 필드(소스별 차이 있음):
      - title, organizer, apply_start_at, apply_end_at
      - target, benefit, region, field
      - description (실제 본문 HTML)
      - poster_image_url, official_url
    """
    if not contests or not ENABLE_DETAIL_FETCH:
        return contests

    enriched = 0
    logger.info(f"[{source_name}][detail] 상세 보강 시작: {len(contests)}건")

    for i, contest in enumerate(contests, start=1):
        title_short = contest.get("title", "")[:40]
        try:
            update = fetch_detail_fn(contest)
            if update:
                contest.update(update)
                enriched += 1
                logger.debug(
                    f"[{source_name}][detail] [{i}/{len(contests)}] OK: {title_short}"
                )
            else:
                logger.debug(
                    f"[{source_name}][detail] [{i}/{len(contests)}] 스킵: {title_short}"
                )
        except Exception as e:
            logger.warning(
                f"[{source_name}][detail] [{i}/{len(contests)}] 오류: {title_short} — {e}"
            )

        try:
            enrich_contest_content(contest)
        except Exception as e:
            logger.warning(
                f"[{source_name}][enrich] [{i}/{len(contests)}] 보강 오류: {title_short} — {e}"
            )

        if i < len(contests):
            time.sleep(DETAIL_REQUEST_DELAY)

    logger.info(f"[{source_name}][detail] 상세 보강 완료: {enriched}/{len(contests)}건")
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

    for source_name, fetch_fn, fetch_detail_fn in SOURCES:
        logger.info("")
        logger.info(f"── [{source_name}] 수집 시작 ──")

        try:
            contests = fetch_fn()
        except Exception as e:
            logger.error(f"[{source_name}] 수집 중 예외 발생: {e}")
            contests = []

        collected = len(contests)
        logger.info(f"[{source_name}] 수집 공고: {collected}건")

        # 상세 페이지 보강
        if contests and ENABLE_DETAIL_FETCH:
            contests = _enrich_with_detail(source_name, contests, fetch_detail_fn)

        result = {"inserted": 0, "updated": 0, "errors": 0}
        if contests:
            contests = _status_guard(source_name, contests)
            contests = _discard_expired(source_name, contests)

        if contests:
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
    logger.info("── 마감 공고 폐기 시작 (purge_expired_contests) ──")
    purge_summary = {"checked": 0, "deleted": 0, "failed": 0}
    try:
        purge_summary = purge_expired_contests(client, source_site=None, dry_run=False)
    except Exception as e:
        logger.error(f"마감 공고 폐기 중 예외 발생: {e}")

    rescore_summary = {"checked": 0, "updated": 0, "failed": 0}
    try:
        logger.info("── 자동 리뷰 점수 재계산 시작 (rescore_contests) ──")
        rescore_summary = rescore_contests(client, source_site=None, dry_run=False)
    except Exception as e:
        logger.error(f"자동 리뷰 점수 재계산 중 예외 발생: {e}")

    logger.info("")
    logger.info("── 중복 후보 탐지 시작 (dedupe_report) ──")
    dedupe_summary = {"candidates": 0, "sample_pairs": []}
    try:
        source_names = [name for name, *_ in SOURCES]
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
    logger.info("purge_expired:")
    logger.info(f"  checked={purge_summary.get('checked', 0)}")
    logger.info(f"  deleted={purge_summary.get('deleted', 0)}")
    logger.info(f"  failed={purge_summary.get('failed', 0)}")
    logger.info("review_score:")
    logger.info(f"  checked={rescore_summary.get('checked', 0)}")
    logger.info(f"  updated={rescore_summary.get('updated', 0)}")
    logger.info(f"  failed={rescore_summary.get('failed', 0)}")
    logger.info("duplicates:")
    logger.info(f"  candidates={dedupe_summary.get('candidates', 0)}")
    logger.info(f"  sample_pairs={len(dedupe_summary.get('sample_pairs', []) or [])}")


if __name__ == "__main__":
    main()
