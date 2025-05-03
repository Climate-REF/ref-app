from collections.abc import Generator

import pytest
from starlette.testclient import TestClient

from climate_ref.database import Database
from ref_backend.core.db import create_database_connection
from ref_backend.main import app


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Database, None, None]:
    _db = create_database_connection()
    yield _db


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c
