import copy
import shutil

import pytest

from climate_ref.database import Database
from climate_ref.results import Reader
from ref_backend.testing import test_ref_config as fixture_ref_config


@pytest.fixture
def writable_database(tmp_path):
    """A throwaway copy of the fixture database, so a test may insert into it."""
    config = copy.deepcopy(fixture_ref_config())
    source = str(config.db.database_url).removeprefix("sqlite:///")
    destination = tmp_path / "climate_ref.db"
    shutil.copy(source, destination)
    config.db.database_url = f"sqlite:///{destination}"
    return Database.from_config(config)


@pytest.fixture
def writable_session(writable_database):
    with writable_database.session_scope() as session:
        yield session


@pytest.fixture
def writable_reader(writable_database, writable_session):
    return Reader(writable_database, session=writable_session)
