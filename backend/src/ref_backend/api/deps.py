from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from cmip_ref.config import Config
from cmip_ref.database import Database


def get_db() -> Generator[Session, None, None]:
    config = Config.default()
    database = Database.from_config(config, run_migrations=False)

    yield database.session


SessionDep = Annotated[Session, Depends(get_db)]
