"""Shared logic for querying and formatting metric values."""

import csv
import io
from collections.abc import Generator, Sequence
from enum import StrEnum
from typing import Literal, TypeVar

from fastapi import HTTPException
from sqlalchemy.orm import Query
from starlette.responses import StreamingResponse

from climate_ref import models
from ref_backend.core.filter_utils import build_filter_clause
from ref_backend.core.json_utils import sanitize_float_value
from ref_backend.core.outliers import detect_outliers_in_scalar_values
from ref_backend.models import AnnotatedScalarValue

TMetricValueModel = TypeVar("TMetricValueModel", bound=models.ScalarMetricValue | models.SeriesMetricValue)


class MetricValueType(StrEnum):
    """Type of metric values to query."""

    SCALAR = "scalar"
    SERIES = "series"


def parse_id_list(id_str: str) -> list[int]:
    """Parse comma-separated list of IDs into integers."""
    try:
        return [int(i.strip()) for i in id_str.split(",") if i.strip()]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid id in list: {e}") from e


def apply_metric_filters(
    query: Query[TMetricValueModel],
    filters: dict[str, str],
    isolate_ids: str | None,
    exclude_ids: str | None,
) -> Query[TMetricValueModel]:
    """
    Apply ID-based filtering to queries.

    Isolate filter takes precedence over exclude filter.

    Args:
        query: Query for metric values
        isolate_ids: Comma-separated IDs to include exclusively
        exclude_ids: Comma-separated IDs to exclude

    Returns
    -------
        Tuple of (filtered_scalar_query, filtered_series_query)
    """
    for key, value in filters.items():
        if hasattr(models.MetricValue, key):
            col = getattr(models.ScalarMetricValue, key)
            query = query.filter(build_filter_clause(col, value))

    if isolate_ids:
        ids = parse_id_list(isolate_ids)
        query = query.filter(models.MetricValue.id.in_(ids))
    elif exclude_ids:
        ids = parse_id_list(exclude_ids)
        query = query.filter(~models.MetricValue.id.in_(ids))

    return query


def process_scalar_values(
    scalar_values: Sequence[models.ScalarMetricValue],
    detect_outliers: Literal["off", "iqr"],
    include_unverified: bool,
) -> tuple[list[AnnotatedScalarValue], bool, int, bool]:
    """
    Process scalar values with optional outlier detection.

    Args:
        scalar_values: List of scalar metric values
        detect_outliers: Outlier detection method
        include_unverified: Whether to include outlier values

    Returns
    -------
        Tuple of (annotated_values, had_outliers, outlier_count, detection_ran)
    """
    had_outliers = False
    outlier_count = 0
    detection_ran = False

    if detect_outliers == "iqr" and scalar_values:
        detection_ran = True
        annotated_scalar_values, outlier_count = detect_outliers_in_scalar_values(scalar_values)
        had_outliers = outlier_count > 0
        if not include_unverified:
            annotated_scalar_values = [item for item in annotated_scalar_values if not item.is_outlier]
    else:
        annotated_scalar_values = [AnnotatedScalarValue(value=v) for v in scalar_values]

    return annotated_scalar_values, had_outliers, outlier_count, detection_ran


def generate_csv_response_scalar(
    scalar_values: list[AnnotatedScalarValue],
    detection_ran: bool,
    had_outliers: bool,
    outlier_count: int,
    filename: str,
) -> StreamingResponse:
    """
    Generate CSV streaming response for metric values.

    Args:
        scalar_values: Processed scalar values with annotations
        series_values: Series metric values
        detection_ran: Whether outlier detection was performed
        had_outliers: Whether outliers were detected
        outlier_count: Number of outliers detected
        filename: Filename for the CSV attachment

    Returns
    -------
        StreamingResponse with CSV content
    """

    def generate_csv() -> Generator[str]:
        output = io.StringIO()
        writer = csv.writer(output)

        if not scalar_values:
            yield ""
            return

        # Write scalar values
        dimensions = sorted(scalar_values[0].value.dimensions.keys())
        header = [*dimensions, "value", "type"]
        if detection_ran:
            header.extend(["is_outlier", "verification_status"])
        writer.writerow(header)

        for item in scalar_values:
            mv = item.value
            row = [mv.dimensions.get(d) for d in dimensions] + [
                sanitize_float_value(mv.value),
                "scalar",
            ]
            if detection_ran:
                row.extend([item.is_outlier, item.verification_status])
            writer.writerow(row)

        output.seek(0)
        yield output.read()

    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    if detection_ran:
        headers["X-REF-Had-Outliers"] = "true" if had_outliers else "false"
        headers["X-REF-Outlier-Count"] = str(outlier_count)

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers=headers,
    )


def generate_csv_response_series(
    series_values: list[models.SeriesMetricValue],
    detection_ran: bool,
    had_outliers: bool,
    outlier_count: int,
    filename: str,
) -> StreamingResponse:
    """
    Generate CSV streaming response for metric values.

    Args:
        series_values: Series metric values
        detection_ran: Whether outlier detection was performed
        had_outliers: Whether outliers were detected
        outlier_count: Number of outliers detected
        filename: Filename for the CSV attachment

    Returns
    -------
        StreamingResponse with CSV content
    """

    def generate_csv() -> Generator[str]:
        output = io.StringIO()
        writer = csv.writer(output)

        if not series_values:
            yield ""
            return

        # Write series values (flattened)
        for sv in series_values:
            dimensions = sorted(sv.dimensions.keys())
            # Write header if not already written
            header = [*dimensions, "value", "index", "index_name", "type"]
            writer.writerow(header)

            # Flatten series into multiple rows
            for i, value in enumerate(sv.values):
                index_value = sv.index[i] if sv.index and i < len(sv.index) else i
                row = [sv.dimensions.get(d) for d in dimensions] + [
                    sanitize_float_value(value),
                    index_value,
                    sv.index_name or "index",
                    "series",
                ]
                writer.writerow(row)

        output.seek(0)
        yield output.read()

    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    if detection_ran:
        headers["X-REF-Had-Outliers"] = "true" if had_outliers else "false"
        headers["X-REF-Outlier-Count"] = str(outlier_count)

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers=headers,
    )
