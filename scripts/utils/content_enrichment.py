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
FETCH_OFFICIAL_DETAIL = os.getenv("CRAWLER_FETCH_OFFICIAL_DETAIL", "false").lower() == "true"
MAX_OFFICIAL_TEXT_CHARS = int(os.getenv("CRAWLER_OFFICIAL_TEXT_CHARS", "1200"))
MAX_DESCRIPTION_CHARS = int(os.getenv("CRAWLER_DESCRIPTION_CHARS", "1800"))

AGGREGATOR_HOSTS = (
    "wevity.com",
    "all-con.co.kr",
    "campuspick.com",
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


def summarize_text(text: str, limit: int = 150) -> str:
    cleaned = re.sub(r"\s+", " ", strip_html(text)).strip()
    if not cleaned:
        return ""
    sentence = re.split(r"(?<=[.!?。！？])\s+|[。\n]", cleaned, maxsplit=1)[0].strip()
    if len(sentence) >= 35:
        cleaned = sentence
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


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
    for tag in soup(["script", "style", "noscript", "iframe", "svg"]):
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
        lines.append("상세 안내: " + detail_text[:MAX_OFFICIAL_TEXT_CHARS])

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

    summary_source = official_text or source_text or description
    summary = summarize_text(summary_source, limit=150)
    if summary and (
        not contest.get("summary")
        or str(contest.get("summary")).strip() == str(contest.get("title", "")).strip()
        or len(strip_html(contest.get("summary"))) < 50
    ):
        contest["summary"] = summary

    raw_payload = contest.get("raw_payload")
    if not isinstance(raw_payload, dict):
        raw_payload = {}
    enrichment = raw_payload.get("enrichment")
    if not isinstance(enrichment, dict):
        enrichment = {}
    if official_meta:
        enrichment.update(
            {
                "official_fetch_url": official_meta.get("url") or official_url,
                "official_title": official_meta.get("title") or "",
                "official_text_chars": len(official_text),
            }
        )
        raw_payload["enrichment"] = enrichment
        contest["raw_payload"] = raw_payload

    return contest
