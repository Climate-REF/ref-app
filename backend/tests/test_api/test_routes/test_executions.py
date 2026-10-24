import pytest
from fastapi.testclient import TestClient

from ref_backend.api.routes import executions as executions_routes


def test_execution_list_count(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions")

    assert r.status_code == 200

    data = r.json()

    assert data["count"] > 0
    assert len(data["data"]) > 0


def get_execution_group_id(client: TestClient, settings) -> str:
    """Helper to get an execution group ID that has scalar metric values."""
    r = client.get(f"{settings.API_V1_STR}/executions")
    assert r.status_code == 200
    data = r.json()
    assert len(data["data"]) > 0
    for group in data["data"]:
        rv = client.get(f"{settings.API_V1_STR}/executions/{group['id']}/values?value_type=scalar")
        if rv.status_code == 200 and rv.json()["count"] > 0:
            return group["id"]
    pytest.skip("No execution group with scalar values found in test data")


def test_execution_values_outlier_detection_off(client: TestClient, settings):
    """Test execution values endpoint with outlier detection disabled."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&value_type=scalar&detect_outliers=off"
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


def test_execution_values_outlier_detection_on(client: TestClient, settings):
    """Test execution values endpoint with outlier detection enabled (default)."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&value_type=scalar")

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


def test_execution_values_include_unverified(client: TestClient, settings):
    """Test execution values endpoint with include_unverified parameter."""
    group_id = get_execution_group_id(client, settings)

    # Get default response
    r_default = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&value_type=scalar"
    )
    assert r_default.status_code == 200
    data_default = r_default.json()
    default_count = len(data_default["data"])

    # Get response with include_unverified=true
    r_unverified = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&value_type=scalar&include_unverified=true"
    )
    assert r_unverified.status_code == 200
    data_unverified = r_unverified.json()
    unverified_count = len(data_unverified["data"])

    # Assert unverified response has at least as many items as default
    assert unverified_count >= default_count


def test_execution_values_pagination_with_outlier_filtering(client: TestClient, settings):
    """Test that pagination works correctly when outlier filtering reduces the dataset.

    With Option A (detect-then-paginate), total_count should reflect the
    post-outlier-filtered count so that pages are always full up to the limit.
    """
    group_id = get_execution_group_id(client, settings)

    # Get total with outliers included
    r_all = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values"
        "?value_type=scalar&detect_outliers=iqr&include_unverified=true"
    )
    assert r_all.status_code == 200
    total_with_outliers = r_all.json()["total_count"]

    # Get total with outliers excluded (default)
    r_filtered = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values"
        "?value_type=scalar&detect_outliers=iqr&include_unverified=false"
    )
    assert r_filtered.status_code == 200
    data_filtered = r_filtered.json()
    total_without_outliers = data_filtered["total_count"]
    outlier_count = data_filtered["outlier_count"]

    # total_count should decrease by the number of outliers when filtering
    if outlier_count and outlier_count > 0:
        assert total_without_outliers == total_with_outliers - outlier_count
    else:
        assert total_without_outliers == total_with_outliers

    # Page should have exactly min(limit, total_without_outliers) items
    expected_count = min(50, total_without_outliers)  # default limit=50
    assert data_filtered["count"] == expected_count


def test_execution_values_outlier_consistency_across_pages(client: TestClient, settings):
    """Test that outlier detection produces consistent results across pages.

    Since outliers are now detected on the full dataset before pagination,
    total_count and outlier_count must be identical on every page.
    """
    group_id = get_execution_group_id(client, settings)

    base_url = (
        f"{settings.API_V1_STR}/executions/{group_id}/values"
        "?value_type=scalar&detect_outliers=iqr&include_unverified=true&limit=2"
    )

    r_page1 = client.get(f"{base_url}&offset=0")
    assert r_page1.status_code == 200
    page1 = r_page1.json()

    r_page2 = client.get(f"{base_url}&offset=2")
    assert r_page2.status_code == 200
    page2 = r_page2.json()

    assert page1["total_count"] == page2["total_count"]
    assert page1["outlier_count"] == page2["outlier_count"]
    assert page1["had_outliers"] == page2["had_outliers"]

    # Pages should not overlap
    if page1["total_count"] > 2 and page2["count"] > 0:
        page1_ids = {item["id"] for item in page1["data"]}
        page2_ids = {item["id"] for item in page2["data"]}
        assert page1_ids.isdisjoint(page2_ids)


def test_execution_values_csv_outlier_detection_off(client: TestClient, settings):
    """Test execution values CSV endpoint with outlier detection disabled."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=csv&value_type=scalar&detect_outliers=off"
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


def test_execution_values_csv_outlier_detection_on(client: TestClient, settings):
    """Test execution values CSV endpoint with outlier detection enabled."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?format=csv&value_type=scalar")

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


