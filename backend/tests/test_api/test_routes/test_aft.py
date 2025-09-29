import pytest
from fastapi.testclient import TestClient

from ref_backend.core.aft import (
    load_official_aft_diagnostics,
    load_ref_mapping,
)


@pytest.fixture
def clear_aft_caches():
    """Clear AFT module caches before each test."""
    load_official_aft_diagnostics.cache_clear()
    load_ref_mapping.cache_clear()
    yield
    load_official_aft_diagnostics.cache_clear()
    load_ref_mapping.cache_clear()


def test_aft_diagnostics_empty_csv(client: TestClient, settings, clear_aft_caches, tmp_path, monkeypatch):
    """Test that GET /api/cmip7-aft-diagnostics returns [] when CSV has only headers."""
    # Create empty CSV with headers
    csv_content = "id,name,theme,version_control,reference_dataset,endorser,provider_link,description,short_description\n"  # noqa
    csv_file = tmp_path / "official_diagnostics.csv"
    csv_file.write_text(csv_content)

    # Create empty YAML
    yaml_content = "# Empty mapping\n"
    yaml_file = tmp_path / "ref_mapping.yaml"
    yaml_file.write_text(yaml_content)

    monkeypatch.setattr("ref_backend.core.aft.get_aft_paths", lambda: (csv_file, yaml_file))

    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics")
    assert r.status_code == 200
    data = r.json()
    assert data == []


@pytest.fixture
def aft_test_data(tmp_path, monkeypatch, clear_aft_caches):
    """Create test CSV and YAML files with sample data."""
    # CSV with 2 entries
    csv_content = """id,name,theme,version_control,reference_dataset,endorser,provider_link,description,short_description
AFT-001,Test Diagnostic 1,Climate,1.0,CMIP6,Test Endorser,https://example.com,Test description,Short desc
AFT-002,Test Diagnostic 2,Ocean,2.0,CMIP7,Test Endorser 2,https://example2.com,Test description 2,Short desc 2
"""  # noqa: E501
    csv_file = tmp_path / "official_diagnostics.csv"
    csv_file.write_text(csv_content)

    # YAML mapping one AFT ID to example/global-mean-timeseries
    yaml_content = """AFT-001:
  - provider_slug: example
    diagnostic_slug: global-mean-timeseries
"""
    yaml_file = tmp_path / "ref_mapping.yaml"
    yaml_file.write_text(yaml_content)

    # Monkeypatch the paths
    monkeypatch.setattr("ref_backend.core.aft.get_aft_paths", lambda: (csv_file, yaml_file))

    return tmp_path


def test_aft_diagnostics_with_data(client: TestClient, settings, aft_test_data):
    """Test AFT diagnostics with sample data."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["id"] == "AFT-001"
    assert data[1]["id"] == "AFT-002"


def test_aft_diagnostic_detail(client: TestClient, settings, aft_test_data):
    """Test getting AFT diagnostic detail."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics/AFT-001")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "AFT-001"
    assert data["name"] == "Test Diagnostic 1"
    assert len(data["diagnostics"]) == 1
    assert data["diagnostics"][0]["provider_slug"] == "example"
    assert data["diagnostics"][0]["diagnostic_slug"] == "global-mean-timeseries"


def test_aft_diagnostic_detail_404(client: TestClient, settings, aft_test_data):
    """Test 404 for unknown AFT ID."""
    r = client.get(f"{settings.API_V1_STR}/cmip7-aft-diagnostics/AFT-999")
    assert r.status_code == 404


@pytest.mark.xfail(reason="Need better test data")
def test_diagnostic_detail_aft_augmentation(client: TestClient, settings, aft_test_data):
    """Test that diagnostic detail includes AFT summaries when mapping exists."""
    # Test diagnostic with mapping
    r = client.get(f"{settings.API_V1_STR}/diagnostics/example/global-mean-timeseries")
    assert r.status_code == 200
    data = r.json()
    assert "aft" in data
    data = r.json()
    assert "aft" in data
    assert len(data["aft"]) == 1
    assert data["aft"][0]["id"] == "AFT-001"

    # Test diagnostic without mapping (assuming another diagnostic exists)
    # Get list of diagnostics first
    r_list = client.get(f"{settings.API_V1_STR}/diagnostics/")
    assert r_list.status_code == 200
    diagnostics = r_list.json()["data"]

    # Find one that doesn't match our mapping
    unmapped_diagnostic = None
    for diag in diagnostics:
        if not (diag["provider"]["slug"] == "example" and diag["slug"] == "global-mean-timeseries"):
            unmapped_diagnostic = diag
            break

    if unmapped_diagnostic:
        r_unmapped = client.get(
            f"{settings.API_V1_STR}/diagnostics/{unmapped_diagnostic['provider']['slug']}/{unmapped_diagnostic['slug']}"
        )
        assert r_unmapped.status_code == 200
        data_unmapped = r_unmapped.json()
        assert "aft" in data_unmapped
        assert data_unmapped["aft"] == []
