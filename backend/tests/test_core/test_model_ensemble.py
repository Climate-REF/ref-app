import pytest

from ref_backend.core.model_ensemble import _percentile, _units, quantile


@pytest.mark.parametrize(
    "fraction, expected",
    [
        (0.0, 1.0),
        (0.25, 1.75),
        (0.5, 2.5),
        (0.75, 3.25),
        (1.0, 4.0),
    ],
)
def test_quantile_interpolates(fraction, expected):
    assert quantile([1.0, 2.0, 3.0, 4.0], fraction) == expected


def test_quantile_single_value():
    assert quantile([7.5], 0.25) == 7.5


def test_quantile_rejects_empty():
    with pytest.raises(ValueError):
        quantile([], 0.5)


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
