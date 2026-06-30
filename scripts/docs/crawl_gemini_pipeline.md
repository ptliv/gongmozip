# Crawl + Gemini Enrichment Pipeline

## Purpose

`scripts/crawl_all.py` now keeps the existing crawl/detail/enrichment/upsert flow and can optionally add a Vertex AI Gemini enrichment pass immediately after deterministic content enrichment.

Default behavior is unchanged. Gemini runs only when `CRAWLER_AI_ENRICH=true`.

## Required Environment

Supabase:

```bash
SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

Vertex AI Gemini through the Google GenAI SDK:

```bash
CRAWLER_AI_ENRICH=true
CRAWLER_AI_MODEL=gemini-2.5-flash-lite
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"
```

Authentication options:

- On a GCP/Vertex-capable server, use Application Default Credentials.
- With a service account JSON file, set:

```bash
GOOGLE_APPLICATION_CREDENTIALS="/secure/path/service-account.json"
```

Do not commit credentials.

## Install

```bash
python -m pip install -r scripts/requirements.txt
```

## One-Shot Run

```bash
python scripts/crawl_all.py
```

The AI pass writes audit metadata to:

```text
raw_payload.enrichment.ai
```

It does not require a schema change.

## Linux Cron Example

Run every day at 06:20 and 18:20 KST:

```cron
20 6,18 * * * cd /srv/gongmozip && /usr/bin/env bash -lc 'set -a; source .env; set +a; python scripts/crawl_all.py >> logs/crawl_all.log 2>&1'
```

If the server timezone is UTC, convert the schedule or set the host timezone to Asia/Seoul.

## Windows Task Scheduler Example

Program:

```text
powershell.exe
```

Arguments:

```text
-NoProfile -ExecutionPolicy Bypass -Command "cd 'C:\madeinmine\contest with web'; python scripts\crawl_all.py *> logs\crawl_all.log"
```

## Prompt Safety

The AI prompt treats crawled page text as untrusted source text. It instructs Gemini to ignore source-page instructions and not invent deadlines, organizers, prizes, eligibility, URLs, or application rules.

## Recommended Operations

- Start with `CRAWLER_AI_ENRICH=false` to confirm crawler stability.
- Enable `CRAWLER_AI_ENRICH=true` after Vertex credentials are verified.
- Keep an eye on token usage and quota because every detailed contest can trigger one model call.
- If quota or cost becomes high, lower source page counts first before weakening prompt quality.
