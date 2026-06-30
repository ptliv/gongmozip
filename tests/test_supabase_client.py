from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from utils import supabase_client  # noqa: E402


def test_derive_crawled_status_uses_future_start(monkeypatch) -> None:
    monkeypatch.setattr(supabase_client, "_today_key", lambda: "2026-06-30")

    assert (
        supabase_client.derive_crawled_status(
            {"apply_start_at": "2026-07-01", "apply_end_at": "2026-07-31"}
        )
        == supabase_client.CONTEST_STATUS_UPCOMING
    )


def test_derive_crawled_status_keeps_same_day_deadline_open(monkeypatch) -> None:
    monkeypatch.setattr(supabase_client, "_today_key", lambda: "2026-06-30")

    assert (
        supabase_client.derive_crawled_status(
            {"apply_start_at": "2026-06-01", "apply_end_at": "2026-06-30"}
        )
        == supabase_client.CONTEST_STATUS_ONGOING
    )


def test_derive_crawled_status_closes_past_deadline(monkeypatch) -> None:
    monkeypatch.setattr(supabase_client, "_today_key", lambda: "2026-06-30")

    assert (
        supabase_client.derive_crawled_status(
            {"apply_start_at": "2026-06-01", "apply_end_at": "2026-06-29"}
        )
        == supabase_client.CONTEST_STATUS_CLOSED
    )
