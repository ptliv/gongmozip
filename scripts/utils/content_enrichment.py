"""
content_enrichment.py - 상세 본문/이미지 보강 유틸.

소스 상세 페이지와 공식 페이지에서 읽을 수 있는 텍스트, meta description,
og:image를 모아 공고 상세에 바로 노출 가능한 한국어 안내문으로 정리합니다.
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

from utils.normalize import clean_str, normalize_date, normalize_url


REQUEST_TIMEOUT = int(os.getenv("CRAWLER_ENRICH_TIMEOUT", "10"))
FETCH_OFFICIAL_DETAIL = os.getenv("CRAWLER_FETCH_OFFICIAL_DETAIL", "true").lower() == "true"
MAX_OFFICIAL_TEXT_CHARS = int(os.getenv("CRAWLER_OFFICIAL_TEXT_CHARS", "900"))
MAX_DESCRIPTION_CHARS = int(os.getenv("CRAWLER_DESCRIPTION_CHARS", "2600"))

AGGREGATOR_HOSTS = (
    "wevity.com",
    "all-con.co.kr",
    "campuspick.com",
)

NOISE_LINE_PATTERNS = (
    "home",
    "faq",
    "q&a",
    "홈",
    "로그인",
    "회원가입",
    "마이페이지",
    "주메뉴",
    "본문 바로가기",
    "하단링크 바로가기",
    "메뉴 열기",
    "메뉴 닫기",
    "첨부파일",
    "첨부 파일",
    "첨부파일은 pc버전에서",
    "pc버전에서 다운받아 확인",
    "개인정보처리방침",
    "이용약관",
    "사이트맵",
    "고객센터",
    "커뮤니티",
    "통합검색",
    "검색하기",
    "신청 및 확인",
    "신청확인",
    "접수확인",
    "정보입력",
    "공유하기",
    "프린트",
    "목록으로",
    "이전글",
    "다음글",
    "관련사이트",
    "공지사항",
    "자료실",
    "쿠키",
    "광고",
    "menu",
    "copyright",
    "javascript",
)

JUNK_WORDS = (
    "마이페이지",
    "FAQ",
    "Q&A",
    "첨부파일",
    "첨부파일은 PC버전에서",
    "PC버전에서 다운받아 확인",
    "HOME",
    "홈",
    "주메뉴",
    "주메뉴 바로가기",
    "본문 바로가기",
    "하단링크 바로가기",
    "메뉴 열기",
    "메뉴 닫기",
    "로그인",
    "회원가입",
    "사이트맵",
    "통합검색",
    "검색하기",
    "개인정보처리방침",
    "이용약관",
    "고객센터",
    "커뮤니티",
    "신청 및 확인",
    "신청확인",
    "접수확인",
    "정보입력",
    "공유하기",
    "프린트",
    "목록으로",
    "이전글",
    "다음글",
    "다운로드",
    "공지사항",
    "자료실",
    "관련사이트",
)

JUNK_TEXT_PATTERN = re.compile(
    r"(공식/원문 안내|주메뉴 바로가기|본문 바로가기|하단링크|통합검색|정보입력 검색|HOME\s*>)",
    re.IGNORECASE,
)

RELEVANT_KEYWORDS = (
    "접수",
    "모집",
    "신청",
    "지원",
    "참가",
    "응모",
    "대상",
    "자격",
    "시상",
    "상금",
    "혜택",
    "제출",
    "서류",
    "일정",
    "발표",
    "문의",
    "활동",
    "주제",
    "심사",
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    text = str(value)
    if "<" in text and ">" in text:
        soup = BeautifulSoup(text, "lxml")
        for tag in soup(["script", "style", "noscript", "iframe", "svg"]):
            tag.decompose()
        text = soup.get_text("\n", strip=True)
    text = re.sub(r"\r", "\n", text)
    text = re.sub(r"[ \t\xa0]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _is_noise_line(line: str) -> bool:
    normalized = re.sub(r"\s+", " ", line).strip()
    lowered = normalized.lower()
    if not normalized:
        return True
    if any(pattern.lower() in lowered for pattern in NOISE_LINE_PATTERNS):
        return True
    if JUNK_TEXT_PATTERN.search(normalized):
        return True
    junk_hits = sum(1 for word in JUNK_WORDS if word in normalized)
    return junk_hits >= 2 or (junk_hits > 0 and len(normalized) < 120)


def _fallback_summary(contest: dict) -> str:
    organizer = clean_str(contest.get("organizer")) or "주최기관"
    contest_type = clean_str(contest.get("type")) or "공고"
    field = clean_str(contest.get("field"))
    category = clean_str(contest.get("category"))
    subject = f"{field} 분야 {contest_type}" if field and field != "기타" else f"{category or contest_type} 공고"
    targets = _format_targets(contest)
    end = normalize_date(contest.get("apply_end_at") or "")
    deadline = f" 마감일은 {end}입니다." if end else " 마감일은 신청 페이지에서 확인해야 합니다."
    focus = _summary_focus(contest)
    return (
        f"{organizer}에서 진행하는 {subject}입니다. "
        f"{targets}에게 적합하며, {focus}을 중심으로 준비하면 좋습니다."
        f"{deadline} 세부 조건은 신청 페이지에서 최종 확인하는 것을 권장합니다."
    )


def _summary_focus(contest: dict) -> str:
    text = " ".join(
        str(contest.get(key) or "")
        for key in ("title", "summary", "description", "type", "category", "field")
    ).lower()
    benefit = contest.get("benefit") or {}
    if isinstance(benefit, dict) and clean_str(benefit.get("prize")):
        return f"{benefit.get('prize')} 등 혜택 조건"
    if re.search(r"인턴|직무|채용|실무", text):
        return "직무 경험과 지원 동기"
    if re.search(r"서포터즈|기자단|대외활동|sns|콘텐츠", text):
        return "활동 가능 시간과 콘텐츠 제작 경험"
    if re.search(r"디자인|영상|포스터|사진|작품|예술|문화", text):
        return "작품 콘셉트와 제출 파일 형식"
    if re.search(r"해커톤|개발|데이터|ai|인공지능|앱|웹|소프트웨어", text):
        return "문제 정의와 구현 가능성"
    if re.search(r"마케팅|광고|아이디어|기획|창업|사업계획", text):
        return "문제 정의와 차별화 포인트"
    if re.search(r"논문|에세이|글쓰기|리포트", text):
        return "주제 적합성과 근거 자료"
    return "제출 조건과 준비 일정"


def summarize_text(text: str, limit: int = 220) -> str:
    cleaned = re.sub(r"\s+", " ", strip_html(text)).strip()
    if not cleaned:
        return ""
    sentence_candidates = [
        sentence.strip(" -·•\t")
        for sentence in re.split(r"(?<=[.!?。！？])\s+|(?<=다\.)\s+|(?<=요\.)\s+|[。\n]", strip_html(text))
    ]
    selected = [
        sentence
        for sentence in sentence_candidates
        if len(sentence) >= 18 and not _is_noise_line(sentence)
    ][:3]
    if selected:
        cleaned = " ".join(selected)
    elif _is_noise_line(cleaned):
        return ""
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def _clean_lines(text: str, limit: int = 12) -> list[str]:
    lines: list[str] = []
    seen: set[str] = set()
    for raw in strip_html(text).splitlines():
        line = re.sub(r"\s+", " ", raw).strip(" -·•\t")
        if len(line) < 8:
            continue
        if _is_noise_line(line):
            continue
        if line in seen:
            continue
        seen.add(line)
        lines.append(line[:180])
        if len(lines) >= limit:
            break
    return lines


def _select_relevant_lines(text: str, limit: int = 5) -> list[str]:
    selected: list[str] = []
    for line in _clean_lines(text, limit=40):
        if any(keyword in line for keyword in RELEVANT_KEYWORDS):
            selected.append(line)
        if len(selected) >= limit:
            break
    return selected


def _keyword_overview(text: str) -> str:
    found = [keyword for keyword in RELEVANT_KEYWORDS if keyword in text]
    if not found:
        return ""
    return ", ".join(dict.fromkeys(found[:8]))


def today_key() -> str:
    return datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()


def is_expired(contest: dict, today: Optional[str] = None) -> bool:
    apply_end_at = normalize_date(contest.get("apply_end_at") or "")
    if not apply_end_at:
        return True
    today = today or today_key()
    return apply_end_at[:10] <= today


def _is_aggregator_url(url: str | None) -> bool:
    if not url:
        return False
    host = urlparse(url).netloc.lower()
    return any(domain in host for domain in AGGREGATOR_HOSTS)


def _fetch_page_metadata(url: str | None) -> dict:
    if not url or not url.startswith(("http://", "https://")):
        return {}

    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        response.raise_for_status()
    except requests.RequestException:
        return {}

    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type and "application/xhtml" not in content_type:
        return {}

    soup = BeautifulSoup(response.text, "lxml")
    for tag in soup(["script", "style", "noscript", "iframe", "svg", "nav", "footer", "header"]):
        tag.decompose()

    def meta(*selectors: str) -> str:
        for selector in selectors:
            node = soup.select_one(selector)
            if node:
                value = node.get("content") or node.get("href") or node.get_text(" ", strip=True)
                value = clean_str(value)
                if value:
                    return value
        return ""

    title = meta("meta[property='og:title']", "meta[name='twitter:title']")
    if not title and soup.title:
        title = clean_str(soup.title.get_text(" ", strip=True)) or ""

    image = meta(
        "meta[property='og:image']",
        "meta[name='twitter:image']",
        "link[rel='image_src']",
    )
    image = normalize_url(image, url) if image else None

    meta_description = meta(
        "meta[property='og:description']",
        "meta[name='description']",
        "meta[name='twitter:description']",
    )

    content_nodes = soup.select(
        "article, main, #content, #contents, .content, .contents, .view, .view-body, .entry-content"
    )
    content_text = ""
    for node in content_nodes:
        text = node.get_text("\n", strip=True)
        if len(text) > len(content_text):
            content_text = text
    if not content_text:
        content_text = soup.body.get_text("\n", strip=True) if soup.body else ""

    content_text = strip_html(content_text)
    if meta_description and meta_description not in content_text:
        content_text = f"{meta_description}\n\n{content_text}".strip()

    return {
        "title": title,
        "description": content_text,
        "relevant_lines": _select_relevant_lines(content_text),
        "image": image,
        "url": response.url,
    }


def _format_period(contest: dict) -> str:
    start = (contest.get("apply_start_at") or "").strip()
    end = (contest.get("apply_end_at") or "").strip()
    if start and end:
        return f"{start}부터 {end}까지"
    if end:
        return f"{end}까지"
    return "공식 안내 기준"


def _format_targets(contest: dict) -> str:
    targets = contest.get("target") or []
    if isinstance(targets, list):
        values = [str(t).strip() for t in targets if str(t).strip()]
        if values:
            return ", ".join(values[:6])
    return "공식 공고 참고"


def _format_benefit(contest: dict) -> str:
    benefit = contest.get("benefit") or {}
    if isinstance(benefit, dict):
        for key in ("prize", "text"):
            value = clean_str(benefit.get(key))
            if value:
                return value
        types = benefit.get("types")
        if isinstance(types, list) and types:
            return ", ".join(str(t) for t in types[:5])
    return ""


def _preparation_tip(contest: dict) -> str:
    field = clean_str(contest.get("field")) or ""
    category = clean_str(contest.get("category")) or ""
    contest_type = clean_str(contest.get("type")) or ""
    haystack = f"{field} {category} {contest_type}"

    if any(word in haystack for word in ("디자인", "영상", "예술", "문화")):
        return "작품형 공고라면 결과물 파일 형식, 해상도, 러닝타임, 저작권·초상권 동의 범위를 먼저 확인해 두는 것이 좋습니다."
    if any(word in haystack for word in ("IT", "테크", "해커톤", "개발", "과학", "공학")):
        return "기술형 공고라면 문제 정의, 구현 방식, 데모 자료, 코드·서비스 공개 범위와 팀 역할을 미리 정리해 두면 좋습니다."
    if any(word in haystack for word in ("마케팅", "광고", "아이디어", "기획", "경영", "경제", "창업")):
        return "기획형 공고라면 시장 문제, 대상 사용자, 실행 가능성, 기대 효과를 한 페이지 안에서 명확히 연결하는 것이 중요합니다."
    if any(word in haystack for word in ("서포터즈", "기자단", "대외활동", "봉사")):
        return "활동형 공고라면 활동 기간, 필수 참석 일정, 콘텐츠 제출 횟수, 수료 기준과 활동비 지급 조건을 함께 확인하세요."
    return "지원 전에는 모집 요강, 제출 방식, 결과 발표 일정, 문의처를 공식 사이트 기준으로 다시 확인하는 것이 안전합니다."


def _checklist_lines(contest: dict) -> list[str]:
    end = (contest.get("apply_end_at") or "").strip()
    target = _format_targets(contest)
    lines = [
        f"마감일({end or '공식 안내 기준'}) 전에 제출 방식과 접수 완료 기준을 확인합니다.",
        f"참가 대상({target})에 본인 또는 팀이 해당하는지 먼저 점검합니다.",
        "제출 파일명, 분량, 양식, 개인정보 동의서 등 필수 서류 누락 여부를 확인합니다.",
        "시상·혜택 조건과 결과 발표 일정을 확인해 이후 일정과 겹치지 않게 준비합니다.",
    ]
    if contest.get("team_allowed"):
        lines.append("팀 지원이 가능하므로 역할 분담, 대표자 정보, 팀원 동의 여부를 미리 정리합니다.")
    return lines


def build_structured_description(contest: dict, source_text: str = "", official_text: str = "") -> str:
    title = clean_str(contest.get("title")) or "공고"
    organizer = clean_str(contest.get("organizer")) or "주최기관"
    contest_type = clean_str(contest.get("type")) or "공모전·대외활동"
    category = clean_str(contest.get("category")) or ""
    field = clean_str(contest.get("field")) or ""
    period = _format_period(contest)
    targets = _format_targets(contest)
    benefit = _format_benefit(contest)

    lines = [
        f"{title}은(는) {organizer}에서 진행하는 {contest_type} 공고입니다.",
        f"접수 기간은 {period}이며, 참가 대상은 {targets}입니다.",
    ]
    if category or field:
        lines.append(f"분류는 {category or '기타'} / {field or '기타'} 기준으로 정리했습니다.")
    if benefit:
        lines.append(f"혜택 또는 시상 정보: {benefit}")

    detail_text = strip_html(official_text) or strip_html(source_text)
    if detail_text:
        detail_text = re.sub(r"\s+", " ", detail_text).strip()
        overview = _keyword_overview(detail_text)
        if overview:
            lines.append(f"공식 안내문에서 확인해야 할 주요 항목은 {overview}입니다.")
        brief = summarize_text(detail_text, limit=MAX_OFFICIAL_TEXT_CHARS)
        if brief:
            lines.append("공식/원문 안내 요약: " + brief)

    relevant_lines = _select_relevant_lines(official_text or source_text, limit=4)
    if relevant_lines:
        lines.append(
            "확인 포인트: "
            + " / ".join(relevant_lines[:4])
        )

    lines.append("지원 준비 가이드: " + _preparation_tip(contest))
    lines.append("제출 전 체크리스트: " + " ".join(_checklist_lines(contest)))

    official_url = contest.get("official_url") or contest.get("official_source_url")
    if official_url:
        lines.append("참가 신청과 제출 서류는 공식 사이트의 최신 공고를 기준으로 확인하세요.")

    description = "\n\n".join(line for line in lines if line).strip()
    return description[:MAX_DESCRIPTION_CHARS].rstrip()


def enrich_contest_content(contest: dict) -> dict:
    """
    contest dict를 제자리에서 보강하고 반환합니다.
    - HTML description을 평문으로 정리
    - 공식 페이지 meta/body에서 설명과 대표 이미지를 보강
    - summary가 제목 수준이면 100~150자 요약으로 교체
    """
    current_description = strip_html(contest.get("description"))
    source_text = current_description

    official_url = (
        contest.get("official_url")
        or contest.get("official_source_url")
        or contest.get("source_url")
    )
    official_meta = {}
    if FETCH_OFFICIAL_DETAIL and official_url and not _is_aggregator_url(official_url):
        official_meta = _fetch_page_metadata(official_url)

    official_text = strip_html(official_meta.get("description"))
    if official_meta.get("image") and not contest.get("poster_image_url"):
        contest["poster_image_url"] = official_meta["image"]

    description = build_structured_description(contest, source_text, official_text)
    if description:
        contest["description"] = description

    summary = _fallback_summary(contest)
    if summary:
        contest["summary"] = summary

    source_checked_at = datetime.now(ZoneInfo("Asia/Seoul")).isoformat()
    contest.setdefault("source_checked_at", source_checked_at)

    raw_payload = contest.get("raw_payload")
    if not isinstance(raw_payload, dict):
        raw_payload = {}
    enrichment = raw_payload.get("enrichment")
    if not isinstance(enrichment, dict):
        enrichment = {}
    enrichment["source_checked_at"] = source_checked_at
    if official_meta:
        enrichment.update(
            {
                "official_fetch_url": official_meta.get("url") or official_url,
                "official_title": official_meta.get("title") or "",
                "official_text_chars": len(official_text),
                "official_relevant_lines": official_meta.get("relevant_lines") or [],
            }
        )
        raw_payload["enrichment"] = enrichment
        contest["raw_payload"] = raw_payload

    return contest
