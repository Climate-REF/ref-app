"""
Tests for the wide-event HTTP middleware
"""

from fastapi.testclient import TestClient


def test_wide_event_stamps_request_id_header(client: TestClient) -> None:
    response = client.get("/livez")
    assert "x-request-id" in response.headers
    assert "x-process-time" in response.headers


def test_wide_event_reuses_upstream_request_id(client: TestClient) -> None:
    response = client.get("/livez", headers={"x-request-id": "upstream-id"})
    assert response.headers["x-request-id"] == "upstream-id"


def test_wide_event_reads_forwarded_for_header(client: TestClient) -> None:
    response = client.get("/livez", headers={"x-forwarded-for": "203.0.113.5, 10.0.0.1"})
    assert response.status_code == 200


def test_wide_event_logs_the_request(client: TestClient, settings, caplog) -> None:
    with caplog.at_level("INFO", logger="access"):
        client.get(f"{settings.API_V1_STR}/diagnostics/")

    record = next(r for r in caplog.records if r.name == "access")
    assert record.event == "http_request"
    assert record.method == "GET"
    assert record.path == f"{settings.API_V1_STR}/diagnostics/"
    assert record.status == 200


def test_wide_event_logs_and_reraises_on_unhandled_exception(app, caplog) -> None:
    @app.get("/boom")
    def boom():
        raise RuntimeError("boom")

    with TestClient(app, raise_server_exceptions=False) as c, caplog.at_level("ERROR", logger="access"):
        response = c.get("/boom")

    assert response.status_code == 500
    record = next(r for r in caplog.records if r.name == "access")
    assert record.error_type == "RuntimeError"


def test_wide_event_logs_probe_hits_at_debug(client: TestClient, caplog) -> None:
    with caplog.at_level("DEBUG", logger="access"):
        client.get("/livez")

    record = next(r for r in caplog.records if r.name == "access")
    assert record.levelname == "DEBUG"
    assert record.path == "/livez"
