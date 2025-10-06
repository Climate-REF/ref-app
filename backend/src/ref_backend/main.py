"""
Main entry point for the FastAPI application
"""

import dotenv
from fastapi import HTTPException, Request, Response
from fastapi.exception_handlers import (
    http_exception_handler as fasthttp_exception_handler,
)
from loguru import logger

from climate_ref.config import Config as RefConfig
from climate_ref.database import Database
from climate_ref.provider_registry import ProviderRegistry
from ref_backend.api import deps
from ref_backend.core.config import get_settings
from ref_backend.log import setup_logging
from ref_backend.testing import test_ref_config, test_settings

# Load environment variables from a .env file, if it exists
dotenv.load_dotenv(override=True)

# Load the settings early, to avoid climate-ref setting the `REF_CONFIGURATION` environment variable
settings = get_settings()

from ref_backend.builder import build_app  # noqa: E402
from ref_backend.core.ref import get_database, get_provider_registry, get_ref_config  # noqa: E402

# Initialize singletons at application startup
ref_config = get_ref_config(settings)
database = get_database(ref_config)
provider_registry = get_provider_registry(ref_config)

setup_logging(settings.LOG_LEVEL)
app = build_app(settings, ref_config, database)


# Override dependencies to use the pre-initialized singletons
def get_singleton_config() -> RefConfig:
    return ref_config


def get_singleton_database() -> Database:
    return database


def get_singleton_provider_registry() -> ProviderRegistry:
    return provider_registry


app.dependency_overrides[deps._ref_config_dependency] = get_singleton_config
app.dependency_overrides[deps._get_database_dependency] = get_singleton_database
app.dependency_overrides[deps._provider_registry_dependency] = get_singleton_provider_registry

if settings.USE_TEST_DATA:
    print("Using test data for the application.")

    app.dependency_overrides[get_settings] = test_settings
    app.dependency_overrides[deps._ref_config_dependency] = test_ref_config


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> Response:
    logger.error(f"HTTP Exception: {exc.detail}")
    return await fasthttp_exception_handler(request, exc)
