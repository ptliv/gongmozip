"""
wevity.py — 위비티(wevity.com) 공모전 목록 크롤러

파싱 파이프라인 (3단계):
  Tier 1  parse_with_bs4()        — requests + BeautifulSoup (정적 HTML)
  Tier 2  parse_with_playwright()  — Playwright JS 렌더링 후 DOM 파싱
  Tier 3  parse_with_agent()       — GPT/Claude 에이전트 (stub, 미구현)

DOM 분석에서 확인된 핵심 구조:
  - div.aside > .cat-area > ul.cat > li  : 분야별/대상별/주최사별 필터 링크
    → 링크 패턴: ?c=find&s=1&gub=N&cidx=N  (gub= 파라미터가 핵심 식별자)
  - 실제 공고 목록                        : main content 영역 (aside 제외)
    → 링크 패턴: ?c=find&s=1&gbn=view&gp=1&ix=105507
    → ix= 이 실제 공고 ID 파라미터 (idx=/cidx= 아님!)
  - 작동하는 목록 URL: https://www.wevity.com/?c=find (ul.list li 16개 확인)
    → 기존 ?c=find&gbn=&s=&order=&list_num=20&find=&page=1 은 PHP PNF 오류 유발

카테고리/필터 링크를 실공고로 오인하지 않도록 구조적으로 방어:
  1. gub= 포함 href → 무조건 필터 링크로 제외
  2. div.aside, ul.cat, .cat-area 영역 → 파싱 대상에서 제외
  3. _is_real_contest_title() → 패턴 + 블랙리스트 기반 강제 필터
  4. _quality_ok() → 10건 미만 또는 카테고리 비율 20% 초과 시 FAIL

contests.status 허용값 (contests_status_check):
  upcoming | ongoing | closed | canceled
  크롤링 기본값: ongoing (현재 모집 중으로 간주)
"""

import copy
import os
import re
import time
from datetime import date, timedelta
from typing import Optional

import requests
from bs4 import BeautifulSoup

from utils import logger
from utils.normalize import (
    clean_str,
    normalize_date,
    normalize_url,
    generate_slug,
    default_apply_end_at,
    today_str,
)

# ------------------------------------------------------------------
# 설정 상수
# ------------------------------------------------------------------

SOURCE_SITE = "wevity"
BASE_URL    = "https://www.wevity.com"
# 작동 확인된 기본 URL (페이지네이션은 discover_wevity_list_url()에서 자동 탐색)
LIST_URL_BASE = "https://www.wevity.com/?c=find"
# {page} 플레이스홀더 — discover_wevity_list_url()이 갱신
LIST_URL      = "https://www.wevity.com/?c=find&gp={page}"

MAX_PAGES       = 3
REQUEST_DELAY   = 1.5
REQUEST_TIMEOUT = 15

# 품질 임계값
QUALITY_MIN_COUNT    = 5     # 최소 공고 건수 (이 미만이면 FAIL)
QUALITY_MAX_CAT_RATE = 0.20  # 카테고리성 제목 허용 비율 (초과 시 FAIL)
QUALITY_MIN_AVG_LEN  = 10    # 제목 평균 최소 길이 (미만이면 FAIL)

# contests.status 허용값 (schema.sql contests_status_check 기준)
CONTEST_STATUS_UPCOMING = "upcoming"
CONTEST_STATUS_ONGOING  = "ongoing"   # 크롤링 기본값 — 현재 모집 중
CONTEST_STATUS_CLOSED   = "closed"
CONTEST_STATUS_CANCELED = "canceled"
CRAWLED_DEFAULT_STATUS  = CONTEST_STATUS_ONGOING

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.wevity.com/",
}

DEBUG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "debug"
)

# ------------------------------------------------------------------
# Primary 선택자
# ------------------------------------------------------------------

SELECTORS = {
    "item_list":   "ul.list > li",
    # 실측 위비티 카드 구조:
    #   .tit > a          : 공모전명 링크 (span.stat 뱃지 포함)
    #   .tit > .sub-tit   : 분야 정보 ("분야 : X, Y, Z")
    #   .organ            : 주최사 (이전: .name — 틀림)
    #   .day              : D-day 카운트다운 ("D-12 접수중")
    "title_link":  ".tit > a",        # 실제 제목 앵커
    "title_badge": "span.stat",       # SPECIAL/IDEA 뱃지 (제목에서 제거)
    "sub_tit":     ".sub-tit",        # 분야 정보
    "organizer":   ".organ",          # 주최사 (확인됨)
    "deadline":    ".day",            # D-day (확인됨)
    "link":        "a",
}

FALLBACK_SELECTOR_CANDIDATES = [
    "ul.list li",
    "ul.lst li",
    ".list_wrap li",
    ".list_area li",
    ".board_list li",
    ".contest_list li",
    ".wrap_list li",
    "section ul li",
    # "li" 전체 선택은 사이드바 필터까지 잡히므로 금지
]

PLAYWRIGHT_CONTAINER_SELECTORS = [
    "ul.list li",
    "ul.lst li",
    ".list_wrap li",
    ".list_area li",
    ".board_list li",
    ".contest_list li",
]

# ------------------------------------------------------------------
# 카테고리 매핑
# ------------------------------------------------------------------

CATEGORY_TO_TYPE = {
    "공모전":  "공모전",
    "대외활동": "대외활동",
    "인턴십":  "인턴십",
    "봉사":    "봉사",
    "교육":    "교육",
    "창업":    "창업",
    "해외":    "해외",
    "기타":    "기타",
}

# ------------------------------------------------------------------
# 필터/카테고리 제목 판별 상수
# ------------------------------------------------------------------

# 사이드바 필터 링크에 포함된 gub= 파라미터 — 이게 있으면 100% 필터 링크
_FILTER_HREF_INDICATORS = [
    "gub=",        # 위비티 필터 그룹 파라미터 (gub=1: 분야, 2: 대상, 3: 주최, 4: 시상)
    "c=event",     # 이벤트 탭
    "c=idea",      # 공모전 전략 탭
    "c=active",    # 대외활동 탭
    "c=comm",      # 공모전 자료 탭
    "c=intro",     # 사이트 소개
    "c=main",      # 메인
]

# 사이드바/네비게이션 DOM 영역 선택자 — 이 안의 링크는 무조건 제외
_EXCLUDE_AREA_SELECTORS = [
    "div.aside",
    "ul.cat",
    ".cat-area",
    "ul.main-menu",
    "ul.m-menus",
    "ul.snb",
    "ul.fm-list",
    "#gnb",
    "#footer",
    ".topbar",
]

# 필터/카테고리 제목 블랙리스트 (정확히 일치)
_FILTER_TITLE_BLACKLIST: set[str] = {
    # 분야별
    "전체", "기획/아이디어", "광고/마케팅", "논문/리포트", "영상/UCC/사진",
    "디자인/캐릭터/웹툰", "웹/모바일/IT", "게임/소프트웨어", "과학/공학",
    "문학/글/시나리오", "건축/건설/인테리어", "네이밍/슬로건", "예체능/미술/음악",
    "대외활동/서포터즈", "봉사활동", "취업/창업", "해외", "기타",
    # 기존 목록 (코드 호환)
    "IT/기술", "디자인/미술", "공연/연예", "건축/설계", "과학기술",
    "문학/글짓기", "사회/환경", "스포츠", "정부/공공기관", "기업/단체",
    "전국/해외", "캠퍼스스타", "서포터즈",
    # 응시대상
    "제한없음", "일반인", "대학생", "청소년", "어린이",
    # 주최사
    "공기업", "대기업", "신문/방송/언론", "외국계기업",
    "중견/중소/벤처기업", "비영리/협회/재단",
    # 시상내역
    "5천만원이상", "5천만원~3천만원", "3천만원~1천만원", "1천만원이하",
    "취업특전", "입사시가산점", "인턴채용", "정직원채용",
    # 이벤트 경품
    "현금/순금", "가전/디지털가전", "상품권/주유권", "IT기기/SW",
    "여행/항공/숙박", "의류/패션/잡화", "화장품/향수/미용", "적립금/포인트",
    "할인권/쿠폰/이용권", "가구/주방/생활용품", "헬스/운동용품",
    "식품/음료/주류/약품", "유아/아동/문구/완구", "자동차/용품",
    "도서/음반", "시사회초대", "콘서트/전시회/공연", "영화/공연예매권", "샘플",
    # 이벤트 응모형태
    "간편응모", "신규가입", "100% 전원당첨", "퀴즈", "퍼즐/낱말퍼즐", "게임",
    "감상평/리플/단문", "사연/후기/장문쓰기", "행시짓기", "노하우/요리법",
    "사진/동영상", "제안/공모", "설문/투표", "소문내기/추천인모집",
    "모니터/테스터/체험", "단순응모", "선착순", "즉석", "SNS",
    # 이벤트 응모대상
    "누구나 참여", "로그인 후 참여", "신규회원참여",
    # HOT 경품
    "IT기기/스마트기기", "상품권/쿠폰", "영화/공연예매",
    # UI 텍스트
    "상세", "상세보기", "보기", "조회", "접수", "more", "MORE",
    "바로가기", "신청", "참여", "클릭", "확인", "이동", "링크",
    "전체 공모전",
}

