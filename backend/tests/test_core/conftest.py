import copy
import shutil

import pytest

from climate_ref.database import Database
from ref_backend.testing import test_ref_config as fixture_ref_config


@pytest.fixture
def writable_session(tmp_path):
    """A throwaway copy of the fixture database, so a test may insert into it."""
    config = copy.deepcopy(fixture_ref_config())
    source = str(config.db.database_url).removeprefix("sqlite:///")
    destination = tmp_path / "climate_ref.db"
    shutil.copy(source, destination)
    config.db.database_url = f"sqlite:///{destination}"

    with Database.from_config(config).session_scope() as session:
        yield session
