import functools
import secrets
import warnings
from pathlib import Path
from typing import Annotated, Any, Literal, Self

from pydantic import (
    AnyUrl,
    BeforeValidator,
    HttpUrl,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    FRONTEND_HOST: str = "http://localhost:5173"
    BACKEND_HOST: str = "http://localhost:8000"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"
    LOG_LEVEL: str = "INFO"
    DIAGNOSTIC_PROVIDERS: list[str] | None = None
    """
    Limit the diagnostics to only query the providers defined in this list.

    If this is not set, all diagnostics will be returned.
    """

    BACKEND_CORS_ORIGINS: Annotated[list[AnyUrl] | str, BeforeValidator(parse_cors)] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [self.FRONTEND_HOST]

    PROJECT_NAME: str = "Climate Rapid Evaluation Framework"
    SENTRY_DSN: HttpUrl | None = None
    REF_CONFIGURATION: str = "data"
    STATIC_DIR: str | None = None
    USE_TEST_DATA: bool = False
    """
    Use test data for development purposes.

    This is useful for local development and testing, but should not be used in production.
    """

    DIAGNOSTIC_METADATA_PATH: Path | None = None
    """
    Path to the diagnostic metadata YAML file.

    This file provides additional metadata for diagnostics that can override or supplement
    the default values from diagnostic implementations. If not provided, defaults to
    'static/diagnostics/metadata.yaml' relative to the backend directory.
    """

    @computed_field  # type: ignore[prop-decorator]
    @property
    def diagnostic_metadata_path_resolved(self) -> Path:
        """
        Get the resolved path to the diagnostic metadata file.

        Returns the configured path or the default location.
        """
        if self.DIAGNOSTIC_METADATA_PATH is not None:
            return self.DIAGNOSTIC_METADATA_PATH
        # Default to static/diagnostics/metadata.yaml relative to backend directory
        return Path(__file__).parent.parent.parent.parent / "static" / "diagnostics" / "metadata.yaml"

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if value == "changethis":
            message = (
                f'The value of {var_name} is "changethis", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "local":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)

        return self


@functools.lru_cache
def get_settings() -> Settings:
    """Get default settings object."""
    return Settings()