# 필터성 제목 패턴 (정규식)
_FILTER_TITLE_PATTERNS: list[re.Pattern] = [
    re.compile(r"^\d+천만원"),                   # "5천만원이상", "3천만원~1천만원"
    re.compile(r"\d+천만원[~이]"),               # 금액 범위
    re.compile(r"^(전체|기타|해외|누구나)$"),    # 단일 단어 필터
    re.compile(r"^[가-힣]+/[가-힣]+$"),          # "기획/아이디어" 형 (슬래시만)
    re.compile(r"^[가-힣A-Za-z]+/[가-힣A-Za-z/]+$", re.IGNORECASE),  # 슬래시 분류형
    re.compile(r"100%\s*전원"),                  # "100% 전원당첨"
    re.compile(r"로그인\s*후\s*참여"),           # "로그인 후 참여"
    re.compile(r"신규\s*가입"),                  # "신규가입"
    re.compile(r"간편\s*응모"),                  # "간편응모"
    re.compile(r"누구나\s*참여"),                # "누구나 참여"
]

# anchor fallback reason 상수
_R_EMPTY       = "empty_href"
_R_JS          = "javascript"
_R_HASH        = "hash_only"
_R_PAGE        = "page_link"
_R_NAV_FILTER  = "nav_or_filter"
_R_NO_ID       = "no_id_param"
_R_DUP         = "duplicate"
_R_NO_EID      = "no_external_id"
_R_TITLE       = "junk_title"
_R_ACCEPTED    = "accepted"


# ------------------------------------------------------------------
# 인코딩 보정
# ------------------------------------------------------------------

def _decode_html(response: requests.Response) -> str:
    """HTTP 응답 바이트를 올바른 인코딩으로 디코딩합니다."""
    content_type = response.headers.get("content-type", "")
    apparent     = response.apparent_encoding

    logger.info(f"[wevity] Content-Type     : {content_type}")
    logger.info(f"[wevity] response.encoding: {response.encoding}")
    logger.info(f"[wevity] apparent_encoding: {apparent}")

    candidates: list[str] = []
    ct_match = re.search(r"charset=([^\s;\"']+)", content_type, re.IGNORECASE)
    if ct_match:
        candidates.append(ct_match.group(1).strip())
    if apparent:
        candidates.append(apparent)
    candidates += ["utf-8", "euc-kr", "cp949"]

    seen: set = set()
    unique: list[str] = []
    for enc in candidates:
        key = enc.lower().replace("-", "").replace("_", "")
        if key not in seen:
            seen.add(key)
            unique.append(enc)

    for enc in unique:
        try:
            html = response.content.decode(enc)
            logger.info(f"[wevity] 인코딩 적용: {enc}")
            return html
        except (UnicodeDecodeError, LookupError):
            logger.warning(f"[wevity] 인코딩 실패: {enc}")

    logger.warning("[wevity] 모든 인코딩 실패 → utf-8 errors=replace")
    return response.content.decode("utf-8", errors="replace")


# ------------------------------------------------------------------
# 디버그 유틸
# ------------------------------------------------------------------

def _save_debug_html(html: str, filename: str) -> None:
    try:
        os.makedirs(DEBUG_DIR, exist_ok=True)
        filepath = os.path.join(DEBUG_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)
        logger.info(f"[wevity] 디버그 HTML 저장: {filepath}")
    except Exception as e:
        logger.warning(f"[wevity] 디버그 HTML 저장 실패: {e}")


def _log_selector_counts(soup: BeautifulSoup) -> None:
    checks = [
        "ul.list > li",
        "li",
        "div.aside li",
        "ul.cat li",
        "a[href*='ix=']",
        "a[href*='idx=']",
        "a[href*='cidx=']",
        "a[href*='gub=']",
        "a[href*='c=find']",
        "a[href*='gbn=view']",
        "a",
    ]
    logger.info("[wevity] ── 선택자 진단 ────────────────────────────────")
    for sel in checks:
        try:
            count = len(soup.select(sel))
        except Exception:
            count = -1
        logger.info(f"[wevity]   {sel:<45} → {count:>4}개")
    logger.info("[wevity] ──────────────────────────────────────────────")


# ------------------------------------------------------------------
# DOM 전처리: 사이드바/네비게이션 영역 제거
# ------------------------------------------------------------------

def _get_main_content(soup: BeautifulSoup) -> BeautifulSoup:
    """
    사이드바(div.aside), 네비게이션, 푸터 등을 제거한 본문 영역을 반환합니다.

    위비티 구조:
      - div.aside: 분야별/대상별/주최사별/시상내역 필터 링크 (전부 제외 대상)
      - ul.cat: 각 필터 카테고리 목록
      - #gnb, #footer: 글로벌 네비게이션, 푸터
    """
    content = soup.select_one("#container, .content-area, .content-wrap")
    if content is None:
        logger.warning("[wevity] 본문 컨테이너를 찾지 못함 → soup 전체 사용")
        content = soup

    cloned = copy.copy(content)
    removed = 0
    for sel in _EXCLUDE_AREA_SELECTORS:
        for tag in cloned.select(sel):
            tag.decompose()
            removed += 1

    logger.info(f"[wevity] 본문 추출: 제외 영역 태그 {removed}개 제거")
    return cloned


def _page_has_contest_content(soup: BeautifulSoup) -> bool:
    """
    페이지가 실제 공고 목록을 포함하는지 확인합니다.

    "Page Not Found" 메시지가 본문에 있거나 공고 목록 컨테이너가
    비어있으면 False를 반환합니다.
    """
    # "Page Not Found" 텍스트 확인
    page_text = soup.get_text()
    if "Page Not Found" in page_text:
        logger.warning("[wevity] 페이지에 'Page Not Found' 발견 — 공고 목록 없음")
        return False

    # 본문에 실제 콘텐츠가 있는지 확인 (최소한 list 컨테이너가 있어야)
    main = _get_main_content(soup)
    # 사이드바 제거 후에도 링크가 충분히 있으면 콘텐츠 있다고 간주
    links = main.select("a[href]")
    if len(links) < 3:
        logger.warning(f"[wevity] 본문 링크 {len(links)}개 (사이드바 제외) — 콘텐츠 없음")
        return False

    return True


# ------------------------------------------------------------------
# 목록 URL 자동 탐색
# ------------------------------------------------------------------

_cached_list_url_template: Optional[str] = None  # discover 결과 캐시


