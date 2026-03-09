"""
allcon.py — 올콘(www.all-con.co.kr) 공모전 목록 크롤러

소스 선택 이유:
  - REST-like JSON API (/page/ajax.contest_list.php) 직접 접근 가능
  - Playwright 불필요 (순수 requests + JSON 파싱)
  - 페이지당 15건, 총 100건+ 공모전, 구조 안정적
  - 경쟁 후보 탈락 이유:
    · thinkcontest: 모든 URL이 index.do로 리다이렉트, JS 의존도 높음
    · campuspick: 순수 SPA, 정적 HTML 없음

API 구조 (실측):
  POST https://www.all-con.co.kr/page/ajax.contest_list.php
  params: t, page, sortname, sortorder, dataRows
  t 값:
    1 → 대학생·일반인 공모전
    2 → 대학생·일반인 대외활동
  응답 JSON:
    { totalCount, totalPage, currentPage, perPage, rows: [...] }
  row 필드:
    cl_srl   : 공모전 ID
    cl_title : HTML (a 태그로 감싼 제목)
    cl_host  : 주최사
    cl_date  : "YY.MM.DD~YY.MM.DD" 형식
    cl_cate  : HTML (분야 텍스트)
    cl_status: HTML (접수중/오늘마감 + D-N)

상세 URL 패턴:
  https://www.all-con.co.kr/view/contest/{cl_srl}

contests.status 허용값 (contests_status_check):
  upcoming | ongoing | closed | canceled
  크롤링 기본값: ongoing
"""

import os
import re
import time
import warnings
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning

from utils import logger
from utils.normalize import (
    clean_str,
    generate_slug,
    default_apply_end_at,
    today_str,
)

# ------------------------------------------------------------------
# 설정 상수
# ------------------------------------------------------------------

SOURCE_SITE = "allcon"
BASE_URL    = "https://www.all-con.co.kr"
API_URL     = "https://www.all-con.co.kr/page/ajax.contest_list.php"
LIST_URL    = "https://www.all-con.co.kr/list/contest/{t}"  # 참조용 (실제 요청은 API)

# 수집 대상 타입 (t 파라미터)
# 1=공모전, 2=대외활동
SOURCE_TYPES: list[dict] = [
    {"t": "1", "label": "공모전", "contest_type": "공모전"},
    {"t": "2", "label": "대외활동", "contest_type": "대외활동"},
]

MAX_PAGES       = 3      # 타입별 최대 페이지 (3 × 15건 = 최대 45건/타입)
PAGE_SIZE       = 15     # API 기본 페이지 크기
REQUEST_DELAY   = 1.0    # 페이지 간 딜레이
REQUEST_TIMEOUT = 15

QUALITY_MIN_COUNT   = 3    # 최소 공고 건수
QUALITY_MIN_AVG_LEN = 8    # 제목 평균 최소 길이

CRAWLED_DEFAULT_STATUS = "ongoing"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.all-con.co.kr/list/contest/1",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
}

DEBUG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "debug"
)

# ------------------------------------------------------------------
# 날짜 파싱
# ------------------------------------------------------------------

_DATE_RANGE_RE = re.compile(
    r"(\d{2})\.(\d{2})\.(\d{2})\s*~\s*(\d{2})\.(\d{2})\.(\d{2})"
)

def _parse_allcon_date_range(raw: str) -> tuple[Optional[str], Optional[str]]:
    """
    올콘 날짜 범위 "YY.MM.DD~YY.MM.DD" → (apply_start_at, apply_end_at).

    예: "26.02.12~26.05.31" → ("2026-02-12", "2026-05-31")
        "26.03.08~26.03.08" → ("2026-03-08", "2026-03-08")

    Returns:
        (apply_start_at, apply_end_at) — 파싱 실패 시 (None, None)
    """
    if not raw:
        return None, None
    m = _DATE_RANGE_RE.search(raw.strip())
    if not m:
        return None, None
    try:
        y1, m1, d1 = int(m.group(1)), int(m.group(2)), int(m.group(3))
        y2, m2, d2 = int(m.group(4)), int(m.group(5)), int(m.group(6))
        start = f"20{y1:02d}-{m1:02d}-{d1:02d}"
        end   = f"20{y2:02d}-{m2:02d}-{d2:02d}"
        return start, end
    except (ValueError, OverflowError):
        return None, None


