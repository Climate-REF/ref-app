import functools
import importlib.resources
from pathlib import Path

from climate_ref.config import Config
from ref_backend.core.config import Settings
from ref_backend.core.ref import get_ref_config

EXAMPLE_DIR = (
    Path(__file__).parents[2]
    / "tests"
    / "test-data"
    / "tests.integration.test_cmip7_aft"
    / "test_solve_cmip7_aft"
)


@functools.lru_cache
def test_settings() -> Settings:
    """Settings to use the decimated test data included in the git repo."""
    return Settings(REF_CONFIGURATION=str(EXAMPLE_DIR))


@functools.lru_cache
def test_ref_config() -> Config:
    """
    Get the REF configuration object for testing.

    This function is used to ensure that the settings are correctly loaded
    for the test environment.
    """
    config = get_ref_config(test_settings())

    config.paths.results = EXAMPLE_DIR / "results"
    config.paths.dimensions_cv = Path(
        str(importlib.resources.files("climate_ref_core.pycmec") / "cv_cmip7_aft.yaml")
    )
    config.db.database_url = "sqlite:///" + str(EXAMPLE_DIR / "db" / "climate_ref.db")

    # Override paths that may contain hardcoded CI runner paths from ref.toml
    config.paths.log = EXAMPLE_DIR / "log"
    config.paths.scratch = EXAMPLE_DIR / "scratch"
    config.paths.software = EXAMPLE_DIR / "software"

    return config