def test_execution_values_pagination_defaults(client: TestClient, settings):
    """Test that execution values endpoint returns total_count and respects default pagination."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&detect_outliers=off"
    )

    assert r.status_code == 200
    data = r.json()

    assert "total_count" in data
    assert isinstance(data["total_count"], int)
    assert data["total_count"] >= 0
    assert data["count"] <= 50
    assert data["count"] <= data["total_count"]


def test_execution_values_pagination_custom_limit(client: TestClient, settings):
    """Test that execution values endpoint respects custom limit parameter."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&detect_outliers=off&limit=2"
    )

    assert r.status_code == 200
    data = r.json()

    assert data["count"] <= 2
    assert data["total_count"] >= data["count"]


def test_execution_values_pagination_offset(client: TestClient, settings):
    """Test that offset skips items and total_count remains consistent."""
    group_id = get_execution_group_id(client, settings)

    base_url = (
        f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&detect_outliers=off&limit=2"
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
        assert page1_ids.isdisjoint(page2_ids), "Paginated pages should not overlap"


def test_execution_values_facets_consistent_across_pages(client: TestClient, settings):
    """Test that facets are computed from the full query, not the paginated page."""
    group_id = get_execution_group_id(client, settings)

    base_url = (
        f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&detect_outliers=off&limit=1"
    )

    r_page1 = client.get(f"{base_url}&offset=0")
    assert r_page1.status_code == 200
    facets_page1 = r_page1.json()["facets"]

    r_page2 = client.get(f"{base_url}&offset=1")
    assert r_page2.status_code == 200
    facets_page2 = r_page2.json()["facets"]

    facet_keys_1 = sorted(f["key"] for f in facets_page1)
    facet_keys_2 = sorted(f["key"] for f in facets_page2)
    assert facet_keys_1 == facet_keys_2, "Facet keys should be the same regardless of page"

    for f1 in facets_page1:
        f2 = next((f for f in facets_page2 if f["key"] == f1["key"]), None)
        assert f2 is not None
        assert sorted(f1["values"]) == sorted(f2["values"]), (
            f"Facet values for '{f1['key']}' should be identical across pages"
        )


def test_execution_values_pagination_invalid_limit(client: TestClient, settings):
    """Test that invalid limit values are rejected."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&limit=0")
    assert r.status_code == 422

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&limit=501")
    assert r.status_code == 422


def test_execution_values_pagination_invalid_offset(client: TestClient, settings):
    """Test that negative offset values are rejected."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&offset=-1")
    assert r.status_code == 422