# ------------------------------------------------------------------
# HTML → 텍스트 파싱
# ------------------------------------------------------------------

def _strip_html(html_str: str) -> str:
    """HTML 태그 제거 후 텍스트 반환."""
    if not html_str:
        return ""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", MarkupResemblesLocatorWarning)
        return BeautifulSoup(html_str, "lxml").get_text(separator=" ", strip=True)


def _extract_title_from_html(cl_title_html: str) -> Optional[str]:
    """
    cl_title HTML에서 공모전 제목만 추출합니다.

    cl_title 형식:
      <a href='/hit/contest/3843?...'>공모전 제목<br><span>카테고리</span></a>
      또는
      <a href='/view/contest/534904?...'>공모전 제목</a>

    처리: <br> 이후 텍스트 제거 → 첫 줄이 실제 제목
    """
    if not cl_title_html:
        return None

    soup = BeautifulSoup(cl_title_html, "lxml")
    a_tag = soup.find("a")
    if not a_tag:
        return clean_str(soup.get_text(strip=True))

    # <br> 이후 텍스트 제거 (카테고리 등이 br 뒤에 붙는 경우)
    for br in a_tag.find_all("br"):
        br.decompose()
    for span in a_tag.find_all("span"):
        span.decompose()

    return clean_str(a_tag.get_text(strip=True))


def _extract_view_url_from_html(cl_title_html: str, cl_srl: str) -> str:
    """
    cl_title HTML의 a 태그 href에서 view URL을 추출합니다.

    /hit/contest/{hit_id}  → /view/contest/{cl_srl} 로 변환
    /view/contest/{id}     → 그대로 사용
    """
    if cl_title_html:
        soup = BeautifulSoup(cl_title_html, "lxml")
        a = soup.find("a", href=True)
        if a:
            href = a["href"]
            # /view/contest/{id}이면 바로 사용
            if "/view/contest/" in href:
                m = re.search(r"/view/contest/(\d+)", href)
                if m:
                    return f"{BASE_URL}/view/contest/{m.group(1)}"

    # cl_srl이 있으면 직접 조합
    if cl_srl:
        return f"{BASE_URL}/view/contest/{cl_srl}"
    return ""


# ------------------------------------------------------------------
# 디버그 유틸
# ------------------------------------------------------------------

def _save_debug_json(data: dict, filename: str) -> None:
    """API 응답 JSON을 디버그 파일로 저장합니다."""
    import json
    try:
        os.makedirs(DEBUG_DIR, exist_ok=True)
        filepath = os.path.join(DEBUG_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"[allcon] 디버그 JSON 저장: {filepath}")
    except Exception as e:
        logger.warning(f"[allcon] 디버그 JSON 저장 실패: {e}")


# ------------------------------------------------------------------
# row → contest dict 변환
# ------------------------------------------------------------------

def _build_contest_dict(
    title: str,
    organizer: str,
    apply_start_at: str,
    apply_end_at: str,
    contest_type: str,
    source_url: str,
    external_id: str,
    raw_payload: dict,
) -> dict:
    """DB 저장용 공고 dict를 생성합니다."""
    slug = generate_slug(title, external_id=f"allcon-{external_id}")
    return {
        "slug":                  slug,
        "title":                 title,
        "organizer":             organizer,
        "summary":               title,
        "description":           title,
        "type":                  contest_type,
        "category":              "기타",
        "field":                 "기타",
        "target":                ["누구나"],
        "region":                "무관",
        "online_offline":        "온·오프라인",
        "team_allowed":          False,
        "apply_start_at":        apply_start_at,
        "apply_end_at":          apply_end_at,
        "status":                CRAWLED_DEFAULT_STATUS,
        "benefit":               {"types": []},
        "official_source_url":   source_url,
        "aggregator_source_url": None,
        "poster_image_url":      None,
        "verified_level":        0,
        "source_site":           SOURCE_SITE,
        "external_id":           str(external_id),
        "raw_payload":           raw_payload,
    }


