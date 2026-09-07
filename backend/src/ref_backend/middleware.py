"""
Wide-event HTTP middleware

Emits one structured access log per request (canonical log line) and stamps
correlation headers on the response. Replaces uvicorn's plaintext access log.
"""

import http
import logging
import time
import uuid
from typing import Any

import fastapi
import sentry_sdk
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("access")

# Probe and metrics hits are logged at debug so they do not drown out real traffic.
_PROBE_PATHS = frozenset({"/livez", "/readyz", "/metrics"})


def _extract_sentry_trace_id() -> str | None:
    """
    Best-effort lookup of the current Sentry trace_id for cross-tool correlation
    """
    span = sentry_sdk.get_current_span()
    if span is not None:
        return getattr(span, "trace_id", None)
    scope = sentry_sdk.get_current_scope()
    ctx = getattr(scope, "_propagation_context", None) or getattr(scope, "propagation_context", None)
    return getattr(ctx, "trace_id", None) if ctx else None


def _resolve_request_id(request: fastapi.Request) -> str:
    """
    Reuse an upstream correlation id if present, otherwise mint one
    """
    upstream = request.headers.get("x-request-id") or request.headers.get("x-amzn-trace-id")
    return upstream or uuid.uuid4().hex


def _client_ip(request: fastapi.Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _correlation_headers(request_id: str, duration_s: float) -> list[tuple[bytes, bytes]]:
    """
    Build the observability and correlation headers stamped on every response
    """
    return [
        (b"x-request-id", request_id.encode()),
        (b"x-process-time", f"{duration_s:.6f}".encode()),
    ]


class WideEventMiddleware:
    """
    Emit one wide event per HTTP request and stamp correlation headers
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        ASGI entry-point: wraps the downstream app to time and log the request
        """
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = fastapi.Request(scope, receive=receive)
        request_id = _resolve_request_id(request)
        request.state.request_id = request_id
        sentry_sdk.set_tag("request_id", request_id)

        start = time.perf_counter()
        status_code: int | None = None
        response_bytes = 0

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code, response_bytes
            if message["type"] == "http.response.start":
                status_code = message["status"]
                duration_s = time.perf_counter() - start
                headers = list(message.get("headers", []))
                headers.extend(_correlation_headers(request_id, duration_s))
                message["headers"] = headers
            elif message["type"] == "http.response.body":
                response_bytes += len(message.get("body", b""))
            await send(message)

        error_type: str | None = None
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            error_type = type(exc).__name__
            if status_code is None:
                status_code = 500
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            event: dict[str, Any] = {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query": dict(request.query_params),
                "status": status_code,
                "duration_ms": duration_ms,
                "response_bytes": response_bytes,
                "client_ip": _client_ip(request),
                "user_agent": request.headers.get("user-agent"),
                "referer": request.headers.get("referer"),
                "sentry_trace_id": _extract_sentry_trace_id(),
            }

            if error_type:
                event["error_type"] = error_type
                logger.error("http_request", extra=event)
            elif (
                request.url.path in _PROBE_PATHS
                and status_code is not None
                and status_code < http.HTTPStatus.BAD_REQUEST
            ):
                logger.debug("http_request", extra=event)
            else:
                logger.info("http_request", extra=event)
