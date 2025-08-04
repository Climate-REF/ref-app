from pathlib import Path

from climate_ref.config import Config
from climate_ref.database import Database, _get_database_revision
from climate_ref.provider_registry import ProviderRegistry
from ref_backend.core.config import Settings


def get_ref_config(settings: Settings) -> Config:
    """
    Get the REF configuration object
    """
    return Config.load(Path(settings.REF_CONFIGURATION) / "ref.toml")


# Simple in-process cache to avoid repeatedly constructing Database/ProviderRegistry
_DATABASE_CACHE: Database | None = None
_PROVIDER_REGISTRY_CACHE: ProviderRegistry | None = None

def get_database(ref_config: Config) -> Database:
    """
    Get a shared database connection using the default config.

    Caches the Database instance in-process to avoid repeatedly constructing
    new engines/sessions per dependency resolution.
    """
    global _DATABASE_CACHE
    if _DATABASE_CACHE is None:
        database = Database.from_config(ref_config, run_migrations=False)
        with database._engine.connect() as connection:
            if _get_database_revision(connection) is None:
                raise ValueError(
                    "The database migration has not been run. "
                    "Check the database URL in your config file and run the migration."
                )
        _DATABASE_CACHE = database
    return _DATABASE_CACHE


def get_provider_registry(ref_config: Config) -> ProviderRegistry:
    """
    Get the provider registry

    Caches the ProviderRegistry instance in-process to avoid re-loading providers
    and duplicating database handles.
    """
    global _PROVIDER_REGISTRY_CACHE
    if _PROVIDER_REGISTRY_CACHE is None:
        database = get_database(ref_config)
        _PROVIDER_REGISTRY_CACHE = ProviderRegistry.build_from_config(ref_config, database)
    return _PROVIDER_REGISTRY_CACHE
