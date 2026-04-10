"""Tests for CORS middleware configuration.

Verifies that the read-only API restricts CORS appropriately:
- Only GET method is allowed
- Credentials are not permitted
"""

from fastapi.testclient import TestClient


def test_cors_allows_get_requests(client: TestClient, settings) -> None:
    """Test that CORS preflight allows GET requests."""
    r = client.options(
        f"{settings.API_V1_STR}/diagnostics/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code == 200
    assert "GET" in r.headers.get("access-control-allow-methods", "")


def test_cors_rejects_post_preflight(client: TestClient, settings) -> None:
    """Test that CORS preflight rejects POST requests.

    The API is read-only so only GET should be permitted.
    """
    r = client.options(
        f"{settings.API_V1_STR}/diagnostics/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    # CORS middleware returns 400 for disallowed methods
    assert r.status_code == 400


def test_cors_rejects_delete_preflight(client: TestClient, settings) -> None:
    """Test that CORS preflight rejects DELETE requests."""
    r = client.options(
        f"{settings.API_V1_STR}/diagnostics/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "DELETE",
        },
    )
    assert r.status_code == 400


def test_cors_rejects_put_preflight(client: TestClient, settings) -> None:
    """Test that CORS preflight rejects PUT requests."""
    r = client.options(
        f"{settings.API_V1_STR}/diagnostics/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PUT",
        },
    )
    assert r.status_code == 400


def test_cors_does_not_allow_credentials(client: TestClient, settings) -> None:
    """Test that CORS does not set allow-credentials header.

    A read-only public API should not accept credentials.
    """
    r = client.options(
        f"{settings.API_V1_STR}/diagnostics/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code == 200
    # access-control-allow-credentials should be absent or "false"
    allow_creds = r.headers.get("access-control-allow-credentials", "false")
    assert allow_creds.lower() != "true"
