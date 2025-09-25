from fastapi.testclient import TestClient


def test_execution_list_count(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions")

    assert r.status_code == 200

    data = r.json()

    assert data["count"] == 10
    assert len(data["data"]) == 10


def get_execution_group_id(client: TestClient, settings) -> str:
    """Helper to get an execution group ID for testing."""
    r = client.get(f"{settings.API_V1_STR}/executions")
    assert r.status_code == 200
    data = r.json()
    assert len(data["data"]) > 0
    return data["data"][0]["id"]


def test_execution_values_outlier_detection_off(client: TestClient, settings):
    """Test execution values endpoint with outlier detection disabled."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&type=scalar&detect_outliers=off"
    )

    assert r.status_code == 200
    data = r.json()

    # Assert no outlier-related fields in response
    assert "had_outliers" not in data
    assert "outlier_count" not in data

    # Assert no outlier fields in individual items
    for item in data["data"]:
        assert "is_outlier" not in item
        assert "verification_status" not in item

    # Assert headers are absent
    assert "X-REF-Had-Outliers" not in r.headers
    assert "X-REF-Outlier-Count" not in r.headers


def test_execution_values_outlier_detection_on(client: TestClient, settings):
    """Test execution values endpoint with outlier detection enabled (default)."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&type=scalar")

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

    # Assert headers are present
    assert "X-REF-Had-Outliers" in r.headers
    assert "X-REF-Outlier-Count" in r.headers


def test_execution_values_include_unverified(client: TestClient, settings):
    """Test execution values endpoint with include_unverified parameter."""
    group_id = get_execution_group_id(client, settings)

    # Get default response
    r_default = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&type=scalar")
    assert r_default.status_code == 200
    data_default = r_default.json()
    default_count = len(data_default["data"])

    # Get response with include_unverified=true
    r_unverified = client.get(
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=json&type=scalar&include_unverified=true"
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
        f"{settings.API_V1_STR}/executions/{group_id}/values?format=csv&type=scalar&detect_outliers=off"
    )

    assert r.status_code == 200
    csv_content = r.text

    # Parse CSV to check columns
    lines = csv_content.strip().split("\n")
    if lines and lines[0]:  # Not empty
        header = lines[0].split(",")
        assert "is_outlier" not in header
        assert "verification_status" not in header

    # Assert headers are absent
    assert "X-REF-Had-Outliers" not in r.headers
    assert "X-REF-Outlier-Count" not in r.headers


def test_execution_values_csv_outlier_detection_on(client: TestClient, settings):
    """Test execution values CSV endpoint with outlier detection enabled."""
    group_id = get_execution_group_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/executions/{group_id}/values?format=csv&type=scalar")

    assert r.status_code == 200
    csv_content = r.text

    # Parse CSV to check columns
    lines = csv_content.strip().split("\n")
    if lines and lines[0]:  # Not empty
        header = lines[0].split(",")
        assert "is_outlier" in header
        assert "verification_status" in header

    # Assert headers are present
    assert "X-REF-Had-Outliers" in r.headers
    assert "X-REF-Outlier-Count" in r.headers
