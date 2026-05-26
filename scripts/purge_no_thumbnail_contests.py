"""
Delete contests that do not have a usable poster thumbnail.

Usage:
  python scripts/purge_no_thumbnail_contests.py --dry-run
  python scripts/purge_no_thumbnail_contests.py
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils import logger
from utils.supabase_client import get_supabase_client, purge_no_thumbnail_contests


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete contests without poster thumbnails.")
    parser.add_argument("--source", default=None, help="Optional source_site filter.")
    parser.add_argument("--dry-run", action="store_true", help="Only report candidates.")
    parser.add_argument("--limit", type=int, default=0, help="Maximum rows to scan. 0 scans all rows.")
    args = parser.parse_args()

    client = get_supabase_client()
    summary = purge_no_thumbnail_contests(
        client,
        source_site=args.source,
        dry_run=args.dry_run,
        limit=args.limit or None,
    )
    logger.info("=== PURGE NO THUMBNAIL SUMMARY ===")
    logger.info(f"checked={summary.get('checked', 0)}")
    logger.info(f"deleted={summary.get('deleted', 0)}")
    logger.info(f"failed={summary.get('failed', 0)}")


if __name__ == "__main__":
    main()
