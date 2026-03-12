"""
auto_score.py — 수집 공고 자동 품질 점수화 모듈

점수 범위: 0 ~ 100
판정 기준:
  80점 이상  → verified_level = 1  (자동 공개)
  50~79점    → verified_level = 0  (검수 대기)
  50점 미만  → verified_level = 0  (저품질 검수 대기)

점수화 규칙:
  [필수 항목 - 40점]
  - 제목 5자 이상          : +15
  - 제목 1~4자             : +5  (부분 점수)
  - 주최기관 존재          : +10
  - 마감일 파싱 성공       : +15

  [품질 항목 - 45점]
  - 시작일 파싱 성공       : +5
  - 공식 링크 존재         : +10
  - summary 80자 이상      : +10  (30자 이상: +6, 있음: +2)
  - description 300자 이상 : +10  (100자 이상: +6, 있음: +2)
  - 이미지 URL 존재        : +8
  - type/category/field 모두 유효: +5
  - benefit.types 1개 이상 : +4
  - target 배열 존재       : +3

  [감점 항목]
  - 광고/스팸 키워드 탐지  : -20
  - 이미 마감된 공고       : -15
  - 비정상 제목(특수문자 과다): -10
"""

import re
from datetime import date

# ── 판정 임계값 ────────────────────────────────────────────────
SCORE_AUTO_PUBLISH   = 80   # 이상 → verified_level = 1 (자동 공개)
SCORE_REVIEW_PENDING = 50   # 이상 → verified_level = 0 (검수 대기)
                             # 미만 → verified_level = 0 (저품질 검수 대기)

# ── 광고/비정상 키워드 ─────────────────────────────────────────
SPAM_KEYWORDS = [
    "테스트", "test123", "홍보물", "광고성", "이벤트 아님",
    "xxx", "샘플", "더미", "dummy", "삭제예정", "임시등록",
]


# ------------------------------------------------------------------
# 공개 API
# ------------------------------------------------------------------

def score_contest(contest: dict) -> int:
    """
    공고 dict를 받아 0~100 품질 점수를 반환합니다.

    Args:
        contest: 크롤러가 수집한 공고 dict

    Returns:
        int: 0~100 품질 점수
    """
    score = 0

    title       = (contest.get("title") or "").strip()
    organizer   = (contest.get("organizer") or "").strip()
    summary     = (contest.get("summary") or "").strip()
    description = (contest.get("description") or "").strip()
    apply_start = (contest.get("apply_start_at") or "").strip()
    apply_end   = (contest.get("apply_end_at") or "").strip()
    source_url  = (
        contest.get("official_source_url") or
        contest.get("source_url") or
        contest.get("aggregator_source_url") or
        ""
    ).strip()
    image_url   = (contest.get("poster_image_url") or "").strip()
    c_type      = (contest.get("type") or "").strip()
    category    = (contest.get("category") or "").strip()
    field       = (contest.get("field") or "").strip()
    benefit     = contest.get("benefit") or {}
    target      = contest.get("target") or []

    # ── 필수 항목 (최대 40점) ──────────────────────────────────
    if len(title) >= 5:
        score += 15
    elif len(title) > 0:
        score += 5

    if organizer and organizer not in ("미상", "주최 미상", "unknown", ""):
        score += 10

    if _is_valid_date(apply_end):
        score += 15

    # ── 품질 항목 (최대 45점) ──────────────────────────────────
    if _is_valid_date(apply_start):
        score += 5

    if source_url and source_url.startswith("http"):
        score += 10

    if len(summary) >= 80:
        score += 10
    elif len(summary) >= 30:
        score += 6
    elif len(summary) > 0:
        score += 2

    if len(description) >= 300:
        score += 10
    elif len(description) >= 100:
        score += 6
    elif len(description) > 0:
        score += 2

    if image_url and image_url.startswith("http"):
        score += 8

    if c_type and category and field:
        score += 5

    if isinstance(benefit, dict) and benefit.get("types"):
        score += 4

    if isinstance(target, list) and len(target) > 0:
        score += 3

    # ── 감점 항목 ──────────────────────────────────────────────
    # 광고/스팸 키워드 감지
    text_to_check = (title + " " + summary).lower()
    for kw in SPAM_KEYWORDS:
        if kw.lower() in text_to_check:
            score -= 20
            break

    # 이미 마감된 공고
    if _is_valid_date(apply_end) and apply_end < date.today().isoformat():
        score -= 15

    # 비정상 제목 (특수문자 30% 초과)
    if title:
        special_count = len(re.sub(r'[a-zA-Z가-힣0-9\s]', '', title))
        if special_count > len(title) * 0.3:
            score -= 10

    return max(0, min(100, score))


def decide_verified_level(score: int) -> int:
    """
    점수를 기반으로 자동 verified_level을 결정합니다.

    Returns:
        1 → 자동 공개 (score >= SCORE_AUTO_PUBLISH)
        0 → 검수 대기 (그 외)
    """
    if score >= SCORE_AUTO_PUBLISH:
        return 1
    return 0


def get_score_label(score: int) -> str:
    """점수를 사람이 읽기 쉬운 레이블로 변환합니다."""
    if score >= SCORE_AUTO_PUBLISH:
        return f"✅ 자동공개 ({score}점)"
    if score >= SCORE_REVIEW_PENDING:
        return f"⏳ 검수대기 ({score}점)"
    return f"⚠️ 저품질 ({score}점)"


# ------------------------------------------------------------------
# 내부 헬퍼
# ------------------------------------------------------------------

def _is_valid_date(date_str: str) -> bool:
    """YYYY-MM-DD 형식 유효성 확인"""
    if not date_str or len(date_str) < 8:
        return False
    try:
        date.fromisoformat(date_str[:10])
        return True
    except ValueError:
        return False
