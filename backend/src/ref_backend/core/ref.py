from pathlib import Path

import sqlalchemy
from alembic.script import ScriptDirectory
from loguru import logger
from sqlalchemy.orm import Session

from climate_ref.config import Config
from climate_ref.database import (
    Database,
    _get_database_revision,
    _get_sqlite_path,
)
from climate_ref.provider_registry import ProviderRegistry
from ref_backend.core.config import Settings


def get_ref_config(settings: Settings) -> Config:
    """
    Get the REF configuration object
    """
    config_fname = Path(settings.REF_CONFIGURATION) / "ref.toml"
    if config_fname.exists():
        logger.info(f"Loading REF configuration from {config_fname}")
    else:
        logger.info(f"REF configuration file not found at {config_fname}, using defaults")
    return Config.load(config_fname, allow_missing=True)


def _build_readonly_database(sqlite_path: Path) -> Database:
    """
    Build a Database that opens the given SQLite file in read-only mode.

    Uses SQLite's URI form with ``mode=ro&immutable=1`` so no journal/WAL
    sidecar is created. ``Database.__init__`` is bypassed because it doesn't
    accept ``connect_args`` and would route through ``sqlalchemy.create_engine``
    without the ``uri=True`` flag needed for ``file:`` URIs.
    """
    url = f"sqlite:///file:{sqlite_path}?mode=ro&immutable=1&uri=true"
    logger.info(f"Opening database read-only at {url}")
    database = Database.__new__(Database)
    database.url = url
    database._engine = sqlalchemy.create_engine(url, connect_args={"uri": True})
    database.session = Session(database._engine)
    return database


def _check_migration_status(database: Database, ref_config: Config) -> None:
    """
    Verify the database schema is compatible with the API.

    Mirrors the ``ref db status`` CLI check: compare the current alembic
    revision against the head revision defined by the bundled alembic
    scripts. When they differ, log a warning rather than raising.

    Raises
    ------
    ValueError
        Raised when the database has no alembic stamp at all *and* migrations are expected to
        have been run (``ref_config.db.run_migrations``).
    """
    script = ScriptDirectory.from_config(database.alembic_config(ref_config))
    head_rev = script.get_current_head()

    with database._engine.connect() as connection:
        current_rev = _get_database_revision(connection)

    if current_rev == head_rev:
        return

    if current_rev is None:
        msg = (
            "The database has no alembic revision stamp. "
            "Check the database URL in your config file and run the migration."
        )
        logger.warning(msg)
        if ref_config.db.run_migrations:
            raise ValueError(msg)
        return

    logger.warning(
        f"Database revision {current_rev!r} does not match this image's head "
        f"revision {head_rev!r}. Assuming a newer climate-ref CLI ran the "
        "migration; the API will continue to read this database."
    )


def get_database(ref_config: Config, read_only: bool = False) -> Database:
    """
    Get a database connection using the default config.

    Parameters
    ----------
    ref_config
        Loaded climate-ref config.
    read_only
        When true and the configured database is SQLite, open it with
        ``mode=ro&immutable=1`` so the underlying filesystem can be mounted
        read-only. Ignored for non-SQLite databases.
    """
    sqlite_path = _get_sqlite_path(ref_config.db.database_url)
    if read_only and sqlite_path is not None:
        database = _build_readonly_database(sqlite_path)
    else:
        if read_only:
            logger.warning(
                "REF_READ_ONLY_DATABASE is set but the configured database is "
                "not SQLite; falling back to a standard read-write connection."
            )
        database = Database.from_config(ref_config, run_migrations=False)

    _check_migration_status(database, ref_config)
    return database


def get_provider_registry(ref_config: Config, read_only: bool = False) -> ProviderRegistry:
    """
    Get the provider registry
    """
    database = get_database(ref_config, read_only=read_only)
    return ProviderRegistry.build_from_config(ref_config, database)