def discover_wevity_list_url() -> str:
    """
    위비티 목록 페이지의 작동하는 페이지네이션 URL 패턴을 자동으로 탐색합니다.
    결과를 모듈 레벨 캐시(_cached_list_url_template)에 저장합니다.

    알려진 사실:
      - https://www.wevity.com/?c=find → ul.list li 16개 (정상 작동 확인)
      - 기존 ?c=find&gbn=&s=&order=&list_num=20&find=&page=N → PHP PNF 오류
      - 실공고 상세 링크: ?c=find&s=1&gbn=view&gp=1&ix=105507 (gp=페이지 번호)

    Returns:
        str: {page} 플레이스홀더가 포함된 페이지네이션 URL 템플릿
    """
    global _cached_list_url_template
    if _cached_list_url_template:
        return _cached_list_url_template

    def _cache_and_return(url: str) -> str:
        global _cached_list_url_template
        _cached_list_url_template = url
        return url

    # page 1 확인
    try:
        resp = requests.get(LIST_URL_BASE, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        html = _decode_html(resp)
        soup = BeautifulSoup(html, "lxml")
        items_p1 = soup.select("ul.list li")
        pnf = "Page Not Found" in soup.get_text()
        logger.info(
            f"[wevity] [discover] {LIST_URL_BASE} "
            f"→ ul.list li={len(items_p1)}개, PNF={pnf}"
        )

        if not items_p1 or pnf:
            logger.error("[wevity] [discover] 기본 URL도 공고 없음 → 폴백 URL 사용")
            return _cache_and_return("https://www.wevity.com/?c=find&gp={page}")

        # 페이지네이션 링크 탐색 (soup에서 직접)
        page_hrefs = [
            a.get("href", "") for a in soup.select("a[href]")
            if any(k in a.get("href", "") for k in ["page=", "gp=", "&p="])
            and "gub=" not in a.get("href", "")
            and "ix=" not in a.get("href", "")
        ]
        if page_hrefs:
            logger.info(f"[wevity] [discover] 페이지네이션 href 샘플: {page_hrefs[:5]}")

    except Exception as e:
        logger.error(f"[wevity] [discover] 기본 URL 요청 실패: {e}")
        return _cache_and_return("https://www.wevity.com/?c=find&gp={page}")

    # 페이지 2 패턴 후보 테스트
    pagination_candidates = [
        f"{LIST_URL_BASE}&gp={{page}}",       # gp= (detail URL에서 관측됨)
        f"{LIST_URL_BASE}&page={{page}}",     # 일반적인 page=
        f"{LIST_URL_BASE}&p={{page}}",        # 단축형
        f"https://www.wevity.com/?c=find&s=1&gp={{page}}",
    ]

    for template in pagination_candidates:
        test_url = template.format(page=2)
        try:
            time.sleep(0.5)
            test_resp = requests.get(test_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            test_resp.raise_for_status()
            test_html = _decode_html(test_resp)
            test_soup = BeautifulSoup(test_html, "lxml")
            test_items = test_soup.select("ul.list li")
            test_pnf   = "Page Not Found" in test_soup.get_text()
            logger.info(
                f"[wevity] [discover] 테스트 {test_url} "
                f"→ ul.list li={len(test_items)}개, PNF={test_pnf}"
            )
            if test_items and not test_pnf:
                logger.info(f"[wevity] [discover] 페이지네이션 URL 확정: {template}")
                return _cache_and_return(template)
        except Exception as e:
            logger.warning(f"[wevity] [discover] 테스트 실패: {test_url} — {e}")

    logger.warning(
        "[wevity] [discover] 페이지네이션 패턴 미발견 — 1페이지 단일 수집으로 진행"
    )
    # 어떤 패턴도 동작 안하면 gp= 를 기본으로 (page 1은 LIST_URL_BASE로 따로 처리)
    return _cache_and_return(f"{LIST_URL_BASE}&gp={{page}}")


# ------------------------------------------------------------------
# 핵심 필터 함수
# ------------------------------------------------------------------

def _is_filter_href(href: str) -> bool:
    """
    위비티 사이드바/네비게이션 필터 링크인지 판단합니다.

    핵심: gub= 파라미터가 있으면 100% 필터 링크
      ?c=find&s=1&gub=1&cidx=1  → 분야별 필터
      ?c=find&s=1&gub=2&cidx=4  → 대상별 필터
      ?c=find&s=1&gub=3&cidx=6  → 주최사별 필터
      ?c=find&s=1&gub=4&cidx=8  → 시상내역 필터
    """
    return any(ind in href for ind in _FILTER_HREF_INDICATORS)


def _extract_contest_id(href: str) -> Optional[str]:
    """
    href에서 공모전 고유 ID를 추출합니다. (primary/fallback_selector 전용)

    위비티 실공고 상세 링크 패턴 (실측):
      ?c=find&s=1&gbn=view&gp=1&ix=105507  → ix= 이 실제 공고 ID

    - gub= 있으면 필터 링크 → None
    - ix=숫자 → 우선 반환 (실공고 ID)
    - cidx=숫자 있고 gub= 없음 → 상세 링크 후보
    - idx=숫자 단독 (앞에 알파벳 없음)
    """
    if not href or "gub=" in href:
        return None
    # ix= 이 실제 공고 ID 파라미터 (확인됨: ix=105507 등)
    m = re.search(r"\bix=(\d+)", href)
    if m:
        return m.group(1)
    # cidx= 있고 gub= 없음 (상세 링크 후보)
    if "cidx=" not in href:
        m = re.search(r"(?<![a-z])idx=(\d+)", href)
        if m:
            return m.group(1)
    return None


def _is_real_contest_title(title: str) -> bool:
    """
    제목이 실제 공고 제목인지 판단합니다.

    False 반환 조건 (필터/카테고리/UI 텍스트):
      - 빈 문자열 또는 10자 미만
      - 블랙리스트에 정확히 일치
      - 필터성 패턴에 매칭 (금액 범위, 슬래시 분류형 등)
    """
    if not title or len(title) < 10:
        return False
    if title in _FILTER_TITLE_BLACKLIST:
        return False
    for pattern in _FILTER_TITLE_PATTERNS:
        if pattern.search(title):
            return False
    return True


def _is_category_title(title: str) -> bool:
    """_is_real_contest_title의 역함수. 하위 호환을 위해 유지."""
    return not _is_real_contest_title(title)


# ------------------------------------------------------------------
# 제목 / 필드 / 날짜 추출 헬퍼
# ------------------------------------------------------------------

# 제목에서 제거할 뱃지 접두/접미어 패턴
_BADGE_STRIP_RE = re.compile(
    r"\s*(SPECIAL|IDEA|HOT|NEW|마감임박|추천|즐겨찾기|이벤트)\s*$",
    re.IGNORECASE,
)

def _extract_title_clean(li) -> Optional[str]:
    """
    위비티 카드 <li>에서 실제 공고 제목만 추출합니다.

    구조:
      .tit > a         : 제목 링크 (+ span.stat "SPECIAL"/"IDEA" 뱃지 포함)
      .tit > .sub-tit  : 분야 정보 (제목과 분리)

    처리:
      1. `.tit > a` 를 복사 → span.stat 제거 → 텍스트 추출
      2. 줄바꿈이 있으면 첫 줄 우선 (추가 텍스트 제거)
      3. _BADGE_STRIP_RE 로 남은 뱃지 문자열 제거
    """
    # 우선: .tit > a (위비티 확인된 구조)
    a_tag = li.select_one(SELECTORS["title_link"])
    if a_tag:
        a_copy = copy.copy(a_tag)
        for badge in a_copy.find_all("span"):
            badge.decompose()
        raw = a_copy.get_text(separator=" ", strip=True)
        # 줄바꿈이 있으면 첫 줄
        raw = raw.split("\n")[0].strip()
        raw = _BADGE_STRIP_RE.sub("", raw).strip()
        title = clean_str(raw)
        if title and _is_real_contest_title(title):
            return title

    # 폴백: 일반 선택자 순서대로
    for sel in ["strong.tit", ".title", ".subject", "strong", "b", "h3", "h4", "em"]:
        tag = li.select_one(sel)
        if not tag:
            continue
        t_copy = copy.copy(tag)
        for badge in t_copy.find_all("span"):
            badge.decompose()
        raw = t_copy.get_text(separator=" ", strip=True).split("\n")[0].strip()
        raw = _BADGE_STRIP_RE.sub("", raw).strip()
        title = clean_str(raw)
        if title and _is_real_contest_title(title):
            return title

    # 최후: a 태그 직접 (위 폴백에서도 못 찾은 경우)
    a = li.select_one("a") if li.name != "a" else li
    if a:
        a_copy = copy.copy(a)
        for span in a_copy.find_all("span"):
            span.decompose()
        raw = a_copy.get_text(separator=" ", strip=True).split("\n")[0].strip()
        raw = _BADGE_STRIP_RE.sub("", raw).strip()
        title = clean_str(raw)
        if title and _is_real_contest_title(title):
            return title

    return None


def _extract_title_from_element(el) -> Optional[str]:
    """컨테이너 요소(li 등)에서 제목 텍스트를 추출합니다. (_extract_title_clean 위임)"""
    return _extract_title_clean(el)


# 분야 → 공모전 유형 매핑 (sub-tit 분야 기반)
_FIELD_TO_TYPE: dict[str, str] = {
    "봉사활동":         "봉사",
    "대외활동/서포터즈": "대외활동",
    "취업/창업":        "창업",
    "해외":            "해외",
}

def _extract_fields_from_sub_tit(li) -> tuple[str, list[str]]:
    """
    .sub-tit 에서 분야 정보를 추출합니다.

    Returns:
        (contest_type, field_list)
        contest_type: 공모전/봉사/대외활동/창업/해외 중 하나
        field_list  : 분야 문자열 리스트 (최대 5개)
    """
    sub = li.select_one(SELECTORS["sub_tit"])
    if not sub:
        return "공모전", []

    raw = sub.get_text(strip=True)                 # "분야 : X, Y, Z"
    raw = re.sub(r"^분야\s*:\s*", "", raw)         # "X, Y, Z"
    fields = [f.strip() for f in raw.split(",") if f.strip()]

    # 분야 목록에서 대표 유형 결정 (우선순위: 봉사 > 대외활동 > 창업 > 해외 > 공모전)
    contest_type = "공모전"
    for field in fields:
        if field in _FIELD_TO_TYPE:
            contest_type = _FIELD_TO_TYPE[field]
            break  # 우선순위대로 첫 번째 매칭

    return contest_type, fields


def _dday_to_date(day_text: str) -> Optional[str]:
    """
    위비티 D-day 텍스트에서 마감일을 계산합니다.

    예:  "D-12 접수중"  → 오늘 + 12일
         "D-0 접수중"   → 오늘
         "D-365 접수중" → 오늘 + 365일
         "마감"         → None (이미 마감)
         "접수예정"     → None

    Returns:
        "YYYY-MM-DD" 문자열 또는 None
    """
    if not day_text:
        return None
    m = re.search(r"D-(\d+)", day_text)
    if m:
        days_left = int(m.group(1))
        target = date.today() + timedelta(days=days_left)
        return target.strftime("%Y-%m-%d")
    return None


# ------------------------------------------------------------------
# 공통 dict 생성
# ------------------------------------------------------------------

def _build_contest_dict(
    title: str,
    organizer: str,
    apply_end_at: str,
    contest_type: str,
    source_url: Optional[str],
    external_id: str,
    raw_payload: dict,
) -> dict:
    """
    DB 저장용 공고 dict를 생성합니다.
    status는 CRAWLED_DEFAULT_STATUS("ongoing") 사용.
    supabase_client.py에서도 동일하게 설정됩니다.
    """
    slug = generate_slug(title, external_id=f"wevity-{external_id}")
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
        "apply_start_at":        today_str(),
        "apply_end_at":          apply_end_at,
        "benefit":               {"types": []},
        "official_source_url":   source_url or "",
        "aggregator_source_url": None,
        "poster_image_url":      None,
        "verified_level":        0,
        "source_site":           SOURCE_SITE,
        "source_url":            source_url,
        "official_url":          None,
        "external_id":           external_id,
        "raw_payload":           raw_payload,
    }


# ------------------------------------------------------------------
# Primary 파싱
# ------------------------------------------------------------------

def _parse_item_primary(tag) -> Optional[dict]:
    """
    SELECTORS 기반으로 위비티 <li> 하나를 파싱합니다.

    위비티 카드 구조 (실측):
      .tit > a       : 제목 링크 (span.stat 뱃지 포함 → 제거 후 추출)
      .tit > .sub-tit: 분야 정보
      .organ         : 주최사
      .day           : D-day ("D-12 접수중")
    """
    try:
        # ── 링크 추출 (.tit > a 우선, 없으면 첫 번째 a) ────────────────
        a_tag = tag.select_one(SELECTORS["title_link"]) or tag.select_one(SELECTORS["link"])
        if not a_tag:
            return None

        href = a_tag.get("href", "")
        if _is_filter_href(href):
            return None

        external_id = _extract_contest_id(href)
        if not external_id:
            return None

        source_url = normalize_url(href, BASE_URL)

        # ── 제목: span.stat 뱃지 제거 후 첫 줄 ──────────────────────────
        title = _extract_title_clean(tag)
        if not title:
            return None

        # ── 주최사: .organ (이전: .name — 잘못된 선택자) ────────────────
        organizer_tag = tag.select_one(SELECTORS["organizer"])
        organizer     = clean_str(organizer_tag.get_text()) if organizer_tag else "미상"
        if not organizer:
            organizer = "미상"

        # ── 마감일: .day "D-12 접수중" → 오늘+12일 ──────────────────────
        deadline_tag = tag.select_one(SELECTORS["deadline"])
        raw_day      = clean_str(deadline_tag.get_text(separator=" ")) if deadline_tag else None
        apply_end_at = _dday_to_date(raw_day) if raw_day else None
        if not apply_end_at:
            apply_end_at = default_apply_end_at(months_ahead=3)

        # ── 분야 + 공모전 유형: .sub-tit ────────────────────────────────
        contest_type, field_list = _extract_fields_from_sub_tit(tag)
        raw_fields = ", ".join(field_list) if field_list else ""

        return _build_contest_dict(
            title=title,
            organizer=organizer,
            apply_end_at=apply_end_at,
            contest_type=contest_type,
            source_url=source_url,
            external_id=external_id,
            raw_payload={
                "raw_title":     title,
                "raw_organizer": organizer,
                "raw_day":       raw_day,
                "raw_fields":    raw_fields,
                "href":          href,
                "parse_mode":    "primary",
            },
        )
    except Exception as e:
        logger.error(f"  [primary] 항목 파싱 오류: {e}")
        return None


# ------------------------------------------------------------------
# Fallback 파싱 (selector 기반)
# ------------------------------------------------------------------

def _parse_elements_as_contests(elements: list) -> list[dict]:
    """
    요소 목록(li 등)에서 유효한 공모전만 파싱합니다.
    필터 링크(gub=)와 카테고리성 제목은 자동 제외됩니다.
    """
    results = []
    for el in elements:
        # 필터 링크 제외 + 실제 contest 링크(idx=) 있는 것만
        a_tag = None
        for a in el.find_all("a", href=True):
            href = a.get("href", "")
            if _is_filter_href(href):
                continue
            if _extract_contest_id(href):
                a_tag = a
                break

        if not a_tag:
            continue

        href        = a_tag.get("href", "")
        external_id = _extract_contest_id(href)
        if not external_id:
            continue

        source_url = normalize_url(href, BASE_URL)

        title = _extract_title_from_element(el)
        if not title:
            continue

        deadline_tag = el.select_one(".date, .deadline, .d-day, time")
        raw_deadline = clean_str(deadline_tag.get_text()) if deadline_tag else None
        apply_end_at = normalize_date(raw_deadline) if raw_deadline else None
        if not apply_end_at:
            apply_end_at = default_apply_end_at(months_ahead=3)

        organizer_tag = el.select_one(".name, .organizer, .host, .company")
        organizer     = clean_str(organizer_tag.get_text()) if organizer_tag else "미상"

        results.append(_build_contest_dict(
            title=title,
            organizer=organizer,
            apply_end_at=apply_end_at,
            contest_type="공모전",
            source_url=source_url,
            external_id=external_id,
            raw_payload={
                "raw_title":    title,
                "raw_deadline": raw_deadline,
                "href":         href,
                "parse_mode":   "fallback_selector",
            },
        ))

    return results


# ------------------------------------------------------------------
# Anchor 기반 Fallback
# ------------------------------------------------------------------

def _is_valid_contest_link(href: str) -> tuple[bool, str]:
    """
    anchor href가 위비티 공고 상세 링크 후보인지 판단합니다.

    Returns:
        (True,  _R_ACCEPTED) — 상세 링크 후보
        (False, reason)      — 탈락 사유

    핵심 제외 조건:
      - gub= 포함 → 위비티 필터 링크 (_R_NAV_FILTER)
      - page= 포함 → 페이지네이션 (_R_PAGE)
      - 기타 네비게이션 패턴 → _R_NAV_FILTER

    허용 조건:
      - cidx= 있고 gub= 없음 (= 상세 링크 후보)
      - idx= 단독 (앞에 알파벳 없음)
    """
    if not href or not href.strip():
        return False, _R_EMPTY
    if href.startswith("javascript:"):
        return False, _R_JS
    if href.strip() == "#":
        return False, _R_HASH
    if "page=" in href:
        return False, _R_PAGE

    # gub= 가 있으면 무조건 필터 링크
    if _is_filter_href(href):
        return False, _R_NAV_FILTER

    # ix= 있음 → 실공고 상세 링크 (확인됨: ?c=find&s=1&gbn=view&gp=1&ix=105507)
    if re.search(r"\bix=\d+", href):
        return True, _R_ACCEPTED

    # cidx= 있고 gub= 없음 → 상세 링크 후보
    if "cidx=" in href:
        return True, _R_ACCEPTED

    # idx= 단독 (cidx, widx 등 제외)
    if re.search(r"(?<![a-z])idx=\d+", href):
        return True, _R_ACCEPTED

    return False, _R_NO_ID


def _extract_id_from_anchor_href(href: str) -> Optional[str]:
    """
    anchor fallback 전용 external_id 추출.
      ix=숫자   → "숫자"        (실공고 ID, 최우선)
      cidx=숫자 → "cidx_숫자"
      idx=숫자  → "idx_숫자"
    """
    if not href:
        return None
    # ix= 이 실공고 ID (e.g., ?c=find&s=1&gbn=view&gp=1&ix=105507)
    m = re.search(r"\bix=(\d+)", href)
    if m:
        return m.group(1)
    m = re.search(r"cidx=(\d+)", href)
    if m:
        return f"cidx_{m.group(1)}"
    m = re.search(r"(?<![a-z])idx=(\d+)", href)
    if m:
        return f"idx_{m.group(1)}"
    return None


def _normalize_wevity_url(href: str) -> str:
    return normalize_url(href, BASE_URL)


def _extract_links_from_anchors(main_content: BeautifulSoup) -> list[dict]:
    """
    본문 영역(사이드바 제거 후)에서 위비티 공고 상세 링크를 추출합니다.

    주의: main_content는 _get_main_content()로 사이드바가 제거된 soup입니다.
    """
    # 후보 앵커 수집 (합집합)
    seen_tag_ids: set = set()
    anchor_candidates: list = []

    for sel in ["a[href*='cidx=']", "a[href*='idx=']", "a[href]"]:
        for a in main_content.select(sel):
            if id(a) not in seen_tag_ids:
                seen_tag_ids.add(id(a))
                anchor_candidates.append(a)

    logger.info(
        f"[wevity] [anchor fallback] 후보 앵커: {len(anchor_candidates)}개 (사이드바 제외 후)"
    )

    # 샘플 href 출력
    raw_hrefs = [a.get("href", "") for a in anchor_candidates]
    logger.info("[wevity] [anchor fallback] 원본 href 샘플 (최대 20개):")
    for i, h in enumerate(raw_hrefs[:20], 1):
        logger.info(f"  [{i:02d}] {h}")

    # 필터링 + reason 집계
    reason_counts: dict[str, int] = {
        k: 0 for k in [_R_EMPTY, _R_JS, _R_HASH, _R_PAGE,
                        _R_NAV_FILTER, _R_NO_ID, _R_DUP,
                        _R_NO_EID, _R_TITLE, _R_ACCEPTED]
    }

    seen_hrefs: set        = set()
    valid_anchors: list    = []
    rejected_samples: list = []

    for a in anchor_candidates:
        href = a.get("href", "")
        ok, reason = _is_valid_contest_link(href)

        if not ok:
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
            if len(rejected_samples) < 20:
                rejected_samples.append({
                    "href":   href[:120],
                    "title":  a.get_text(" ", strip=True)[:60],
                    "reason": reason,
                })
            continue

        abs_url = _normalize_wevity_url(href)
        if abs_url in seen_hrefs:
            reason_counts[_R_DUP] += 1
            continue
        seen_hrefs.add(abs_url)
        reason_counts[_R_ACCEPTED] += 1
        valid_anchors.append((a, abs_url, href))

    logger.info(
        f"[wevity] [anchor fallback] 유효 링크: {len(valid_anchors)}개 (중복 제거 후)"
    )
    logger.info(f"[wevity] [anchor fallback] 탈락 사유: {reason_counts}")

    if rejected_samples:
        logger.info("[wevity] [anchor fallback] rejected 샘플 (최대 20개):")
        for i, r in enumerate(rejected_samples, 1):
            logger.info(
                f"  [{i:02d}] reason={r['reason']!r:20s} "
                f"title={r['title'][:30]!r:32s} href={r['href']}"
            )

    if valid_anchors:
        logger.info("[wevity] [anchor fallback] accepted 샘플 (최대 10개):")
        for i, (a, url, href) in enumerate(valid_anchors[:10], 1):
            t = a.get_text(" ", strip=True)[:60]
            logger.info(f"  [{i:02d}] title={t!r:40s} url={url}")
    else:
        logger.warning("[wevity] [anchor fallback] accepted=0 — 사이드바 제거 후에도 유효 링크 없음")

    # 공고 dict 생성
    results: list[dict] = []
    for a_tag, abs_url, href in valid_anchors:
        external_id = _extract_id_from_anchor_href(href)
        if not external_id:
            reason_counts[_R_NO_EID] += 1
            continue

        raw_title = a_tag.get_text(" ", strip=True)
        title     = clean_str(raw_title)

        if not title or not _is_real_contest_title(title):
            reason_counts[_R_TITLE] += 1
            continue

        apply_end_at = default_apply_end_at(months_ahead=3)

        results.append(_build_contest_dict(
            title=title,
            organizer="미상",
            apply_end_at=apply_end_at,
            contest_type="공모전",
            source_url=abs_url,
            external_id=external_id,
            raw_payload={
                "raw_title":  raw_title,
                "href":       href,
                "parse_mode": "anchor_fallback",
            },
        ))

    logger.info(f"[wevity] [anchor fallback] 최종 파싱: {len(results)}건")
    return results


def _fallback_parse(soup: BeautifulSoup) -> list[dict]:
    """
    FALLBACK_SELECTOR_CANDIDATES → anchor fallback 순으로 시도합니다.
    사이드바(div.aside 등)는 제거 후 탐색합니다.
    """
    main = _get_main_content(soup)

    logger.info("[wevity] ── fallback 선택자 후보 탐색 ──────────────────")
    for selector in FALLBACK_SELECTOR_CANDIDATES:
        elements = main.select(selector)
        if not elements:
            logger.info(f"[wevity] 후보 '{selector:<25}': 요소 없음")
            continue

        # 필터 링크(gub=) 제외 후 실제 contest 링크 있는 요소만
        valid_elements = [
            el for el in elements
            if any(
                (not _is_filter_href(a.get("href", "")) and
                 _extract_contest_id(a.get("href", "")))
                for a in el.find_all("a", href=True)
            )
        ]

        if not valid_elements:
            logger.info(
                f"[wevity] 후보 '{selector:<25}': "
                f"{len(elements)}개 중 실공고 링크 없음"
            )
            continue

        sample_titles = [
            t for el in valid_elements[:5]
            if (t := _extract_title_from_element(el))
        ]
        logger.info(
            f"[wevity] 후보 '{selector:<25}': {len(valid_elements)}건, "
            f"샘플 → {sample_titles}"
        )

        if len(valid_elements) >= 3:
            logger.info(f"[wevity] 채택 선택자: '{selector}'")
            logger.info("[wevity] ──────────────────────────────────────────────")
            return _parse_elements_as_contests(valid_elements)

    logger.info("[wevity] ──────────────────────────────────────────────")
    logger.warning("[wevity] li 기반 fallback 전부 실패 → anchor fallback 시도")

    anchor_results = _extract_links_from_anchors(main)
    if anchor_results:
        logger.info(f"[wevity] anchor fallback 성공: {len(anchor_results)}건")
    else:
        logger.warning("[wevity] anchor fallback도 0건")
    return anchor_results


# ------------------------------------------------------------------
# 품질 검사 (강화)
# ------------------------------------------------------------------

def _quality_ok(contests: list[dict], label: str = "") -> bool:
    """
    파싱 결과 품질을 검사합니다.

    FAIL 조건:
      1. 결과 0건
      2. QUALITY_MIN_COUNT(5) 건 미만
      3. 카테고리성 제목 비율 > QUALITY_MAX_CAT_RATE(20%)
      4. 제목 평균 길이 < QUALITY_MIN_AVG_LEN(10)
    """
    prefix = f"[wevity] 품질 검사 [{label}]:"

    if not contests:
        logger.warning(f"{prefix} 0건 → FAIL")
        return False

    n = len(contests)
    if n < QUALITY_MIN_COUNT:
        logger.warning(f"{prefix} {n}건 < 최소 {QUALITY_MIN_COUNT}건 → FAIL")
        return False

    cat_count = sum(1 for c in contests if not _is_real_contest_title(c.get("title", "")))
    cat_rate  = cat_count / n
    if cat_rate > QUALITY_MAX_CAT_RATE:
        logger.warning(
            f"{prefix} 카테고리 비율 {cat_count}/{n} ({cat_rate:.0%}) "
            f"> {QUALITY_MAX_CAT_RATE:.0%} → FAIL"
        )
        return False

    avg_len = sum(len(c.get("title", "")) for c in contests) / n
    if avg_len < QUALITY_MIN_AVG_LEN:
        logger.warning(
            f"{prefix} 제목 평균 길이 {avg_len:.1f} < {QUALITY_MIN_AVG_LEN} → FAIL"
        )
        return False

    logger.info(
        f"{prefix} {n}건, 카테고리 {cat_rate:.0%}, 평균 제목 길이 {avg_len:.1f} → OK"
    )
    return True


# ------------------------------------------------------------------
# 저장 직전 방어 필터
# ------------------------------------------------------------------

# 저장 금지 제목 접두어
_BLOCKED_TITLE_PREFIXES = ("분야 :", "주최사 :", "접수기간 :", "모집기간 :", "기간 :", "조회수")

def _pre_save_filter(contests: list[dict]) -> list[dict]:
    """
    저장 직전 최종 검증 (강화).

    차단 조건:
      1. _is_real_contest_title() 실패 (블랙리스트/패턴)
      2. 제목 길이 6자 미만
      3. 제목이 메타 접두어("분야 :", "주최사 :" 등)로 시작
      4. 제목에 줄바꿈 포함 → 정리 후 재검사
      5. external_id 가 숫자가 아닌 것 (ix= 기반 ID는 순수 숫자)
         단, "cidx_NNN"/"idx_NNN" 같은 fallback ID는 경고만 출력하고 허용
      6. source_url 에 gub= 포함 (필터 링크)
    허용 후:
      - status를 CRAWLED_DEFAULT_STATUS로 강제 보정
    """
    valid   = []
    dropped_reasons: dict[str, int] = {}

    def _drop(reason: str, title: str) -> None:
        dropped_reasons[reason] = dropped_reasons.get(reason, 0) + 1
        logger.debug(f"[wevity] [pre_save_filter] DROP({reason}): {title!r}")

    for c in contests:
        title      = c.get("title", "") or ""
        source_url = c.get("official_source_url", "") or c.get("source_url", "") or ""
        ext_id     = c.get("external_id", "") or ""

        # ── 줄바꿈 정리 ──────────────────────────────────────────────
        if "\n" in title:
            title = title.split("\n")[0].strip()
            c["title"] = title

        # ── 제목 길이 ────────────────────────────────────────────────
        if len(title) < 6:
            _drop("title_too_short", title)
            continue

        # ── 메타 접두어 차단 ─────────────────────────────────────────
        if any(title.startswith(pfx) for pfx in _BLOCKED_TITLE_PREFIXES):
            _drop("title_meta_prefix", title)
            continue

        # ── 실공고 제목 검증 ─────────────────────────────────────────
        if not _is_real_contest_title(title):
            _drop("junk_title", title)
            continue

        # ── gub= 필터 링크 차단 ──────────────────────────────────────
        if "gub=" in source_url:
            _drop("filter_url", title)
            continue

        # ── ix= 기반 순수 숫자 ID 권고 (fallback ID는 허용) ────────────
        if not ext_id:
            _drop("no_external_id", title)
            continue
        if not ext_id.isdigit():
            logger.debug(
                f"[wevity] [pre_save_filter] WARN: fallback ID({ext_id!r}) — {title!r}"
            )
            # fallback ID(cidx_NNN, idx_NNN)는 경고만, 차단 안 함

        # ── status 최종 보정 ─────────────────────────────────────────
        c["status"] = CRAWLED_DEFAULT_STATUS
        valid.append(c)

    total_dropped = sum(dropped_reasons.values())
    if total_dropped:
        logger.warning(
            f"[wevity] [pre_save_filter] {total_dropped}건 제외 — 사유: {dropped_reasons}"
        )
    if not valid:
        logger.error(
            "[wevity] [pre_save_filter] 실공고 0건 → 저장 중단. "
            "파싱 로직 또는 사이트 구조를 확인하세요."
        )

    logger.info(f"[wevity] [pre_save_filter] 저장 대상: {len(valid)}건")
    return valid


# ------------------------------------------------------------------
# 중복 제거
# ------------------------------------------------------------------

def _dedupe(contests: list[dict]) -> list[dict]:
    """external_id 기준 중복 제거. 먼저 들어온 것을 유지합니다."""
    before = len(contests)
    seen: set = set()
    unique = []
    for c in contests:
        eid = c.get("external_id")
        if eid and eid not in seen:
            seen.add(eid)
            unique.append(c)
    after = len(unique)
    if before != after:
        logger.info(f"[wevity] 중복 제거: {before}건 → {after}건")
    return unique


# ==================================================================
# 파싱 파이프라인
# ==================================================================

# ------------------------------------------------------------------
# Tier 1: BS4 파싱
# ------------------------------------------------------------------

def parse_with_bs4(soup: BeautifulSoup) -> list[dict]:
    """
    Tier 1: requests + BeautifulSoup 기반 정적 HTML 파싱.
    사이드바 제거 → primary → fallback_selector → anchor_fallback 순으로 시도.
    """
    if not _page_has_contest_content(soup):
        logger.warning("[wevity] [bs4] 공고 목록 없음 (Page Not Found 등) → 0건")
        return []

    # Primary (사이드바가 없는 main content 기준)
    main = _get_main_content(soup)
    items = main.select(SELECTORS["item_list"])

    if items:
        results = [r for r in (_parse_item_primary(i) for i in items) if r]
        if results:
            logger.info(f"[wevity] [bs4] primary: {len(results)}건")
            return results
        logger.warning("[wevity] [bs4] primary 요소 있으나 파싱 0건 → fallback")
    else:
        logger.warning("[wevity] [bs4] primary 선택자 0건 → fallback")

    results = _fallback_parse(soup)
    logger.info(f"[wevity] [bs4] fallback: {len(results)}건")
    return results


# ------------------------------------------------------------------
# Tier 2: Playwright 파싱
# ------------------------------------------------------------------

def _parse_with_playwright_dom(page) -> list[dict]:
    """
    Playwright DOM API로 렌더링된 페이지에서 공고 카드를 직접 추출합니다.
    사이드바(div.aside)는 제외하고 실제 공고 목록만 대상으로 합니다.
    """
    for sel in PLAYWRIGHT_CONTAINER_SELECTORS:
        try:
            items = page.query_selector_all(sel)
        except Exception as e:
            logger.warning(f"[wevity] [playwright_dom] 선택자 '{sel}' 오류: {e}")
            continue

        if not items:
            continue

        contest_items: list[dict] = []

        for item in items:
            try:
                # 사이드바 내 요소 제외
                in_aside = item.evaluate(
                    "el => !!el.closest('.aside, .cat-area, ul.cat, #gnb, #footer')"
                )
                if in_aside:
                    continue

                # 공고 링크 찾기 (gub= 없고 cidx= 또는 idx= 있는 것만)
                a_el = None
                debug_href = ""
                for a in item.query_selector_all("a[href]"):
                    href = a.get_attribute("href") or ""
                    debug_href = href
                    ok, reason = _is_valid_contest_link(href)
                    if ok:
                        a_el = a
                        break

                if not a_el:
                    continue

                href = a_el.get_attribute("href") or ""
                external_id = _extract_id_from_anchor_href(href)
                if not external_id:
                    continue

                # 제목 추출
                title_el = item.query_selector(".tit, .title, strong, b, h3, h4, em")
                title = (
                    clean_str(title_el.inner_text()) if title_el
                    else clean_str(a_el.inner_text())
                )

                # 실공고 제목 검증
                if not title or not _is_real_contest_title(title):
                    logger.debug(
                        f"[wevity] [playwright_dom] 제외: title={title!r} href={href}"
                    )
                    continue

                source_url = _normalize_wevity_url(href)

                org_el    = item.query_selector(".name, .organizer, .host, .company")
                organizer = clean_str(org_el.inner_text()) if org_el else "미상"

                date_el      = item.query_selector(".date, .deadline, .d-day, time")
                raw_deadline = clean_str(date_el.inner_text()) if date_el else None
                apply_end_at = (
                    normalize_date(raw_deadline) if raw_deadline
                    else default_apply_end_at(months_ahead=3)
                )

                contest_items.append(_build_contest_dict(
                    title=title,
                    organizer=organizer,
                    apply_end_at=apply_end_at,
                    contest_type="공모전",
                    source_url=source_url,
                    external_id=external_id,
                    raw_payload={
                        "raw_title":    title,
                        "raw_deadline": raw_deadline,
                        "href":         href,
                        "parse_mode":   "playwright_dom",
                    },
                ))

            except Exception as e:
                logger.warning(f"[wevity] [playwright_dom] 항목 파싱 오류: {e}")
                continue

        if len(contest_items) >= 3:
            logger.info(
                f"[wevity] [playwright_dom] 채택 선택자: '{sel}' → {len(contest_items)}건"
            )
            return contest_items

    logger.warning("[wevity] [playwright_dom] 모든 선택자 실패 → 0건")
    return []


def parse_with_playwright(url: str) -> list[dict]:
    """
    Tier 2: Playwright 기반 JS 렌더링 후 DOM 파싱.
    playwright 미설치 시 즉시 [] 반환합니다.
    """
    try:
        from playwright.sync_api import sync_playwright
        from playwright.sync_api import TimeoutError as PWTimeout
    except ImportError:
        logger.warning("[wevity] [playwright] playwright 미설치 → 건너뜀")
        return []

    logger.info(f"[wevity] [playwright] 시작: {url}")
    results: list[dict] = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            context = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="ko-KR",
            )
            pw_page = context.new_page()

            try:
                pw_page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                pw_page.wait_for_timeout(3_000)
            except PWTimeout:
                logger.warning(f"[wevity] [playwright] 페이지 로드 타임아웃: {url}")

            html = pw_page.content()
            soup = BeautifulSoup(html, "lxml")

            _log_selector_counts(soup)
            _save_debug_html(html, "wevity_playwright.html")

            # "Page Not Found" 확인
            if not _page_has_contest_content(soup):
                logger.warning("[wevity] [playwright] 공고 목록 없음 → DOM API 시도")
            else:
                results = parse_with_bs4(soup)
                if _quality_ok(results, label="playwright+bs4"):
                    logger.info(
                        f"[wevity] [playwright] bs4 재파싱 성공: {len(results)}건"
                    )
                    context.close()
                    browser.close()
                    return results
                logger.warning(
                    f"[wevity] [playwright] bs4 재파싱 품질 불량 ({len(results)}건) "
                    "→ DOM API 시도"
                )

            results = _parse_with_playwright_dom(pw_page)
            if results:
                logger.info(
                    f"[wevity] [playwright] DOM API 파싱 성공: {len(results)}건"
                )
            else:
                logger.warning("[wevity] [playwright] DOM API도 0건")

            context.close()
            browser.close()

    except Exception as e:
        logger.error(f"[wevity] [playwright] 치명적 오류: {e}", exc_info=True)

    return results


