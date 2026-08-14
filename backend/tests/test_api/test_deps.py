import pytest
import sqlalchemy
from fastapi.testclient import TestClient

from ref_backend.api.deps import _get_database_dependency, get_database_session
from ref_backend.testing import test_ref_config as _load_test_ref_config


def test_database_dependency_is_reused(settings):
    """The same Database, and so the same engine, is handed to every request"""
    first = _get_database_dependency(settings, _load_test_ref_config())
    second = _get_database_dependency(settings, _load_test_ref_config())

    assert first is second


def test_session_dependency_closes_the_transaction(settings):
    """The session dependency ends the transaction once the request is done"""
    database = _get_database_dependency(settings, _load_test_ref_config())

    generator = get_database_session(database)
    session = next(generator)
    session.execute(sqlalchemy.text("SELECT 1"))
    assert session.in_transaction()

    with pytest.raises(StopIteration):
        next(generator)

    assert not session.in_transaction()


def test_request_leaves_no_open_transaction(client: TestClient, settings):
    """A completed request does not leave a connection idle in a transaction"""
    database = _get_database_dependency(settings, _load_test_ref_config())

    response = client.get(f"{settings.API_V1_STR}/diagnostics/")

    assert response.status_code == 200
    assert not database.session.in_transaction()
