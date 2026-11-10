"""
Tests for the RFC 9727 API catalog.
"""

from starlette.testclient import TestClient

from ref_backend.api_catalog import API_CATALOG_PATH, LINKSET_MEDIA_TYPE, build_linkset


def test_api_catalog_links_to_the_api(client: TestClient, settings) -> None:
    response = client.get(API_CATALOG_PATH)

    assert response.status_code == 200
    assert response.headers["content-type"] == LINKSET_MEDIA_TYPE
    [entry] = response.json()["linkset"]
    host = settings.BACKEND_HOST.rstrip("/")
    assert entry["anchor"] == f"{host}{settings.API_V1_STR}/"
    assert entry["service-desc"][0]["href"] == f"{host}{settings.API_V1_STR}/openapi.json"
    assert entry["service-doc"][0]["href"] == f"{host}/docs"


def test_api_catalog_links_resolve(client: TestClient, settings) -> None:
    """Every linked path is served by the app itself."""
    [entry] = client.get(API_CATALOG_PATH).json()["linkset"]
    host = settings.BACKEND_HOST.rstrip("/")

    for relation in ("service-desc", "service-doc", "status"):
        path = entry[relation][0]["href"].removeprefix(host)
        assert client.get(path).status_code == 200, relation


def test_api_catalog_answers_head(client: TestClient) -> None:
    response = client.head(API_CATALOG_PATH)

    assert response.status_code == 200
    assert response.headers["content-type"] == LINKSET_MEDIA_TYPE


def test_build_linkset_strips_trailing_slashes() -> None:
    linkset = build_linkset(
        backend_host="https://api.example.org/",
        api_prefix="/api/v1/",
        openapi_url="/api/v1/openapi.json",
        docs_url="/docs",
    )

    [entry] = linkset["linkset"]
    assert entry["anchor"] == "https://api.example.org/api/v1/"
    assert entry["status"][0]["href"] == "https://api.example.org/api/v1/utils/health-check/"
