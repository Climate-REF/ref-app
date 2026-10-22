import copy
import shutil
from collections.abc import Generator
from pathlib import Path

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
    app = build_app(
        settings=test_settings(),
        ref_config=test_ref_config(),
        database=deps._get_database_dependency(test_settings(), test_ref_config()),
    )

    app.dependency_overrides[get_settings] = test_settings
    app.dependency_overrides[deps._ref_config_dependency] = test_ref_config

    return app


@pytest.fixture(scope="session")
def client(app) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def writable_client(tmp_path: Path) -> Generator[TestClient, None, None]:
    """A client over a copy of the fixture database, for tests that have to write to it."""
    settings = test_settings()
    config = copy.deepcopy(test_ref_config())

    source = Path(config.db.database_url.removeprefix("sqlite:///"))
    database_copy = tmp_path / source.name
    shutil.copy(source, database_copy)
    config.db.database_url = f"sqlite:///{database_copy}"

    app = build_app(
        settings=settings,
        ref_config=config,
        database=deps._get_database_dependency(settings, config),
    )
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[deps._ref_config_dependency] = lambda: config

    with TestClient(app) as client:
        client.ref_config = config  # type: ignore[attr-defined]
        yield client
