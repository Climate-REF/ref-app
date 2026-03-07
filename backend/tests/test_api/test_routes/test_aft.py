import pytest
from fastapi.testclient import TestClient

from ref_backend.core.aft import (
    _build_ref_to_aft_index,
    get_aft_diagnostic_by_id,
    get_aft_diagnostics_index,
    load_official_aft_diagnostics,
)
from ref_backend.core.collections import (
    AFTCollectionContent,
    AFTCollectionDetail,
    AFTCollectionDiagnosticLink,
    load_all_collections,
)


@pytest.fixture(autouse=True)
def clear_caches():
    """Clear all caches before and after each test."""
    for fn in [
        load_official_aft_diagnostics,
        get_aft_diagnostics_index,
        get_aft_diagnostic_by_id,
        _build_ref_to_aft_index,
    ]:
        fn.cache_clear()
    load_all_collections.cache_clear()
    yield
    for fn in [
        load_official_aft_diagnostics,
        get_aft_diagnostics_index,
        get_aft_diagnostic_by_id,
        _build_ref_to_aft_index,
    ]:
        fn.cache_clear()
    load_all_collections.cache_clear()


def _make_collection(
    id: str,
    name: str = "Test Diagnostic",
    diagnostics: list[dict] | None = None,
) -> AFTCollectionDetail:
    diag_links = [AFTCollectionDiagnosticLink(**d) for d in (diagnostics or [])]
    return AFTCollectionDetail(
        id=id,
        name=name,
        theme="Climate",
        endorser="Test Endorser",
        version_control="1.0",
        reference_dataset="ERA5",
        provider_link="https://example.com",
        content=AFTCollectionContent(
            description="Test description",
            short_description="Short desc",
        ),
        diagnostics=diag_links,
        explorer_cards=[],
    )


@pytest.fixture
def empty_collections(monkeypatch):
    """Patch load_all_collections to return empty dict."""
    monkeypatch.setattr("ref_backend.core.aft.load_all_collections", lambda: {})


@pytest.fixture
def sample_collections(monkeypatch):
    """Patch load_all_collections to return sample data."""
    collections = {
        "AFT-001": _make_collection(
            "AFT-001",
            name="Test Diagnostic 1",
            diagnostics=[{"provider_slug": "example", "diagnostic_slug": "global-mean-timeseries"}],
        ),
        "AFT-002": _make_collection("AFT-002", name="Test Diagnostic 2"),
    }
    monkeypatch.setattr("ref_backend.core.aft.load_all_collections", lambda: collections)


def test_aft_diagnostics_empty(client: TestClient, settings, empty_collections):
    """Test that GET /api/cmip7-aft-diagnostics returns [] when no collections exist."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics")
    assert r.status_code == 200
    assert r.json() == []


def test_aft_diagnostics_with_data(client: TestClient, settings, sample_collections):
    """Test AFT diagnostics list with sample data."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["id"] == "AFT-001"
    assert data[1]["id"] == "AFT-002"


def test_aft_diagnostic_detail(client: TestClient, settings, sample_collections):
    """Test getting AFT diagnostic detail."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics/AFT-001")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "AFT-001"
    assert data["name"] == "Test Diagnostic 1"
    assert len(data["diagnostics"]) == 1
    assert data["diagnostics"][0]["provider_slug"] == "example"
    assert data["diagnostics"][0]["diagnostic_slug"] == "global-mean-timeseries"


def test_aft_diagnostic_detail_404(client: TestClient, settings, sample_collections):
    """Test 404 for unknown AFT ID."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics/AFT-999")
    assert r.status_code == 404
