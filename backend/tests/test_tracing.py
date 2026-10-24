import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

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
