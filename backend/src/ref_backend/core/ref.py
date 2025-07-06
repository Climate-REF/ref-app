from collections.abc import Generator

from sqlalchemy.orm import Session

from climate_ref.config import Config
from climate_ref.database import Database, _get_database_revision
from climate_ref.provider_registry import ProviderRegistry
from climate_ref_core.pycmec.controlled_vocabulary import CV


def get_ref_config() -> Config:
    """
    Get the REF configuration object
    """
    return Config.default()


def get_database() -> Database:
    """
    Get a new database connection using the default config
    """
    config = get_ref_config()
    database = Database.from_config(config, run_migrations=False)
    with database._engine.connect() as connection:
        if _get_database_revision(connection) is None:
            raise ValueError(
                "The database migration has not been run. "
                "Check the database URL in your config file and run the migration."
            )
    return database


def get_cv() -> Generator[CV, None, None]:
    """
    Get the controlled vocabulary used by the REF

    Returns
    -------
        CV
    """
    config = get_ref_config()
    yield CV.load_from_file(config.paths.dimensions_cv)


def get_provider_registry() -> ProviderRegistry:
    """
    Get the provider registry
    """
    config = get_ref_config()
    database = get_database()
    return ProviderRegistry.build_from_config(config, database)


def get_database_session() -> Generator[Session, None, None]:
    """
    Create a new database session
    """
    database = get_database()
    yield database.session
