"""
crawl_all.py - Run all configured source crawlers and upsert to Supabase.
"""

import argparse
import os
import sys
import time

# Make `scripts/` importable from project root execution.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils import logger
from utils.ai_content_enrichment import (
    AiEnrichmentSettings,
    enrich_contest_with_vertex_ai,
    has_vertex_environment,
    load_ai_enrichment_settings_from_env,
)
from utils.crawl_postprocess import log_crawl_final_summary, run_post_crawl_maintenance
from utils.supabase_client import get_supabase_client, upsert_contests_bulk
from utils.content_enrichment import enrich_contest_content, is_expired, today_key
from utils.auto_score import has_valid_thumbnail
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


def _discard_without_thumbnail(source_name: str, contests: list[dict]) -> list[dict]:
    """
    썸네일이 없는 공고는 공개/저장 대상에서 제외합니다.
    원본 사이트가 이미지를 제공하지 않으면 AdSense 심사 표면에 얇은 카드가 생기므로
    크롤링 단계에서 버립니다.
    """
    kept: list[dict] = []
    discarded = 0
    for contest in contests:
        if has_valid_thumbnail(contest):
            kept.append(contest)
        else:
            discarded += 1

    if discarded:
        logger.info(f"[{source_name}] 썸네일 없는 공고 폐기: {discarded}건")
    return kept


def _enrich_with_detail(
    source_name: str,
    contests: list[dict],
    fetch_detail_fn,
) -> list[dict]:
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


def _enrich_with_ai(
    source_name: str,
    contests: list[dict],
    ai_settings: AiEnrichmentSettings,
) -> list[dict]:
    if not contests or not ai_settings.enabled or not has_vertex_environment():
        return contests

    for index, contest in enumerate(contests, start=1):
        title_short = contest.get("title", "")[:40]
        try:
            outcome = enrich_contest_with_vertex_ai(contest, settings=ai_settings)
            logger.info(
                f"[{source_name}][ai] [{index}/{len(contests)}] "
                f"{outcome.reason}: {title_short}"
            )
        except Exception as e:
            logger.warning(
                f"[{source_name}][ai] [{index}/{len(contests)}] Gemini 보강 오류: {title_short} — {e}"
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
    ai_settings = load_ai_enrichment_settings_from_env()
    if ai_settings.enabled:
        if has_vertex_environment():
            logger.info(f"Gemini 보강 활성화: model={ai_settings.model}")
        else:
            logger.warning(
                "Gemini 보강 요청됨 but Vertex 환경변수 누락: "
                "GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION"
            )

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
            contests = _enrich_with_detail(
                source_name,
                contests,
                fetch_detail_fn,
            )

        result = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
        if contests:
            contests = _status_guard(source_name, contests)
            contests = _discard_expired(source_name, contests)
            contests = _discard_without_thumbnail(source_name, contests)
            contests = _enrich_with_ai(source_name, contests, ai_settings)

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
            "skipped": result.get("skipped", 0),
            "failed": result["errors"],
            "samples": _sample_rows(contests, limit=3),
        }
        source_summaries.append(source_summary)

        total_inserted += result["inserted"]
        total_updated += result["updated"]
        total_failed += result["errors"]

        logger.info(
            f"[{source_name}] 저장 완료 | "
            f"inserted={result['inserted']} updated={result['updated']} "
            f"skipped={result.get('skipped', 0)} failed={result['errors']}"
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

    source_names = [name for name, *_ in SOURCES]
    maintenance_summary = run_post_crawl_maintenance(client, source_names)
    log_crawl_final_summary(source_summaries, maintenance_summary)


if __name__ == "__main__":
    argparse.ArgumentParser(
        description="Run all configured contest crawlers and optional Gemini enrichment.",
    ).parse_args()
    main()
