import pytest
from fastapi.testclient import TestClient


def get_diagnostic(client: TestClient, settings) -> dict:
    """Helper to get a diagnostic for testing."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/")
    assert r.status_code == 200
    diagnostics = r.json()["data"]
    assert len(diagnostics) > 0
    return diagnostics[0]


def get_diagnostic_with_scalar_values(client: TestClient, settings) -> dict:
    """Helper to get a diagnostic that has scalar metric values."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/")
    assert r.status_code == 200
    diagnostics = r.json()["data"]
    assert len(diagnostics) > 0
    for diag in diagnostics:
        provider_slug = diag["provider"]["slug"]
        diagnostic_slug = diag["slug"]
        rv = client.get(
            f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?value_type=scalar"
        )
        if rv.status_code == 200 and rv.json()["count"] > 0:
            return diag
    # Fall back to first diagnostic if none have scalar values
    return diagnostics[0]


def get_diagnostic_metrics(
    client: TestClient, settings, provider_slug: str, diagnostic_slug: str
) -> list[str]:
    """Helper to get available metrics for a diagnostic."""
    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?value_type=scalar"
    )
    assert r.status_code == 200
    facets = r.json()["facets"]
    metric_facet = next((f for f in facets if f["key"] == "metric"), None)
    assert metric_facet is not None
    return metric_facet["values"]


@pytest.mark.xfail(reason="Comparison endpoint not yet implemented")
def test_diagnostic_comparison(client: TestClient, settings):
    """Test the comparison endpoint for a diagnostic."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    # These values are chosen based on the test data
    source_id = "ACCESS-ESM1-5"
    metrics = get_diagnostic_metrics(client, settings, provider_slug, diagnostic_slug)[:2]
    assert len(metrics) > 0

    query_params = "&".join([f"metrics={m}" for m in metrics])

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/comparison?source_id={source_id}&{query_params}"
    )

    assert r.status_code == 200
    data = r.json()

    assert "source" in data
    assert "ensemble" in data


def test_diagnostic_executions(client: TestClient, settings):
    """Test the executions endpoint for a diagnostic."""
    diagnostic = get_diagnostic(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    source_id = "ACCESS-ESM1-5"

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/executions?source_id={source_id}"
    )

    assert r.status_code == 200
    data = r.json()
    assert data["count"] > 0
    assert len(data["data"]) > 0


def test_diagnostic_values_outlier_detection_off(client: TestClient, settings):
    """Test diagnostic values endpoint with outlier detection disabled."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?format=json&value_type=scalar&detect_outliers=off"
    )

    assert r.status_code == 200
    data = r.json()

    # Assert outlier detection did not run
    assert data["had_outliers"] is None
    assert data["outlier_count"] is None

    # Assert no outlier annotations on items
    for item in data["data"]:
        assert item["is_outlier"] is None
        assert item["verification_status"] is None


def test_diagnostic_values_outlier_detection_on(client: TestClient, settings):
    """Test diagnostic values endpoint with outlier detection enabled (default)."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?format=json&value_type=scalar"
    )

    assert r.status_code == 200
    data = r.json()

    # Assert outlier-related fields in response
    assert "had_outliers" in data
    assert "outlier_count" in data
    assert isinstance(data["had_outliers"], bool)
    assert isinstance(data["outlier_count"], int)
    assert data["outlier_count"] >= 0

    # Assert outlier fields in individual scalar items
    for item in data["data"]:
        assert "is_outlier" in item
        assert "verification_status" in item
        assert isinstance(item["is_outlier"], bool)
        assert item["verification_status"] in ["verified", "unverified"]


def test_diagnostic_values_include_unverified(client: TestClient, settings):
    """Test diagnostic values endpoint with include_unverified parameter."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    # Get default response
    r_default = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?format=json&value_type=scalar"
    )
    assert r_default.status_code == 200
    data_default = r_default.json()
    default_count = len(data_default["data"])

    # Get response with include_unverified=true
    r_unverified = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?format=json&value_type=scalar&include_unverified=true"
    )
    assert r_unverified.status_code == 200
    data_unverified = r_unverified.json()
    unverified_count = len(data_unverified["data"])

    # Assert unverified response has at least as many items as default
    assert unverified_count >= default_count


def test_diagnostic_values_csv_outlier_detection_off(client: TestClient, settings):
    """Test diagnostic values CSV endpoint with outlier detection disabled."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?format=csv&value_type=scalar&detect_outliers=off"
    )

    assert r.status_code == 200
    csv_content = r.text

    # Parse CSV to check columns
    lines = csv_content.strip().splitlines()
    if lines and lines[0]:  # Not empty
        header = [h.strip() for h in lines[0].split(",")]
        assert "is_outlier" not in header
        assert "verification_status" not in header

    # Assert headers are absent
    assert "X-REF-Had-Outliers" not in r.headers
    assert "X-REF-Outlier-Count" not in r.headers


def test_diagnostic_values_csv_outlier_detection_on(client: TestClient, settings):
    """Test diagnostic values CSV endpoint with outlier detection enabled."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values?format=csv&value_type=scalar"
    )

    assert r.status_code == 200
    csv_content = r.text

    # Parse CSV to check columns
    lines = csv_content.strip().splitlines()
    assert len(lines) > 1, "CSV should have header and data rows"
    header = [h.strip() for h in lines[0].split(",")]
    assert "is_outlier" in header
    assert "verification_status" in header

    # Assert headers are present
    assert "X-REF-Had-Outliers" in r.headers
    assert "X-REF-Outlier-Count" in r.headers


def test_diagnostics_list_returns_data(client: TestClient, settings) -> None:
    """Test that diagnostics list endpoint returns data."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/")
    assert r.status_code == 200
    data = r.json()
    assert "count" in data
    assert "data" in data
    assert data["count"] > 0
    assert len(data["data"]) > 0


def test_diagnostic_get_by_provider_slug(client: TestClient, settings) -> None:
    """Test getting a specific diagnostic by provider and diagnostic slug."""
    diagnostic = get_diagnostic(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]
    r = client.get(f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}")
    assert r.status_code == 200
    result = r.json()
    assert result["provider"]["slug"] == provider_slug
    assert result["slug"] == diagnostic_slug


def test_diagnostic_404_invalid_provider(client: TestClient, settings) -> None:
    """Test that requesting a nonexistent diagnostic returns 404."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/nonexistent-provider/nonexistent-diagnostic")
    assert r.status_code == 404


def test_diagnostics_facets(client: TestClient, settings) -> None:
    """Test that diagnostics facets endpoint returns dimension summary."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/facets")
    assert r.status_code == 200
    data = r.json()
    assert "dimensions" in data
    assert "count" in data
    assert isinstance(data["dimensions"], dict)
    assert isinstance(data["count"], int)
