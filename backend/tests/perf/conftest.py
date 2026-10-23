"""
Fixtures for the API performance tests, which run against a large synthetic database.

These only run when ``REF_PERF_SCALE`` is set (see ``make test-perf``).
The database is built once per shape, scale and schema, and cached under ``REF_PERF_CACHE``.
"""

import os
import sqlite3
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
from starlette.testclient import TestClient

from climate_ref.config import Config
from climate_ref.database import Database
from climate_ref.provider_registry import ProviderRegistry
from ref_backend.api import deps
from ref_backend.builder import build_app
from ref_backend.core.config import Settings, get_settings


@pytest.fixture(scope="session")
def synthetic() -> Any:
    """The synthetic database generator from climate-ref."""
    if not os.environ.get("REF_PERF_SCALE"):
        pytest.skip("set REF_PERF_SCALE to run the API performance tests")
    return pytest.importorskip(
        "climate_ref.testing.synthetic", reason="needs a climate-ref with the synthetic database generator"
    )


@pytest.fixture(scope="session")
def perf_database_path(synthetic: Any) -> Path:
    """The synthetic database for this scale and schema, built on first use."""
    cache = Path(os.environ.get("REF_PERF_CACHE", Path.home() / ".cache" / "ref-app" / "perf"))
    path: Path = synthetic.cached_synthetic_database(cache, scale=float(os.environ["REF_PERF_SCALE"]))
    return path


@pytest.fixture(scope="session")
def perf_settings(tmp_path_factory: pytest.TempPathFactory) -> Settings:
    # An empty configuration directory, so a developer's ref.toml cannot point the app elsewhere.
    configuration = tmp_path_factory.mktemp("configuration")
    return Settings(REF_CONFIGURATION=str(configuration), REF_READ_ONLY_DATABASE=True)


@pytest.fixture(scope="session")
def perf_ref_config(perf_database_path: Path, tmp_path_factory: pytest.TempPathFactory) -> Config:
    config = Config()
    config.db.database_url = f"sqlite:///{perf_database_path}"
    config.paths.results = tmp_path_factory.mktemp("results")
    return config


@pytest.fixture(scope="session")
def perf_database(perf_settings: Settings, perf_ref_config: Config) -> Database:
    return deps._get_database_dependency(perf_settings, perf_ref_config)


@pytest.fixture(scope="session")
def perf_client(
    perf_settings: Settings, perf_ref_config: Config, perf_database: Database
) -> Iterator[TestClient]:
    """A client for the app reading the synthetic database read-only, like the deployed API."""
    app = build_app(settings=perf_settings, ref_config=perf_ref_config, database=perf_database)
    app.dependency_overrides[get_settings] = lambda: perf_settings
    app.dependency_overrides[deps._ref_config_dependency] = lambda: perf_ref_config
    # Built once like `ref_backend.main`, and without registering, because the database is read-only.
    registry = ProviderRegistry.build_from_config(perf_ref_config, perf_database, register=False)
    app.dependency_overrides[deps._provider_registry_dependency] = lambda: registry
    with TestClient(app) as client:
        yield client


@dataclass(frozen=True, kw_only=True)
class Targets:
    """Ids and slugs that the endpoints query, picked from the generated data."""

    provider_slug: str
    diagnostic_slug: str
    """The diagnostic with the most metric values, the worst case for a diagnostic-scoped read."""

    execution_group_id: int
    """The group of the execution with the most metric values."""

    dataset_slug: str
    source_id: str
    """The model with the most CMIP6 datasets."""


@pytest.fixture(scope="session")
def targets(perf_database_path: Path) -> Targets:
    """Pick the busiest diagnostic and execution, so each endpoint reads its worst case."""
    con = sqlite3.connect(f"file:{perf_database_path}?mode=ro", uri=True)
    execution_id, _ = con.execute(
        "SELECT execution_id, count(*) FROM metric_value GROUP BY execution_id ORDER BY 2 DESC LIMIT 1"
    ).fetchone()
    group_id, diagnostic_slug, provider_slug = con.execute(
        "SELECT g.id, d.slug, p.slug FROM execution e JOIN execution_group g ON g.id = e.execution_group_id "
        "JOIN diagnostic d ON d.id = g.diagnostic_id JOIN provider p ON p.id = d.provider_id WHERE e.id = ?",
        (execution_id,),
    ).fetchone()
    (dataset_slug,) = con.execute("SELECT slug FROM dataset ORDER BY id DESC LIMIT 1").fetchone()
    (source_id,) = con.execute(
        "SELECT source_id FROM cmip6_dataset GROUP BY source_id ORDER BY count(*) DESC LIMIT 1"
    ).fetchone()
    con.close()
    return Targets(
        provider_slug=provider_slug,
        diagnostic_slug=diagnostic_slug,
        execution_group_id=group_id,
        dataset_slug=dataset_slug,
        source_id=source_id,
    )


@pytest.fixture(scope="session")
def large_table_scans(
    synthetic: Any, perf_database: Database, perf_database_path: Path
) -> Callable[[Callable[[], Any]], frozenset[str]]:
    """Run a call once and return the large tables that any of its queries reads in full."""

    def _scans(call: Callable[[], Any]) -> frozenset[str]:
        with synthetic.captured_statements(perf_database) as statements:
            call()
        scans: frozenset[str] = synthetic.large_table_scans(perf_database_path, statements)
        return scans

    return _scans
