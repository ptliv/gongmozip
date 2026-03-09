"""
supabase_client.py — Supabase 연결 및 contests 테이블 저장 유틸

환경변수에서 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 읽어
Supabase 클라이언트를 만들고 contests 테이블에 데이터를 저장합니다.

upsert 기준: source_site + external_id
  - 같은 (source_site, external_id) 조합이 이미 있으면 → UPDATE
  - 없으면 → INSERT
"""

import os
from datetime import date, datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

from utils import logger

# .env.local 또는 .env 파일에서 환경변수 로드
# GitHub Actions에서는 secrets로 주입되므로 load_dotenv는 무시됩니다.
load_dotenv(dotenv_path=".env.local")  # Next.js 프로젝트 루트의 .env.local
load_dotenv(dotenv_path=".env")        # 없으면 .env도 시도

# ------------------------------------------------------------------
# contests.status 허용값 상수
# DB 체크 제약조건(contests_status_check): upcoming | ongoing | closed | canceled
# ------------------------------------------------------------------
CONTEST_STATUS_UPCOMING = "upcoming"
CONTEST_STATUS_ONGOING  = "ongoing"    # 크롤링 직후 기본값 — 현재 모집 중
CONTEST_STATUS_CLOSED   = "closed"
CONTEST_STATUS_CANCELED = "canceled"

# 크롤러가 신규 저장 시 사용하는 기본 status
# 위비티 등 외부 사이트에서 수집한 공고는 현재 모집 중인 것으로 간주
CRAWLED_DEFAULT_STATUS = CONTEST_STATUS_ONGOING


def get_supabase_client() -> Client:
    """
    환경변수에서 자격증명을 읽어 Supabase 클라이언트를 생성합니다.

    필요한 환경변수:
        SUPABASE_URL              — Supabase 프로젝트 URL
        SUPABASE_SERVICE_ROLE_KEY — 서비스 롤 키 (RLS 우회, 쓰기 권한)

    raises:
        ValueError: 환경변수가 설정되지 않은 경우
    """
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise ValueError(
            "환경변수 SUPABASE_URL이 설정되지 않았습니다.\n"
            ".env.local 파일 또는 GitHub Actions secrets를 확인하세요."
        )
    if not key:
        raise ValueError(
            "환경변수 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.\n"
            ".env.local 파일 또는 GitHub Actions secrets를 확인하세요."
        )

    return create_client(url, key)


def upsert_contest(client: Client, contest: dict) -> dict:
    """
    contests 테이블에 공고 1건을 저장합니다.

    이미 같은 source_site + external_id가 있으면 UPDATE,
    없으면 INSERT 합니다.

    Args:
        client:  get_supabase_client()로 만든 클라이언트
        contest: 저장할 공고 데이터 dict

    Returns:
        dict: {"action": "insert"|"update", "id": str} 또는
              {"action": "error", "error": str}

    저장 시 공통 필드를 강제로 덮어씁니다:
        - status      = CRAWLED_DEFAULT_STATUS ("ongoing") — 모집 중으로 간주
        - is_verified = False        (관리자 검증 전)
        - crawled_at  = 현재 UTC 시각
    """
    source_site = contest.get("source_site", "")
    external_id = contest.get("external_id", "")

    # 공통 필드 강제 설정
    # contests_status_check 허용값: upcoming | ongoing | closed | canceled
    # 크롤링한 공고는 현재 모집 중으로 간주 → CRAWLED_DEFAULT_STATUS = "ongoing"
    contest["status"] = CRAWLED_DEFAULT_STATUS
    contest["is_verified"] = False
    contest["crawled_at"] = datetime.now(timezone.utc).isoformat()

    try:
        # ── 1. 기존 데이터 조회 ────────────────────────────────────────
        response = (
            client.table("contests")
            .select("id")
            .eq("source_site", source_site)
            .eq("external_id", external_id)
            .execute()
        )

        existing = response.data  # 리스트, 없으면 []

        # ── 2. UPDATE ──────────────────────────────────────────────────
        if existing:
            record_id = existing[0]["id"]
            # slug는 기존 것을 유지 (UPDATE 시 덮어쓰지 않음)
            update_data = {k: v for k, v in contest.items() if k != "slug"}
            client.table("contests").update(update_data).eq("id", record_id).execute()
            return {"action": "update", "id": record_id}

        # ── 3. INSERT ──────────────────────────────────────────────────
        insert_response = client.table("contests").insert(contest).execute()
        new_id = insert_response.data[0]["id"] if insert_response.data else "unknown"
        return {"action": "insert", "id": new_id}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"DB 저장 실패 [{source_site}:{external_id}] - {error_msg}")
        return {"action": "error", "error": error_msg}


