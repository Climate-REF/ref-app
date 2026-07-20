"""Tests for the live reader-values CSV generation and dimension-filter helpers."""

import asyncio
import math

from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.results.values import (
    ScalarValue,
    ScalarValueCollection,
    SeriesValue,
    SeriesValueCollection,
)
from ref_backend.core.reader_values import (
    generate_csv_response_scalar,
    generate_csv_response_series,
    parse_dimension_filters,
)


async def _collect_body(response: StreamingResponse) -> str:
    chunks = [chunk.decode() if isinstance(chunk, bytes) else chunk async for chunk in response.body_iterator]
    return "".join(chunks)


def _read_body(response: StreamingResponse) -> str:
    return asyncio.run(_collect_body(response))


def _scalar(**overrides):
    defaults = {
        "id": 1,
        "execution_id": 1,
        "execution_group_id": 1,
        "value": 1.0,
        "kind": "model",
        "dimensions": {"source_id": "A", "variable_id": "tas"},
        "attributes": {},
    }
    defaults.update(overrides)
    return ScalarValue(**defaults)


def _scalar_collection(items, **overrides):
    defaults = {
        "items": tuple(items),
        "total_count": len(items),
        "facets": (),
        "offset": 0,
        "limit": None,
        "had_outliers": False,
        "outlier_count": 0,
    }
    defaults.update(overrides)
    return ScalarValueCollection(**defaults)


def _series(**overrides):
    defaults = {
        "id": 1,
        "execution_id": 1,
        "execution_group_id": 1,
        "values": [1.0, 2.0, 3.0],
        "index": [2000, 2001, 2002],
        "index_name": "year",
        "reference_id": None,
        "kind": "model",
        "dimensions": {"source_id": "A"},
        "attributes": {},
    }
    defaults.update(overrides)
    return SeriesValue(**defaults)


def _series_collection(items, **overrides):
    defaults = {
        "items": tuple(items),
        "total_count": len(items),
        "facets": (),
        "offset": 0,
        "limit": None,
    }
    defaults.update(overrides)
    return SeriesValueCollection(**defaults)


class TestParseDimensionFilters:
    """Test parse_dimension_filters against the registered CV dimensions."""

    def test_keeps_registered_dimension(self, app):
        """A registered CV dimension is kept."""
        cv_dimension = sorted(models.ScalarMetricValue._cv_dimensions)[0]
        result = parse_dimension_filters({cv_dimension: "value"})
        assert result == {cv_dimension: "value"}

    def test_drops_unregistered_key(self, app):
        """An unregistered query parameter is silently dropped."""
        cv_dimension = sorted(models.ScalarMetricValue._cv_dimensions)[0]
        result = parse_dimension_filters({cv_dimension: "value", "not_a_cv_dimension": "x"})
        assert result == {cv_dimension: "value"}


class TestGenerateCsvResponseScalar:
    """Test the scalar CSV streaming response."""

    def test_header_without_detection(self):
        """Header is sorted dimensions then value, type, with no outlier columns or headers."""
        item = _scalar(dimensions={"variable_id": "tas", "source_id": "A"})
        collection = _scalar_collection([item])
        response = generate_csv_response_scalar(collection, detection_ran=False, filename="out.csv")

        body = _read_body(response)
        header = body.splitlines()[0]
        assert header == "source_id,variable_id,value,type"
        assert "X-REF-Had-Outliers" not in response.headers
        assert "X-REF-Outlier-Count" not in response.headers
        assert response.headers["Content-Disposition"] == "attachment; filename=out.csv"

    def test_header_with_detection(self):
        """Header gains outlier columns and X-REF-* headers reflect the collection."""
        item = _scalar(is_outlier=True, verification_status="unverified")
        collection = _scalar_collection([item], had_outliers=True, outlier_count=3)
        response = generate_csv_response_scalar(collection, detection_ran=True, filename="out.csv")

        body = _read_body(response)
        header = body.splitlines()[0]
        assert header == "source_id,variable_id,value,type,is_outlier,verification_status"
        assert response.headers["X-REF-Had-Outliers"] == "true"
        assert response.headers["X-REF-Outlier-Count"] == "3"

    def test_empty_collection_yields_empty_body(self):
        """An empty collection produces an empty body."""
        collection = _scalar_collection([])
        response = generate_csv_response_scalar(collection, detection_ran=False, filename="out.csv")
        assert _read_body(response) == ""

    def test_nan_value_is_sanitized_to_empty_cell(self):
        """A NaN value renders as an empty CSV cell rather than the literal 'nan'."""
        item = _scalar(value=math.nan)
        collection = _scalar_collection([item])
        response = generate_csv_response_scalar(collection, detection_ran=False, filename="out.csv")

        body = _read_body(response)
        data_row = body.splitlines()[1]
        # dimensions,,type -> value cell is empty between the two commas around it
        assert ",,scalar" in data_row


class TestGenerateCsvResponseSeries:
    """Test the series CSV streaming response."""

    def test_per_series_header_and_rows(self):
        """Each series gets its own header block and one row per index point."""
        item = _series(values=[1.0, 2.0], index=[2000, 2001], index_name="year")
        collection = _series_collection([item])
        response = generate_csv_response_series(collection, filename="out.csv")

        body = _read_body(response)
        lines = body.splitlines()
        assert lines[0] == "source_id,value,index,index_name,type"
        assert lines[1] == "A,1.0,2000,year,series"
        assert lines[2] == "A,2.0,2001,year,series"

    def test_index_falls_back_to_ordinal(self):
        """When index is missing, the row uses the ordinal position instead."""
        item = _series(values=[10.0, 20.0], index=None, index_name=None)
        collection = _series_collection([item])
        response = generate_csv_response_series(collection, filename="out.csv")

        body = _read_body(response)
        lines = body.splitlines()
        assert lines[0] == "source_id,value,index,index_name,type"
        assert lines[1] == "A,10.0,0,index,series"
        assert lines[2] == "A,20.0,1,index,series"

    def test_empty_collection_yields_empty_body(self):
        """An empty collection produces an empty body."""
        collection = _series_collection([])
        response = generate_csv_response_series(collection, filename="out.csv")
        assert _read_body(response) == ""
