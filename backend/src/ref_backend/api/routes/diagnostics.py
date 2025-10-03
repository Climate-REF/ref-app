import csv
import io
import json
from collections.abc import Generator
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import and_, not_, text
from sqlalchemy.orm import selectinload
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset
from ref_backend.api.deps import AppContextDep
from ref_backend.core.filter_utils import build_filter_clause
from ref_backend.core.json_utils import sanitize_float_value
from ref_backend.core.outliers import detect_outliers_in_scalar_values
from ref_backend.models import (
    AnnotatedScalarValue,
    Collection,
    DiagnosticSummary,
    Execution,
    ExecutionGroup,
    MetricValueCollection,
    MetricValueComparison,
    MetricValueFacetSummary,
)

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


async def _get_diagnostic(
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str
) -> models.Diagnostic:
    if app_context.settings.DIAGNOSTIC_PROVIDERS:
        if provider_slug not in app_context.settings.DIAGNOSTIC_PROVIDERS:
            raise HTTPException(status_code=404, detail="Diagnostic not found")

    diagnostic = (
        app_context.session.query(models.Diagnostic)
        .join(models.Diagnostic.provider)
        .filter(
            models.Diagnostic.slug == diagnostic_slug,
            models.Provider.slug == provider_slug,
        )
        .one_or_none()
    )
    if diagnostic is None:
        raise HTTPException(status_code=404, detail="Diagnostic not found")
    return diagnostic


@router.get("/", name="list")
async def _list(app_context: AppContextDep) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics
    """
    diagnostics_query = app_context.session.query(models.Diagnostic)
    if app_context.settings.DIAGNOSTIC_PROVIDERS:
        diagnostics_query = diagnostics_query.join(models.Provider).filter(
            models.Provider.slug.in_(app_context.settings.DIAGNOSTIC_PROVIDERS)
        )

    diagnostics = diagnostics_query.all()

    return Collection(data=[DiagnosticSummary.build(m, app_context) for m in diagnostics])


@router.get("/facets", name="facets")
async def facets(app_context: AppContextDep) -> MetricValueFacetSummary:
    """
    Query the unique dimensions and metrics for all diagnostics (both scalar and series)
    """
    # Get unique values for each CV dimension column from both scalar and series values
    dimension_summary = {}

    # Get dimensions from scalar values
    for dimension_name in models.ScalarMetricValue._cv_dimensions:
        scalar_query = text(f"""
            SELECT DISTINCT {dimension_name}
            FROM {models.ScalarMetricValue.__tablename__}
            WHERE {dimension_name} IS NOT NULL
        """)  # noqa: S608
        scalar_result = app_context.session.execute(scalar_query).fetchall()
        scalar_values = {row[0] for row in scalar_result}

        # Get dimensions from series values
        series_query = text(f"""
            SELECT DISTINCT {dimension_name}
            FROM {models.SeriesMetricValue.__tablename__}
            WHERE {dimension_name} IS NOT NULL
        """)  # noqa: S608
        series_result = app_context.session.execute(series_query).fetchall()
        series_values = {row[0] for row in series_result}

        # Combine and sort unique values
        all_values = scalar_values.union(series_values)
        dimension_summary[dimension_name] = sorted(list(all_values))

    # Count both scalar and series values
    scalar_count = app_context.session.query(models.ScalarMetricValue).count()
    series_count = app_context.session.query(models.SeriesMetricValue).count()

    return MetricValueFacetSummary(
        dimensions=dimension_summary,
        count=scalar_count + series_count,
    )


@router.get("/{provider_slug}/{diagnostic_slug}")
async def get(app_context: AppContextDep, provider_slug: str, diagnostic_slug: str) -> DiagnosticSummary:
    """
    Fetch a result using the slug
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    return DiagnosticSummary.build(diagnostic, app_context)


