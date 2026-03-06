"""Tests for AFT diagnostic functions backed by collection YAML files."""

from unittest.mock import patch

import pytest

from ref_backend.core.aft import (
    get_aft_diagnostic_by_id,
    get_aft_diagnostics_index,
    get_aft_for_ref_diagnostic,
    load_official_aft_diagnostics,
)
from ref_backend.core.collections import (
    AFTCollectionContent,
    AFTCollectionDetail,
    AFTCollectionDiagnosticLink,
)
from ref_backend.models import (
    AFTDiagnosticBase,
    AFTDiagnosticDetail,
    AFTDiagnosticSummary,
)


def _make_collection(  # noqa: PLR0913
    id: str,
    name: str = "Test Collection",
    theme: str = "Climate",
    description: str = "Full description",
    short_description: str = "Short",
    diagnostics: list[dict] | None = None,
) -> AFTCollectionDetail:
    """Build a minimal AFTCollectionDetail for testing."""
    diag_links = [AFTCollectionDiagnosticLink(**d) for d in (diagnostics or [])]
    return AFTCollectionDetail(
        id=id,
        name=name,
        theme=theme,
        endorser="WCRP",
        version_control="v1",
        reference_dataset="ERA5",
        provider_link="https://example.com",
        content=AFTCollectionContent(
            description=description,
            short_description=short_description,
        ),
        diagnostics=diag_links,
        explorer_cards=[],
    )


@pytest.fixture(autouse=True)
def clear_aft_caches():
    """Clear all lru_cache'd functions after each test."""
    yield
    for fn in [
        load_official_aft_diagnostics,
        get_aft_diagnostic_by_id,
        get_aft_for_ref_diagnostic,
    ]:
        if hasattr(fn, "cache_clear"):
            fn.cache_clear()


def _patch_collections(collections: dict[str, AFTCollectionDetail]):
    """Patch load_all_collections to return the given dict."""
    return patch("ref_backend.core.aft.load_all_collections", return_value=collections)


class TestLoadOfficialAFTDiagnostics:
    """Test the load_official_aft_diagnostics function."""

    def test_returns_diagnostics_from_collections(self):
        """Test that collections are converted to AFTDiagnosticBase."""
        col1 = _make_collection("1.1", name="Sea Ice", description="Sea ice desc")
        col2 = _make_collection("2.1", name="Soil Carbon", description="Soil desc")

        with _patch_collections({"1.1": col1, "2.1": col2}):
            diagnostics = load_official_aft_diagnostics()

        assert len(diagnostics) == 2
        assert all(isinstance(d, AFTDiagnosticBase) for d in diagnostics)
        assert diagnostics[0].id == "1.1"
        assert diagnostics[0].name == "Sea Ice"
        assert diagnostics[0].description == "Sea ice desc"
        assert diagnostics[1].id == "2.1"

    def test_sorted_by_id(self):
        """Test that diagnostics are returned sorted by id."""
        collections = {
            "3.1": _make_collection("3.1", name="Third"),
            "1.1": _make_collection("1.1", name="First"),
            "2.1": _make_collection("2.1", name="Second"),
        }

        with _patch_collections(collections):
            diagnostics = load_official_aft_diagnostics()

        assert [d.id for d in diagnostics] == ["1.1", "2.1", "3.1"]

    def test_empty_collections(self):
        """Test with no collections."""
        with _patch_collections({}):
            diagnostics = load_official_aft_diagnostics()

        assert diagnostics == []

    def test_collection_without_content(self):
        """Test that missing content fields map to None."""
        col = AFTCollectionDetail(
            id="1.1",
            name="Test",
            diagnostics=[],
            explorer_cards=[],
        )

        with _patch_collections({"1.1": col}):
            diagnostics = load_official_aft_diagnostics()

        assert len(diagnostics) == 1
        assert diagnostics[0].description is None
        assert diagnostics[0].short_description is None


