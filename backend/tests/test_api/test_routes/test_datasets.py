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


def test_dataset_list_invalid_facets_json(client: TestClient, settings):
    """Test that malformed facets JSON returns 400 instead of a 500."""
    r = client.get(f"{settings.API_V1_STR}/datasets/?dataset_type=cmip6&facets=notjson")

    assert r.status_code == 400


def test_dataset_list_non_object_facets_json(client: TestClient, settings):
    """Test that facets JSON that is not an object returns 400 instead of a 500."""
    r = client.get(f"{settings.API_V1_STR}/datasets/?dataset_type=cmip6&facets=%5B1%2C2%5D")

    assert r.status_code == 400


def test_dataset_list_facets_without_dataset_type(client: TestClient, settings):
    """Test that facets without a dataset_type returns 400 instead of a 500."""
    r = client.get(f'{settings.API_V1_STR}/datasets/?dataset_type=&facets={{"a":"b"}}')

    assert r.status_code == 400


def test_dataset_list_unknown_dataset_type(client: TestClient, settings):
    """Test that an unrecognised dataset_type returns 400 rather than an empty list."""
    r = client.get(f"{settings.API_V1_STR}/datasets/?dataset_type=not-a-source-type")

    assert r.status_code == 400


def test_dataset_list_unknown_facet(client: TestClient, settings):
    """Test that a facet that is not a column on the source type returns 400 rather than being ignored."""
    r = client.get(f'{settings.API_V1_STR}/datasets/?dataset_type=cmip6&facets={{"not_a_facet":"x"}}')

    assert r.status_code == 400


def test_dataset_list_facet_filter(client: TestClient, settings):
    """Test that a known facet actually narrows the result set."""
    dataset = get_dataset(client, settings)
    source_id = dataset["metadata"]["source_id"]

    r = client.get(f'{settings.API_V1_STR}/datasets/?dataset_type=cmip6&facets={{"source_id":"{source_id}"}}')

    assert r.status_code == 200
    data = r.json()["data"]
    assert data
    assert all(ds["metadata"]["source_id"] == source_id for ds in data)


def test_dataset_list_name_contains(client: TestClient, settings):
    """Test that name_contains still filters on the slug."""
    dataset = get_dataset(client, settings)
    slug = dataset["slug"]

    r = client.get(f"{settings.API_V1_STR}/datasets/?name_contains={slug}")

    assert r.status_code == 200
    returned_slugs = [ds["slug"] for ds in r.json()["data"]]
    assert slug in returned_slugs
    assert all(slug.lower() in returned.lower() for returned in returned_slugs)


def test_dataset_carries_its_mip_era(client: TestClient, settings) -> None:
    """CMIP datasets report the era that keeps them off each other's charts."""
    r = client.get(f"{settings.API_V1_STR}/datasets/?dataset_type=cmip6&limit=1")

    assert r.status_code == 200
    assert r.json()["data"][0]["mip_era"] == "CMIP6"
