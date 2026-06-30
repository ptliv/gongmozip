from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from utils.r2_image_migration import (  # noqa: E402
    build_plan,
    build_poster_key,
    build_public_url,
    content_type_for_extension,
    extension_from_content_type,
    is_external_poster_url,
)


def test_external_poster_filter_skips_existing_r2_public_domain() -> None:
    assert not is_external_poster_url("https://images.gongmozip.com/posters/abc.jpg")


def test_external_poster_filter_keeps_source_site_domains() -> None:
    assert is_external_poster_url("https://www.all-con.co.kr/data/poster.jpg")
    assert is_external_poster_url("https://cf-tabs-image.campuspick.com/poster.png")


def test_extension_prefers_response_content_type() -> None:
    assert extension_from_content_type("image/jpeg; charset=binary", "https://x.test/a.png") == "jpg"


def test_extension_falls_back_to_url_suffix_and_defaults_to_jpg() -> None:
    assert extension_from_content_type(None, "https://x.test/a.webp?width=200") == "webp"
    assert extension_from_content_type("application/octet-stream", "https://x.test/a") == "jpg"


def test_content_type_for_extension_normalizes_jpeg() -> None:
    assert content_type_for_extension("jpeg") == "image/jpeg"
    assert content_type_for_extension(".png") == "image/png"


def test_builds_stable_r2_key_and_public_url() -> None:
    assert build_poster_key(" contest-id ", ".PNG") == "posters/contest-id.png"
    assert (
        build_public_url("https://images.gongmozip.com/", "/posters/contest-id.png")
        == "https://images.gongmozip.com/posters/contest-id.png"
    )


def test_build_plan_matches_existing_gongmozip_key_pattern() -> None:
    plan = build_plan(
        contest_id="4e7aba1b-aa80-4725-abe3-53d2a049651a",
        source_url="https://www.all-con.co.kr/poster?id=1",
        content_type="image/png",
        public_base_url="https://images.gongmozip.com",
    )

    assert plan.object_key == "posters/4e7aba1b-aa80-4725-abe3-53d2a049651a.png"
    assert (
        plan.public_url
        == "https://images.gongmozip.com/posters/4e7aba1b-aa80-4725-abe3-53d2a049651a.png"
    )