def _parse_row(row: dict, contest_type: str) -> Optional[dict]:
    """
    API 응답 row 1건을 공모전 dict로 변환합니다.

    Returns:
        dict or None (파싱 실패 또는 유효하지 않은 항목)
    """
    try:
        cl_srl   = str(row.get("cl_srl", "")).strip()
        cl_title = row.get("cl_title", "")
        cl_host  = clean_str(_strip_html(row.get("cl_host", ""))) or "미상"
        cl_date  = row.get("cl_date", "")
        cl_cate  = clean_str(_strip_html(row.get("cl_cate", ""))) or ""

        if not cl_srl:
            return None

        title = _extract_title_from_html(cl_title)
        if not title or len(title) < 4:
            logger.debug(f"[allcon] 제목 미추출 → 스킵: srl={cl_srl}")
            return None

        source_url = _extract_view_url_from_html(cl_title, cl_srl)
        if not source_url:
            source_url = f"{BASE_URL}/view/contest/{cl_srl}"

        apply_start_at, apply_end_at = _parse_allcon_date_range(cl_date)
        if not apply_start_at:
            apply_start_at = today_str()
        if not apply_end_at:
            apply_end_at = default_apply_end_at(months_ahead=3)

        # organizer: HTML에 '(…' 같은 말줄임 포함될 수 있음 → 정리
        organizer = re.sub(r"\(…\)?\s*$", "", cl_host).strip() or "미상"
        organizer = organizer[:80]  # DB 필드 길이 방어

        return _build_contest_dict(
            title=title,
            organizer=organizer,
            apply_start_at=apply_start_at,
            apply_end_at=apply_end_at,
            contest_type=contest_type,
            source_url=source_url,
            external_id=cl_srl,
            raw_payload={
                "raw_title":  cl_title[:200],
                "raw_host":   cl_host,
                "raw_date":   cl_date,
                "raw_cate":   cl_cate,
                "source_t":   contest_type,
            },
        )
    except Exception as e:
        logger.error(f"[allcon] row 파싱 오류: {e} | row={row}")
        return None


# ------------------------------------------------------------------
# API 단일 페이지 요청
# ------------------------------------------------------------------

