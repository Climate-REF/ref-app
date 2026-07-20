"""Tests for ref_backend.core.metric_values module."""

from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from ref_backend.core.metric_values import parse_id_list
from ref_backend.models import MetricValueCollection


class TestParseIdList:
    """Test the parse_id_list function."""

    def test_valid_csv_string(self):
        """Test parsing a valid comma-separated list of IDs."""
        result = parse_id_list("1,2,3")
        assert result == [1, 2, 3]

    def test_single_id(self):
        """Test parsing a single ID."""
        result = parse_id_list("42")
        assert result == [42]

    def test_whitespace_handling(self):
        """Test that whitespace around IDs is stripped."""
        result = parse_id_list(" 1 , 2 , 3 ")
        assert result == [1, 2, 3]

    def test_extra_commas(self):
        """Test that extra commas are handled correctly."""
        result = parse_id_list("1,,2,,,3")
        assert result == [1, 2, 3]

    def test_invalid_input_raises_http_exception(self):
        """Test that invalid input raises HTTPException with status_code=400."""
        with pytest.raises(HTTPException) as exc_info:
            parse_id_list("a,b,c")
        assert exc_info.value.status_code == 400
        assert "Invalid id in list" in exc_info.value.detail

    def test_mixed_valid_invalid(self):
        """Test that mixing valid and invalid IDs raises an exception."""
        with pytest.raises(HTTPException) as exc_info:
            parse_id_list("1,invalid,3")
        assert exc_info.value.status_code == 400


def _reader_collection(items):
    """Build a stand-in reader collection (only the fields the builders read)."""
    return Mock(items=items, total_count=len(items), facets=[], had_outliers=False, outlier_count=0)


class TestBuildScalarFromReader:
    """Test MetricValueCollection.build_scalar_from_reader carries the reader's fields through."""

    def test_kind_and_outlier_annotations_pass_through(self):
        """A reader scalar surfaces its resolved kind plus outlier annotations."""
        item = Mock(
            id=1,
            dimensions={"metric": "rmse"},
            attributes=None,
            value=1.5,
            execution_group_id=1,
            execution_id=2,
            is_outlier=True,
            verification_status="unverified",
            kind="reference",
        )

        collection = MetricValueCollection.build_scalar_from_reader(
            _reader_collection([item]), detection_ran=True
        )

        value = collection.data[0]
        assert value.kind == "reference"
        assert value.is_outlier is True
        assert value.verification_status == "unverified"
        assert collection.had_outliers is False
        assert collection.outlier_count == 0

    def test_no_detection_clears_outlier_summary(self):
        """When detection did not run the outlier summary is None."""
        item = Mock(
            id=1,
            dimensions={"metric": "rmse"},
            attributes=None,
            value=1.5,
            execution_group_id=1,
            execution_id=2,
            is_outlier=None,
            verification_status=None,
            kind="model",
        )

        collection = MetricValueCollection.build_scalar_from_reader(
            _reader_collection([item]), detection_ran=False
        )

        assert collection.data[0].kind == "model"
        assert collection.had_outliers is None
        assert collection.outlier_count is None


class TestBuildSeriesFromReader:
    """Test build_series_from_reader surfaces kind, reference_id and presentation attrs."""

    def _series_item(self, **overrides):
        defaults = dict(
            id=1,
            dimensions={"metric": "temp"},
            attributes=None,
            values=[1.0, 2.0],
            index=[2020, 2021],
            index_name="time",
            execution_group_id=1,
            execution_id=2,
            kind="model",
            reference_id=None,
        )
        defaults.update(overrides)
        return Mock(**defaults)

    def test_esmvaltool_style_attributes(self):
        """ESMValTool-style attribute keys already match the target names."""
        item = self._series_item(
            attributes={
                "value_units": "K",
                "value_long_name": "Near-Surface Air Temperature",
                "index_units": "days since 1850-01-01",
                "calendar": "standard",
                "index_long_name": "time",
            },
        )

        collection = MetricValueCollection.build_series_from_reader(_reader_collection([item]))

        value = collection.data[0]
        assert value.value_units == "K"
        assert value.value_long_name == "Near-Surface Air Temperature"
        assert value.index_units == "days since 1850-01-01"
        assert value.calendar == "standard"

    def test_ilamb_style_attributes_fall_back(self):
        """ILAMB-style keys (units, long_name) fall back onto the target names."""
        item = self._series_item(
            attributes={
                "units": "percent",
                "long_name": "Bias",
                "standard_name": "bias",
            },
        )

        collection = MetricValueCollection.build_series_from_reader(_reader_collection([item]))

        value = collection.data[0]
        assert value.value_units == "percent"
        assert value.value_long_name == "Bias"
        assert value.index_units is None
        assert value.calendar is None

    def test_missing_attributes_are_none(self):
        """A series with attributes=None surfaces None presentation fields, not an error."""
        collection = MetricValueCollection.build_series_from_reader(_reader_collection([self._series_item()]))

        value = collection.data[0]
        assert value.value_units is None
        assert value.value_long_name is None
        assert value.index_units is None
        assert value.calendar is None

    def test_reference_series_sets_kind_and_reference_id(self):
        """A reference series surfaces kind="reference" and its reference_id."""
        item = self._series_item(kind="reference", reference_id="abc123")

        collection = MetricValueCollection.build_series_from_reader(_reader_collection([item]))

        value = collection.data[0]
        assert value.kind == "reference"
        assert value.reference_id == "abc123"

    def test_model_series_defaults_kind_and_no_reference_id(self):
        """A model series surfaces kind="model" with no reference_id."""
        collection = MetricValueCollection.build_series_from_reader(_reader_collection([self._series_item()]))

        value = collection.data[0]
        assert value.kind == "model"
        assert value.reference_id is None
