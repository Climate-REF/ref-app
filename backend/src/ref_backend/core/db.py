from collections.abc import Generator

from sqlalchemy.orm import Session

from cmip_ref.config import Config
from cmip_ref.database import Database


def create_database_connection() -> Database:
    """
    Create a new connection to the database
    """
    config = Config.default()
    database = Database.from_config(config, run_migrations=False)
    return database


def get_database_session() -> Generator[Session, None, None]:
    """
    Create a new database session

    Returns
    -------
        A session for the database
    """
    # TODO: Figure out how to use dependency injection with fastapi
    # I get a fastapi.exceptions.FastAPIError if I try pass in an optional Database object here
    database = create_database_connection()

    yield database.session


def get_config() -> Generator[Config, None, None]:
    """
    Get the REF configuration object

    Returns
    -------
        The configuration object
    """
    yield Config.default()
