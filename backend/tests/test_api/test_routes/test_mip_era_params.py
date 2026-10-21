"""The `mip_era` query parameter on every route that takes it."""

import pytest
from fastapi.testclient import TestClient

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


def test_an_unknown_era_on_a_model_is_not_found(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/models/{MODEL}", params={"mip_era": "CMIP5"})
    assert r.status_code == 404


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