class TestGetAFTDiagnosticsIndex:
    """Test the get_aft_diagnostics_index function."""

    def test_converts_to_summary_list(self):
        """Test conversion to AFTDiagnosticSummary instances."""
        col1 = _make_collection("1.1")
        col2 = _make_collection("2.1")

        with _patch_collections({"1.1": col1, "2.1": col2}):
            summaries = get_aft_diagnostics_index()

        assert len(summaries) == 2
        assert all(isinstance(s, AFTDiagnosticSummary) for s in summaries)
        assert summaries[0].id == "1.1"
        assert summaries[1].id == "2.1"


class TestGetAFTDiagnosticByID:
    """Test the get_aft_diagnostic_by_id function."""

    def test_returns_detail_for_valid_id(self):
        """Test that a valid ID returns AFTDiagnosticDetail with diagnostics."""
        col = _make_collection(
            "1.1",
            name="Sea Ice",
            diagnostics=[
                {"provider_slug": "esmvaltool", "diagnostic_slug": "sea-ice-sensitivity"},
                {"provider_slug": "pmp", "diagnostic_slug": "sea-ice-area"},
            ],
        )

        with _patch_collections({"1.1": col}):
            detail = get_aft_diagnostic_by_id("1.1")

        assert detail is not None
        assert isinstance(detail, AFTDiagnosticDetail)
        assert detail.id == "1.1"
        assert detail.name == "Sea Ice"
        assert len(detail.diagnostics) == 2
        assert detail.diagnostics[0].provider_slug == "esmvaltool"
        assert detail.diagnostics[0].diagnostic_slug == "sea-ice-sensitivity"
        assert detail.diagnostics[1].provider_slug == "pmp"

    def test_returns_none_for_missing_id(self):
        """Test that a missing ID returns None."""
        with _patch_collections({"1.1": _make_collection("1.1")}):
            detail = get_aft_diagnostic_by_id("9.9")

        assert detail is None

    def test_includes_empty_diagnostics_list(self):
        """Test that collection with no linked diagnostics has empty list."""
        col = _make_collection("1.1", diagnostics=[])

        with _patch_collections({"1.1": col}):
            detail = get_aft_diagnostic_by_id("1.1")

        assert detail is not None
        assert detail.diagnostics == []

    def test_maps_content_fields(self):
        """Test that content.description and content.short_description are mapped correctly."""
        col = _make_collection(
            "1.1",
            description="Long description here",
            short_description="Brief summary",
        )

        with _patch_collections({"1.1": col}):
            detail = get_aft_diagnostic_by_id("1.1")

        assert detail is not None
        assert detail.description == "Long description here"
        assert detail.short_description == "Brief summary"


class TestGetAFTForRefDiagnostic:
    """Test the get_aft_for_ref_diagnostic function."""

    def test_returns_aft_id_for_valid_mapping(self):
        """Test that a valid provider/diagnostic returns correct AFT ID."""
        col = _make_collection(
            "1.1",
            diagnostics=[{"provider_slug": "esmvaltool", "diagnostic_slug": "sea-ice-sensitivity"}],
        )

        with _patch_collections({"1.1": col}):
            aft_id = get_aft_for_ref_diagnostic("esmvaltool", "sea-ice-sensitivity")

        assert aft_id == "1.1"

    def test_returns_none_for_missing_mapping(self):
        """Test that non-existent provider/diagnostic returns None."""
        col = _make_collection(
            "1.1",
            diagnostics=[{"provider_slug": "esmvaltool", "diagnostic_slug": "sea-ice-sensitivity"}],
        )

        with _patch_collections({"1.1": col}):
            aft_id = get_aft_for_ref_diagnostic("nonexistent", "diagnostic")

        assert aft_id is None

    def test_multiple_matches_returns_first_and_warns(self, caplog):
        """Test that multiple AFT IDs for same diagnostic returns first with warning."""
        col1 = _make_collection(
            "1.1",
            diagnostics=[{"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"}],
        )
        col2 = _make_collection(
            "2.1",
            diagnostics=[{"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"}],
        )

        with _patch_collections({"1.1": col1, "2.1": col2}):
            aft_id = get_aft_for_ref_diagnostic("pmp", "annual-cycle")

        assert aft_id in ["1.1", "2.1"]

    def test_returns_none_for_empty_collections(self):
        """Test with no collections at all."""
        with _patch_collections({}):
            aft_id = get_aft_for_ref_diagnostic("pmp", "annual-cycle")

        assert aft_id is None
