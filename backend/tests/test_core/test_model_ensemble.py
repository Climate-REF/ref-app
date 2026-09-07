import pytest

from climate_ref.results import OutlierPolicy
from ref_backend.core.model_ensemble import _percentile, _statistics, _units
from ref_backend.models.climate_models import EnsembleComparison


def test_statistics_interpolates_the_quartiles():
    stats = _statistics([4.0, 1.0, 3.0, 2.0])

    assert (stats.min, stats.max) == (1.0, 4.0)
    assert (stats.lower_quartile, stats.median, stats.upper_quartile) == (1.75, 2.5, 3.25)
    assert stats.mean == 2.5
    assert stats.std_dev == pytest.approx(1.118034)


def test_statistics_of_one_model_has_no_spread():
    stats = _statistics([7.5])

    assert stats.count == 1
    assert stats.median == 7.5
    assert stats.std_dev is None


@pytest.mark.parametrize(
    "value, expected",
    [
        (0.0, 0.0),
        (1.0, 12.5),
        (2.0, 37.5),
        (4.0, 87.5),
        (9.0, 100.0),
    ],
)
def test_percentile_counts_ties_as_half(value, expected):
    assert _percentile([1.0, 2.0, 3.0, 4.0], value) == expected


@pytest.mark.parametrize(
    "attributes, expected",
    [
        ({"value_units": "K"}, "K"),
        ({"units": "mm/day"}, "mm/day"),
        ({"value_units": "K", "units": "mm/day"}, "K"),
        ({"units": ""}, None),
        ({}, None),
        (None, None),
        ("not a mapping", None),
    ],
)
def test_units_reads_whichever_key_the_provider_used(attributes, expected):
    assert _units(attributes) == expected


def _comparison(model_value: float, spread: list[float]) -> EnsembleComparison:
    return EnsembleComparison(
        diagnostic_id=1,
        diagnostic_slug="ecs",
        diagnostic_name="Equilibrium Climate Sensitivity",
        provider_slug="esmvaltool",
        dimensions={"metric": "ecs"},
        units="K",
        model_value=model_value,
        model_member_count=1,
        ensemble=_statistics(spread),
        percentile=50.0,
        z_score=0.0,
    )


def test_outliers_use_the_policy_the_values_pages_detect_with():
    """The fences come from `OutlierPolicy`, so the two views cannot disagree about one metric."""
    policy = OutlierPolicy()
    spread = [1.0, 2.0, 3.0, 4.0]
    iqr = 3.25 - 1.75

    assert not _comparison(4.0 + (policy.factor - 1) * iqr, spread).is_outlier
    assert _comparison(3.25 + (policy.factor + 1) * iqr, spread).is_outlier


def test_too_few_models_flags_nothing():
    """Below the policy's sample size there is no spread worth calling an outlier."""
    spread = [1.0, 2.0, 1000.0][: OutlierPolicy().min_n - 1]

    assert _comparison(1e9, spread).ensemble.count < OutlierPolicy().min_n
    assert not _comparison(1e9, spread).is_outlier
