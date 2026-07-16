"""Helpers for serving metric values through the ``climate_ref.results.Reader`` facade."""

import csv
import io
from collections.abc import Generator, Mapping

from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.results.values import ScalarValueCollection, SeriesValueCollection
from ref_backend.core.json_utils import sanitize_float_value


def parse_dimension_filters(query_params: Mapping[str, str]) -> dict[str, str]:
    """
    Extract CV-dimension filters from arbitrary query parameters.

    Only keys that are registered CV dimensions are kept so unknown parameters are
    silently ignored (and never reach the reader, which would reject them).
    """
    cv_dimensions = set(models.ScalarMetricValue._cv_dimensions)
    return {key: value for key, value in query_params.items() if key in cv_dimensions}


def generate_csv_response_scalar(
    collection: ScalarValueCollection,
    detection_ran: bool,
    filename: str,
) -> StreamingResponse:
    """
    Generate a CSV streaming response from a reader scalar collection.

    Preserves the historical column layout: sorted dimension columns, then ``value`` and
    ``type``, and (when detection ran) ``is_outlier`` and ``verification_status``.
    """

    def generate_csv() -> Generator[str]:
        output = io.StringIO()
        writer = csv.writer(output)

        items = collection.items
        if not items:
            yield ""
            return

        dimensions = sorted(items[0].dimensions.keys())
        header = [*dimensions, "value", "type"]
        if detection_ran:
            header.extend(["is_outlier", "verification_status"])
        writer.writerow(header)

        for item in items:
            row = [item.dimensions.get(d) for d in dimensions] + [
                sanitize_float_value(item.value),
                "scalar",
            ]
            if detection_ran:
                row.extend([item.is_outlier, item.verification_status])
            writer.writerow(row)

        output.seek(0)
        yield output.read()

    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    if detection_ran:
        headers["X-REF-Had-Outliers"] = "true" if collection.had_outliers else "false"
        headers["X-REF-Outlier-Count"] = str(collection.outlier_count)

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers=headers,
    )


def generate_csv_response_series(
    collection: SeriesValueCollection,
    filename: str,
) -> StreamingResponse:
    """
    Generate a CSV streaming response from a reader series collection.

    Preserves the historical flattened layout: one header/data block per series, with a
    row per index point.
    """

    def generate_csv() -> Generator[str]:
        output = io.StringIO()
        writer = csv.writer(output)

        items = collection.items
        if not items:
            yield ""
            return

        for sv in items:
            dimensions = sorted(sv.dimensions.keys())
            header = [*dimensions, "value", "index", "index_name", "type"]
            writer.writerow(header)

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

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
