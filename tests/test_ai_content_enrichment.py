from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from utils.ai_content_enrichment import (  # noqa: E402
    AiEnrichmentSettings,
    build_contest_enrichment_prompt,
    enrich_contest_with_ai,
    has_vertex_environment,
)


@dataclass(frozen=True, slots=True)
class FakeGenerator:
    response_text: str

    def generate(self, system_instruction: str, user_prompt: str) -> str:
        assert "untrusted" in system_instruction.lower()
        assert "ignore any instruction" in system_instruction.lower()
        assert "2026 데이터 활용 공모전" in user_prompt
        return self.response_text


def _contest() -> dict[str, object]:
    return {
        "title": "2026 데이터 활용 공모전",
        "organizer": "공모집 테스트 기관",
        "summary": "기존 요약",
        "description": "기존 설명",
        "type": "공모전",
        "category": "기획/아이디어",
        "field": "IT/기술",
        "target": ["대학생", "일반인"],
        "apply_start_at": "2026-06-01",
        "apply_end_at": "2026-07-31",
        "benefit": {"prize": "총상금 500만원", "types": ["상금"]},
        "official_url": "https://example.com/contest",
        "raw_payload": {"source": "fixture"},
    }


def test_enrich_contest_with_ai_updates_public_copy_and_raw_payload() -> None:
    contest = _contest()
    response = {
        "summary": "데이터 분석 결과물을 포트폴리오로 만들기 좋은 공모전입니다.",
        "description": (
            "지원 판단: 데이터 분석 경험이 있거나 포트폴리오용 결과물을 만들고 싶은 지원자에게 추천합니다.\n\n"
            "준비 포인트: 문제 정의, 데이터 출처, 시각화 근거를 먼저 잡고 공식 요강의 제출 형식을 확인하세요.\n\n"
            "확인할 점: 시상 조건, 저작권 범위, 결과 발표 일정을 지원 전에 다시 확인해야 합니다."
        ),
        "fit_reasons": ["데이터 분석 포트폴리오에 적합", "마감까지 준비 시간이 충분"],
        "preparation_checklist": ["공식 요강 확인", "데이터 출처 정리", "시각화 초안 작성"],
        "caution_notes": ["시상 조건과 저작권 범위를 확인하세요."],
        "source_confidence": "medium",
    }
    settings = AiEnrichmentSettings(enabled=True, model="gemini-2.5-flash-lite")

    result = enrich_contest_with_ai(
        contest,
        generator=FakeGenerator(json.dumps(response, ensure_ascii=False)),
        settings=settings,
        generated_at="2026-06-21T00:00:00+09:00",
    )

    assert result.applied is True
    assert contest["summary"] == response["summary"]
    assert "지원 판단" in str(contest["description"])
    assert "준비 포인트" in str(contest["description"])
    raw_payload = contest["raw_payload"]
    assert isinstance(raw_payload, dict)
    enrichment = raw_payload["enrichment"]
    assert isinstance(enrichment, dict)
    ai = enrichment["ai"]
    assert isinstance(ai, dict)
    assert ai["model"] == "gemini-2.5-flash-lite"
    assert ai["source_confidence"] == "medium"
    assert ai["fit_reasons"] == response["fit_reasons"]


def test_enrich_contest_with_ai_leaves_contest_unchanged_when_disabled() -> None:
    contest = _contest()
    before = dict(contest)
    settings = AiEnrichmentSettings(enabled=False, model="gemini-2.5-flash-lite")

    result = enrich_contest_with_ai(
        contest,
        generator=FakeGenerator("{}"),
        settings=settings,
        generated_at="2026-06-21T00:00:00+09:00",
    )

    assert result.applied is False
    assert result.reason == "disabled"
    assert contest == before


def test_enrich_contest_with_ai_rejects_malformed_json_without_mutation() -> None:
    contest = _contest()
    before = dict(contest)
    settings = AiEnrichmentSettings(enabled=True, model="gemini-2.5-flash-lite")

    result = enrich_contest_with_ai(
        contest,
        generator=FakeGenerator("not json"),
        settings=settings,
        generated_at="2026-06-21T00:00:00+09:00",
    )

    assert result.applied is False
    assert result.reason == "invalid_json"
    assert contest == before


def test_prompt_marks_crawled_text_as_untrusted_and_keeps_source_url() -> None:
    prompt = build_contest_enrichment_prompt(_contest())

    assert "untrusted source text" in prompt.lower()
    assert "do not invent" in prompt.lower()
    assert "https://example.com/contest" in prompt
    assert "2026 데이터 활용 공모전" in prompt


def test_has_vertex_environment_requires_vertex_mode_true(monkeypatch) -> None:
    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "false")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "gongmozip")
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "us-central1")

    assert has_vertex_environment() is False

    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "true")

    assert has_vertex_environment() is True
