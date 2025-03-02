from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from ref_backend.core.db import get_database_session

SessionDep = Annotated[Session, Depends(get_database_session)]
