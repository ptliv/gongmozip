"""
normalize.py — 수집 데이터 정제 유틸

크롤러에서 얻은 날짜/문자열/URL 등을 DB에 저장 가능한 형태로 변환합니다.
각 함수는 변환에 실패하면 None 또는 기본값을 반환하며 예외를 발생시키지 않습니다.
"""

import re
import time
import urllib.parse
from datetime import datetime, date, timedelta
from typing import Optional


# ------------------------------------------------------------------
# 문자열 정리
# ------------------------------------------------------------------

def clean_str(value) -> Optional[str]:
    """
    문자열의 앞뒤 공백, 줄바꿈, 특수 공백 문자를 제거합니다.
    빈 문자열이나 None은 None으로 반환합니다.

    사용 예:
        clean_str("  제목\n") → "제목"
        clean_str("")         → None
    """
    if value is None:
        return None
    cleaned = str(value).strip().replace("\xa0", " ").replace("\t", " ")
    # 연속 공백 하나로 압축
    cleaned = re.sub(r" {2,}", " ", cleaned)
    return cleaned if cleaned else None


def or_none(value) -> Optional[str]:
    """
    값이 None이거나 빈 문자열이면 None을 반환합니다.
    주로 선택 필드(없어도 되는 필드)에 사용합니다.

    사용 예:
        or_none("")    → None
        or_none("abc") → "abc"
    """
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


# ------------------------------------------------------------------
# 날짜 정리
# ------------------------------------------------------------------

def normalize_date(raw: str) -> Optional[str]:
    """
    한국 공모전 사이트에서 자주 보이는 날짜 형식을 "YYYY-MM-DD"로 변환합니다.

    지원 형식 예시:
        "2024.12.31"         → "2024-12-31"
        "2024-12-31"         → "2024-12-31"
        "24.12.31"           → "2024-12-31"
        "~2024.12.31"        → "2024-12-31"
        "2024년 12월 31일"   → "2024-12-31"
        "12월 31일"          → None  (연도 없으면 처리 불가)

    실패 시 None 반환 (예외 없음).
    """
    if not raw:
        return None

    # 앞뒤 특수문자 제거 (~, ·, ▶ 등)
    s = re.sub(r"^[~·▶\s]+", "", str(raw).strip())
    s = re.sub(r"[~·▶\s]+$", "", s)

    # "YYYY년 MM월 DD일" 형식
    m = re.search(r"(\d{4})[년]\s*(\d{1,2})[월]\s*(\d{1,2})[일]?", s)
    if m:
        y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
        return f"{y}-{mo}-{d}"

    # "YYYY.MM.DD" 또는 "YYYY-MM-DD" 형식
    m = re.search(r"(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})", s)
    if m:
        y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
        return f"{y}-{mo}-{d}"

    # "YY.MM.DD" 형식 (두 자리 연도)
    m = re.search(r"(\d{2})[.\-](\d{1,2})[.\-](\d{1,2})", s)
    if m:
        y = "20" + m.group(1)
        mo, d = m.group(2).zfill(2), m.group(3).zfill(2)
        return f"{y}-{mo}-{d}"

    return None


def default_apply_end_at(months_ahead: int = 3) -> str:
    """
    마감일을 알 수 없을 때 사용할 기본 마감일을 반환합니다.
    기본값: 오늘로부터 3개월 후

    사용 예:
        default_apply_end_at()    → "2024-12-31"  (3개월 후)
        default_apply_end_at(1)   → "2024-10-31"  (1개월 후)
    """
    future = date.today() + timedelta(days=30 * months_ahead)
    return future.strftime("%Y-%m-%d")


def today_str() -> str:
    """오늘 날짜를 "YYYY-MM-DD" 형식으로 반환합니다."""
    return date.today().strftime("%Y-%m-%d")


# ------------------------------------------------------------------
# URL 정리
# ------------------------------------------------------------------

def normalize_url(url: str, base_url: str = "") -> Optional[str]:
    """
    상대 URL을 절대 URL로 변환하고, 앞뒤 공백을 제거합니다.
    이미 절대 URL이면 그대로 반환합니다.

    사용 예:
        normalize_url("/contest/123", "https://example.com") → "https://example.com/contest/123"
        normalize_url("https://example.com/contest/123")     → "https://example.com/contest/123"
        normalize_url("")                                     → None
    """
    if not url:
        return None
    url = str(url).strip()
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if base_url:
        return urllib.parse.urljoin(base_url, url)
    return url


# ------------------------------------------------------------------
# Slug 생성
# ------------------------------------------------------------------

def generate_slug(title: str, external_id: str = "") -> str:
    """
    공고 제목과 외부 ID로 URL-safe slug를 생성합니다.
    Next.js 사이트의 기존 slug 패턴과 동일하게 작성합니다.

    사용 예:
        generate_slug("2024 창업 공모전", "12345") → "2024-창업-공모전-12345"
    """
    # 소문자 변환, 허용 문자 외 제거, 공백→하이픈
    slug = title.lower()
    slug = re.sub(r"[^\w\s가-힣-]", "", slug, flags=re.UNICODE)
    slug = slug.strip()
    slug = re.sub(r"\s+", "-", slug)
    slug = slug[:50]  # 최대 50자

    # 외부 ID로 고유성 보장 (external_id가 있으면 사용, 없으면 타임스탬프)
    suffix = external_id if external_id else str(int(time.time() * 1000))
    return f"{slug}-{suffix}"
