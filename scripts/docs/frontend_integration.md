# Supabase + Vercel Frontend Integration Guide

## 1) Current System Structure
- Crawlers: `scripts/sources/wevity.py`, `allcon.py`, `campuspick.py`
- Orchestrator: `scripts/crawl_all.py`
- DB write path: crawler output -> `upsert_contests_bulk()` -> `contests` table
- Maintenance jobs:
  - `close_expired_contests()` for deadline-based status close
  - `build_dedupe_report()` for cross-source duplicate candidates
- Frontend target: Vercel app reads from Supabase (read-only query functions)

## 2) Data Flow
1. Source fetch (`fetch_*_contests`)
2. Normalize + quality filter + status guard
3. Upsert by `(source_site, external_id)`
4. Close expired (`ongoing/upcoming` + past `apply_end_at` -> `closed`)
5. Build frontend payload via `scripts/utils/contest_queries.py`

## 3) Detail Page URL Rule (Example)
- Path: `/contests/[slug]`
- Example:
  - `/contests/2026-대한민국-ai-콘텐츠-페스티벌-wevity-105407`
  - `/contests/제10회-소비자지향성-개선과제-공모전-allcon-534351`

## 4) Slug Rule
- Utility: `scripts/utils/slugify_contest.py`
- Rule summary:
  - base slug from `title`
  - keep Korean/English/number
  - spaces/special chars -> `-`
  - optional suffix: `{source_site}-{external_id}`
- Example:
  - title only: `2026-대한민국-ai-콘텐츠-페스티벌`
  - with suffix: `2026-대한민국-ai-콘텐츠-페스티벌-wevity-105407`

## 5) Required Frontend Pages (4)
1. Contest list page
2. Contest detail page
3. Deadline-soon page
4. Category/field page

## 6) Supabase Query Flow (Recommended)
- Detail:
  - `get_contest_detail_payload(client, slug)`
- Recent/Open list:
  - `get_recent_contests_payload(client, limit=20)`
- Related list:
  - `get_related_contests_payload(client, contest_type, exclude_id, limit=6)`

## 7) Field Check for Detail Page

### A. Works with current fields (already usable)
- `title`
- `organizer`
- `apply_end_at`
- `status`
- `source_site`
- `source_url`
- `official_source_url`
- `type` (mapped to `contest_type` in payload)
- `target` (mapped to `target_tags` in payload)
- `summary` / `description` (fallback for `eligibility_text`)
- `raw_payload` (fallback for `metadata_json`)

### B. Suggested additional fields (proposal only, no DB change in this task)
- `metadata_json` (dedicated normalized metadata field)
- `contest_type` (separate from generic `type` if taxonomy expands)
- `target_tags` (normalized tags for filtering chips)
- `eligibility_text` (explicit eligibility copy for detail page)
- `apply_url` (official apply form URL if different from detail URL)
- `prize_text` (human-friendly prize summary)
- `contact_text` (official contact)

## 8) SEO Key Points
- `title`
  - format: `{contest title} | {site name}`
- `description`
  - prefer `summary` + deadline + organizer short text
- `canonical`
  - always self canonical on slug URL
- Structured data draft
  - `@type: Event` or `CreativeWork` (project policy dependent)
  - core fields: `name`, `description`, `organizer`, `startDate`, `endDate`, `url`
  - optional: `image`, `keywords`, `inLanguage`
