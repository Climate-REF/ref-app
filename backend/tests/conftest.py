import functools
from collections.abc import Generator

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from ref_backend.core.config import Settings


@functools.lru_cache
def test_settings():
    """Settings to use the decimated test data included in the git repo."""
    return Settings()


@pytest.fixture()
def settings():
    return test_settings()


@pytest.fixture(scope="session")
def app() -> FastAPI:
    """
    Create a FastAPI application for testing.

    This creates the application with the necessary overrides for testing,
    including mocking Sentry setup and using a custom settings function.
    """
    # Late load the application to ensure that we are in the pytest context
    import ref_backend.main

    app = ref_backend.main.build_app()

    app.dependency_overrides[ref_backend.core.config.get_settings] = lambda: settings()

    return app


@pytest.fixture(scope="session")
def client(app) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c
