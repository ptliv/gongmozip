#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "anyio",
#     "httpx2[http2,brotli,zstd]",
# ]
# ///

# How to run
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Dry run:
#      uv run scripts/migrate_posters_to_r2.py
# 3. Apply:
#      uv run scripts/migrate_posters_to_r2.py --apply

from __future__ import annotations

import argparse
from pathlib import Path

import anyio

from utils.r2_migration_io import (
    DEFAULT_BUCKET,
    DEFAULT_PUBLIC_BASE_URL,
    ROOT_DIR,
    run_migration,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate external contest poster images to Cloudflare R2.")
    parser.add_argument("--apply", action="store_true", help="Upload to R2 and update Supabase.")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--public-base-url", default=DEFAULT_PUBLIC_BASE_URL)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--only-host", action="append", default=None)
    parser.add_argument("--env-file", default=str(ROOT_DIR / ".env.local"))
    parser.add_argument("--report-path", default=None)
    return parser.parse_args()


async def main_async() -> None:
    args = parse_args()
    await run_migration(
        apply=args.apply,
        bucket=args.bucket,
        public_base_url=args.public_base_url,
        limit=args.limit,
        only_hosts=set(args.only_host) if args.only_host else None,
        env_file=Path(args.env_file),
        report_path=Path(args.report_path) if args.report_path else None,
    )


def main() -> None:
    anyio.run(main_async)


if __name__ == "__main__":
    main()