def _fetch_page(t: str, page: int) -> Optional[dict]:
    """
    올콘 API에서 단일 페이지 데이터를 가져옵니다.

    Returns:
        JSON dict (totalCount, totalPage, rows 포함) or None
    """
    payload = {
        "t":         t,
        "page":      str(page),
        "sortname":  "cl_order",
        "sortorder": "asc",
        "dataRows":  str(PAGE_SIZE),
    }
    try:
        r = requests.post(
            API_URL,
            headers=HEADERS,
            data=payload,
            timeout=REQUEST_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        logger.error(f"[allcon] API 요청 실패 t={t} page={page}: {e}")
        return None
    except Exception as e:
        logger.error(f"[allcon] API 응답 파싱 실패 t={t} page={page}: {e}")
        return None


# ------------------------------------------------------------------
# 품질 검사
# ------------------------------------------------------------------

def _quality_ok(contests: list[dict], label: str) -> bool:
    """파싱 결과 품질을 검사합니다."""
    if not contests:
        logger.warning(f"[allcon] 품질 [{label}]: 0건 → FAIL")
        return False
    if len(contests) < QUALITY_MIN_COUNT:
        logger.warning(f"[allcon] 품질 [{label}]: {len(contests)}건 < {QUALITY_MIN_COUNT} → FAIL")
        return False
    avg_len = sum(len(c.get("title", "")) for c in contests) / len(contests)
    if avg_len < QUALITY_MIN_AVG_LEN:
        logger.warning(f"[allcon] 품질 [{label}]: 평균 제목 {avg_len:.1f}자 → FAIL")
        return False
    logger.info(f"[allcon] 품질 [{label}]: {len(contests)}건, 평균 제목 {avg_len:.1f}자 → OK")
    return True


# ------------------------------------------------------------------
# pre_save_filter
# ------------------------------------------------------------------

_BLOCKED_PREFIXES = ("분야 :", "주최사 :", "접수기간 :", "기간 :", "조회수")

def _pre_save_filter(contests: list[dict]) -> list[dict]:
    """
    저장 직전 최종 검증.

    차단 조건:
      - 제목 6자 미만
      - 메타 접두어로 시작하는 제목
      - external_id 없음
    보정:
      - status = CRAWLED_DEFAULT_STATUS
    """
    valid:   list[dict]       = []
    dropped: dict[str, int]  = {}

    for c in contests:
        title  = c.get("title", "") or ""
        ext_id = c.get("external_id", "")

        if "\n" in title:
            title = title.split("\n")[0].strip()
            c["title"] = title

        if len(title) < 6:
            dropped["title_too_short"] = dropped.get("title_too_short", 0) + 1
            continue

        if any(title.startswith(pfx) for pfx in _BLOCKED_PREFIXES):
            dropped["meta_prefix"] = dropped.get("meta_prefix", 0) + 1
            continue

        if not ext_id:
            dropped["no_external_id"] = dropped.get("no_external_id", 0) + 1
            continue

        c["status"] = CRAWLED_DEFAULT_STATUS
        valid.append(c)

    if dropped:
        logger.warning(f"[allcon] [pre_save_filter] 제외: {dropped}")
    logger.info(f"[allcon] [pre_save_filter] 저장 대상: {len(valid)}건")
    return valid


# ------------------------------------------------------------------
# 중복 제거
# ------------------------------------------------------------------

def _dedupe(contests: list[dict]) -> list[dict]:
    """external_id 기준 중복 제거."""
    seen: set = set()
    unique: list[dict] = []
    for c in contests:
        eid = c.get("external_id")
        if eid and eid not in seen:
            seen.add(eid)
            unique.append(c)
    before = len(contests)
    after  = len(unique)
    if before != after:
        logger.info(f"[allcon] 중복 제거: {before}건 → {after}건")
    return unique


# ------------------------------------------------------------------
# 공개 함수: fetch_allcon_contests
# ------------------------------------------------------------------

def fetch_allcon_contests() -> list[dict]:
    """
    올콘 API에서 공모전/대외활동 목록을 수집합니다.

    SOURCE_TYPES의 각 타입에 대해 MAX_PAGES 페이지까지 순회.

    Returns:
        list[dict]: 저장 대상 공모전 dict 리스트 (중복 제거 완료)
    """
    all_contests: list[dict] = []

    logger.info(
        f"[allcon] 수집 시작 | source_types={[s['label'] for s in SOURCE_TYPES]} "
        f"| 최대 {MAX_PAGES}페이지/타입 | status='{CRAWLED_DEFAULT_STATUS}'"
    )

    for src in SOURCE_TYPES:
        t            = src["t"]
        label        = src["label"]
        contest_type = src["contest_type"]
        type_contests: list[dict] = []
        first_response_saved = False

        logger.info(f"[allcon] [{label}] 수집 시작 (t={t})")

        for page in range(1, MAX_PAGES + 1):
            logger.info(f"[allcon] [{label}] 페이지 {page} 요청")
            data = _fetch_page(t, page)

            if not data or not data.get("rows"):
                logger.warning(f"[allcon] [{label}] 페이지 {page}: 응답 없음 → 종료")
                break

            total_count = data.get("totalCount", 0)
            total_pages = data.get("totalPage", 1)
            rows        = data.get("rows", [])

            logger.info(
                f"[allcon] [{label}] 페이지 {page}/{min(total_pages, MAX_PAGES)} "
                f"| totalCount={total_count} | rows={len(rows)}"
            )

            # 1페이지 API 응답 디버그 저장
            if not first_response_saved:
                _save_debug_json(data, f"allcon_t{t}_p1.json")
                first_response_saved = True

            # row 파싱
            parsed = [c for c in (_parse_row(row, contest_type) for row in rows) if c]
            logger.info(f"[allcon] [{label}] 페이지 {page}: {len(parsed)}건 파싱")

            # 샘플 로그
            for i, c in enumerate(parsed[:3], 1):
                logger.info(
                    f"  [{i}] id={c['external_id']:<7} end={c['apply_end_at']} "
                    f"org={c['organizer'][:12]:<12} | {c['title'][:50]}"
                )

            type_contests.extend(parsed)

            # 마지막 페이지 도달 시 조기 종료
            if page >= total_pages:
                logger.info(f"[allcon] [{label}] 마지막 페이지 도달 ({page}/{total_pages}) → 종료")
                break

            if page < MAX_PAGES:
                time.sleep(REQUEST_DELAY)

        logger.info(f"[allcon] [{label}] 수집 완료: {len(type_contests)}건")
        all_contests.extend(type_contests)

    # 전체 중복 제거 + pre_save_filter
    all_contests = _dedupe(all_contests)
    all_contests = _pre_save_filter(all_contests)

    # 수집 요약 로그
    _log_collect_summary(all_contests)

    return all_contests


def _log_collect_summary(contests: list[dict]) -> None:
    """수집 완료 요약 로그."""
    logger.info("=" * 60)
    logger.info("  ALLCON COLLECT SUMMARY")
    logger.info(f"  raw_collected: {len(contests)}건")
    if contests:
        logger.info("  sample_titles:")
        for i, c in enumerate(contests[:10], 1):
            logger.info(f"    [{i:02d}] {c['title']}")
        logger.info("  sample_urls:")
        for i, c in enumerate(contests[:10], 1):
            logger.info(f"    [{i:02d}] {c.get('official_source_url','N/A')}")
    logger.info("=" * 60)


# ------------------------------------------------------------------
# 전체 파이프라인: run_allcon_pipeline
# ------------------------------------------------------------------

def run_allcon_pipeline() -> dict:
    """
    올콘 수집 → Supabase 저장 전체 파이프라인.

    Returns:
        dict: {
            source, raw_collected, to_save,
            inserted, updated, failed,
            failed_samples, success_samples
        }
    """
    from utils.supabase_client import get_supabase_client, upsert_contest

    summary: dict = {
        "source":          SOURCE_SITE,
        "raw_collected":   0,
        "to_save":         0,
        "inserted":        0,
        "updated":         0,
        "failed":          0,
        "failed_samples":  [],
        "success_samples": [],
    }

    # 1. 수집
    contests = fetch_allcon_contests()
    summary["raw_collected"] = len(contests)
    summary["to_save"]       = len(contests)

    if not contests:
        logger.error("[allcon] 수집 결과 0건 — 저장 건너뜀")
        _print_final_summary(summary)
        return summary

    # 2. Supabase 저장
    logger.info(f"[allcon] Supabase 저장 시작: {len(contests)}건")
    client = get_supabase_client()

    for i, contest in enumerate(contests, start=1):
        title = contest.get("title", "(제목 없음)")
        logger.info(f"  [{i}/{len(contests)}] 저장 중: {title[:50]}")
        outcome = upsert_contest(client, contest)

        if outcome["action"] == "insert":
            summary["inserted"] += 1
            summary["success_samples"].append({
                "action":    "insert",
                "title":     title,
                "deadline":  contest.get("apply_end_at", "N/A"),
                "organizer": contest.get("organizer", "N/A"),
                "url":       contest.get("official_source_url", ""),
                "id":        outcome.get("id"),
            })
            logger.info(f"    → INSERT (id: {outcome.get('id')})")
        elif outcome["action"] == "update":
            summary["updated"] += 1
            summary["success_samples"].append({
                "action":    "update",
                "title":     title,
                "deadline":  contest.get("apply_end_at", "N/A"),
                "organizer": contest.get("organizer", "N/A"),
                "url":       contest.get("official_source_url", ""),
                "id":        outcome.get("id"),
            })
            logger.info(f"    → UPDATE (id: {outcome.get('id')})")
        else:
            summary["failed"] += 1
            err = outcome.get("error", "알 수 없는 오류")
            summary["failed_samples"].append({
                "title":  title,
                "error":  err,
                "ext_id": contest.get("external_id"),
            })
            logger.error(f"    → FAIL: {err[:120]}")

    _print_final_summary(summary)
    return summary


def _print_final_summary(summary: dict) -> None:
    """최종 실행 결과 요약 블록."""
    logger.info("")
    logger.info("=" * 60)
    logger.info("=== NEW SOURCE FINAL SUMMARY ===")
    logger.info(f"  source          : {summary.get('source', SOURCE_SITE)}")
    logger.info(f"  pages_fetched   : (MAX_PAGES={MAX_PAGES}/타입, 타입={len(SOURCE_TYPES)}개)")
    logger.info(f"  raw_collected   : {summary['raw_collected']}건")
    logger.info(f"  after_filter    : {summary['to_save']}건")
    logger.info(f"  inserted        : {summary['inserted']}건")
    logger.info(f"  updated         : {summary['updated']}건")
    logger.info(f"  failed          : {summary['failed']}건")

    if summary["failed_samples"]:
        logger.info("  failed_samples (최대 5개):")
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
