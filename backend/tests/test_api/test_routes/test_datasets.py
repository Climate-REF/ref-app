import pytest
from fastapi.testclient import TestClient


def get_dataset(client: TestClient, settings) -> dict:
    """Helper to get a dataset for testing."""
    r = client.get(f"{settings.API_V1_STR}/datasets/")
    assert r.status_code == 200
    data = r.json()["data"]
    if not data:
        pytest.skip("No datasets available in test data")
    return data[0]


def test_dataset_list_returns_data(client: TestClient, settings):
    """Test that the dataset list endpoint returns data."""
    r = client.get(f"{settings.API_V1_STR}/datasets/")

    assert r.status_code == 200
    data = r.json()

    assert "count" in data
    assert "data" in data
    assert data["count"] > 0


def test_dataset_list_pagination(client: TestClient, settings):
    """Test that pagination works for dataset list."""
    r = client.get(f"{settings.API_V1_STR}/datasets/?offset=0&limit=1")

    assert r.status_code == 200
    data = r.json()

    assert len(data["data"]) <= 1


def test_dataset_get_by_slug(client: TestClient, settings):
    """Test getting a single dataset by slug."""
    dataset = get_dataset(client, settings)
    slug = dataset["slug"]

    r = client.get(f"{settings.API_V1_STR}/datasets/{slug}")

    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == slug


def test_dataset_get_invalid_slug(client: TestClient, settings):
    """Test that getting a dataset with an invalid slug returns 404."""
    r = client.get(f"{settings.API_V1_STR}/datasets/nonexistent-slug-12345")

    assert r.status_code == 404


def test_dataset_executions(client: TestClient, settings):
    """Test the executions endpoint for a dataset."""
    dataset = get_dataset(client, settings)
    dataset_id = dataset["id"]

    r = client.get(f"{settings.API_V1_STR}/datasets/{dataset_id}/executions")

    assert r.status_code == 200
