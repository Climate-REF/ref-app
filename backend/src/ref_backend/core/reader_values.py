"""Helpers for serving metric values through the ``climate_ref.results.Reader`` facade."""

import csv
import io
from collections.abc import Generator, Iterable, Mapping, Sequence
from typing import TYPE_CHECKING, Any, Literal

from fastapi import HTTPException
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.results import MetricValueFilter, OutlierPolicy
from climate_ref.results.values import ScalarValueCollection, SeriesValueCollection
from ref_backend.core.json_utils import sanitize_float_value
from ref_backend.core.metric_values import MetricValueType
from ref_backend.core.mip_eras import mip_eras_for_executions
from ref_backend.models import MetricValueCollection

if TYPE_CHECKING:
    from ref_backend.api.deps import AppContext


def parse_dimension_filters(query_params: Mapping[str, str]) -> dict[str, str]:
    """
    Extract CV-dimension filters from arbitrary query parameters.

    Only keys that are registered CV dimensions are kept so unknown parameters are
    silently ignored (and never reach the reader, which would reject them).
    """
    cv_dimensions = set(models.ScalarMetricValue._cv_dimensions)
    return {key: value for key, value in query_params.items() if key in cv_dimensions}


def _csv_response(
    rows: Iterable[Sequence[Any]], filename: str, headers: Mapping[str, str] | None = None
) -> StreamingResponse:
    """Stream `rows` as a CSV download, writing each row as it is produced."""

    def generate_csv() -> Generator[str]:
        output = io.StringIO()
        writer = csv.writer(output)
        for row in rows:
            writer.writerow(row)
            yield output.getvalue()
            output.seek(0)
            output.truncate()

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}", **(headers or {})},
    )


def _scalar_csv_rows(collection: ScalarValueCollection, detection_ran: bool) -> Generator[list[Any]]:
    items = collection.items
    # Dimension columns come from the values, so an empty collection only has the fixed ones
    dimensions = sorted(items[0].dimensions.keys()) if items else []
    header = [*dimensions, "value", "type"]
    if detection_ran:
        header.extend(["is_outlier", "verification_status"])
    yield header

    for item in items:
        row = [item.dimensions.get(d) for d in dimensions] + [
            sanitize_float_value(item.value),
            "scalar",
        ]
        if detection_ran:
            row.extend([item.is_outlier, item.verification_status])
        yield row


def generate_csv_response_scalar(
    collection: ScalarValueCollection,
    detection_ran: bool,
    filename: str,
) -> StreamingResponse:
    """
    Generate a CSV streaming response from a reader scalar collection.

    Preserves the historical column layout: sorted dimension columns, then ``value`` and
    ``type``, and (when detection ran) ``is_outlier`` and ``verification_status``.
    An empty collection gets a header of the columns that do not depend on the values.
    """
    headers = {}
    if detection_ran:
        headers["X-REF-Had-Outliers"] = "true" if collection.had_outliers else "false"
        headers["X-REF-Outlier-Count"] = str(collection.outlier_count)
    return _csv_response(_scalar_csv_rows(collection, detection_ran), filename, headers)


_SERIES_COLUMNS = ["value", "index", "index_name", "type"]


def _series_csv_rows(collection: SeriesValueCollection) -> Generator[list[Any]]:
    if not collection.items:
        yield list(_SERIES_COLUMNS)
        return

    for sv in collection.items:
        dimensions = sorted(sv.dimensions.keys())
        yield [*dimensions, *_SERIES_COLUMNS]

        for i, value in enumerate(sv.values):
            index_value = sv.index[i] if sv.index and i < len(sv.index) else i
            yield [sv.dimensions.get(d) for d in dimensions] + [
                sanitize_float_value(value),
                index_value,
                sv.index_name or "index",
                "series",
            ]


def generate_csv_response_series(
    collection: SeriesValueCollection,
    filename: str,
) -> StreamingResponse:
    """
    Generate a CSV streaming response from a reader series collection.

    Preserves the historical flattened layout: one header/data block per series, with a
    row per index point. An empty collection gets a header of the columns that do not
    depend on the values.
    """
    return _csv_response(_series_csv_rows(collection), filename)


def annotate_mip_eras(app_context: "AppContext", collection: MetricValueCollection) -> MetricValueCollection:
    """
    Stamp each model value with the MIP era of the execution that produced it.

    The charts split on this single key, and most diagnostics do not record a MIP era at all.
    An execution whose datasets span both eras is left unstamped, because no single era describes it.
    """
    unstamped = [
        item for item in collection.data if item.kind == "model" and not item.dimensions.get("mip_era")
    ]
    if not unstamped:
        return collection

    mip_eras = mip_eras_for_executions(app_context.session, {item.execution_id for item in unstamped})

    for item in unstamped:
        # A diagnostic's own `mip_id` stands in when the inputs do not settle the era.
        mip_era = mip_eras.get(item.execution_id) or item.dimensions.get("mip_id")
        if mip_era:
            item.dimensions["mip_era"] = mip_era.upper()

    return collection


def fetch_metric_values(  # noqa: PLR0913, PLR0917
    app_context: "AppContext",
    metric_filter: MetricValueFilter,
    value_type: MetricValueType,
    format: str | None,
    offset: int,
    limit: int,
    detect_outliers: Literal["off", "iqr"],
    include_unverified: bool,
    filename_stem: str,
) -> MetricValueCollection | StreamingResponse:
    """
    Read metric values for an already-scoped filter and render them as JSON or CSV.

    `filename_stem` names the CSV download, which is the only thing that varies
    between the diagnostic-scoped and execution-scoped endpoints.
    CSV exports return every matching value, so `offset` and `limit` are ignored there.
    """
    if value_type == MetricValueType.SCALAR:
        detection_ran = detect_outliers == "iqr"
        outlier_policy = OutlierPolicy(method=detect_outliers)

        if format == "csv":
            collection = app_context.reader.values.scalar_values(
                metric_filter,
                outliers=outlier_policy,
                include_unverified=include_unverified,
            )
            return generate_csv_response_scalar(
                collection, detection_ran, f"metric_values_scalar_{filename_stem}.csv"
            )

        collection = app_context.reader.values.scalar_values(
            metric_filter,
            outliers=outlier_policy,
            include_unverified=include_unverified,
            offset=offset,
            limit=limit,
        )
        return annotate_mip_eras(
            app_context, MetricValueCollection.build_scalar_from_reader(collection, detection_ran)
        )

    if value_type == MetricValueType.SERIES:
        if format == "csv":
            series_collection = app_context.reader.values.series_values(metric_filter)
            return generate_csv_response_series(
                series_collection, f"metric_values_series_{filename_stem}.csv"
            )

        series_collection = app_context.reader.values.series_values(
            metric_filter,
            offset=offset,
            limit=limit,
        )
        return annotate_mip_eras(
            app_context, MetricValueCollection.build_series_from_reader(series_collection)
        )

    raise HTTPException(status_code=500, detail="Unknown value_type")
