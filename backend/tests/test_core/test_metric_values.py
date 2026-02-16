"""Tests for ref_backend.core.metric_values module."""

import asyncio
import csv
import io
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from ref_backend.core.metric_values import (
    generate_csv_response_scalar,
    generate_csv_response_series,
    parse_id_list,
    process_scalar_values,
)
from ref_backend.models import AnnotatedScalarValue


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


class TestProcessScalarValues:
    """Test the process_scalar_values function."""

    def test_detect_outliers_iqr_with_values(self):
        """Test with detect_outliers='iqr' and non-empty values."""
        # Need enough values (min_n=4) and varied enough for IQR detection
        mock_values = [
            Mock(id=1, dimensions={"metric": "rmse"}, value=1.0),
            Mock(id=2, dimensions={"metric": "rmse"}, value=2.0),
            Mock(id=3, dimensions={"metric": "rmse"}, value=2.5),
            Mock(id=4, dimensions={"metric": "rmse"}, value=3.0),
            Mock(id=5, dimensions={"metric": "rmse"}, value=3.5),
            Mock(id=6, dimensions={"metric": "rmse"}, value=4.0),
            Mock(id=7, dimensions={"metric": "rmse"}, value=4.5),
            Mock(id=8, dimensions={"metric": "rmse"}, value=5.0),
            Mock(id=9, dimensions={"metric": "rmse"}, value=5.5),
            Mock(id=10, dimensions={"metric": "rmse"}, value=6.0),
            Mock(id=11, dimensions={"metric": "rmse"}, value=100.0),  # outlier
        ]

        annotated, had_outliers, outlier_count, detection_ran = process_scalar_values(
            mock_values, detect_outliers="iqr", include_unverified=True
        )

        assert detection_ran is True
        assert len(annotated) == 11
        assert all(isinstance(item, AnnotatedScalarValue) for item in annotated)
        # The last value should be flagged as an outlier
        assert annotated[10].is_outlier is True
        assert outlier_count >= 1
        assert had_outliers is True

    def test_detect_outliers_off(self):
        """Test with detect_outliers='off' returns plain wrappers."""
        mock_values = [
            Mock(dimensions={"metric": "rmse"}, value=1.0),
            Mock(dimensions={"metric": "rmse"}, value=2.0),
        ]

        annotated, had_outliers, outlier_count, detection_ran = process_scalar_values(
            mock_values, detect_outliers="off", include_unverified=True
        )

        assert detection_ran is False
        assert had_outliers is False
        assert outlier_count == 0
        assert len(annotated) == 2
        # All should be plain wrappers without outlier flags
        assert all(item.is_outlier is None for item in annotated)

    def test_include_unverified_false_filters_outliers(self):
        """Test that include_unverified=False filters out outliers."""
        mock_values = [
            Mock(id=1, dimensions={"metric": "rmse"}, value=1.0),
            Mock(id=2, dimensions={"metric": "rmse"}, value=2.0),
            Mock(id=3, dimensions={"metric": "rmse"}, value=2.5),
            Mock(id=4, dimensions={"metric": "rmse"}, value=3.0),
            Mock(id=5, dimensions={"metric": "rmse"}, value=3.5),
            Mock(id=6, dimensions={"metric": "rmse"}, value=4.0),
            Mock(id=7, dimensions={"metric": "rmse"}, value=4.5),
            Mock(id=8, dimensions={"metric": "rmse"}, value=5.0),
            Mock(id=9, dimensions={"metric": "rmse"}, value=5.5),
            Mock(id=10, dimensions={"metric": "rmse"}, value=6.0),
            Mock(id=11, dimensions={"metric": "rmse"}, value=100.0),  # outlier
        ]

        annotated, had_outliers, outlier_count, detection_ran = process_scalar_values(
            mock_values, detect_outliers="iqr", include_unverified=False
        )

        assert detection_ran is True
        assert had_outliers is True
        assert outlier_count >= 1
        # Outliers should be filtered out
        assert len(annotated) < len(mock_values)
        assert all(not item.is_outlier for item in annotated)

    def test_empty_input(self):
        """Test that empty input returns empty list with detection_ran=False."""
        annotated, had_outliers, outlier_count, detection_ran = process_scalar_values(
            [], detect_outliers="iqr", include_unverified=True
        )

        assert detection_ran is False
        assert had_outliers is False
        assert outlier_count == 0
        assert annotated == []


