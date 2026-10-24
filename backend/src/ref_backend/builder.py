from collections.abc import Awaitable, Callable
from importlib.metadata import version

import sentry_sdk
from cr_service import context, metrics, tracing
from cr_service.health import router as health_router
from cr_service.info import ServiceInfo
from cr_service.middleware import WideEventMiddleware
from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi_sqlalchemy_monitor import AlchemyStatistics, SQLAlchemyMonitor
from fastapi_sqlalchemy_monitor.action import Action, ConditionalAction, WarnMaxTotalInvocation
from loguru import logger
from prometheus_fastapi_instrumentator import routing
from sqlalchemy import Engine
from starlette import status
from starlette.exceptions import HTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send

from climate_ref.config import Config
from climate_ref.database import Database
from ref_backend.analytics import router as analytics_router
from ref_backend.api.main import api_router
from ref_backend.caching import CacheControlMiddleware
from ref_backend.core.config import Settings

SERVICE = ServiceInfo(name="ref-backend", version=version("ref-backend"))

description = """
API for querying the results from the Climate Rapid Evaluation Framework (Climate REF).
This is used to back the [Climate REF Explorer](https://dashboard.climate-ref.org) web application.

This API is a work in progress and will likely change in the future without warning.
We are interested in your feedback on how you would like to use this API.
This will help us prioritize features, and be aware of any API consumers before we make any changes.

Contact [Jared Lewis](mailto:jared.lewis@climate-resource.com) or
[file an issue on GitHub](https://github.com/Climate-REF/ref-app/issues),
if you have any questions or feedback.
"""


def custom_generate_unique_id(route: APIRoute) -> str:
    # The cr-service health and metrics routes carry no tag.
    return f"{route.tags[0]}-{route.name}" if route.tags else route.name


class RequestQueryMonitor(SQLAlchemyMonitor):
    """Runs the actions even when the endpoint raises, so a failed request keeps its query statistics."""

    def __init__(self, app: ASGIApp, *, engine: Engine, actions: list[Action]) -> None:
        super().__init__(app, engine=engine, actions=actions)
        self.actions = actions

    async def _dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        statistics = AlchemyStatistics()
        self.request_context.set(statistics)
        try:
            return await call_next(request)
        finally:
            for action in self.actions:
                action.handle(statistics)


class SlowQueryMonitor(ConditionalAction):
    def __init__(self, threshold_ms: float):
        self.threshold_ms = threshold_ms

    def _condition(self, statistics: AlchemyStatistics) -> bool:
        # Check if any query exceeds the time threshold
        return any(
            query.total_invocation_time_ms > self.threshold_ms for query in statistics.query_stats.values()
        )

    def _handle(self, statistics: AlchemyStatistics) -> None:
        # Log details of slow queries
        for query_stat in statistics.query_stats.values():
            if query_stat.total_invocation_time_ms > self.threshold_ms:
                logger.warning(
                    f"Slow query detected ({query_stat.total_invocation_time_ms:.2f}ms): {query_stat.query}"
                )


class BindQueryStatistics(Action):
    """Put the request's query count and time on its wide event."""

    def handle(self, statistics: AlchemyStatistics) -> None:
        context.bind(
            db_queries=statistics.total_invocations,
            db_time_ms=round(statistics.total_invocation_time_ms, 2),
        )


class BindRouteMiddleware:
    """Put the route template on the wide event, named as the `handler` label in /metrics names it."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            # None for a path no route matches.
            context.bind(route=routing.get_route_name(Request(scope), should_include_root_path=False))
        await self.app(scope, receive, send)


class SPAStaticFiles(StaticFiles):
    """
    Static file handler with SPA fallback.

    Serves static files normally, but falls back to index.html for paths
    that don't match a real file (enabling client-side routing).
    Missing files under the build's `assets/` directory still return a 404.
    """

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            # A missing build asset must 404, because the browser cannot run HTML as a script.
            if exc.status_code != status.HTTP_404_NOT_FOUND or path.startswith("assets/"):
                raise
            # Not ".", because a directory lookup redirects to a trailing slash.
            response = await super().get_response("index.html", scope)

        return response


def build_app(settings: Settings, ref_config: Config, database: Database) -> FastAPI:
    """
    Build the FastAPI application with the necessary configurations and middlewares.
    """
    if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
        sentry_sdk.init(
            dsn=str(settings.SENTRY_DSN),
            environment=settings.ENVIRONMENT,
            release=settings.GIT_COMMIT,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
        )
    # FastAPI traces each request itself once a tracer provider is installed.
    tracing.install_provider(SERVICE)
    tracing.instrument_sqlalchemy(database._engine)

    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=description,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        generate_unique_id_function=custom_generate_unique_id,
        contact={
            "name": "Development Lead - Jared Lewis",
            "email": "jared.lewis@climate-resource.com",
        },
        license_info={
            "name": "Apache 2.0",
            "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
        },
    )
    app.add_middleware(
        RequestQueryMonitor,
        engine=database._engine,
        actions=[
            BindQueryStatistics(),
            WarnMaxTotalInvocation(max_invocations=10),
            SlowQueryMonitor(threshold_ms=100),
        ],
    )

    # Set all CORS enabled origins
    if settings.all_cors_origins or settings.BACKEND_CORS_ORIGIN_REGEX:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.all_cors_origins,
            allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX,
            allow_credentials=False,
            allow_methods=["GET"],
            allow_headers=["*"],
        )

    app.add_middleware(
        CacheControlMiddleware,
        api_prefix=settings.API_V1_STR,
        api_max_age=settings.API_CACHE_MAX_AGE,
        results_max_age=settings.RESULTS_CACHE_MAX_AGE,
    )
    # Outermost, so the wide event times the whole stack and sees the query statistics.
    app.add_middleware(BindRouteMiddleware)
    app.add_middleware(WideEventMiddleware)

    # Registered before the static mount, so the SPA fallback does not swallow the probes or /metrics.
    app.include_router(health_router)
    metrics.instrument_app(app)

    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Mounted above the static files, which only answer GET and HEAD.
    app.include_router(analytics_router)

    if settings.STATIC_DIR:
        logger.info(f"Serving static files from {settings.STATIC_DIR}")
        app.mount(
            "/",
            SPAStaticFiles(directory=settings.STATIC_DIR, html=True, check_dir=False),
            name="static",
        )

    return app