@router.get("/{provider_slug}/{diagnostic_slug}/execution_groups")
async def list_execution_groups(
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str
) -> Collection[ExecutionGroup]:
    """
    Fetch execution groups for a diagnostic.
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    # Precompute the diagnostic summary once (shared across all groups)
    diagnostic_summary = DiagnosticSummary.build(diagnostic, app_context)

    # Eager-load relationships to avoid per-item queries
    execution_groups = (
        app_context.session.query(models.ExecutionGroup)
        .options(
            selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.outputs),
            selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.datasets),
            selectinload(models.ExecutionGroup.diagnostic),
        )
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .all()
    )

    return Collection(
        data=[
            ExecutionGroup.build(e, app_context, diagnostic_summary=diagnostic_summary)
            for e in execution_groups
        ]
    )


@router.get("/{provider_slug}/{diagnostic_slug}/comparison")
async def comparison(  # noqa: PLR0912, PLR0913, PLR0915
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    source_filters: str = Query(..., description="JSON string for source filters"),
    type: str = Query("scalar", description="Type of metric values to compare: 'scalar', 'series', or 'all'"),
    isolate_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to isolate"),
    exclude_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to exclude"),
) -> MetricValueComparison:
    """
    Get all the diagnostic values for a given diagnostic, with flexible filtering.

    - `source_filters`: A JSON string representing a dictionary of filters to apply to
      the source data. For example: `{"source_id": "MIROC6", "experiment_id": "ssp585"}`
    - `type`: Type of metric values to compare - 'scalar' (default), 'series', or 'all'
    - Other query parameters are treated as filters to be applied to all data before
      being split into source and ensemble.
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    try:
        source_filter_dict = json.loads(source_filters)
        if not isinstance(source_filter_dict, dict):
            raise ValueError("source_filters must be a JSON object")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid source_filters: {e}") from e

    # Build queries for scalar and/or series values
    scalar_query = None
    series_query = None

    if type in {"scalar", "all"}:
        scalar_query = (
            app_context.session.query(models.ScalarMetricValue)
            .join(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        )

    if type in {"series", "all"}:
        series_query = (
            app_context.session.query(models.SeriesMetricValue)
            .join(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        )

    # Apply general filters from query parameters
    query_params = request.query_params
    for key, value in query_params.items():
        if key in {"source_filters", "type"}:
            continue

        if scalar_query and key in models.ScalarMetricValue._cv_dimensions:
            col = getattr(models.ScalarMetricValue, key)
            scalar_query = scalar_query.filter(build_filter_clause(col, value))

        if series_query and key in models.SeriesMetricValue._cv_dimensions:
            col = getattr(models.SeriesMetricValue, key)
            series_query = series_query.filter(build_filter_clause(col, value))

    # Build source filter conditions
    # Support id-based filtering via isolate_ids / exclude_ids (isolate takes precedence)
    def _parse_id_list(id_str: str) -> list[int]:
        try:
            return [int(i.strip()) for i in id_str.split(",") if i.strip()]
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid id in list: {e}") from e

    if isolate_ids:
        ids = _parse_id_list(isolate_ids)
        if scalar_query:
            scalar_query = scalar_query.filter(models.ScalarMetricValue.id.in_(ids))
        if series_query:
            series_query = series_query.filter(models.SeriesMetricValue.id.in_(ids))
    elif exclude_ids:
        ids = _parse_id_list(exclude_ids)
        if scalar_query:
            scalar_query = scalar_query.filter(~models.ScalarMetricValue.id.in_(ids))
        if series_query:
            series_query = series_query.filter(~models.SeriesMetricValue.id.in_(ids))

    scalar_source_clauses = []
    series_source_clauses = []

    for key, value in source_filter_dict.items():
        if scalar_query and key in models.ScalarMetricValue._cv_dimensions:
            col = getattr(models.ScalarMetricValue, key)
            scalar_source_clauses.append(build_filter_clause(col, value))

        if series_query and key in models.SeriesMetricValue._cv_dimensions:
            col = getattr(models.SeriesMetricValue, key)
            series_source_clauses.append(build_filter_clause(col, value))

    if not scalar_source_clauses and not series_source_clauses:
        raise HTTPException(status_code=400, detail="source_filters cannot be empty or contain no valid keys")

    # Execute queries and split into source and ensemble
    source_scalar_values = []
    ensemble_scalar_values = []
    source_series_values = []
    ensemble_series_values = []

    if scalar_query and scalar_source_clauses:
        source_conditions = and_(*scalar_source_clauses)
        source_scalar_values = scalar_query.filter(source_conditions).all()
        ensemble_scalar_values = scalar_query.filter(not_(source_conditions)).all()

    if series_query and series_source_clauses:
        source_conditions = and_(*series_source_clauses)
        source_series_values = series_query.filter(source_conditions).all()
        ensemble_series_values = series_query.filter(not_(source_conditions)).all()

    return MetricValueComparison(
        source=MetricValueCollection.build(
            scalar_values=[AnnotatedScalarValue(value=v) for v in source_scalar_values],
            series_values=source_series_values,
        ),
        ensemble=MetricValueCollection.build(
            scalar_values=[AnnotatedScalarValue(value=v) for v in ensemble_scalar_values],
            series_values=ensemble_series_values,
        ),
    )


@router.get(
    "/{provider_slug}/{diagnostic_slug}/executions",
    response_model=Collection[Execution],
)
async def list_executions(
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
) -> Collection[Execution]:
    """
    Fetch executions for a specific diagnostic, with arbitrary filters on the dataset.

    e.g. `?source_id=MIROC6&experiment_id=ssp585`
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    executions_query = (
        app_context.session.query(models.Execution)
        .join(CMIP6Dataset, models.Execution.datasets)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
    )

    query_params = request.query_params
    for key, value in query_params.items():
        if hasattr(CMIP6Dataset, key):
            col = getattr(CMIP6Dataset, key)
            executions_query = executions_query.filter(build_filter_clause(col, value))

    executions = executions_query.all()

    return Collection(data=[Execution.build(e, app_context) for e in executions])


@router.get("/{provider_slug}/{diagnostic_slug}/values", response_model=None)
async def list_metric_values(  # noqa: PLR0912, PLR0913, PLR0915
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    format: str | None = None,
    type: str = Query("all", description="Type of metric values to return: 'scalar', 'series', or 'all'"),
    detect_outliers: Literal["off", "iqr"] = Query(
        "iqr", description="Outlier detection method: 'off' or 'iqr'"
    ),
    include_unverified: bool = Query(False, description="Include unverified (outlier) values"),
    isolate_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to isolate"),
    exclude_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to exclude"),
) -> MetricValueCollection | StreamingResponse:
    """
    Get all the diagnostic values for a given diagnostic (both scalar and series)

    - `type`: Filter by metric value type - 'scalar', 'series', or 'all' (default)
    - `format`: Return format - 'json' (default) or 'csv'
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    # Build queries for scalar and series values
    scalar_query = None
    series_query = None

    if type in {"scalar", "all"}:
        scalar_query = (
            app_context.session.query(models.ScalarMetricValue)
            .join(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        )

    if type in {"series", "all"}:
        series_query = (
            app_context.session.query(models.SeriesMetricValue)
            .join(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        )

    # Apply general filters from query parameters
    query_params = request.query_params
    for key, value in query_params.items():
        if key in {"format", "type"}:
            continue

        if scalar_query and hasattr(models.ScalarMetricValue, key):
            col = getattr(models.ScalarMetricValue, key)
            scalar_query = scalar_query.filter(build_filter_clause(col, value))

        if series_query and hasattr(models.SeriesMetricValue, key):
            col = getattr(models.SeriesMetricValue, key)
            series_query = series_query.filter(build_filter_clause(col, value))

    # Apply id-based filtering (isolate takes precedence over exclude)
    def _parse_id_list(id_str: str) -> list[int]:
        try:
            return [int(i.strip()) for i in id_str.split(",") if i.strip()]
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid id in list: {e}") from e

    if isolate_ids:
        ids = _parse_id_list(isolate_ids)
        if scalar_query:
            scalar_query = scalar_query.filter(models.ScalarMetricValue.id.in_(ids))
        if series_query:
            series_query = series_query.filter(models.SeriesMetricValue.id.in_(ids))
    elif exclude_ids:
        ids = _parse_id_list(exclude_ids)
        if scalar_query:
            scalar_query = scalar_query.filter(~models.ScalarMetricValue.id.in_(ids))
        if series_query:
            series_query = series_query.filter(~models.SeriesMetricValue.id.in_(ids))

    scalar_values = scalar_query.all() if scalar_query else []
    series_values = series_query.all() if series_query else []

    # Outlier detection
    annotated_scalar_values: list[AnnotatedScalarValue]
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

    if format == "csv":

        def generate_csv() -> Generator[str]:
            output = io.StringIO()
            writer = csv.writer(output)

            if (not annotated_scalar_values and not scalar_values) and not series_values:
                yield ""
                return

            # For CSV, we'll handle scalar and series differently
            # Scalar values: dimensions + value
            # Series values: dimensions + values (flattened) + index info

            if annotated_scalar_values:
                dimensions = sorted(annotated_scalar_values[0].value.dimensions.keys())
                header = [*dimensions, "value", "type"]
                if detection_ran:
                    header.extend(["is_outlier", "verification_status"])
                writer.writerow(header)

                for item in annotated_scalar_values:
                    mv = item.value
                    row = [mv.dimensions.get(d) for d in dimensions] + [
                        sanitize_float_value(mv.value),
                        "scalar",
                    ]
                    if detection_ran:
                        row.extend([item.is_outlier, item.verification_status])
                    writer.writerow(row)

            if series_values:
                # Write series values (flattened)
                for sv in series_values:
                    dimensions = sorted(sv.dimensions.keys())
                    if not (annotated_scalar_values or scalar_values):  # Write header if not already written
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

        headers = {
            "Content-Disposition": f"attachment; filename=metric_values_{provider_slug}_{diagnostic_slug}.csv"
        }
        if detection_ran:
            headers["X-REF-Had-Outliers"] = "true" if had_outliers else "false"
            headers["X-REF-Outlier-Count"] = str(outlier_count)

        return StreamingResponse(
            generate_csv(),
            media_type="text/csv",
            headers=headers,
        )
    else:
        return MetricValueCollection.build(
            scalar_values=annotated_scalar_values,
            series_values=series_values,
            had_outliers=had_outliers if detection_ran else None,
            outlier_count=outlier_count if detection_ran else None,
        )
