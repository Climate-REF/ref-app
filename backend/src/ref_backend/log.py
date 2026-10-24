import inspect
import json
import logging
import sys
import traceback
from datetime import UTC
from typing import TYPE_CHECKING, Any

from cr_service.tracing import current_trace_context
from loguru import logger

if TYPE_CHECKING:
    from loguru import Message, Record


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

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def _add_trace_context(record: "Record") -> None:
    record["extra"].update(current_trace_context())


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


def setup_logging(log_level: str, json_logs: bool = False) -> None:
    logger.configure(patcher=_add_trace_context)
    if json_logs:
        logger.remove()
        logger.add(_json_sink, level="DEBUG")

    # Remove existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)

    # Intercept standard logging
    logging.basicConfig(handlers=[InterceptHandler()], level=log_level)

    # List of loggers to intercept
    loggers = (
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
        "fastapi",
        "asyncio",
        "starlette",
    )

    for logger_name in loggers:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = []
        logging_logger.propagate = True