def test_execution_values_pagination_beyond_total(client: TestClient, settings):
    """Test that requesting offset beyond total returns empty data."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values"
        "?value_type=scalar&detect_outliers=off&offset=999999"
    )

    assert r.status_code == 200
    data = r.json()

    assert data["count"] == 0
    assert len(data["data"]) == 0
    assert data["total_count"] >= 0


def test_execution_values_csv_ignores_pagination(client: TestClient, settings):
    """Test that CSV export returns all results regardless of pagination params."""
    group_id = get_execution_group_id(client, settings)

    r_json = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?value_type=scalar&detect_outliers=off&limit=1"
    )
    assert r_json.status_code == 200
    total_count = r_json.json()["total_count"]

    r_csv = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values"
        "?value_type=scalar&format=csv&detect_outliers=off&limit=1&offset=0"
    )
    assert r_csv.status_code == 200
    lines = r_csv.text.strip().splitlines()
    csv_row_count = len(lines) - 1
    assert csv_row_count == total_count


def test_execution_get_by_id(client: TestClient, settings) -> None:
    """Test getting a specific execution group by ID."""
    # Get an execution group ID from the list
    r = client.get(f"{settings.API_V1_STR}/executions")
    assert r.status_code == 200
    data = r.json()
    if not data["data"]:
        pytest.skip("No execution groups available")
    group_id = data["data"][0]["id"]

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}")
    assert r.status_code == 200
    result = r.json()
    assert result["id"] == group_id


def test_execution_404_invalid_id(client: TestClient, settings) -> None:
    """Test that requesting a nonexistent execution returns 404."""
    r = client.get(f"{settings.API_V1_STR}/executions/nonexistent-id-12345")
    assert r.status_code == 404


def test_execution_404_non_numeric_group_id(client: TestClient, settings) -> None:
    """Test that a non-numeric group id returns 404 instead of a 500."""
    r = client.get(f"{settings.API_V1_STR}/executions/not-a-number")
    assert r.status_code == 404


def test_execution_404_non_numeric_group_id_on_execution_route(client: TestClient, settings) -> None:
    """Test that a non-numeric group id on the execution sub-route returns 404."""
    r = client.get(f"{settings.API_V1_STR}/executions/not-a-number/execution")
    assert r.status_code == 404


def test_execution_404_non_numeric_execution_id(client: TestClient, settings) -> None:
    """Test that a non-numeric execution_id query param returns 404."""
    group_id = get_execution_group_id(client, settings)
    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/execution?execution_id=abc")
    assert r.status_code == 404


def test_execution_datasets(client: TestClient, settings) -> None:
    """Test getting datasets for an execution group."""
    # Get an execution group ID from the list
    r = client.get(f"{settings.API_V1_STR}/executions")
    assert r.status_code == 200
    data = r.json()
    if not data["data"]:
        pytest.skip("No execution groups available")
    group_id = data["data"][0]["id"]

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/datasets")
    assert r.status_code == 200
    result = r.json()
    assert "data" in result
    assert isinstance(result["data"], list)


def test_execution_statistics(client: TestClient, settings) -> None:
    """Test getting execution statistics."""
    r = client.get(f"{settings.API_V1_STR}/executions/statistics")
    assert r.status_code == 200
    data = r.json()
    groups = data["groups"]
    assert (
        groups["total"] == groups["successful"] + groups["failed"] + groups["running"] + groups["not_started"]
    )
    assert groups["total"] > 0
    for key in ("scalar_value_count", "series_value_count", "total_datasets", "total_files"):
        assert isinstance(data[key], int)


def test_execution_statistics_match_list(client: TestClient, settings) -> None:
    """The list and the statistics count the same execution groups."""
    stats = client.get(f"{settings.API_V1_STR}/executions/statistics").json()["groups"]
    listed = client.get(f"{settings.API_V1_STR}/executions?limit=1").json()
    successful = client.get(f"{settings.API_V1_STR}/executions?limit=1&successful=true").json()
    unsuccessful = client.get(f"{settings.API_V1_STR}/executions?limit=1&successful=false").json()

    assert listed["total_count"] == stats["total"]
    assert successful["total_count"] == stats["successful"]
    # Not successful covers failed, running and never-run groups.
    assert unsuccessful["total_count"] == listed["total_count"] - successful["total_count"]


def test_execution_list_pagination(client: TestClient, settings) -> None:
    page1 = client.get(f"{settings.API_V1_STR}/executions?limit=2&offset=0").json()
    page2 = client.get(f"{settings.API_V1_STR}/executions?limit=2&offset=2").json()

    assert page1["count"] == 2
    assert page2["count"] == 2
    assert page1["total_count"] == page2["total_count"]
    assert {g["id"] for g in page1["data"]}.isdisjoint({g["id"] for g in page2["data"]})


def test_execution_carries_resource_usage(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions/?limit=50")
    assert r.status_code == 200
    executions = [g["executions"][-1] for g in r.json()["data"] if g["executions"]]
    assert executions
    for execution in executions:
        assert set(execution) >= {"wall_seconds", "cpu_seconds", "peak_memory_bytes"}
    timed = [e for e in executions if e["wall_seconds"] is not None]
    untimed = [e for e in executions if e["wall_seconds"] is None]
    assert timed and untimed, "fixture should hold both timed and untimed executions"
    assert all(e["wall_seconds"] > 0 for e in timed)
    assert all(e["cpu_seconds"] is None and e["peak_memory_bytes"] is None for e in untimed)


def test_execution_statistics_resource_usage(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions/statistics")
    assert r.status_code == 200
    usage = r.json()["resource_usage"]
    assert usage["timed_execution_count"] > 0
    assert usage["wall_seconds_total"] >= usage["wall_seconds_max"] >= usage["wall_seconds_mean"] > 0
    assert usage["cpu_seconds_total"] > 0
    assert usage["peak_memory_bytes_max"] >= usage["peak_memory_bytes_min"] > 0


def test_execution_logs(client: TestClient, settings, monkeypatch, tmp_path):
    group_id = get_execution_group_id(client, settings)
    log_file = tmp_path / "out.log"
    log_file.write_text("\n".join(f"line {i}" for i in range(30)) + "\n")
    monkeypatch.setattr(executions_routes, "resolve_artifact", lambda *_: log_file)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/logs")

    assert r.status_code == 200
    assert r.text == log_file.read_text()


def test_execution_logs_lines(client: TestClient, settings, monkeypatch, tmp_path):
    group_id = get_execution_group_id(client, settings)
    log_file = tmp_path / "out.log"
    log_file.write_text("\n".join(f"line {i}" for i in range(30)) + "\n")
    monkeypatch.setattr(executions_routes, "resolve_artifact", lambda *_: log_file)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/logs?lines=5")

    assert r.status_code == 200
    assert r.text.splitlines() == [f"line {i}" for i in range(25, 30)]


@pytest.mark.parametrize("lines", [0, 501])
def test_execution_logs_lines_out_of_range(client: TestClient, settings, lines):
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/logs?lines={lines}")

    assert r.status_code == 422


@pytest.mark.parametrize("query", ["", "?lines=5"])
def test_execution_logs_missing_log(client: TestClient, settings, monkeypatch, tmp_path, query):
    group_id = get_execution_group_id(client, settings)
    monkeypatch.setattr(executions_routes, "resolve_artifact", lambda *_: tmp_path / "missing.log")

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/logs{query}")

    assert r.status_code == 404


def test_execution_running_is_not_reported_as_failed(client: TestClient, settings) -> None:
    groups = client.get(f"{settings.API_V1_STR}/executions/?limit=100").json()["data"]
    outcomes = {e["successful"] for g in groups for e in g["executions"]}

    assert outcomes <= {True, False, None}
    assert False in outcomes, "fixture should hold a failed execution"


def test_execution_group_shape(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions/?limit=50")
    assert r.status_code == 200
    groups = r.json()["data"]
    assert groups
    for group in groups:
        assert "diagnostic" not in group
        assert "latest_execution" not in group
        assert group["provider_slug"]
        assert group["diagnostic_slug"]
        # Oldest first, so the latest execution is the last one
        created = [e["created_at"] for e in group["executions"]]
        assert created == sorted(created)


def test_execution_group_last_execution_is_latest(client: TestClient, settings) -> None:
    group = client.get(f"{settings.API_V1_STR}/executions/?limit=1").json()["data"][0]
    latest = client.get(f"{settings.API_V1_STR}/executions/{group['id']}/execution").json()

    assert group["executions"][-1]["id"] == latest["id"]


def test_execution_list_leaves_out_outputs_by_default(client: TestClient, settings) -> None:
    groups = client.get(f"{settings.API_V1_STR}/executions/?limit=50").json()["data"]
    executions = [e for g in groups for e in g["executions"]]

    assert executions
    assert all(e["outputs"] is None for e in executions)


def test_execution_list_includes_outputs_on_request(client: TestClient, settings) -> None:
    groups = client.get(f"{settings.API_V1_STR}/executions/?limit=50&include_outputs=true").json()["data"]
    executions = [e for g in groups for e in g["executions"]]

    assert all(isinstance(e["outputs"], list) for e in executions)
    assert any(e["outputs"] for e in executions), "fixture should hold executions with outputs"


def test_execution_group_detail_includes_outputs(client: TestClient, settings) -> None:
    group = client.get(f"{settings.API_V1_STR}/executions/?limit=1").json()["data"][0]
    detail = client.get(f"{settings.API_V1_STR}/executions/{group['id']}").json()

    assert all(isinstance(e["outputs"], list) for e in detail["executions"])


def test_execution_failure_reason(client: TestClient, settings) -> None:
    groups = client.get(f"{settings.API_V1_STR}/executions/?limit=100").json()["data"]
    executions = [e for g in groups for e in g["executions"]]

    assert all(e["failure_reason"] is None for e in executions if e["successful"] is not False)
    # The fixture's failure predates the column, so the migration marked it unknown
    assert {e["failure_reason"] for e in executions if e["successful"] is False} == {"unknown"}


def test_execution_list_filters_by_failure_reason(client: TestClient, settings) -> None:
    unknown = client.get(f"{settings.API_V1_STR}/executions/?limit=100&failure_reason=unknown").json()
    other = client.get(f"{settings.API_V1_STR}/executions/?limit=100&failure_reason=system_error").json()

    assert unknown["total_count"] == 1
    assert unknown["data"][0]["executions"][-1]["failure_reason"] == "unknown"
    assert other["total_count"] == 0


@pytest.mark.parametrize("query", ["failure_reason=not-a-reason", "mip_era=CMIP5"])
def test_execution_list_rejects_an_unknown_filter_value(client: TestClient, settings, query) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions/?{query}")
    assert r.status_code == 422


def test_execution_list_filters_by_source_id(client: TestClient, settings) -> None:
    everything = client.get(f"{settings.API_V1_STR}/executions/?limit=500&include_outputs=false").json()
    by_era = client.get(f"{settings.API_V1_STR}/executions/?limit=500&mip_era=CMIP6").json()
    assert 0 < by_era["total_count"] <= everything["total_count"]

    nothing = client.get(f"{settings.API_V1_STR}/executions/?source_id=not-a-model").json()
    assert nothing["total_count"] == 0


def test_execution_statistics_count_groups_per_era(client: TestClient, settings) -> None:
    stats = client.get(f"{settings.API_V1_STR}/executions/statistics").json()
    by_era = stats["groups_by_mip_era"]
    assert set(by_era) == {"CMIP6", "CMIP7"}
    assert all(0 <= era["total"] <= stats["groups"]["total"] for era in by_era.values())

    listed = client.get(f"{settings.API_V1_STR}/executions/?mip_era=CMIP6").json()
    assert by_era["CMIP6"]["total"] == listed["total_count"] > 0