def close_expired_contests(
    client: Client,
    source_site: Optional[str] = None,
    dry_run: bool = False,
) -> dict:
    """
    apply_end_at이 오늘보다 과거인 공고를 status='closed'로 일괄 업데이트합니다.

    조건:
      - status IN ('ongoing', 'upcoming')  — canceled/closed 는 건드리지 않음
      - apply_end_at < 오늘 (NOT NULL)
      - source_site 가 주어지면 해당 소스만, 없으면 전체 테이블 대상

    Args:
        client:      Supabase 클라이언트
        source_site: 특정 소스만 처리할 경우 지정 (None이면 전체)
        dry_run:     True면 조회만 하고 실제 업데이트는 건너뜀

    Returns:
        dict: {
            "today": str,
            "checked": int,       # 조회된 후보 수
            "updated": int,       # 실제 closed 처리된 수 (dry_run이면 0)
            "skipped": int,       # apply_end_at null 등으로 스킵된 수
            "failed": int,        # 업데이트 실패 수
            "failed_samples": list[dict],
            "candidate_samples": list[dict],
        }
    """
    today = date.today().isoformat()          # "YYYY-MM-DD"
    target_statuses = [CONTEST_STATUS_ONGOING, CONTEST_STATUS_UPCOMING]

    summary: dict = {
        "today":             today,
        "checked":           0,
        "updated":           0,
        "skipped":           0,
        "failed":            0,
        "failed_samples":    [],
        "candidate_samples": [],
    }

    mode = "DRY-RUN" if dry_run else "LIVE"
    logger.info(f"[close_expired] 마감 처리 시작 [{mode}] | 기준일: {today}")

    try:
        # ── 1. 후보 조회 ────────────────────────────────────────────
        query = (
            client.table("contests")
            .select("id, title, apply_end_at, status, source_site")
            .in_("status", target_statuses)
            .lt("apply_end_at", today)
            .not_.is_("apply_end_at", "null")
        )
        if source_site:
            query = query.eq("source_site", source_site)

        # 최대 2000건 (운영 초기 충분한 한도)
        response = query.limit(2000).execute()
        candidates = response.data or []

    except Exception as e:
        logger.error(f"[close_expired] 후보 조회 실패: {e}")
        _print_close_summary(summary)
        return summary

    summary["checked"] = len(candidates)
    summary["candidate_samples"] = candidates[:5]

    logger.info(f"[close_expired] 마감 후보: {len(candidates)}건")
    if candidates:
        logger.info("[close_expired] 후보 샘플 (최대 5건):")
        for c in candidates[:5]:
            logger.info(
                f"  id={c['id'][:8]}... "
                f"status={c['status']:<8} "
                f"apply_end_at={c['apply_end_at']} "
                f"source={c.get('source_site','?'):<10} "
                f"title={c.get('title','')[:40]}"
            )

    if not candidates:
        logger.info("[close_expired] 마감 처리 대상 없음")
        _print_close_summary(summary)
        return summary

    if dry_run:
        logger.info(f"[close_expired] DRY-RUN — 실제 업데이트 건너뜀 ({len(candidates)}건 대상)")
        _print_close_summary(summary)
        return summary

    # ── 2. 일괄 UPDATE (filter 기반) ────────────────────────────────
    # ID 목록을 모아서 .in_("id", [...]) 으로 한 번에 업데이트
    # 안전: 100건씩 배치 처리 (URL 길이 한계 방어)
    BATCH_SIZE = 100
    candidate_ids = [c["id"] for c in candidates]

    for batch_start in range(0, len(candidate_ids), BATCH_SIZE):
        batch_ids  = candidate_ids[batch_start : batch_start + BATCH_SIZE]
        batch_num  = batch_start // BATCH_SIZE + 1
        total_batches = (len(candidate_ids) + BATCH_SIZE - 1) // BATCH_SIZE

        try:
            client.table("contests").update(
                {"status": CONTEST_STATUS_CLOSED}
            ).in_("id", batch_ids).execute()

            summary["updated"] += len(batch_ids)
            logger.info(
                f"[close_expired] 배치 {batch_num}/{total_batches} "
                f"→ {len(batch_ids)}건 closed 처리 완료"
            )

        except Exception as e:
            err_msg = str(e)
            logger.error(
                f"[close_expired] 배치 {batch_num}/{total_batches} 실패: {err_msg}"
            )
            summary["failed"] += len(batch_ids)
            for cid in batch_ids[:5]:
                summary["failed_samples"].append({
                    "id":    cid,
                    "error": err_msg[:120],
                })

    _print_close_summary(summary)
    return summary


