from collections.abc import Generator

from sqlalchemy.orm import Session

from climate_ref.config import Config
from climate_ref.database import Database, _get_database_revision
from climate_ref.models import MetricValue
from climate_ref.provider_registry import ProviderRegistry
from climate_ref_core.pycmec.controlled_vocabulary import CV


def create_database_connection() -> tuple[Config, Database]:
    """
    Create a new connection to the database
    """
    config = Config.default()
    database = Database.from_config(config, run_migrations=False)
    with database._engine.connect() as connection:
        if _get_database_revision(connection) is None:
            raise ValueError(
                "The database migration has not been run."
                "Check the database URL in your config file and run the migration."
            )
    return config, database


ref_config, database = create_database_connection()
cv = CV.load_from_file(ref_config.paths.dimensions_cv)
MetricValue.register_cv_dimensions(cv)
provider_registry = ProviderRegistry.build_from_config(ref_config, database)


def get_database_session() -> Generator[Session, None, None]:
    """
    Create a new database session

    Returns
    -------
        A session for the database
    """
    yield database.session


def get_ref_config() -> Generator[Config, None, None]:
    """
    Get the REF configuration object

    Returns
    -------
        The configuration object
    """
    yield ref_config


def get_cv() -> Generator[CV, None, None]:
    """
    Get the controlled vocabulary used by the REF

    Returns
    -------
        CV
    """
    yield cv
