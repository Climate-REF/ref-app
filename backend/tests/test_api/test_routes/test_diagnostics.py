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


def get_diagnostic_with_series_values(client: TestClient, settings) -> dict:
    """Helper to get a diagnostic that has series metric values."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/")
    assert r.status_code == 200
    diagnostics = r.json()["data"]
    assert len(diagnostics) > 0
    for diag in diagnostics:
        if diag["has_series_values"]:
            return diag
    pytest.skip("No diagnostic with series values found in test data")


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


def test_diagnostic_values_pagination_defaults(client: TestClient, settings):
    """Test that metric values endpoint returns total_count and respects default pagination."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off"
    )

    assert r.status_code == 200
    data = r.json()

    assert "total_count" in data
    assert isinstance(data["total_count"], int)
    assert data["total_count"] >= 0
    # Default limit is 50, so count should be at most 50
    assert data["count"] <= 50
    # count should not exceed total_count
    assert data["count"] <= data["total_count"]


def test_diagnostic_values_pagination_custom_limit(client: TestClient, settings):
    """Test that metric values endpoint respects custom limit parameter."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off&limit=2"
    )

    assert r.status_code == 200
    data = r.json()

    assert data["count"] <= 2
    assert data["total_count"] >= data["count"]


def test_diagnostic_values_pagination_offset(client: TestClient, settings):
    """Test that offset skips items and total_count remains consistent."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    base_url = (
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off&limit=2"
    )

    r_page1 = client.get(f"{base_url}&offset=0")
    assert r_page1.status_code == 200
    page1 = r_page1.json()

    r_page2 = client.get(f"{base_url}&offset=2")
    assert r_page2.status_code == 200
    page2 = r_page2.json()

    # total_count should be the same across pages
    assert page1["total_count"] == page2["total_count"]

    # Pages should have different data (if enough items exist)
    if page1["total_count"] > 2 and page2["count"] > 0:
        page1_ids = {item["id"] for item in page1["data"]}
        page2_ids = {item["id"] for item in page2["data"]}
        assert page1_ids.isdisjoint(page2_ids), "Paginated pages should not overlap"


def test_diagnostic_values_pagination_beyond_total(client: TestClient, settings):
    """Test that requesting offset beyond total returns empty data."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off&offset=999999"
    )

    assert r.status_code == 200
    data = r.json()

    assert data["count"] == 0
    assert len(data["data"]) == 0
    assert data["total_count"] >= 0


def test_diagnostic_values_csv_ignores_pagination(client: TestClient, settings):
    """Test that CSV export returns all results regardless of pagination params."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&format=csv&detect_outliers=off&limit=1&offset=0"
    )

    assert r.status_code == 200
    lines = r.text.strip().splitlines()
    csv_row_count = len(lines) - 1  # Exclude header

    # Get total count from JSON endpoint
    r_json = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off&limit=1"
    )
    total_count = r_json.json()["total_count"]

    # CSV should have all rows, not just the paginated subset
    assert csv_row_count == total_count


def test_diagnostic_series_values_pagination(client: TestClient, settings):
    """Test pagination on series metric values endpoint."""
    diagnostic = get_diagnostic_with_series_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=series&limit=2"
    )

    assert r.status_code == 200
    data = r.json()

    assert "total_count" in data
    assert isinstance(data["total_count"], int)
    assert data["count"] <= 2
    assert data["count"] <= data["total_count"]
    assert data["types"] == ["series"]


def test_diagnostic_series_values_pagination_offset(client: TestClient, settings):
    """Test series pagination with offset produces non-overlapping pages."""
    diagnostic = get_diagnostic_with_series_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    base_url = (
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=series&limit=2"
    )

    r_page1 = client.get(f"{base_url}&offset=0")
    assert r_page1.status_code == 200
    page1 = r_page1.json()

    r_page2 = client.get(f"{base_url}&offset=2")
    assert r_page2.status_code == 200
    page2 = r_page2.json()

    assert page1["total_count"] == page2["total_count"]

    if page1["total_count"] > 2 and page2["count"] > 0:
        page1_ids = {item["id"] for item in page1["data"]}
        page2_ids = {item["id"] for item in page2["data"]}
        assert page1_ids.isdisjoint(page2_ids), "Paginated series pages should not overlap"


def test_diagnostic_series_csv_ignores_pagination(client: TestClient, settings):
    """Test that series CSV export returns all results regardless of pagination."""
    diagnostic = get_diagnostic_with_series_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    # CSV with limit=1 should still return all data
    r_csv = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=series&format=csv&limit=1&offset=0"
    )
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers.get("content-type", "")


def test_diagnostic_values_facets_consistent_across_pages(client: TestClient, settings):
    """Test that facets are computed from the full query, not the paginated page."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    base_url = (
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off&limit=1"
    )

    r_page1 = client.get(f"{base_url}&offset=0")
    assert r_page1.status_code == 200
    facets_page1 = r_page1.json()["facets"]

    r_page2 = client.get(f"{base_url}&offset=1")
    assert r_page2.status_code == 200
    facets_page2 = r_page2.json()["facets"]

    # Facet keys should be identical across pages
    facet_keys_1 = sorted(f["key"] for f in facets_page1)
    facet_keys_2 = sorted(f["key"] for f in facets_page2)
    assert facet_keys_1 == facet_keys_2, "Facet keys should be the same regardless of page"

    # Facet values should be identical across pages
    for f1 in facets_page1:
        f2 = next((f for f in facets_page2 if f["key"] == f1["key"]), None)
        assert f2 is not None
        assert sorted(f1["values"]) == sorted(f2["values"]), (
            f"Facet values for '{f1['key']}' should be identical across pages"
        )


def test_diagnostic_values_pagination_invalid_limit(client: TestClient, settings):
    """Test that invalid limit values are rejected."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    # limit=0 should be rejected (min is 1)
    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&limit=0"
    )
    assert r.status_code == 422

    # limit=501 should be rejected (max is 500)
    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&limit=501"
    )
    assert r.status_code == 422


def test_diagnostic_values_pagination_invalid_offset(client: TestClient, settings):
    """Test that negative offset values are rejected."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&offset=-1"
    )
    assert r.status_code == 422


def test_diagnostic_values_pagination_with_filter(client: TestClient, settings):
    """Test that pagination works correctly when dimension filters are applied."""
    diagnostic = get_diagnostic_with_scalar_values(client, settings)
    provider_slug = diagnostic["provider"]["slug"]
    diagnostic_slug = diagnostic["slug"]

    # First get facets to find a filterable dimension
    r = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        "?value_type=scalar&detect_outliers=off"
    )
    assert r.status_code == 200
    data = r.json()
    unfiltered_total = data["total_count"]

    if not data["facets"]:
        pytest.skip("No facets available for filtering")

    # Pick a facet and one of its values
    facet = data["facets"][0]
    filter_value = facet["values"][0]

    # Request with filter
    r_filtered = client.get(
        f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values"
        f"?value_type=scalar&detect_outliers=off&limit=2&{facet['key']}={filter_value}"
    )
    assert r_filtered.status_code == 200
    filtered_data = r_filtered.json()

    # Filtered total should be <= unfiltered total
    assert filtered_data["total_count"] <= unfiltered_total
    assert filtered_data["count"] <= 2
    assert filtered_data["count"] <= filtered_data["total_count"]

    # All returned items should match the filter
    for item in filtered_data["data"]:
        assert item["dimensions"].get(facet["key"]) == filter_value


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
