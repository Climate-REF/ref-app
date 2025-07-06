from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from climate_ref.config import Config
from climate_ref_core.pycmec.controlled_vocabulary import CV
from ref_backend.core.config import Settings, get_settings
from ref_backend.core.ref import get_cv, get_database_session, get_ref_config

SessionDep = Annotated[Session, Depends(get_database_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
ConfigDep = Annotated[Config, Depends(get_ref_config)]
CVDep = Annotated[CV, Depends(get_cv)]
