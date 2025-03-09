from collections.abc import Generator

from sqlalchemy.orm import Session

from cmip_ref.config import Config
from cmip_ref.database import Database


def create_database_connection() -> tuple[Config, Database]:
    """
    Create a new connection to the database
    """
    config = Config.default()
    database = Database.from_config(config, run_migrations=False)
    return config, database


ref_config, database = create_database_connection()


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
