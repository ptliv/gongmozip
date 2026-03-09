"""
dedupe_report.py - Cross-source duplicate candidate report (read-only).

Comparison rules:
  - Exact: normalized_title + normalized_organizer + apply_end_at all match
  - Near:  normalized_title + apply_end_at match (organizer differs or missing)
"""

import re
from typing import Optional

from supabase import Client

from utils import logger


def normalize_text(text: str) -> str:
    """
    Normalize text for duplicate comparison.

    Rules:
      - lowercase
      - trim and collapse spaces
      - remove bracket characters
      - remove some punctuation (not aggressive)
    """
    if text is None:
        return ""

    s = str(text).lower().strip()
    if not s:
        return ""

    # Keep bracket contents but remove bracket symbols.
    s = re.sub(r"[\(\)\[\]\{\}]", " ", s)
    # Remove punctuation, keep korean/english/numbers/space.
    s = re.sub(r"[^\w\s가-힣]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _load_rows(client: Client, source_sites: Optional[list[str]] = None) -> list[dict]:
    """Load fields required for dedupe matching."""
    query = client.table("contests").select(
        "id, title, organizer, apply_end_at, source_site, external_id, official_source_url"
    )
    if source_sites:
        query = query.in_("source_site", source_sites)

    # Limit is enough for current crawler scope; report is read-only.
    response = query.limit(5000).execute()
    return response.data or []


def _pair_key(left: dict, right: dict) -> tuple[str, str]:
    """Stable pair key to avoid duplicate counting."""
    left_key = str(left.get("id") or f"{left.get('source_site')}:{left.get('external_id')}")
    right_key = str(right.get("id") or f"{right.get('source_site')}:{right.get('external_id')}")
    return tuple(sorted((left_key, right_key)))


def build_dedupe_report(
    client: Client,
    source_sites: Optional[list[str]] = None,
    limit: int = 10,
) -> dict:
    """
    Build duplicate candidate report across different source_site values only.

    Returns:
      {
        scanned: int,
        used_rows: int,
        candidates: int,
        exact_matches: int,
        near_matches: int,
        sample_pairs: list[dict],
      }
    """
    rows = _load_rows(client, source_sites=source_sites)

    normalized_rows: list[dict] = []
    for row in rows:
        source_site = str(row.get("source_site") or "").strip()
        apply_end_at = str(row.get("apply_end_at") or "").strip()
        title_norm = normalize_text(row.get("title") or "")
        org_norm = normalize_text(row.get("organizer") or "")

        if not source_site or not apply_end_at or not title_norm:
            continue

        normalized_rows.append(
            {
                "id": row.get("id"),
                "source_site": source_site,
                "external_id": str(row.get("external_id") or ""),
                "title": row.get("title") or "",
                "organizer": row.get("organizer") or "",
                "apply_end_at": apply_end_at,
                "official_source_url": row.get("official_source_url") or "",
                "normalized_title": title_norm,
                "normalized_organizer": org_norm,
            }
        )

    groups: dict[tuple[str, str], list[dict]] = {}
    for row in normalized_rows:
        key = (row["normalized_title"], row["apply_end_at"])
        groups.setdefault(key, []).append(row)

    exact_matches = 0
    near_matches = 0
    sample_pairs: list[dict] = []
    seen_pairs: set[tuple[str, str]] = set()

    for (_, _), group_rows in groups.items():
        if len(group_rows) < 2:
            continue
        source_count = len({r["source_site"] for r in group_rows})
        if source_count < 2:
            continue

        for i in range(len(group_rows)):
            left = group_rows[i]
            for j in range(i + 1, len(group_rows)):
                right = group_rows[j]
                if left["source_site"] == right["source_site"]:
                    continue

                key = _pair_key(left, right)
                if key in seen_pairs:
                    continue
                seen_pairs.add(key)

                is_exact = (
                    left["normalized_organizer"]
                    and right["normalized_organizer"]
                    and left["normalized_organizer"] == right["normalized_organizer"]
                )
                match_type = "exact" if is_exact else "near"
                if is_exact:
                    exact_matches += 1
                else:
                    near_matches += 1

                if len(sample_pairs) < max(limit, 0):
                    sample_pairs.append(
                        {
                            "match_type": match_type,
                            "apply_end_at": left["apply_end_at"],
                            "normalized_title": left["normalized_title"],
                            "normalized_organizer_left": left["normalized_organizer"],
                            "normalized_organizer_right": right["normalized_organizer"],
                            "left": {
                                "source_site": left["source_site"],
                                "external_id": left["external_id"],
                                "title": left["title"],
                                "organizer": left["organizer"],
                                "official_source_url": left["official_source_url"],
                            },
                            "right": {
                                "source_site": right["source_site"],
                                "external_id": right["external_id"],
                                "title": right["title"],
                                "organizer": right["organizer"],
                                "official_source_url": right["official_source_url"],
                            },
                        }
                    )

    summary = {
        "scanned": len(rows),
        "used_rows": len(normalized_rows),
        "candidates": exact_matches + near_matches,
        "exact_matches": exact_matches,
        "near_matches": near_matches,
        "sample_pairs": sample_pairs,
    }
    return summary


def _print_dedupe_summary(summary: dict) -> None:
    """Print dedupe report summary."""
    logger.info("")
    logger.info("=" * 55)
    logger.info("=== DEDUPE REPORT SUMMARY ===")
    logger.info(f"  scanned      : {summary.get('scanned', 0)}")
    logger.info(f"  used_rows    : {summary.get('used_rows', 0)}")
    logger.info(f"  candidates   : {summary.get('candidates', 0)}")
    logger.info(f"  exact_matches: {summary.get('exact_matches', 0)}")
    logger.info(f"  near_matches : {summary.get('near_matches', 0)}")

    pairs = summary.get("sample_pairs", []) or []
    if pairs:
        logger.info(f"  sample_pairs (max {len(pairs)}):")
        for i, pair in enumerate(pairs, 1):
            left = pair["left"]
            right = pair["right"]
            logger.info(
                f"    [{i:02d}] [{pair['match_type']}] {pair['apply_end_at']} "
                f"{left['source_site']}:{left['external_id']} <-> "
                f"{right['source_site']}:{right['external_id']}"
            )
            logger.info(f"         title: {left['title'][:80]}")
            logger.info(
                f"         organizer: {left.get('organizer','')[:30]} | {right.get('organizer','')[:30]}"
            )
    logger.info("=" * 55)
