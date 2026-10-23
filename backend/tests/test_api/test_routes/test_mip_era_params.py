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
    return sum(d["groups"]["total"] for d in body["data"])


def _with_values(body) -> int:
    return sum(d["has_metric_values"] for d in body["data"])


def _rows(body) -> int:
    return len(body["data"])


def _facet_values(body) -> int:
    return sum(len(f["values"]) for f in body)


ROUTES = [
    ("/diagnostics/", {}, _group_total),
    ("/diagnostics/catalog", {}, _group_total),
    ("/diagnostics/value-flags", {}, _with_values),
    (f"/diagnostics/{DIAGNOSTIC}/execution_groups", {}, _rows),
    (f"/diagnostics/{DIAGNOSTIC}/values", {"value_type": "scalar"}, _rows),
    (f"/diagnostics/{DIAGNOSTIC}/values/facets", {"value_type": "scalar"}, _facet_values),
    ("/executions/", {}, _rows),
    ("/models/", {}, _rows),
    (f"/models/{MODEL}/ensemble", {}, _rows),
]


@pytest.mark.parametrize(("path", "params", "amount"), ROUTES)
def test_the_era_keeps_only_its_groups(client: TestClient, settings, path, params, amount) -> None:
    """The fixture only holds CMIP6 runs."""
    url = f"{settings.API_V1_STR}{path}"
    everything = client.get(url, params=params)
    cmip6 = client.get(url, params={**params, "mip_era": "CMIP6"})
    cmip7 = client.get(url, params={**params, "mip_era": "CMIP7"})

    assert everything.status_code == cmip6.status_code == cmip7.status_code == 200
    assert amount(cmip6.json()) == amount(everything.json()) > 0
    assert amount(cmip7.json()) == 0


@pytest.mark.parametrize(
    ("path", "params"), [*((path, params) for path, params, _ in ROUTES), (f"/models/{MODEL}", {})]
)
@pytest.mark.parametrize("mip_era", ["CMIP5", "cmip6", ""])
def test_an_era_other_than_cmip6_or_cmip7_is_rejected(
    client: TestClient, settings, path, params, mip_era
) -> None:
    r = client.get(f"{settings.API_V1_STR}{path}", params={**params, "mip_era": mip_era})
    assert r.status_code == 422


@pytest.mark.parametrize(("source_id", "mip_era"), [("NOT-A-MODEL", None), (MODEL, "CMIP7")])
def test_a_missing_model_or_an_era_without_runs_is_not_found(
    client: TestClient, settings, source_id, mip_era
) -> None:
    params = {"mip_era": mip_era} if mip_era else {}
    assert client.get(f"{settings.API_V1_STR}/models/{source_id}", params=params).status_code == 404


def _add_obs_only_value(config) -> int:
    """Add a scalar value from a group of `DIAGNOSTIC` that draws on observations alone."""
    provider_slug, diagnostic_slug = DIAGNOSTIC.split("/")
    with Database.from_config(config, run_migrations=False).session_scope() as session:
        diagnostic = session.scalars(
            select(models.Diagnostic)
            .join(models.Provider)
            .where(models.Diagnostic.slug == diagnostic_slug, models.Provider.slug == provider_slug)
        ).one()
        group = models.ExecutionGroup(
            diagnostic_id=diagnostic.id,
            key="obs-only",
            diagnostic_version=diagnostic.promoted_version,
            selectors={SourceDatasetType.obs4MIPs.value: [["source_id", "obs"]]},
        )
        session.add(group)
        session.flush()
        execution = models.Execution(
            execution_group_id=group.id, dataset_hash="obs-only", output_fragment="obs-only", successful=True
        )
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


@pytest.mark.parametrize("mip_era", ["CMIP6", "CMIP7"])
def test_values_keep_obs_only_runs_for_either_era(writable_client: TestClient, mip_era) -> None:
    value_id = _add_obs_only_value(writable_client.ref_config)  # type: ignore[attr-defined]
    r = writable_client.get(
        f"/api/v1/diagnostics/{DIAGNOSTIC}/values",
        params={"value_type": "scalar", "mip_era": mip_era, "limit": 500, "detect_outliers": "off"},
    )

    assert r.status_code == 200
    assert value_id in {v["id"] for v in r.json()["data"]}