# ------------------------------------------------------------------
# Tier 3: Agent 파싱 (stub)
# ------------------------------------------------------------------

def parse_with_agent(html: str) -> list[dict]:
    """
    Tier 3: GPT/Claude 에이전트 기반 파싱 — 미구현 stub.
    향후 LLM 호출 로직을 여기에 추가하세요.
    """
    logger.warning("[wevity] [agent] 미구현 stub — 0건 반환")
    return []


# ------------------------------------------------------------------
# 파이프라인 실행 (단일 페이지)
# ------------------------------------------------------------------

def _run_parse_pipeline(
    html: str,
    soup: BeautifulSoup,
    url: str,
    page_no: int,
) -> tuple[list[dict], str]:
    """
    단일 페이지에 대해 Tier 1 → 2 → 3 파이프라인을 실행합니다.
    각 Tier 결과를 _quality_ok()로 검사하고 통과하면 반환합니다.

    Returns:
        (contests, tier_label)
    """
    logger.info(
        f"[wevity] 파이프라인 시작 (페이지 {page_no}) — "
        f"status 기본값: '{CRAWLED_DEFAULT_STATUS}' "
        f"(허용값: upcoming|ongoing|closed|canceled)"
    )

    # Tier 1: BS4
    contests = parse_with_bs4(soup)
    if _quality_ok(contests, label=f"bs4/p{page_no}"):
        return contests, "bs4"

    logger.warning(
        f"[wevity] 페이지 {page_no}: bs4 품질 불량 ({len(contests)}건) → Playwright"
    )

    # Tier 2: Playwright
    contests = parse_with_playwright(url)
    if _quality_ok(contests, label=f"playwright/p{page_no}"):
        return contests, "playwright"

    logger.warning(
        f"[wevity] 페이지 {page_no}: Playwright 품질 불량 ({len(contests)}건) → Agent"
    )

    # Tier 3: Agent (stub)
    contests = parse_with_agent(html)
    return contests, "agent"


