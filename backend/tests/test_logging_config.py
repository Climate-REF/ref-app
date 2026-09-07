"""
Tests for the structured logging formatters
"""

import json
import logging

from ref_backend.logging_config import JsonFormatter, TextFormatter


def _make_record(message="hello", **extra):
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg=message,
        args=(),
        exc_info=None,
    )
    for key, value in extra.items():
        setattr(record, key, value)
    return record


def test_json_formatter_produces_valid_json_with_extras():
    formatter = JsonFormatter()
    record = _make_record(request_id="abc123")
    payload = json.loads(formatter.format(record))
    assert payload["message"] == "hello"
    assert payload["request_id"] == "abc123"
    assert payload["level"] == "info"


def test_text_formatter_appends_extras_as_key_value_pairs():
    formatter = TextFormatter()
    record = _make_record(request_id="abc123")
    line = formatter.format(record)
    assert "hello" in line
    assert "request_id='abc123'" in line
