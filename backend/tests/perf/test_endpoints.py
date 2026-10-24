"""
Performance of the API endpoints against a production-shaped synthetic database.

Each endpoint is one request the frontend makes.
It fails when a query reads a large table in full, which the query plan shows at any scale.
The timings are compared against main by ``make perf-compare``.
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field

import pytest


@dataclass(frozen=True, kw_only=True)
class Endpoint:
    id: str
    path: str
    """Path below the API prefix, formatted with the ``targets`` fields, e.g. ``{provider_slug}``."""

    params: Mapping[str, str] = field(default_factory=dict)
    allowed_scans: frozenset[str] = frozenset()
    """Large tables this request has to read in full, e.g. a summary over every execution."""


_DIAGNOSTIC = "diagnostics/{provider_slug}/{diagnostic_slug}"
_GROUP = "executions/{execution_group_id}"

# The allowed scans record the full reads each endpoint is known to make, not what it should read.
ENDPOINTS = [
    # diagnostics: the landing page and a diagnostic's page
    Endpoint(id="diagnostics.list", path="diagnostics/", allowed_scans=frozenset({"execution_group"})),
    Endpoint(
        id="diagnostics.list.cmip6",
        path="diagnostics/",
        params={"mip_era": "CMIP6"},
        allowed_scans=frozenset({"execution_group"}),
    ),
    Endpoint(
        id="diagnostics.catalog", path="diagnostics/catalog", allowed_scans=frozenset({"execution_group"})
    ),
    Endpoint(id="diagnostics.value-flags", path="diagnostics/value-flags"),
    Endpoint(id="diagnostics.get", path=_DIAGNOSTIC),
    Endpoint(id="diagnostics.execution-groups", path=f"{_DIAGNOSTIC}/execution_groups"),
    Endpoint(id="diagnostics.values.scalar", path=f"{_DIAGNOSTIC}/values", params={"value_type": "scalar"}),
    Endpoint(
        id="diagnostics.values.scalar.source-id",
        path=f"{_DIAGNOSTIC}/values",
        params={"value_type": "scalar", "source_id": "{source_id}"},
    ),
    Endpoint(id="diagnostics.values.series", path=f"{_DIAGNOSTIC}/values", params={"value_type": "series"}),
    Endpoint(
        id="diagnostics.values.scalar.page",
        path=f"{_DIAGNOSTIC}/values",
        params={"value_type": "scalar", "with_facets": "false"},
    ),
    Endpoint(
        id="diagnostics.values.series.page",
        path=f"{_DIAGNOSTIC}/values",
        params={"value_type": "series", "with_facets": "false"},
    ),
    Endpoint(
        id="diagnostics.values.facets.scalar",
        path=f"{_DIAGNOSTIC}/values/facets",
        params={"value_type": "scalar"},
    ),
    Endpoint(
        id="diagnostics.values.facets.series",
        path=f"{_DIAGNOSTIC}/values/facets",
        params={"value_type": "series"},
    ),
    # executions: the recent list and an execution group's page
    Endpoint(id="executions.list", path="executions/", allowed_scans=frozenset({"execution_group"})),
    Endpoint(
        id="executions.list.failed",
        path="executions/",
        params={"successful": "false"},
        allowed_scans=frozenset({"execution_group"}),
    ),
    Endpoint(
        id="executions.statistics",
        path="executions/statistics",
        allowed_scans=frozenset({"execution_group", "dataset", "dataset_file"}),
    ),
    Endpoint(id="executions.get", path=_GROUP),
    Endpoint(id="executions.values.scalar", path=f"{_GROUP}/values", params={"value_type": "scalar"}),
    Endpoint(id="executions.values.series", path=f"{_GROUP}/values", params={"value_type": "series"}),
    Endpoint(id="executions.values.facets", path=f"{_GROUP}/values/facets", params={"value_type": "scalar"}),
    # models and datasets
    Endpoint(
        id="models.list",
        path="models/",
        allowed_scans=frozenset({"execution", "cmip6_dataset", "cmip7_dataset"}),
    ),
    Endpoint(id="models.get", path="models/{source_id}", allowed_scans=frozenset({"execution"})),
    Endpoint(id="datasets.list", path="datasets/"),
    Endpoint(id="datasets.get", path="datasets/{dataset_slug}"),
]


@pytest.mark.parametrize("endpoint", ENDPOINTS, ids=lambda e: e.id)
def test_endpoint(  # noqa: PLR0913, PLR0917
    endpoint: Endpoint, perf_client, perf_settings, targets, large_table_scans, benchmark
):
    fields = vars(targets)
    url = f"{perf_settings.API_V1_STR}/{endpoint.path.format(**fields)}"
    params = {k: v.format(**fields) for k, v in endpoint.params.items()}

    def _get():
        response = perf_client.get(url, params=params)
        assert response.status_code == 200, response.text
        return response

    # This request also warms the caches, so the timed rounds need no warm-up.
    unexpected = large_table_scans(_get) - endpoint.allowed_scans
    benchmark.pedantic(_get, rounds=int(os.environ.get("REF_PERF_ROUNDS", "5")), warmup_rounds=0)

    assert not unexpected, f"reads every row of {sorted(unexpected)}"
