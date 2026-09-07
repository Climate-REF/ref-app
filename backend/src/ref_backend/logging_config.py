"""
Structured JSON logging configuration

Installs a single JSON formatter on the root logger so every log line is one parseable event per record,
and silences uvicorn's plaintext access log in favour of the wide-event middleware.

For local development, set ``LOG_FORMAT=text`` to get a human-readable line format
that still includes all the structured fields in an appended ``key=value`` format.
"""

import json
import logging
import os
import sys
import time
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from loguru import logger as loguru_logger

_ENV_CONTEXT: dict[str, Any] = {}

_RESERVED_LOG_RECORD_KEYS = frozenset(
    {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "message",
        "module",
        "msecs",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "taskName",
        "thread",
        "threadName",
    }
)


def build_env_context() -> dict[str, Any]:
    """
    Return the static fields baked into every log line
    """
    try:
        app_version = version("ref-backend")
    except PackageNotFoundError:
        app_version = None

    fields = {
        "service": "ref-backend",
        "version": app_version,
        "commit": os.environ.get("GIT_COMMIT") or os.environ.get("IMAGE_TAG") or None,
        "env": os.environ.get("ENVIRONMENT", "local"),
        "instance_id": os.environ.get("HOSTNAME"),
    }
    return {k: v for k, v in fields.items() if v is not None}


class JsonFormatter(logging.Formatter):
    """
    Single-line JSON formatter that flattens ``extra`` and merges env context
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Render the record as a single-line JSON object
        """
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        payload.update(_ENV_CONTEXT)

        for key, value in record.__dict__.items():
            if key in _RESERVED_LOG_RECORD_KEYS or key.startswith("_"):
                continue
            payload[key] = value

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, separators=(",", ":"))


class TextFormatter(logging.Formatter):
    """
    Human-readable formatter for local dev

    Renders one line per record with timestamp, level, logger, message,
    then any ``extra`` fields appended as ``key=value`` pairs.
    Wide-event records therefore stay grep-friendly without forcing operators to read JSON.
    """

    _DEFAULT_FMT = "%(asctime)s %(levelname)-5s %(name)s %(message)s"

    def __init__(self) -> None:
        super().__init__(fmt=self._DEFAULT_FMT, datefmt="%Y-%m-%dT%H:%M:%S")

    def format(self, record: logging.LogRecord) -> str:
        """
        Render the record as ``<ts> <level> <logger> <msg> k=v ...``
        """
        base = super().format(record)
        extras = []
        for key, value in record.__dict__.items():
            if key in _RESERVED_LOG_RECORD_KEYS or key.startswith("_"):
                continue
            extras.append(f"{key}={value!r}")
        if extras:
            base = f"{base} | {' '.join(extras)}"
        if record.exc_info and not record.exc_text:
            base = f"{base}\n{self.formatException(record.exc_info)}"
        return base


def _resolve_format(explicit: str | None) -> str:
    """
    Pick the formatter name: explicit arg > LOG_FORMAT env > default ``json``
    """
    raw = (explicit or os.environ.get("LOG_FORMAT") or "json").strip().lower()
    if raw in {"json", "text"}:
        return raw
    return "json"


def _loguru_sink(message: Any) -> None:
    """
    Re-emit a loguru record through the standard library, so it picks up our formatter
    """
    record = message.record
    logging.getLogger(record["name"] or "loguru").log(
        record["level"].no,
        record["message"],
        exc_info=record["exception"],
    )


def _bridge_loguru(level: str | int) -> None:
    """
    Route loguru through the standard library

    climate-ref and its providers log via loguru, so without this their records bypass
    the JSON formatter and land on stderr unstructured.
    """
    loguru_logger.remove()
    loguru_logger.add(_loguru_sink, level=level, format="{message}")


def configure_logging(level: str | int = "INFO", fmt: str | None = None) -> None:
    """
    Install structured logging and silence uvicorn's plaintext access log

    The handler format is JSON by default and switches to a human-readable
    line format when ``LOG_FORMAT=text`` (or ``fmt="text"``) is set. Idempotent:
    safe to call again after uvicorn re-applies its own dictConfig on startup.
    """
    _ENV_CONTEXT.clear()
    _ENV_CONTEXT.update(build_env_context())

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(TextFormatter() if _resolve_format(fmt) == "text" else JsonFormatter())

    root = logging.getLogger()
    if "PYTEST_CURRENT_TEST" in os.environ:
        # In tests, keep pytest's capturing handlers and add ours alongside, once.
        already_attached = any(isinstance(h.formatter, JsonFormatter | TextFormatter) for h in root.handlers)
        if not already_attached:
            root.addHandler(handler)
    else:
        root.handlers = [handler]
    root.setLevel(level)

    _bridge_loguru(level)

    access = logging.getLogger("uvicorn.access")
    access.handlers = []
    access.propagate = False

    for name in ("uvicorn", "uvicorn.error", "fastapi"):
        log = logging.getLogger(name)
        log.handlers = []
        log.propagate = True
