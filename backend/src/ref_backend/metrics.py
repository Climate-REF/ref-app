"""Prometheus metrics via prometheus-fastapi-instrumentator."""

import fastapi
from prometheus_fastapi_instrumentator import Instrumentator


def instrument_app(app: fastapi.FastAPI) -> None:
    """Instrument the app and expose it at ``/metrics``.

    Registers the default request-count and latency histograms
    (``http_requests_total``, ``http_request_duration_seconds``).
    """
    Instrumentator(excluded_handlers=["/metrics", "/health-check/"]).instrument(app).expose(
        app, include_in_schema=False, tags=["metrics"]
    )
