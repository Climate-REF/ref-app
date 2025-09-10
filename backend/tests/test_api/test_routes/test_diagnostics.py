from fastapi.testclient import TestClient


def get_diagnostic(client: TestClient, settings) -> dict:
    """Helper to get a diagnostic for testing."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/")
    assert r.status_code == 200
    diagnostics = r.json()["data"]
    assert len(diagnostics) > 0
    return diagnostics[0]


def get_diagnostic_metrics(
    client: TestClient, settings, provider_slug: str, diagnostic_slug: str
) -> list[str]:
    """Helper to get available metrics for a diagnostic."""
    r = client.get(f"{settings.API_V1_STR}/diagnostics/{provider_slug}/{diagnostic_slug}/values")
    assert r.status_code == 200
    facets = r.json()["facets"]
    metric_facet = next((f for f in facets if f["key"] == "metric"), None)
    assert metric_facet is not None
    return metric_facet["values"]


def test_diagnostic_comparison(client: TestClient, settings):
    """Test the comparison endpoint for a diagnostic."""
    diagnostic = get_diagnostic(client, settings)
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
    # assert data["source"]["count"] > 0
    #
    # assert all(
    #     mv["dimensions"].get("source_id") == source_id for mv in data["source"]["data"]
    # )
    # assert all(
    #     mv["dimensions"].get("source_id") != source_id
    #     for mv in data["ensemble"]["data"]
    # )
    # assert all(
    #     mv["dimensions"].get("metric") in metrics for mv in data["source"]["data"]
    # )
    # assert all(
    #     mv["dimensions"].get("metric") in metrics for mv in data["ensemble"]["data"]
    # )


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
