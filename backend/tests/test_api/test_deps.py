from contextlib import contextmanager

import sqlalchemy
from fastapi.testclient import TestClient

from ref_backend.api.deps import _get_database_dependency, get_database_session
from ref_backend.testing import test_ref_config as _load_test_ref_config

# FastAPI drives the dependency as a generator, so the tests wrap it to get the same teardown.
session_scope = contextmanager(get_database_session)


def test_database_dependency_is_reused(settings):
    """The same Database, and so the same engine, is handed to every request"""
    first = _get_database_dependency(settings, _load_test_ref_config())
    second = _get_database_dependency(settings, _load_test_ref_config())

    assert first is second


def test_session_dependency_is_request_scoped(settings):
    """Each request gets its own session rather than the shared long-lived one"""
    database = _get_database_dependency(settings, _load_test_ref_config())

    with session_scope(database) as first, session_scope(database) as second:
        assert first is not second
        assert first is not database.session
        assert second is not database.session


def test_session_dependency_closes_the_transaction(settings):
    """The session dependency ends the transaction once the request is done"""
    database = _get_database_dependency(settings, _load_test_ref_config())

    with session_scope(database) as session:
        session.execute(sqlalchemy.text("SELECT 1"))
        assert session.in_transaction()

    assert not session.in_transaction()


def test_request_returns_its_connection_to_the_pool(client: TestClient, settings):
    """A completed request does not leave a connection checked out"""
    database = _get_database_dependency(settings, _load_test_ref_config())

    response = client.get(f"{settings.API_V1_STR}/diagnostics/")

    assert response.status_code == 200
    assert database._engine.pool.checkedout() == 0
