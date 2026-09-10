import fastapi
from prometheus_fastapi_instrumentator import Instrumentator


def instrument_app(app: fastapi.FastAPI) -> None:
    """Expose ``http_requests_total`` and ``http_request_duration_seconds`` at ``/metrics``."""
    # The unique id function in the builder needs a tag on every route.
    Instrumentator(excluded_handlers=["^/metrics$", "^/api/v1/utils/health-check/$"]).instrument(app).expose(
        app, include_in_schema=False, tags=["metrics"]
    )
