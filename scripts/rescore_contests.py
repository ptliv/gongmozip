"""
Recalculate automatic review scores for contests already stored in Supabase.

Usage:
  python scripts/rescore_contests.py
  python scripts/rescore_contests.py --dry-run
  python scripts/rescore_contests.py --source campuspick
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils import logger
from utils.supabase_client import get_supabase_client, rescore_contests


def main() -> None:
    parser = argparse.ArgumentParser(description="Recalculate contest review_score values.")
    parser.add_argument("--source", default=None, help="Optional source_site filter.")
    parser.add_argument("--dry-run", action="store_true", help="Calculate without writing updates.")
    parser.add_argument("--limit", type=int, default=5000, help="Maximum rows to scan.")
    args = parser.parse_args()

    client = get_supabase_client()
    summary = rescore_contests(
        client,
        source_site=args.source,
        dry_run=args.dry_run,
        limit=args.limit,
    )
    logger.info("=== RESCORE SUMMARY ===")
    logger.info(f"checked={summary.get('checked', 0)}")
    logger.info(f"updated={summary.get('updated', 0)}")
    logger.info(f"admin_preserved={summary.get('skipped_admin_verified', 0)}")
    logger.info(f"failed={summary.get('failed', 0)}")


if __name__ == "__main__":
    main()
