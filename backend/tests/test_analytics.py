"""
Tests for the Plausible proxy.

The upstream calls are served by a mock transport, so no request leaves the test run.
"""

import httpx
import pytest
from starlette.testclient import TestClient

from ref_backend import analytics


@pytest.fixture()
def upstream_requests(monkeypatch):
    """
    Capture the requests the proxy makes and answer them from a mock transport.
    """
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        if request.url.path == "/api/event":
            return httpx.Response(202, text="ok", headers={"content-type": "text/plain"})
        return httpx.Response(
            200,
            text="console.log('tracker');",
            headers={"content-type": "application/javascript", "cache-control": "public, max-age=60"},
        )

    monkeypatch.setattr(analytics, "_client", httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    return captured


def test_script_is_proxied(client: TestClient, upstream_requests):
    response = client.get("/log/script.js")

    assert response.status_code == 200
    assert response.text == "console.log('tracker');"
    assert response.headers["content-type"].startswith("application/javascript")
    assert response.headers["cache-control"] == "public, max-age=60"
    assert str(upstream_requests[0].url) == analytics.PLAUSIBLE_SCRIPT_URL


def test_event_is_proxied(client: TestClient, upstream_requests):
    response = client.post(
        "/log/api/event",
        content=b'{"n":"pageview"}',
        headers={"content-type": "text/plain", "user-agent": "test-agent"},
    )

    assert response.status_code == 202
    assert response.text == "ok"

    forwarded = upstream_requests[0]
    assert str(forwarded.url) == analytics.PLAUSIBLE_EVENT_URL
    assert forwarded.content == b'{"n":"pageview"}'
    assert forwarded.headers["content-type"] == "text/plain"
    assert forwarded.headers["user-agent"] == "test-agent"
    assert forwarded.headers["x-forwarded-for"] == "testclient"
    assert "x-plausible-dropped" not in response.headers


def test_event_prefers_the_cloudflare_client_ip(client: TestClient, upstream_requests):
    client.post(
        "/log/api/event",
        content=b'{"n":"pageview"}',
        headers={"cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "172.68.1.1"},
    )

    assert upstream_requests[0].headers["x-forwarded-for"] == "203.0.113.7"


def test_event_passes_through_the_dropped_flag(client: TestClient, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(202, text="ok", headers={"x-plausible-dropped": "1"})

    monkeypatch.setattr(analytics, "_client", httpx.AsyncClient(transport=httpx.MockTransport(handler)))

    response = client.post("/log/api/event", content=b'{"n":"pageview"}')

    assert response.headers["x-plausible-dropped"] == "1"


def test_event_survives_an_unreachable_upstream(client: TestClient, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("upstream down", request=request)

    monkeypatch.setattr(analytics, "_client", httpx.AsyncClient(transport=httpx.MockTransport(handler)))

    response = client.post("/log/api/event", content=b'{"n":"pageview"}')

    assert response.status_code == 202


def test_script_reports_an_unreachable_upstream(client: TestClient, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("upstream down", request=request)

    monkeypatch.setattr(analytics, "_client", httpx.AsyncClient(transport=httpx.MockTransport(handler)))

    response = client.get("/log/script.js")

    assert response.status_code == 502
