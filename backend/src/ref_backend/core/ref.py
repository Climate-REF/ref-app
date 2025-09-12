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
    if not config_fname.exists():
        raise FileNotFoundError(f"REF configuration file not found: {config_fname}")
    logger.info(f"Loading REF configuration from {config_fname}")
    return Config.load(config_fname)


def get_database(ref_config: Config) -> Database:
    """
    Get a database connection using the default config
    """
    database = Database.from_config(ref_config, run_migrations=False)
    with database._engine.connect() as connection:
        if _get_database_revision(connection) is None:
            raise ValueError(
                "The database migration has not been run. "
                "Check the database URL in your config file and run the migration."
            )
    return database


def get_provider_registry(ref_config: Config) -> ProviderRegistry:
    """
    Get the provider registry
    """
    database = get_database(ref_config)
    return ProviderRegistry.build_from_config(ref_config, database)
