import inspect
import json
import logging
import sys
import traceback
from datetime import UTC
from typing import TYPE_CHECKING, Any

from cr_service.context import get_context
from cr_service.redact import redact_fields
from cr_service.tracing import current_trace_context
from loguru import logger

if TYPE_CHECKING:
    from loguru import Message, Record


_RESERVED_LOG_RECORD_KEYS = frozenset(logging.makeLogRecord({}).__dict__) | {"message", "asctime"}


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno  # type: ignore[assignment]

        # Find caller to get correct stack depth
        frame, depth = inspect.currentframe(), 0
        while frame and (depth == 0 or frame.f_code.co_filename == logging.__file__):
            frame = frame.f_back
            depth += 1

        # Carries `extra` across, which is where cr-service puts the wide event's fields.
        fields = {
            key: value for key, value in record.__dict__.items() if key not in _RESERVED_LOG_RECORD_KEYS
        }
        logger.bind(**fields).opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def _add_request_context(record: "Record") -> None:
    record["extra"] = redact_fields({**current_trace_context(), **get_context(), **record["extra"]})


def _json_sink(message: "Message") -> None:
    """Write one compact JSON object per line, in the shape cr-service services log."""
    record = message.record
    payload: dict[str, Any] = {
        "ts": record["time"].astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "level": record["level"].name.lower(),
        "logger": record["name"],
        "message": record["message"],
        **record["extra"],
    }
    if record["exception"]:
        payload["exc"] = "".join(traceback.format_exception(*record["exception"]))
    # Compact separators, because Grafana matches `"trace_id":"<id>"` to link a line to its trace.
    sys.stdout.write(json.dumps(payload, default=str, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _text_format(record: "Record") -> str:
    """Loguru's default line, followed by the bound fields as ``key=value`` pairs."""
    fields = " ".join(f"{key}={value!r}" for key, value in record["extra"].items() if key != "_fields")
    record["extra"]["_fields"] = f" | {fields}" if fields else ""
    return (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
        "{extra[_fields]}\n{exception}"
    )


def setup_logging(log_level: str, json_logs: bool = False) -> None:
    logger.configure(patcher=_add_request_context)
    logger.remove()
    if json_logs:
        logger.add(_json_sink, level=log_level.upper())
    else:
        logger.add(sys.stderr, level=log_level.upper(), format=_text_format)

    # Remove existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)

    # Intercept standard logging
    logging.basicConfig(handlers=[InterceptHandler()], level=log_level)

    # List of loggers to intercept
    loggers = (
        "uvicorn",
        "uvicorn.error",
        "fastapi",
        "asyncio",
        "starlette",
    )

    for logger_name in loggers:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = []
        logging_logger.propagate = True

    # The wide event replaces uvicorn's access line.
    access = logging.getLogger("uvicorn.access")
    access.handlers = []
    access.propagate = False
