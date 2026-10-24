import json
import sys

import pytest
import sqlalchemy
from cr_service.middleware import WideEventMiddleware
from fastapi import FastAPI
from loguru import logger
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from starlette.testclient import TestClient

from ref_backend.builder import BindQueryStatistics, RequestQueryMonitor
from ref_backend.log import setup_logging

TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736"


@pytest.fixture(scope="module")
def exporter():
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    return exporter


def test_request_span_continues_the_browser_trace(exporter, client):
    exporter.clear()

    response = client.get(
        "/api/v1/utils/about", headers={"traceparent": f"00-{TRACE_ID}-00f067aa0ba902b7-01"}
    )

    assert response.status_code == 200
    spans = [span for span in exporter.get_finished_spans() if span.kind == trace.SpanKind.SERVER]
    assert spans
    assert trace.format_trace_id(spans[0].context.trace_id) == TRACE_ID
    assert spans[0].attributes["http.route"] == "/api/v1/utils/about"


@pytest.fixture
def json_logs(capsys):
    setup_logging("INFO", json_logs=True)
    capsys.readouterr()
    yield lambda: [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    logger.remove()
    logger.configure(patcher=None)
    logger.add(sys.stderr)


def test_each_request_logs_one_wide_event(exporter, client, json_logs):
    client.get("/api/v1/diagnostics/", headers={"traceparent": f"00-{TRACE_ID}-00f067aa0ba902b7-01"})
    lines = json_logs()

    events = [line for line in lines if line.get("event") == "http_request"]
    assert len(events) == 1
    event = events[0]
    assert event["method"] == "GET"
    assert event["route"] == "/api/v1/diagnostics/"
    assert event["status"] == 200
    assert event["duration_ms"] > 0
    assert event["db_queries"] > 0
    assert event["trace_id"] == TRACE_ID
    assert all(line["level"] != "debug" for line in lines)
    assert not any("query_stats" in line["message"] for line in lines)


def test_wide_event_names_the_route_when_no_endpoint_runs(client, json_logs):
    client.post("/api/v1/diagnostics/")

    (event,) = [line for line in json_logs() if line.get("event") == "http_request"]
    assert event["status"] == 405
    assert event["route"] == "/api/v1/diagnostics/"


def test_failed_request_keeps_its_query_statistics(json_logs):
    engine = sqlalchemy.create_engine("sqlite://")
    app = FastAPI()

    @app.get("/boom")
    def boom():
        with engine.connect() as connection:
            connection.execute(sqlalchemy.text("SELECT 1"))
        raise RuntimeError("boom")

    app.add_middleware(RequestQueryMonitor, engine=engine, actions=[BindQueryStatistics()])
    app.add_middleware(WideEventMiddleware)

    TestClient(app, raise_server_exceptions=False).get("/boom")

    (event,) = [line for line in json_logs() if line.get("event") == "http_request"]
    assert event["status"] == 500
    assert event["db_queries"] == 1
