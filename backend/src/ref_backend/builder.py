import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from loguru import logger
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from climate_ref.config import Config
from climate_ref.models import MetricValue
from climate_ref_core.pycmec.controlled_vocabulary import CV
from ref_backend.api.main import api_router
from ref_backend.core.config import Settings


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


def register_cv_dimensions(ref_config: Config) -> None:
    """
    Register the controlled vocabulary dimensions for MetricValue.

    This is a workaround until we have a better way to handle controlled vocabularies.
    """
    cv_path = ref_config.paths.dimensions_cv

    MetricValue.register_cv_dimensions(CV.load_from_file(cv_path))


def build_app(settings: Settings, ref_config: Config) -> FastAPI:
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
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        generate_unique_id_function=custom_generate_unique_id,
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
