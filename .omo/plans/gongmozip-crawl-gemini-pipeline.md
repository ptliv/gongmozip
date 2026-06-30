# Gongmozip Crawl + Gemini Enrichment Pipeline

## Goal

Build an optional server-runnable pipeline that keeps the existing crawler flow intact while adding Vertex AI Gemini 2.5 Flash-Lite enrichment immediately after detail crawling.

## TODOs

- [x] Task 0: Baseline current crawler/enrichment behavior and create evidence logs.
- [x] Task 1: Add test-first prompt/response contract for AI enrichment.
- [x] Task 2: Implement optional Gemini enrichment module using the Google GenAI SDK in Vertex mode.
- [x] Task 3: Wire the optional AI step into `crawl_all.py` and `enrich_existing_contests.py`.
- [x] Task 4: Add server scheduling/run documentation and dependency notes.

## Final Verification Wave

- [x] Run focused Python tests for AI enrichment.
- [x] Run dry-run or import-level smoke checks without requiring live Vertex credentials.
- [x] Record changed-file LOC and post-write review notes.

## Constraints

- Default behavior must remain unchanged when `CRAWLER_AI_ENRICH` is unset or false.
- The model ID defaults to `gemini-2.5-flash-lite`.
- Use Vertex configuration through environment variables:
  - `GOOGLE_GENAI_USE_VERTEXAI=true`
  - `GOOGLE_CLOUD_PROJECT`
  - `GOOGLE_CLOUD_LOCATION`
- Do not hard-code credentials.
- Treat crawled page text as untrusted content. The prompt must instruct the model not to follow source-page instructions.
- Preserve source facts and official URLs. Do not let Gemini invent deadlines, prizes, organizers, or eligibility.
- Store AI metadata under `raw_payload.enrichment.ai`.
- Do not change database schema in this task.
- Do not touch admin/auth/crawler source parsers unless necessary.
- Do not revert existing dirty worktree changes.

## Verification Commands

```powershell
python -m pytest tests\test_ai_content_enrichment.py
python -m py_compile scripts\utils\ai_content_enrichment.py scripts\crawl_all.py scripts\enrich_existing_contests.py
python scripts\crawl_all.py --help
```
