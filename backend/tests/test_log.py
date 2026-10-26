import json
import logging
import re
import sys

import pytest
import sentry_sdk
from loguru import logger
from opentelemetry import trace
from opentelemetry.trace import NonRecordingSpan, SpanContext, TraceFlags

from ref_backend.log import setup_logging

TRACE_ID = 0x4BF92F3577B34DA6A3CE929D0E0E4736
SPAN_ID = 0x00F067AA0BA902B7
# The derived field Grafana uses to link a Loki line to its Tempo trace.
GRAFANA_TRACE_ID = re.compile(r'"trace_id":"(\w+)"')


@pytest.fixture
def restore_loguru():
    yield
    logger.remove()
    logger.configure(patcher=None)
    logger.add(sys.stderr)


def test_json_lines_carry_the_active_trace(restore_loguru, capsys):
    setup_logging("INFO", json_logs=True)
    span = NonRecordingSpan(SpanContext(TRACE_ID, SPAN_ID, is_remote=False, trace_flags=TraceFlags(1)))

    with trace.use_span(span):
        logger.warning("Slow query detected")

    line = capsys.readouterr().out.strip()
    payload = json.loads(line)
    assert payload["level"] == "warning"
    assert payload["message"] == "Slow query detected"
    assert payload["span_id"] == "00f067aa0ba902b7"
    assert GRAFANA_TRACE_ID.search(line).group(1) == "4bf92f3577b34da6a3ce929d0e0e4736"


def test_json_lines_outside_a_span_have_no_trace(restore_loguru, capsys):
    setup_logging("INFO", json_logs=True)

    logger.info("Starting up")

    payload = json.loads(capsys.readouterr().out)
    assert "trace_id" not in payload


def test_json_lines_include_the_exception(restore_loguru, capsys):
    setup_logging("INFO", json_logs=True)

    try:
        raise ValueError("boom")
    except ValueError:
        logger.exception("Request failed")

    payload = json.loads(capsys.readouterr().out)
    assert payload["level"] == "error"
    assert "ValueError: boom" in payload["exc"]


def test_text_lines_show_the_bound_fields(restore_loguru, capsys):
    setup_logging("INFO")

    logger.bind(event="http_request", status=404, route="/api/v1/executions/{group_id}").info("http_request")

    line = capsys.readouterr().err
    assert "status=404" in line
    assert "route='/api/v1/executions/{group_id}'" in line


def test_secret_fields_are_masked(restore_loguru, capsys):
    setup_logging("INFO", json_logs=True)

    logger.bind(api_key="sk-live-123").info("Calling upstream")

    payload = json.loads(capsys.readouterr().out)
    assert payload["api_key"] != "sk-live-123"


def test_stdlib_lines_name_the_calling_module_under_sentry(restore_loguru, capsys):
    # Sentry's logging integration wraps the stdlib handler call, as it does when deployed.
    sentry_sdk.init()
    setup_logging("INFO", json_logs=True)

    logging.getLogger("uvicorn.error").info("Started server process")

    payload = json.loads(capsys.readouterr().out)
    assert payload["logger"] == __name__
