from pathlib import Path

from loguru import logger

from climate_ref.config import Config
from climate_ref.database import Database, MigrationState
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


def get_database(ref_config: Config, read_only: bool = False) -> Database:
    """
    Get a database connection using the default config.

    When ``read_only`` is true,
    the SQLite database is opened via``Database.from_config(..., read_only=True)``,
    which rewrites the URL to read-only URI form so no journal/WAL sidecar is created.
    """
    database = Database.from_config(ref_config, run_migrations=False, read_only=read_only)

    status = database.migration_status(ref_config)
    state = status["state"]
    if state is MigrationState.UP_TO_DATE:
        return database

    if state is MigrationState.UNMANAGED:
        msg = (
            "The database has no alembic revision stamp. "
            "Check the database URL in your config file and run the migration."
        )
        logger.warning(msg)
        if ref_config.db.run_migrations:
            raise ValueError(msg)
    elif state is MigrationState.REMOVED:
        raise ValueError(
            f"Database revision {status['current']!r} has been removed. "
            "Please delete your database and start again."
        )
    else:
        logger.warning(
            f"Database revision {status['current']!r} does not match this image's "
            f"head revision {status['head']!r}. "
            "The API will continue to read this database."
        )

    return database


def get_provider_registry(ref_config: Config, read_only: bool = False) -> ProviderRegistry:
    """
    Get the provider registry
    """
    database = get_database(ref_config, read_only=read_only)
    return ProviderRegistry.build_from_config(ref_config, database)