class TestGenerateCsvResponseScalar:
    """Test the generate_csv_response_scalar function."""

    def test_non_empty_scalar_values(self):
        """Test CSV generation with non-empty scalar values."""
        mock_value1 = Mock(dimensions={"region": "global", "metric": "rmse"}, value=1.5)
        mock_value2 = Mock(dimensions={"region": "global", "metric": "bias"}, value=2.5)

        annotated_values = [
            AnnotatedScalarValue(value=mock_value1),
            AnnotatedScalarValue(value=mock_value2),
        ]

        response = generate_csv_response_scalar(
            scalar_values=annotated_values,
            detection_ran=False,
            had_outliers=False,
            outlier_count=0,
            filename="test.csv",
        )

        # The body_iterator is created from the generator passed to StreamingResponse
        # We need to call the internal generate_csv function directly
        # Or use list comprehension to consume the sync generator before it's wrapped

        async def consume():
            content = ""
            async for chunk in response.body_iterator:
                content += chunk
            return content

        content = asyncio.run(consume())
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)

        # Check header (sorted dimensions + value + type)
        assert rows[0] == ["metric", "region", "value", "type"]

        # Check data rows
        assert rows[1] == ["rmse", "global", "1.5", "scalar"]
        assert rows[2] == ["bias", "global", "2.5", "scalar"]

        # Check headers
        assert response.headers["Content-Disposition"] == "attachment; filename=test.csv"
        assert "X-REF-Had-Outliers" not in response.headers

    def test_with_detection_ran_includes_outlier_columns(self):
        """Test that detection_ran=True adds outlier columns to CSV."""
        mock_value1 = Mock(dimensions={"region": "global"}, value=1.5)
        mock_value2 = Mock(dimensions={"region": "global"}, value=100.0)

        annotated_values = [
            AnnotatedScalarValue(value=mock_value1, is_outlier=False, verification_status="verified"),
            AnnotatedScalarValue(value=mock_value2, is_outlier=True, verification_status="unverified"),
        ]

        response = generate_csv_response_scalar(
            scalar_values=annotated_values,
            detection_ran=True,
            had_outliers=True,
            outlier_count=1,
            filename="test.csv",
        )

        # Consume the async streaming response
        async def consume():
            content = ""
            async for chunk in response.body_iterator:
                content += chunk
            return content

        content = asyncio.run(consume())
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)

        # Check header includes outlier columns
        assert rows[0] == ["region", "value", "type", "is_outlier", "verification_status"]

        # Check data rows
        assert rows[1] == ["global", "1.5", "scalar", "False", "verified"]
        assert rows[2] == ["global", "100.0", "scalar", "True", "unverified"]

        # Check custom headers
        assert response.headers["X-REF-Had-Outliers"] == "true"
        assert response.headers["X-REF-Outlier-Count"] == "1"

    def test_with_detection_ran_no_outliers(self):
        """Test that detection_ran=True with no outliers sets headers correctly."""
        mock_value1 = Mock(dimensions={"region": "global"}, value=1.5)

        annotated_values = [
            AnnotatedScalarValue(value=mock_value1, is_outlier=False, verification_status="verified"),
        ]

        response = generate_csv_response_scalar(
            scalar_values=annotated_values,
            detection_ran=True,
            had_outliers=False,
            outlier_count=0,
            filename="test.csv",
        )

        # Check custom headers
        assert response.headers["X-REF-Had-Outliers"] == "false"
        assert response.headers["X-REF-Outlier-Count"] == "0"

    def test_empty_values(self):
        """Test that empty values yields empty string."""
        response = generate_csv_response_scalar(
            scalar_values=[],
            detection_ran=False,
            had_outliers=False,
            outlier_count=0,
            filename="test.csv",
        )

        # Consume the async streaming response
        async def consume():
            content = ""
            async for chunk in response.body_iterator:
                content += chunk
            return content

        content = asyncio.run(consume())
        assert content == ""


