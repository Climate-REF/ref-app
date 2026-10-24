import json
import sys

import pytest
from loguru import logger
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

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


def test_each_request_logs_one_wide_event(exporter, client, capsys):
    setup_logging("INFO", json_logs=True)
    try:
        capsys.readouterr()
        client.get("/api/v1/diagnostics/", headers={"traceparent": f"00-{TRACE_ID}-00f067aa0ba902b7-01"})
        lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    finally:
        logger.remove()
        logger.configure(patcher=None)
        logger.add(sys.stderr)

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