# ------------------------------------------------------------------
# 공개 함수
# ------------------------------------------------------------------

def fetch_wevity_contests() -> list[dict]:
    """
    위비티 목록 페이지를 순회하며 공모전 정보를 수집합니다.

    파이프라인:
      각 페이지마다 bs4 → playwright → agent 순으로 시도.
      품질 검사 통과 + 저장 직전 방어 필터(_pre_save_filter) 통과한 항목만 저장.

    Returns:
        list[dict]: 저장 대상 공모전 dict 리스트 (중복 제거 완료)
    """
    all_contests: list[dict] = []
    seen_ids: set = set()

    logger.info(
        f"[wevity] 수집 시작 (최대 {MAX_PAGES}페이지) "
        f"| status='{CRAWLED_DEFAULT_STATUS}' "
        f"| 품질 임계값: 최소 {QUALITY_MIN_COUNT}건, "
        f"카테고리 비율 {QUALITY_MAX_CAT_RATE:.0%} 이하, "
        f"평균 제목 {QUALITY_MIN_AVG_LEN}자 이상"
    )

    # 목록 URL 자동 탐색 (PNF 우회 + 페이지네이션 패턴 확정)
    list_url_template = discover_wevity_list_url()
    logger.info(f"[wevity] 채택 URL 템플릿: {list_url_template}")

    for page in range(1, MAX_PAGES + 1):
        # page=1은 항상 LIST_URL_BASE 사용 (가장 안정적)
        url = LIST_URL_BASE if page == 1 else list_url_template.format(page=page)
        logger.info(f"[wevity] 페이지 {page} 요청: {url}")

        try:
            response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"[wevity] 페이지 {page} 요청 실패: {e}")
            break

        html = _decode_html(response)
        soup = BeautifulSoup(html, "lxml")

        if page == 1:
            title_tag  = soup.find("title")
            page_title = title_tag.get_text(strip=True) if title_tag else "(없음)"
            logger.info(f"[wevity] 응답 <title>: {page_title}")
            _log_selector_counts(soup)
            _save_debug_html(html, "wevity_page1.html")

        # 파싱 파이프라인
        contests, tier_label = _run_parse_pipeline(
            html=html, soup=soup, url=url, page_no=page
        )

        # 저장 직전 방어 필터
        contests = _pre_save_filter(contests)

        if not contests:
            logger.warning(
                f"[wevity] 페이지 {page}: 저장 대상 0건 ({tier_label}) → 종료"
            )
            break

        # 최종 채택 샘플 10개 로그
        sample_titles = [c["title"] for c in contests[:10]]
        logger.info(
            f"[wevity] 페이지 {page}: 최종 채택 공고 샘플 ({min(10, len(contests))}개):"
        )
        for i, t in enumerate(sample_titles, 1):
            logger.info(f"  [{i:02d}] {t}")

        # 페이지 간 중복 제거
        page_contests: list[dict] = []
        for c in contests:
            eid = c.get("external_id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                page_contests.append(c)

        logger.info(
            f"[wevity] 페이지 {page}: {len(page_contests)}건 수집 "
            f"({tier_label}, 저장 직전 필터 후: {len(contests)}건)"
        )
        all_contests.extend(page_contests)

        if page < MAX_PAGES:
            time.sleep(REQUEST_DELAY)

    all_contests = _dedupe(all_contests)
    logger.info(f"[wevity] 수집 완료: 총 {len(all_contests)}건")

    # ── 수집 요약 (저장 전 최종 샘플 출력) ───────────────────────────
    _log_wevity_collect_summary(list_url_template, all_contests)

    return all_contests


def _log_wevity_collect_summary(url_template: str, contests: list[dict]) -> None:
    """수집 단계 요약 로그. 저장 결과는 run_wevity_pipeline()이 출력."""
    logger.info("=" * 60)
    logger.info("  WEVITY COLLECT SUMMARY")
    logger.info(f"  list_url_template : {url_template}")
    logger.info(f"  raw_collected     : {len(contests)}건")
    if contests:
        logger.info("  sample_titles:")
        for i, c in enumerate(contests[:10], 1):
            logger.info(f"    [{i:02d}] {c['title']}")
        logger.info("  sample_urls:")
        for i, c in enumerate(contests[:10], 1):
            logger.info(f"    [{i:02d}] {c.get('official_source_url', 'N/A')}")
    logger.info("=" * 60)


def run_wevity_pipeline() -> dict:
    """
    위비티 수집 → Supabase 저장 전체 파이프라인을 실행합니다.

    Returns:
        dict: {
            "list_url_template": str,
            "raw_collected": int,
            "to_save": int,
            "inserted": int,
            "updated": int,
            "failed": int,
            "failed_samples": list[dict],
            "success_samples": list[dict],
        }
    """
    from utils.supabase_client import get_supabase_client, upsert_contests_bulk

    summary: dict = {
        "list_url_template": "",
        "raw_collected":     0,
        "to_save":           0,
        "inserted":          0,
        "updated":           0,
        "failed":            0,
        "failed_samples":    [],
        "success_samples":   [],
    }

    # ── 1. 수집 (내부에서 discover_wevity_list_url 호출 → 캐시됨) ────
    contests = fetch_wevity_contests()
    summary["list_url_template"] = _cached_list_url_template or LIST_URL
    summary["raw_collected"] = len(contests)
    summary["to_save"]       = len(contests)

    if not contests:
        logger.error("[wevity] 수집 결과 0건 — 저장 건너뜀")
        _print_final_summary(summary)
        return summary

    # ── 2. Supabase 저장 ─────────────────────────────────────────────
    logger.info(f"[wevity] Supabase 저장 시작: {len(contests)}건")
    client = get_supabase_client()

    from utils.supabase_client import upsert_contest
    for i, contest in enumerate(contests, start=1):
        title = contest.get("title", "(제목 없음)")
        logger.info(f"  [{i}/{len(contests)}] 저장 중: {title[:50]}")
        outcome = upsert_contest(client, contest)

        if outcome["action"] == "insert":
            summary["inserted"] += 1
            summary["success_samples"].append({
                "action": "insert",
                "title":  title,
                "url":    contest.get("official_source_url", ""),
                "id":     outcome.get("id"),
            })
            logger.info(f"    → INSERT (id: {outcome.get('id')})")

        elif outcome["action"] == "update":
            summary["updated"] += 1
            summary["success_samples"].append({
                "action": "update",
                "title":  title,
                "url":    contest.get("official_source_url", ""),
                "id":     outcome.get("id"),
            })
            logger.info(f"    → UPDATE (id: {outcome.get('id')})")

        else:
            summary["failed"] += 1
            err = outcome.get("error", "알 수 없는 오류")
            # 오류 원인 분류
            cause = _classify_db_error(err, contest)
            summary["failed_samples"].append({
                "title":  title,
                "error":  err,
                "cause":  cause,
                "ext_id": contest.get("external_id"),
            })
            logger.error(f"    → FAIL [{cause}]: {err[:120]}")

    _print_final_summary(summary)
    return summary


def _classify_db_error(error_msg: str, contest: dict) -> str:
    """
    DB 저장 실패 원인을 분류합니다.

    Returns:
        str: "status_constraint" | "notnull_error" | "unique_conflict" |
             "date_error" | "title_error" | "other_constraint" | "unknown"
    """
    err = error_msg.lower()
    if "status" in err and ("check" in err or "constraint" in err):
        return "status_constraint"
    if "not null" in err or "null value" in err:
        field = re.search(r'column "([^"]+)"', error_msg)
        return f"notnull_error({field.group(1) if field else '?'})"
    if "unique" in err or "duplicate" in err:
        return "unique_conflict"
    if "date" in err or "invalid input syntax" in err and ("date" in err or "timestamp" in err):
        return "date_error"
    if "title" in err:
        return "title_error"
    if "constraint" in err or "check" in err or "violates" in err:
        return "other_constraint"
    return "unknown"


def _print_final_summary(summary: dict) -> None:
    """최종 실행 결과 요약 블록을 출력합니다."""
    logger.info("")
    logger.info("=" * 60)
    logger.info("=== WEVITY FINAL SUMMARY ===")
    logger.info(f"  list_url_template : {summary.get('list_url_template', 'N/A')}")
    logger.info(f"  pages_fetched     : (MAX_PAGES={MAX_PAGES})")
    logger.info(f"  raw_collected     : {summary['raw_collected']}건")
    logger.info(f"  after_filter      : {summary['to_save']}건")
    logger.info(f"  to_save           : {summary['to_save']}건")
    logger.info(f"  inserted          : {summary['inserted']}건")
    logger.info(f"  updated           : {summary['updated']}건")
    logger.info(f"  failed            : {summary['failed']}건")

    if summary["failed_samples"]:
        logger.info("  failed_samples (최대 5개):")
        for s in summary["failed_samples"][:5]:
            logger.info(
                f"    [{s['cause']}] ext_id={s['ext_id']!r} "
                f"title={s['title'][:40]!r} error={s['error'][:80]}"
            )

    logger.info("  success_samples (최대 10개):")
    for s in summary["success_samples"][:10]:
        logger.info(f"    [{s['action']}] {s['title'][:50]}")
    logger.info("  sample_urls (최대 10개):")
    for s in summary["success_samples"][:10]:
        logger.info(f"    {s.get('url', 'N/A')}")
    logger.info("=" * 60)
