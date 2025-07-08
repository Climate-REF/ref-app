from collections.abc import Generator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from climate_ref.config import Config
from climate_ref.provider_registry import ProviderRegistry
from ref_backend.core.config import Settings, get_settings
from ref_backend.core.ref import get_database, get_provider_registry, get_ref_config

SettingsDep = Annotated[Settings, Depends(get_settings)]


def _ref_config_dependency(settings: SettingsDep) -> Config:
    """
    Get the REF configuration object
    """
    return get_ref_config(settings)


REFConfigDep = Annotated[Config, Depends(_ref_config_dependency)]


def get_database_session(ref_config: REFConfigDep) -> Generator[Session, None, None]:
    """
    Create a new database session
    """
    database = get_database(ref_config)
    yield database.session


SessionDep = Annotated[Session, Depends(get_database_session)]


@dataclass
class AppContext:
    """
    Application context container

    This is a container for the core application components that are used across the application.
    It is intended to be used as a dependency injector to simplify the number of dependencies
    that need to be passed to functions.
    """

    session: Session
    ref_config: Config
    settings: Settings
    provider_registry: ProviderRegistry


def get_app_context(
    session: SessionDep,
    ref_config: REFConfigDep,
    settings: SettingsDep,
) -> AppContext:
    """
    Get the application context
    """
    provider_registry = get_provider_registry(ref_config)
    return AppContext(
        session=session,
        ref_config=ref_config,
        settings=settings,
        provider_registry=provider_registry,
    )


AppContextDep = Annotated[AppContext, Depends(get_app_context)]
