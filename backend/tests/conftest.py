from collections.abc import Generator

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from ref_backend.api import deps
from ref_backend.builder import build_app
from ref_backend.core.config import get_settings
from ref_backend.testing import test_ref_config, test_settings


@pytest.fixture(scope="session")
def settings():
    return test_settings()


@pytest.fixture(scope="session")
def app() -> FastAPI:
    """
    Create a FastAPI application for testing.

    This creates the application with the necessary overrides for testing,
    including mocking Sentry setup and using a custom settings function.
    """
    app = build_app(settings=test_settings(), ref_config=test_ref_config())

    app.dependency_overrides[get_settings] = test_settings
    app.dependency_overrides[deps._ref_config_dependency] = test_ref_config

    return app


@pytest.fixture(scope="session")
def client(app) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c
