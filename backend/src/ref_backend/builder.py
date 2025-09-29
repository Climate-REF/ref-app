from dataclasses import asdict

import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi_sqlalchemy_monitor import AlchemyStatistics, SQLAlchemyMonitor
from fastapi_sqlalchemy_monitor.action import Action, ConditionalAction, WarnMaxTotalInvocation
from loguru import logger
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from climate_ref.config import Config
from climate_ref.database import Database
from climate_ref.models import MetricValue
from climate_ref_core.pycmec.controlled_vocabulary import CV
from ref_backend.api.main import api_router
from ref_backend.core.config import Settings

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
    return f"{route.tags[0]}-{route.name}"


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


class LogStatistics(Action):
    """Action that logs current statistics."""

    def handle(self, statistics: AlchemyStatistics) -> None:
        if statistics.total_invocations > 0:
            logger.info(asdict(statistics))


def register_cv_dimensions(ref_config: Config) -> None:
    """
    Register the controlled vocabulary dimensions for MetricValue.

    This is a workaround until we have a better way to handle controlled vocabularies.
    """
    cv_path = ref_config.paths.dimensions_cv

    MetricValue.register_cv_dimensions(CV.load_from_file(cv_path))


def build_app(settings: Settings, ref_config: Config, database: Database) -> FastAPI:
    """
    Build the FastAPI application with the necessary configurations and middlewares.
    """
    if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
        sentry_sdk.init(
            dsn=str(settings.SENTRY_DSN),
            enable_tracing=True,
        )

    register_cv_dimensions(ref_config)

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
        SQLAlchemyMonitor,
        engine=database._engine,
        actions=[
            LogStatistics(),
            WarnMaxTotalInvocation(max_invocations=10),
            SlowQueryMonitor(threshold_ms=100),
        ],
    )

    # Set all CORS enabled origins
    if settings.all_cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.all_cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(api_router, prefix=settings.API_V1_STR)

    if settings.STATIC_DIR:
        logger.info(f"Serving static files from {settings.STATIC_DIR}")
        app.mount(
            "/",
            StaticFiles(directory=settings.STATIC_DIR, html=True, check_dir=False),
            name="static",
        )

    return app
