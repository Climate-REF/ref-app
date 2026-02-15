import pytest
from fastapi.testclient import TestClient


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
