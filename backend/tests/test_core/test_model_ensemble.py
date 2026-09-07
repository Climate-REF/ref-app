import pytest

from ref_backend.core.model_ensemble import _percentile, _statistics, _units


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
