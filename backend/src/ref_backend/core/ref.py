from pathlib import Path

from loguru import logger

from climate_ref.config import Config
from climate_ref.database import Database, _get_database_revision
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


def get_database(ref_config: Config) -> Database:
    """
    Get a database connection using the default config
    """
    database = Database.from_config(ref_config, run_migrations=False)
    with database._engine.connect() as connection:
        if _get_database_revision(connection) is None:
            msg = (
                "The database migration has not been run. "
                "Check the database URL in your config file and run the migration."
            )
            logger.warning(msg)
            if ref_config.db.run_migrations:
                raise ValueError(msg)
    return database


def get_provider_registry(ref_config: Config) -> ProviderRegistry:
    """
    Get the provider registry
    """
    database = get_database(ref_config)
    return ProviderRegistry.build_from_config(ref_config, database)
