import pytest
from fastapi.testclient import TestClient

#: A model the decimated test data runs through most of the diagnostics.
MODEL = "ACCESS-ESM1-5"


def test_model_list_returns_models(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/")

    assert r.status_code == 200
    data = r.json()
    assert data["count"] > 0

    source_ids = [model["source_id"] for model in data["data"]]
    assert MODEL in source_ids
    assert source_ids == sorted(source_ids)


def test_model_list_counts_add_up(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/")

    for model in r.json()["data"]:
        counts = model["execution_groups"]
        assert counts["total"] == counts["successful"] + counts["failed"] + counts["running"]
        assert 0 <= counts["success_rate_percentage"] <= 100


def test_model_list_filters_by_source_id(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/", params={"source_id_contains": "access"})

    assert r.status_code == 200
    source_ids = [model["source_id"] for model in r.json()["data"]]
    assert source_ids
    assert all("ACCESS" in source_id for source_id in source_ids)


def test_model_list_filters_by_mip_era(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/", params={"mip_era": "CMIP7"})

    assert r.status_code == 200
    for model in r.json()["data"]:
        assert model["mip_eras"] == ["CMIP7"]


def test_model_detail(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/{MODEL}")

    assert r.status_code == 200
    data = r.json()
    assert data["source_id"] == MODEL
    assert data["dataset_count"] > 0
    assert data["diagnostic_count"] == len(data["diagnostics"])

    # The per-diagnostic tallies partition the model's groups.
    assert (
        sum(d["execution_groups"]["total"] for d in data["diagnostics"])
        == (data["execution_groups"]["total"])
    )


def test_model_detail_lists_only_unsuccessful_runs(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/{MODEL}")

    data = r.json()
    counts = data["execution_groups"]
    assert len(data["failures"]) == counts["failed"] + counts["running"]
    assert all(failure["outcome"] != "successful" for failure in data["failures"])


def test_model_detail_unknown_source_id(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/not-a-model")

    assert r.status_code == 404


def test_model_ensemble_comparison(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/{MODEL}/ensemble")

    assert r.status_code == 200
    comparisons = r.json()["data"]
    if not comparisons:
        pytest.skip("No metric is reported by enough models in the test data")

    for comparison in comparisons:
        ensemble = comparison["ensemble"]
        assert ensemble["count"] >= 3
        assert ensemble["min"] <= ensemble["median"] <= ensemble["max"]
        assert ensemble["lower_quartile"] <= ensemble["upper_quartile"]
        assert ensemble["min"] <= comparison["model_value"] <= ensemble["max"]
        assert 0 <= comparison["percentile"] <= 100

    # Furthest from the ensemble mean first, so the anomalies lead.
    magnitudes = [abs(c["z_score"]) if c["z_score"] is not None else -1.0 for c in comparisons]
    assert magnitudes == sorted(magnitudes, reverse=True)


def test_model_ensemble_comparison_filters_by_diagnostic(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/{MODEL}/ensemble")
    comparisons = r.json()["data"]
    if not comparisons:
        pytest.skip("No metric is reported by enough models in the test data")

    slug = comparisons[0]["diagnostic_slug"]
    filtered = client.get(f"{settings.API_V1_STR}/models/{MODEL}/ensemble", params={"diagnostic_slug": slug})

    assert filtered.status_code == 200
    assert filtered.json()["data"]
    assert all(c["diagnostic_slug"] == slug for c in filtered.json()["data"])


def test_model_ensemble_comparison_unknown_source_id(client: TestClient, settings):
    r = client.get(f"{settings.API_V1_STR}/models/not-a-model/ensemble")

    assert r.status_code == 200
    assert r.json()["data"] == []