class TestGenerateCsvResponseSeries:
    """Test the generate_csv_response_series function."""

    def test_non_empty_series(self):
        """Test CSV generation with non-empty series values."""
        mock_series1 = Mock(
            dimensions={"region": "global", "metric": "temp"},
            values=[1.0, 2.0, 3.0],
            index=[2020, 2021, 2022],
            index_name="year",
        )
        mock_series2 = Mock(
            dimensions={"region": "north", "metric": "temp"},
            values=[4.0, 5.0],
            index=[2020, 2021],
            index_name="year",
        )

        response = generate_csv_response_series(
            series_values=[mock_series1, mock_series2],
            detection_ran=False,
            had_outliers=False,
            outlier_count=0,
            filename="test.csv",
        )

        # Consume the async streaming response
        async def consume():
            content = ""
            async for chunk in response.body_iterator:
                content += chunk
            return content

        content = asyncio.run(consume())
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)

        # First series header
        assert rows[0] == ["metric", "region", "value", "index", "index_name", "type"]

        # First series data (flattened)
        assert rows[1] == ["temp", "global", "1.0", "2020", "year", "series"]
        assert rows[2] == ["temp", "global", "2.0", "2021", "year", "series"]
        assert rows[3] == ["temp", "global", "3.0", "2022", "year", "series"]

        # Second series header
        assert rows[4] == ["metric", "region", "value", "index", "index_name", "type"]

        # Second series data (flattened)
        assert rows[5] == ["temp", "north", "4.0", "2020", "year", "series"]
        assert rows[6] == ["temp", "north", "5.0", "2021", "year", "series"]

    def test_series_without_index(self):
        """Test series values without explicit index use position."""
        mock_series = Mock(
            dimensions={"region": "global"},
            values=[10.0, 20.0, 30.0],
            index=None,
            index_name=None,
        )

        response = generate_csv_response_series(
            series_values=[mock_series],
            detection_ran=False,
            had_outliers=False,
            outlier_count=0,
            filename="test.csv",
        )

        # Consume the async streaming response
        async def consume():
            content = ""
            async for chunk in response.body_iterator:
                content += chunk
            return content

        content = asyncio.run(consume())
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)

        # Header is: region, value, index, index_name, type
        # So indices are in column 2 (0-indexed)
        assert rows[1][2] == "0"  # index column
        assert rows[2][2] == "1"
        assert rows[3][2] == "2"
        # Check index_name defaults to "index" (column 3)
        assert rows[1][3] == "index"

    def test_empty_series(self):
        """Test that empty series yields empty string."""
        response = generate_csv_response_series(
            series_values=[],
            detection_ran=False,
            had_outliers=False,
            outlier_count=0,
            filename="test.csv",
        )

        # Consume the async streaming response
        async def consume():
            content = ""
            async for chunk in response.body_iterator:
                content += chunk
            return content

        content = asyncio.run(consume())
        assert content == ""

    def test_series_with_detection_headers(self):
        """Test that detection headers are set for series."""
        mock_series = Mock(
            dimensions={"region": "global"},
            values=[1.0, 2.0],
            index=[2020, 2021],
            index_name="year",
        )

        response = generate_csv_response_series(
            series_values=[mock_series],
            detection_ran=True,
            had_outliers=True,
            outlier_count=5,
            filename="test.csv",
        )

        # Check custom headers
        assert response.headers["X-REF-Had-Outliers"] == "true"
        assert response.headers["X-REF-Outlier-Count"] == "5"
        assert response.headers["Content-Disposition"] == "attachment; filename=test.csv"
