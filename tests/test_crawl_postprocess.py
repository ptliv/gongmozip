from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from utils import crawl_postprocess  # noqa: E402


def test_run_post_crawl_maintenance_returns_all_summaries(monkeypatch) -> None:
    calls: list[str] = []
    source_names = ["wevity", "allcon"]

    def close_stub(client, source_site=None, dry_run=False):
        calls.append(f"close:{source_site}:{dry_run}")
        return {"checked": 1, "updated": 1, "failed": 0}

    def purge_stub(client, source_site=None, dry_run=False):
        calls.append(f"purge:{source_site}:{dry_run}")
        return {"checked": 2, "deleted": 2, "failed": 0}

    def thumbnail_stub(client, source_site=None, dry_run=False):
        calls.append(f"thumbnail:{source_site}:{dry_run}")
        return {"checked": 3, "deleted": 3, "failed": 0}

    def rescore_stub(client, source_site=None, dry_run=False):
        calls.append(f"rescore:{source_site}:{dry_run}")
        return {"checked": 4, "updated": 4, "failed": 0}

    def dedupe_stub(client, source_sites, limit):
        calls.append(f"dedupe:{','.join(source_sites)}:{limit}")
        return {"candidates": 5, "sample_pairs": [{"a": 1}]}

    monkeypatch.setattr(crawl_postprocess, "close_expired_contests", close_stub)
    monkeypatch.setattr(crawl_postprocess, "purge_expired_contests", purge_stub)
    monkeypatch.setattr(crawl_postprocess, "purge_no_thumbnail_contests", thumbnail_stub)
    monkeypatch.setattr(crawl_postprocess, "rescore_contests", rescore_stub)
    monkeypatch.setattr(crawl_postprocess, "build_dedupe_report", dedupe_stub)

    summary = crawl_postprocess.run_post_crawl_maintenance(
        client={},
        source_names=source_names,
    )

    assert calls == [
        "close:None:False",
        "purge:None:False",
        "thumbnail:None:False",
        "rescore:None:False",
        "dedupe:wevity,allcon:10",
    ]
    assert summary["close_expired"]["updated"] == 1
    assert summary["purge_expired"]["deleted"] == 2
    assert summary["purge_no_thumbnail"]["deleted"] == 3
    assert summary["review_score"]["updated"] == 4
    assert summary["duplicates"]["candidates"] == 5
