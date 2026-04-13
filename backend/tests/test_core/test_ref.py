import copy
import shutil
from pathlib import Path

import pytest
import sqlalchemy

from climate_ref.config import Config
from ref_backend.core.config import Settings
from ref_backend.core.ref import get_database, get_ref_config
from ref_backend.testing import test_ref_config as _load_test_ref_config


def test_get_ref_config_missing_toml(tmp_path: Path):
    """get_ref_config returns a default Config when ref.toml does not exist"""
    settings = Settings(REF_CONFIGURATION=str(tmp_path))

    config = get_ref_config(settings)

    assert isinstance(config, Config)


def test_get_ref_config_with_toml(tmp_path: Path):
    """get_ref_config loads configuration from ref.toml when it exists"""
    toml_file = tmp_path / "ref.toml"
    toml_file.write_text("")

    settings = Settings(REF_CONFIGURATION=str(tmp_path))

    config = get_ref_config(settings)

    assert isinstance(config, Config)


def _copy_test_db(tmp_path: Path) -> Path:
    """Copy the checked-in test SQLite database to an isolated location."""
    src = Path(_load_test_ref_config().db.database_url.removeprefix("sqlite:///"))
    dst = tmp_path / "climate_ref.db"
    shutil.copy2(src, dst)
    return dst


def test_get_database_read_only_rejects_writes(tmp_path: Path):
    """read_only=True opens SQLite via mode=ro so writes raise OperationalError."""
    db_path = _copy_test_db(tmp_path)
    ref_config = copy.deepcopy(_load_test_ref_config())
    ref_config.db.database_url = f"sqlite:///{db_path}"

    database = get_database(ref_config, read_only=True)

    assert "mode=ro" in database.url
    with database._engine.connect() as connection:
        with pytest.raises(sqlalchemy.exc.OperationalError):
            connection.execute(sqlalchemy.text("CREATE TABLE probe (x INTEGER)"))
            connection.commit()


def test_get_database_tolerates_unknown_revision(tmp_path: Path):
    """
    A DB stamped with an alembic revision this image doesn't know must not
    raise — it means a newer climate-ref CLI ran the migration.
    """
    db_path = _copy_test_db(tmp_path)
    ref_config = copy.deepcopy(_load_test_ref_config())
    ref_config.db.database_url = f"sqlite:///{db_path}"

    engine = sqlalchemy.create_engine(ref_config.db.database_url)
    with engine.begin() as connection:
        connection.execute(sqlalchemy.text("UPDATE alembic_version SET version_num = 'from_future_cli'"))
    engine.dispose()

    database = get_database(ref_config)
    assert database is not None
