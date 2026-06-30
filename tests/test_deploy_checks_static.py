from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_sitemap_generator_includes_indexable_contest_list() -> None:
    source = (ROOT / "scripts" / "deploy" / "generate_static_seo_files.py").read_text(
        encoding="utf-8"
    )
    contests_page = (ROOT / "src" / "app" / "(main)" / "contests" / "page.tsx").read_text(
        encoding="utf-8"
    )

    assert 'f"{BASE_URL}/contests"' in source
    assert 'canonicalUrl("/contests")' in contests_page
    assert "NOINDEX_FOLLOW_ROBOTS" not in contests_page
    assert "export const revalidate = 300" in contests_page


def test_production_checkers_use_indexable_sitemap_expectations() -> None:
    production_checker = (ROOT / "scripts" / "deploy" / "check_production_urls.py").read_text(
        encoding="utf-8"
    )
    seo_checker = (ROOT / "scripts" / "deploy" / "check_seo_surface.py").read_text(
        encoding="utf-8"
    )

    assert "contests_in_sitemap" in production_checker
    assert "deadline_in_sitemap" not in production_checker
    assert '"/deadline",' not in production_checker
    assert '("field", "/field/...")' not in production_checker
    assert '("target", "/target/...")' not in production_checker
    assert '("host", "/host/...")' not in production_checker
    assert "contests_in_sitemap" in seo_checker
    assert "list_not_noindex" in seo_checker
    assert "deadline_in_sitemap" not in seo_checker
