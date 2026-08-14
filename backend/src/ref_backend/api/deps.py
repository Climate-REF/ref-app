from collections.abc import Generator
from dataclasses import dataclass
from threading import Lock
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from climate_ref.config import Config
from climate_ref.database import Database
from climate_ref.provider_registry import ProviderRegistry
from climate_ref.results import Reader
from ref_backend.core.config import Settings, get_settings
from ref_backend.core.ref import get_database, get_provider_registry, get_ref_config

SettingsDep = Annotated[Settings, Depends(get_settings)]


def _ref_config_dependency(settings: SettingsDep) -> Config:
    """
    Get the REF configuration object
    """
    return get_ref_config(settings)


REFConfigDep = Annotated[Config, Depends(_ref_config_dependency)]


_database_cache: dict[tuple[str, bool], Database] = {}
_database_cache_lock = Lock()


def _get_database_dependency(settings: SettingsDep, ref_config: REFConfigDep) -> Database:
    # A Database owns an engine and its connection pool, so it is reused across requests.
    key = (ref_config.db.database_url, settings.REF_READ_ONLY_DATABASE)
    with _database_cache_lock:
        if key not in _database_cache:
            _database_cache[key] = get_database(ref_config, read_only=settings.REF_READ_ONLY_DATABASE)
        return _database_cache[key]


DatabaseDep = Annotated[Database, Depends(_get_database_dependency)]


def get_database_session(database: DatabaseDep) -> Generator[Session, None, None]:
    """
    Provide a session that lives for the duration of a request

    `Database.session` is long lived and shared process-wide, so it is not safe to hand to a
    request. `session_scope` gives each request its own session on the shared engine and pool,
    and closes it once the response is sent.
    """
    with database.session_scope() as session:
        yield session


SessionDep = Annotated[Session, Depends(get_database_session)]


def _get_reader_dependency(database: DatabaseDep, ref_config: REFConfigDep, session: SessionDep) -> Reader:
    """
    Get the results reader
    """
    return Reader(database, results=ref_config.paths.results, session=session)


ReaderDep = Annotated[Reader, Depends(_get_reader_dependency)]


@dataclass
class AppContext:
    """
    Application context container

    This is a container for the core application components that are used across the application.
    It is intended to be used as a dependency injector to simplify the number of dependencies
    that need to be passed to functions.
    """

    session: Session
    reader: Reader
    ref_config: Config
    settings: Settings
    provider_registry: ProviderRegistry


def _provider_registry_dependency(settings: SettingsDep, ref_config: REFConfigDep) -> ProviderRegistry:
    """
    Get the provider registry
    """
    return get_provider_registry(ref_config, read_only=settings.REF_READ_ONLY_DATABASE)


ProviderRegistryDep = Annotated[ProviderRegistry, Depends(_provider_registry_dependency)]


def get_app_context(
    session: SessionDep,
    reader: ReaderDep,
    ref_config: REFConfigDep,
    settings: SettingsDep,
    provider_registry: ProviderRegistryDep,
) -> AppContext:
    """
    Get the application context
    """
    return AppContext(
        session=session,
        reader=reader,
        ref_config=ref_config,
        settings=settings,
        provider_registry=provider_registry,
    )


AppContextDep = Annotated[AppContext, Depends(get_app_context)]
