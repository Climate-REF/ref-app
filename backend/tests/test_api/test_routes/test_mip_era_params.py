"""The `mip_era` query parameter on every route that takes it."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from climate_ref import models
from climate_ref.database import Database
from climate_ref_core.datasets import SourceDatasetType

MODEL = "ACCESS-ESM1-5"
DIAGNOSTIC = "esmvaltool/climate-at-global-warming-levels"


def _group_total(body) -> int:
    return sum(d["execution_group_count"] for d in body["data"])


def _with_values(body) -> int:
    return sum(d["has_metric_values"] for d in body["data"])


def _rows(body) -> int:
    return len(body["data"])


ROUTES = [
    ("/diagnostics/", {}, _group_total),
    ("/diagnostics/catalog", {}, _group_total),
    ("/diagnostics/value-flags", {}, _with_values),
    (f"/diagnostics/{DIAGNOSTIC}/execution_groups", {}, _rows),
    (f"/diagnostics/{DIAGNOSTIC}/values", {"value_type": "scalar"}, _rows),
    ("/executions/", {}, _rows),
    ("/models/", {}, _rows),
    (f"/models/{MODEL}/ensemble", {}, _rows),
]


@pytest.mark.parametrize(("path", "params", "amount"), ROUTES)
def test_an_unknown_era_matches_nothing(client: TestClient, settings, path, params, amount) -> None:
    url = f"{settings.API_V1_STR}{path}"
    everything = client.get(url, params=params)
    unknown = client.get(url, params={**params, "mip_era": "CMIP5"})

    assert everything.status_code == unknown.status_code == 200
    assert amount(everything.json()) > 0
    assert amount(unknown.json()) == 0


def test_an_unknown_era_on_a_model_is_an_empty_model(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/models/{MODEL}", params={"mip_era": "CMIP5"})

    assert r.status_code == 200
    body = r.json()
    assert body["source_id"] == MODEL
    assert body["diagnostics"] == body["failures"] == body["mip_eras"] == []
    assert body["execution_groups"]["total"] == 0


@pytest.mark.parametrize(
    ("source_id", "mip_era"), [("NOT-A-MODEL", None), ("NOT-A-MODEL", "CMIP5"), (MODEL, "CMIP7")]
)
def test_a_missing_model_or_a_known_era_without_runs_is_not_found(
    client: TestClient, settings, source_id, mip_era
) -> None:
    params = {"mip_era": mip_era} if mip_era else {}
    assert client.get(f"{settings.API_V1_STR}/models/{source_id}", params=params).status_code == 404


@pytest.mark.parametrize(
    ("path", "params"), [*((path, params) for path, params, _ in ROUTES), (f"/models/{MODEL}", {})]
)
def test_the_era_ignores_case(client: TestClient, settings, path, params) -> None:
    url = f"{settings.API_V1_STR}{path}"
    upper = client.get(url, params={**params, "mip_era": "CMIP6"})
    lower = client.get(url, params={**params, "mip_era": "cmip6"})

    assert upper.status_code == 200
    assert lower.json() == upper.json()


@pytest.mark.parametrize(("path", "params"), [("/models/", {}), ("/executions/", {})])
def test_an_empty_era_is_no_filter(client: TestClient, settings, path, params) -> None:
    url = f"{settings.API_V1_STR}{path}"
    assert client.get(url, params={**params, "mip_era": ""}).json() == client.get(url, params=params).json()


def _add_obs_only_value(config) -> int:
    """Add a scalar value from an execution of `DIAGNOSTIC` that ran on observations alone."""
    provider_slug, diagnostic_slug = DIAGNOSTIC.split("/")
    with Database.from_config(config, run_migrations=False).session_scope() as session:
        group = session.scalars(
            select(models.ExecutionGroup)
            .join(models.Diagnostic)
            .join(models.Provider)
            .where(models.Diagnostic.slug == diagnostic_slug, models.Provider.slug == provider_slug)
            .limit(1)
        ).one()
        obs = session.scalars(
            select(models.Dataset).where(models.Dataset.dataset_type == SourceDatasetType.obs4MIPs).limit(1)
        ).one()
        execution = models.Execution(
            execution_group_id=group.id, dataset_hash="obs-only", output_fragment="obs-only", successful=True
        )
        execution.datasets.append(obs)
        session.add(execution)
        session.flush()
        value = models.ScalarMetricValue.build(
            execution_id=execution.id, value=1.0, dimensions={}, attributes=None
        )
        session.add(value)
        session.flush()
        value_id = value.id
        session.commit()
    return value_id


@pytest.mark.parametrize(("mip_era", "included"), [("CMIP6", True), ("cmip7", True), ("CMIP5", False)])
def test_values_keep_obs_only_runs_for_a_known_era(writable_client: TestClient, mip_era, included) -> None:
    value_id = _add_obs_only_value(writable_client.ref_config)  # type: ignore[attr-defined]
    r = writable_client.get(
        f"/api/v1/diagnostics/{DIAGNOSTIC}/values",
        params={"value_type": "scalar", "mip_era": mip_era, "limit": 500, "detect_outliers": "off"},
    )

    assert r.status_code == 200
    assert (value_id in {v["id"] for v in r.json()["data"]}) is included
