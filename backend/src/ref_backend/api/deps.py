from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from cmip_ref.config import Config
from ref_backend.core.db import get_config, get_database_session

SessionDep = Annotated[Session, Depends(get_database_session)]
ConfigDep = Annotated[Config, Depends(get_config)]