def _print_close_summary(summary: dict) -> None:
    """close_expired_contests 실행 결과 요약 로그."""
    logger.info("")
    logger.info("=" * 55)
    logger.info("=== CLOSE EXPIRED SUMMARY ===")
    logger.info(f"  today      : {summary['today']}")
    logger.info(f"  checked    : {summary['checked']}건  (status=ongoing/upcoming 중 apply_end_at 경과)")
    logger.info(f"  candidates : {summary['checked']}건")
    logger.info(f"  updated    : {summary['updated']}건")
    logger.info(f"  skipped    : {summary['skipped']}건  (apply_end_at null 등)")
    logger.info(f"  failed     : {summary['failed']}건")

    if summary["failed_samples"]:
        logger.info("  failed_samples (최대 5개):")
        for s in summary["failed_samples"][:5]:
            logger.info(f"    id={s['id'][:8]}... error={s['error'][:80]}")

    if summary["candidate_samples"]:
        logger.info("  sample_titles (후보 최대 5개):")
        for c in summary["candidate_samples"]:
            logger.info(
                f"    [{c.get('status','?')}→closed] {c.get('apply_end_at','?')} "
                f"{c.get('title','')[:50]}"
            )
    logger.info("=" * 55)


def upsert_contests_bulk(client: Client, contests: list[dict]) -> dict:
    """
    공고 목록을 순회하며 upsert_contest()를 호출합니다.

    Args:
        client:   Supabase 클라이언트
        contests: 저장할 공고 dict 리스트

    Returns:
        dict: {"inserted": int, "updated": int, "errors": int}
    """
    result = {"inserted": 0, "updated": 0, "errors": 0}

    for i, contest in enumerate(contests, start=1):
        title = contest.get("title", "(제목 없음)")
        logger.info(f"  [{i}/{len(contests)}] 저장 중: {title}")

        outcome = upsert_contest(client, contest)

        if outcome["action"] == "insert":
            result["inserted"] += 1
            logger.info(f"    → INSERT 완료 (id: {outcome['id']})")
        elif outcome["action"] == "update":
            result["updated"] += 1
            logger.info(f"    → UPDATE 완료 (id: {outcome['id']})")
        else:
            result["errors"] += 1
            logger.error(f"    → 실패: {outcome.get('error', '알 수 없는 오류')}")

    return result
