"""Tests for JSON utilities for handling special float values."""

from ref_backend.core.json_utils import (
    sanitize_dict_values,
    sanitize_float_list,
    sanitize_float_value,
)


class TestSanitizeFloatValue:
    """Test the sanitize_float_value function."""

    def test_nan_returns_none(self):
        """Test that NaN values are converted to None."""
        result = sanitize_float_value(float("nan"))
        assert result is None

    def test_positive_infinity_returns_none(self):
        """Test that positive infinity is converted to None."""
        result = sanitize_float_value(float("inf"))
        assert result is None

    def test_negative_infinity_returns_none(self):
        """Test that negative infinity is converted to None."""
        result = sanitize_float_value(float("-inf"))
        assert result is None

    def test_normal_float_passthrough(self):
        """Test that normal float values pass through unchanged."""
        result = sanitize_float_value(3.14)
        assert result == 3.14

    def test_non_float_string_returns_original(self):
        """Test that non-float string values return original value."""
        result = sanitize_float_value("hello")
        assert result == "hello"

    def test_non_float_int_returns_original(self):
        """Test that non-float int values return original value."""
        result = sanitize_float_value(42)
        assert result == 42


class TestSanitizeFloatList:
    """Test the sanitize_float_list function."""

    def test_mixed_list_with_nan_and_inf(self):
        """Test that a mixed list with NaN and infinity values is sanitized."""
        values = [1.0, float("nan"), 2.0, float("inf")]
        result = sanitize_float_list(values)
        expected = [1.0, None, 2.0, None]
        assert result == expected

    def test_empty_list(self):
        """Test that an empty list returns an empty list."""
        result = sanitize_float_list([])
        assert result == []

    def test_all_normal_floats(self):
        """Test that a list of normal floats passes through unchanged."""
        values = [1.0, 2.0, 3.0]
        result = sanitize_float_list(values)
        assert result == [1.0, 2.0, 3.0]

    def test_all_nan_values(self):
        """Test that a list of all NaN values returns all None."""
        values = [float("nan"), float("nan"), float("nan")]
        result = sanitize_float_list(values)
        assert result == [None, None, None]


class TestSanitizeDictValues:
    """Test the sanitize_dict_values function."""

    def test_flat_dict_with_float_values_including_nan(self):
        """Test that a flat dict with NaN values is sanitized."""
        data = {"a": 1.0, "b": float("nan"), "c": 3.0}
        result = sanitize_dict_values(data)
        expected = {"a": 1.0, "b": None, "c": 3.0}
        assert result == expected

    def test_nested_dict(self):
        """Test that nested dictionaries are recursively sanitized."""
        data = {
            "outer": {"inner": float("nan"), "value": 2.0},
            "normal": 1.0,
        }
        result = sanitize_dict_values(data)
        expected = {
            "outer": {"inner": None, "value": 2.0},
            "normal": 1.0,
        }
        assert result == expected

    def test_dict_with_list_values_containing_nan_inf(self):
        """Test that dict with list values containing NaN/inf is sanitized."""
        data = {
            "values": [1.0, float("nan"), 2.0, float("inf")],
            "normal": 3.0,
        }
        result = sanitize_dict_values(data)
        expected = {
            "values": [1.0, None, 2.0, None],
            "normal": 3.0,
        }
        assert result == expected

    def test_empty_dict(self):
        """Test that an empty dict returns an empty dict."""
        result = sanitize_dict_values({})
        assert result == {}

    def test_deeply_nested_structure(self):
        """Test that deeply nested structures are fully sanitized."""
        data = {
            "level1": {
                "level2": {
                    "values": [float("nan"), 1.0],
                    "scalar": float("inf"),
                },
                "normal": 2.0,
            }
        }
        result = sanitize_dict_values(data)
        expected = {
            "level1": {
                "level2": {
                    "values": [None, 1.0],
                    "scalar": None,
                },
                "normal": 2.0,
            }
        }
        assert result == expected
