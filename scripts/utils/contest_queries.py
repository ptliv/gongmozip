"""
contest_queries.py - Read-only payload builders for Vercel frontend.

Notes about field availability:
  - Current contests rows include: type, target, raw_payload
  - Fields often requested by frontend/SEO but not present as dedicated columns:
      metadata_json, contest_type, target_tags, eligibility_text
  - This module maps them with fallback values for a stable response shape.
"""

from typing import Optional

from supabase import Client


_SELECT_COLUMNS = (
    "id, slug, title, organizer, summary, description, "
    "apply_start_at, apply_end_at, status, "
    "type, category, field, target, "
    "official_source_url, aggregator_source_url, "
    "source_site, source_url, external_id, "
    "poster_image_url, benefit, online_offline, team_allowed, "
    "verified_level, view_count, updated_at, raw_payload"
)


def _to_front_payload(row: dict) -> dict:
    """Normalize DB row into frontend-ready payload shape."""
    metadata_json = row.get("metadata_json")
    if metadata_json is None:
        metadata_json = row.get("raw_payload") or {}

    contest_type = row.get("contest_type") or row.get("type") or ""
    target_tags = row.get("target_tags")
    if target_tags is None:
        target_tags = row.get("target") or []

    eligibility_text = row.get("eligibility_text")
    if not eligibility_text:
        eligibility_text = row.get("summary") or row.get("description") or ""

    source_url = row.get("source_url") or row.get("official_source_url") or ""

    return {
        "id": row.get("id"),
        "slug": row.get("slug"),
        "title": row.get("title"),
        "organizer": row.get("organizer"),
        "summary": row.get("summary"),
        "description": row.get("description"),
        "apply_start_at": row.get("apply_start_at"),
        "apply_end_at": row.get("apply_end_at"),
        "status": row.get("status"),
        "source_site": row.get("source_site"),
        "source_url": source_url,
        "official_source_url": row.get("official_source_url"),
        "metadata_json": metadata_json,
        "contest_type": contest_type,
        "target_tags": target_tags,
        "eligibility_text": eligibility_text,
        "category": row.get("category"),
        "field": row.get("field"),
        "benefit": row.get("benefit"),
        "poster_image_url": row.get("poster_image_url"),
        "online_offline": row.get("online_offline"),
        "team_allowed": row.get("team_allowed"),
        "verified_level": row.get("verified_level"),
        "view_count": row.get("view_count"),
        "external_id": row.get("external_id"),
        "updated_at": row.get("updated_at"),
    }


def get_contest_detail_payload(client: Client, slug: str) -> dict:
    """
    Get one contest detail payload by slug.
    """
    response = (
        client.table("contests")
        .select(_SELECT_COLUMNS)
        .eq("slug", slug)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    if not rows:
        return {
            "ok": False,
            "error": "not_found",
            "slug": slug,
            "contest": None,
        }
    return {
        "ok": True,
        "slug": slug,
        "contest": _to_front_payload(rows[0]),
    }


def get_recent_contests_payload(client: Client, limit: int = 20) -> dict:
    """
    Get recent/open contests for list page.
    """
    safe_limit = max(1, min(int(limit), 100))
    response = (
        client.table("contests")
        .select(_SELECT_COLUMNS)
        .in_("status", ["ongoing", "upcoming"])
        .order("apply_end_at", desc=False)
        .limit(safe_limit)
        .execute()
    )
    items = [_to_front_payload(row) for row in (response.data or [])]
    return {
        "ok": True,
        "count": len(items),
        "items": items,
    }


def get_related_contests_payload(
    client: Client,
    contest_type: str,
    exclude_id: str,
    limit: int = 6,
) -> dict:
    """
    Get related contests by contest type, excluding current contest id.
    """
    safe_limit = max(1, min(int(limit), 30))
    query = (
        client.table("contests")
        .select(_SELECT_COLUMNS)
        .eq("type", contest_type)
        .in_("status", ["ongoing", "upcoming"])
        .order("apply_end_at", desc=False)
        .limit(safe_limit)
    )
    if exclude_id:
        query = query.neq("id", exclude_id)

    response = query.execute()
    items = [_to_front_payload(row) for row in (response.data or [])]
    return {
        "ok": True,
        "count": len(items),
        "contest_type": contest_type,
        "items": items,
    }
