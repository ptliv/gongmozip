"""
Resident scheduler for the Gongmozip Threads publisher.

Keep this process open in a terminal. It checks the clock, launches the
one-shot publisher at configured times, and prevents launches when the local
daily safety quota would be exceeded.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from threads_contest_publisher import (  # noqa: E402
    DEFAULT_HISTORY_PATH,
    DEFAULT_THREADS_DB_PATH,
    KST,
    LOCAL_DAILY_PUBLISH_LIMIT,
    PUBLISH_UNITS_PER_RUN,
    count_today_history_publish_units,
    effective_daily_limit,
    find_profile,
    get_profile_daily_count,
    load_env,
    load_history,
    refresh_profile_daily_counts,
)


DEFAULT_TIMES = "09:10,12:30,15:30,18:30,21:30"


def parse_times(value: str) -> list[str]:
    raw = [part.strip() for part in re.split(r"[,\s]+", value or "") if part.strip()]
    parsed: list[str] = []
    for item in raw:
        match = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)", item)
        if not match:
            raise ValueError(f"Invalid time '{item}'. Use HH:MM, for example 09:10.")
        parsed.append(f"{int(match.group(1)):02d}:{match.group(2)}")
    if not parsed:
        raise ValueError("At least one publish time is required.")
    return sorted(set(parsed))


def safe_limit(value: int) -> int:
    return min(max(1, int(value)), LOCAL_DAILY_PUBLISH_LIMIT)


def quota_snapshot(args: argparse.Namespace) -> dict[str, Any]:
    db_path = Path(args.threads_db_path)
    profile_name = args.profile_name or os.getenv("THREADS_PROFILE_NAME", "")
    profile = find_profile(db_path, profile_name)
    profile = refresh_profile_daily_counts(db_path, profile)

    if profile:
        used = get_profile_daily_count(profile)
        limit = effective_daily_limit(profile, args.daily_limit)
        source = f"profile:{profile.get('name')}"
    else:
        used = count_today_history_publish_units(load_history(Path(args.history_path)))
        limit = safe_limit(args.daily_limit)
        source = "local-history"

    return {
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
        "source": source,
        "can_publish": used + PUBLISH_UNITS_PER_RUN <= limit,
    }


def build_command(args: argparse.Namespace) -> list[str]:
    command = [
        sys.executable,
        str(SCRIPT_DIR / "threads_contest_publisher.py"),
        "--publish",
        "--audience",
        args.audience,
        "--count",
        str(args.count),
        "--min-contests",
        str(args.min_contests),
        "--daily-limit",
        str(args.daily_limit),
        "--threads-db-path",
        str(args.threads_db_path),
        "--history-path",
        str(args.history_path),
    ]
    if args.profile_name:
        command.extend(["--profile-name", args.profile_name])
    if args.shortener:
        command.extend(["--shortener", args.shortener])
    if args.discord_webhook_url:
        command.extend(["--discord-webhook-url", args.discord_webhook_url])
    if args.ignore_history:
        command.append("--ignore-history")
    return command


def next_run_text(times: list[str]) -> str:
    now = datetime.now(KST)
    candidates = []
    for day_offset in (0, 1):
        base_date = now.date() + timedelta(days=day_offset)
        for item in times:
            hour, minute = map(int, item.split(":"))
            candidate = datetime(
                base_date.year,
                base_date.month,
                base_date.day,
                hour,
                minute,
                tzinfo=KST,
            )
            if candidate > now:
                candidates.append(candidate)
    if not candidates:
        return "unknown"
    return min(candidates).strftime("%Y-%m-%d %H:%M")


def run_publish(args: argparse.Namespace, slot: str) -> int:
    quota = quota_snapshot(args)
    print(
        f"[{datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}] "
        f"slot={slot} quota={quota['used']}/{quota['limit']} "
        f"remaining={quota['remaining']} source={quota['source']}"
    )
    if not quota["can_publish"]:
        print(
            "[skip] Not enough local quota for one roundup. "
            f"Need {PUBLISH_UNITS_PER_RUN}, remaining {quota['remaining']}."
        )
        return 0

    command = build_command(args)
    print("[run] " + " ".join(f'"{part}"' if " " in part else part for part in command))
    completed = subprocess.run(command, cwd=ROOT_DIR)
    print(f"[done] exit_code={completed.returncode}")
    return int(completed.returncode)


def run_loop(args: argparse.Namespace) -> int:
    times = parse_times(args.times)
    print("Gongmozip Threads resident scheduler")
    print("=" * 38)
    print(f"times       : {', '.join(times)}")
    print(f"daily limit : {safe_limit(args.daily_limit)}")
    print(f"per publish : {PUBLISH_UNITS_PER_RUN} units (body + reply link)")
    print(f"next run    : {next_run_text(times)}")
    print("Keep this terminal open. Press Ctrl+C to stop.")
    print()

    fired_slots: set[str] = set()
    active_day = datetime.now(KST).date()

    if args.run_now:
        run_publish(args, "run-now")

    try:
        while True:
            now = datetime.now(KST)
            if now.date() != active_day:
                active_day = now.date()
                fired_slots.clear()
                print(f"[reset] new day {active_day}; in-memory schedule markers cleared.")

            current_time = now.strftime("%H:%M")
            slot = f"{now.date().isoformat()} {current_time}"
            if current_time in times and slot not in fired_slots:
                fired_slots.add(slot)
                run_publish(args, slot)
                print(f"[wait] next run: {next_run_text(times)}")

            time.sleep(max(5, int(args.poll_seconds)))
    except KeyboardInterrupt:
        print("\n[stop] scheduler stopped by user.")
        return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Keep a terminal open and publish Gongmozip Threads posts at set times.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--times", default=os.getenv("THREADS_SCHEDULE_TIMES", DEFAULT_TIMES))
    parser.add_argument("--audience", choices=["auto", "1020", "2030", "3040"], default="auto")
    parser.add_argument("--count", type=int, default=int(os.getenv("THREADS_CONTEST_COUNT", "5")))
    parser.add_argument("--min-contests", type=int, default=3)
    parser.add_argument("--daily-limit", type=int, default=int(os.getenv("THREADS_DAILY_LIMIT", "10")))
    parser.add_argument("--poll-seconds", type=int, default=15)
    parser.add_argument("--profile-name", default=os.getenv("THREADS_PROFILE_NAME", ""))
    parser.add_argument("--shortener", choices=["tinyurl", "isgd", "none"], default=os.getenv("THREADS_SHORTENER", "tinyurl"))
    parser.add_argument("--discord-webhook-url", default=os.getenv("THREADS_DISCORD_WEBHOOK_URL", ""))
    parser.add_argument("--threads-db-path", default=os.getenv("THREADS_AUTOMATOR_DB_PATH", str(DEFAULT_THREADS_DB_PATH)))
    parser.add_argument("--history-path", default=os.getenv("THREADS_CONTEST_HISTORY_PATH", str(DEFAULT_HISTORY_PATH)))
    parser.add_argument("--ignore-history", action="store_true")
    parser.add_argument("--run-now", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    load_env()
    raise SystemExit(run_loop(parse_args()))
