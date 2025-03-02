from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from ref_backend.core.db import engine
from ref_backend.main import app


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c
