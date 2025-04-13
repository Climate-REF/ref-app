from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from cmip_ref.config import Config
from cmip_ref_core.pycmec.controlled_vocabulary import CV
from ref_backend.core.ref import get_cv, get_database_session, get_ref_config

SessionDep = Annotated[Session, Depends(get_database_session)]
ConfigDep = Annotated[Config, Depends(get_ref_config)]
CVDep = Annotated[CV, Depends(get_cv)]
