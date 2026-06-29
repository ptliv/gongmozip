"""
Post-crawl maintenance steps for the unified crawler.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import TypeAlias

from supabase import Client

from utils import logger
from utils.dedupe_report import build_dedupe_report, _print_dedupe_summary
from utils.supabase_client import (
    close_expired_contests,
    purge_expired_contests,
    purge_no_thumbnail_contests,
    rescore_contests,
)

Summary: TypeAlias = dict[str, int | str | list[dict[str, str]]]
PostCrawlSummary: TypeAlias = dict[str, dict]


def run_post_crawl_maintenance(
    client: Client,
    source_names: Sequence[str],
) -> PostCrawlSummary:
    logger.info("")
    logger.info("── 마감 처리 시작 (close_expired_contests) ──")
    close_summary: dict = {"checked": 0, "updated": 0, "failed": 0}
    try:
        close_summary = close_expired_contests(client, source_site=None, dry_run=False)
    except Exception as exc:  # noqa: BROAD_EXCEPT_OK - top-level crawl maintenance boundary
        logger.error(f"마감 처리 중 예외 발생: {exc}")

    logger.info("")
    logger.info("── 마감 공고 폐기 시작 (purge_expired_contests) ──")
    purge_summary: dict = {"checked": 0, "deleted": 0, "failed": 0}
    try:
        purge_summary = purge_expired_contests(client, source_site=None, dry_run=False)
    except Exception as exc:  # noqa: BROAD_EXCEPT_OK
        logger.error(f"마감 공고 폐기 중 예외 발생: {exc}")

    logger.info("")
    logger.info("── 썸네일 없는 공고 폐기 시작 (purge_no_thumbnail_contests) ──")
    thumbnail_summary: dict = {"checked": 0, "deleted": 0, "failed": 0}
    try:
        thumbnail_summary = purge_no_thumbnail_contests(
            client,
            source_site=None,
            dry_run=False,
        )
    except Exception as exc:  # noqa: BROAD_EXCEPT_OK
        logger.error(f"썸네일 없는 공고 폐기 중 예외 발생: {exc}")

    rescore_summary: dict = {"checked": 0, "updated": 0, "failed": 0}
    try:
        logger.info("── 자동 리뷰 점수 재계산 시작 (rescore_contests) ──")
        rescore_summary = rescore_contests(client, source_site=None, dry_run=False)
    except Exception as exc:  # noqa: BROAD_EXCEPT_OK
        logger.error(f"자동 리뷰 점수 재계산 중 예외 발생: {exc}")

    logger.info("")
    logger.info("── 중복 후보 탐지 시작 (dedupe_report) ──")
    dedupe_summary: dict = {"candidates": 0, "sample_pairs": []}
    try:
        dedupe_summary = build_dedupe_report(
            client,
            source_sites=list(source_names),
            limit=10,
        )
        _print_dedupe_summary(dedupe_summary)
    except Exception as exc:  # noqa: BROAD_EXCEPT_OK
        logger.error(f"중복 후보 탐지 중 예외 발생: {exc}")

    return {
        "close_expired": close_summary,
        "purge_expired": purge_summary,
        "purge_no_thumbnail": thumbnail_summary,
        "review_score": rescore_summary,
        "duplicates": dedupe_summary,
    }


def log_crawl_final_summary(
    source_summaries: Sequence[dict],
    maintenance: PostCrawlSummary,
) -> None:
    logger.info("")
    logger.info("=== CRAWL ALL FINAL SUMMARY ===")
    logger.info("sources:")
    for source in source_summaries:
        logger.info(
            f"  - {source['source']}: inserted={source['inserted']}, "
            f"updated={source['updated']}, skipped={source.get('skipped', 0)}, "
            f"failed={source['failed']}, collected={source['collected']}"
        )
    _log_summary("close_expired", maintenance["close_expired"], ("checked", "updated", "failed"))
    _log_summary("purge_expired", maintenance["purge_expired"], ("checked", "deleted", "failed"))
    _log_summary(
        "purge_no_thumbnail",
        maintenance["purge_no_thumbnail"],
        ("checked", "deleted", "failed"),
    )
    _log_summary("review_score", maintenance["review_score"], ("checked", "updated", "failed"))
    duplicates = maintenance["duplicates"]
    logger.info("duplicates:")
    logger.info(f"  candidates={duplicates.get('candidates', 0)}")
    logger.info(f"  sample_pairs={len(duplicates.get('sample_pairs', []) or [])}")


def _log_summary(label: str, summary: dict, keys: Sequence[str]) -> None:
    logger.info(f"{label}:")
    for key in keys:
        logger.info(f"  {key}={summary.get(key, 0)}")
