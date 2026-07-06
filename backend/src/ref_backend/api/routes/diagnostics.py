from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import Integer, func
from sqlalchemy.orm import selectinload
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset
from climate_ref.results import MetricValueFilter, OutlierPolicy
from ref_backend.api.deps import AppContextDep
from ref_backend.core.filter_utils import build_filter_clause
from ref_backend.core.metric_values import (
    MetricValueType,
    parse_id_list,
)
from ref_backend.core.reader_values import (
    generate_csv_response_scalar,
    generate_csv_response_series,
    parse_dimension_filters,
)
from ref_backend.models import (
    Collection,
    DiagnosticSummary,
    Execution,
    ExecutionGroup,
    MetricValueCollection,
    MetricValueFacetSummary,
)

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


async def _get_diagnostic(
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str
) -> models.Diagnostic:
    if app_context.settings.DIAGNOSTIC_PROVIDERS:
        if provider_slug not in app_context.settings.DIAGNOSTIC_PROVIDERS:
            raise HTTPException(status_code=404, detail="Diagnostic not found")

    if app_context.settings.DIAGNOSTIC_EXCLUDE:
        if diagnostic_slug in app_context.settings.DIAGNOSTIC_EXCLUDE:
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
    if app_context.settings.DIAGNOSTIC_EXCLUDE:
        diagnostics_query = diagnostics_query.filter(
            models.Diagnostic.slug.notin_(app_context.settings.DIAGNOSTIC_EXCLUDE)
        )

    diagnostics = diagnostics_query.all()

    if not diagnostics:
        return Collection(data=[])

    # Batch fetch all diagnostic statistics to avoid N+1 queries
    diagnostic_ids = [d.id for d in diagnostics]

    # Check for scalar values existence
    scalar_values_exist = (
        app_context.session.query(models.ExecutionGroup.diagnostic_id)
        .join(models.Execution)
        .join(models.ScalarMetricValue)
        .filter(models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids))
        .distinct()
        .all()
    )
    scalar_diagnostic_ids = {row[0] for row in scalar_values_exist}

    # Check for series values existence
    series_values_exist = (
        app_context.session.query(models.ExecutionGroup.diagnostic_id)
        .join(models.Execution)
        .join(models.SeriesMetricValue)
        .filter(models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids))
        .distinct()
        .all()
    )
    series_diagnostic_ids = {row[0] for row in series_values_exist}

    # Count executions per diagnostic
    execution_counts = (
        app_context.session.query(
            models.ExecutionGroup.diagnostic_id,
            func.count(models.Execution.id).label("total_count"),
            func.sum(func.cast(models.Execution.successful, Integer)).label("successful_count"),
        )
        .join(models.Execution)
        .filter(models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids))
        .group_by(models.ExecutionGroup.diagnostic_id)
        .all()
    )
    execution_stats = {row[0]: {"total": row[1], "successful": row[2] or 0} for row in execution_counts}

    # Count execution groups per diagnostic
    execution_group_counts = (
        app_context.session.query(
            models.ExecutionGroup.diagnostic_id, func.count(models.ExecutionGroup.id).label("group_count")
        )
        .filter(models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids))
        .group_by(models.ExecutionGroup.diagnostic_id)
        .all()
    )
    group_counts = {row[0]: row[1] for row in execution_group_counts}

    # Count successful execution groups (latest execution successful)
    # Subquery: latest execution id per group
    latest_exec_per_group = (
        app_context.session.query(
            models.Execution.execution_group_id.label("egid"),
            func.max(models.Execution.id).label("latest_exec_id"),
        )
        .join(models.ExecutionGroup, models.Execution.execution_group_id == models.ExecutionGroup.id)
        .filter(models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids))
        .group_by(models.Execution.execution_group_id)
        .subquery()
    )

    # Join back to executions to check success of latest
    successful_group_counts = (
        app_context.session.query(
            models.ExecutionGroup.diagnostic_id,
            func.count(latest_exec_per_group.c.egid).label("successful_count"),
        )
        .join(models.Execution, models.Execution.id == latest_exec_per_group.c.latest_exec_id)
        .join(models.ExecutionGroup, models.ExecutionGroup.id == latest_exec_per_group.c.egid)
        .filter(models.Execution.successful.is_(True))
        .group_by(models.ExecutionGroup.diagnostic_id)
        .all()
    )
    successful_group_counts_dict = {row[0]: row[1] for row in successful_group_counts}

    return Collection(
        data=[
            DiagnosticSummary.build_with_stats(
                m,
                app_context,
                has_scalar_values=m.id in scalar_diagnostic_ids,
                has_series_values=m.id in series_diagnostic_ids,
                execution_stats=execution_stats.get(m.id, {"total": 0, "successful": 0}),
                execution_group_count=group_counts.get(m.id, 0),
                successful_execution_group_count=successful_group_counts_dict.get(m.id, 0),
            )
            for m in diagnostics
        ]
    )


@router.get("/facets", name="facets")
async def facets(app_context: AppContextDep) -> MetricValueFacetSummary:
    """
    Query the unique dimensions and metrics for all diagnostics (both scalar and series)
    """
    # Get unique values for each CV dimension column from both scalar and series values
    dimension_summary = {}

    # Get dimensions from scalar and series values using ORM queries
    # to avoid raw SQL interpolation
    for dimension_name in models.ScalarMetricValue._cv_dimensions:
        if not hasattr(models.ScalarMetricValue, dimension_name):
            continue

        scalar_col = getattr(models.ScalarMetricValue, dimension_name)
        scalar_result = app_context.session.query(scalar_col).filter(scalar_col.isnot(None)).distinct().all()
        scalar_values = {row[0] for row in scalar_result}

        series_col = getattr(models.SeriesMetricValue, dimension_name)
        series_result = app_context.session.query(series_col).filter(series_col.isnot(None)).distinct().all()
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


@router.get("/{provider_slug}/{diagnostic_slug}/values", response_model=MetricValueCollection)
async def list_metric_values(  # noqa: PLR0913
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    value_type: MetricValueType = Query(..., description="Type of metric values to return"),
    format: str | None = None,
    offset: int = Query(0, ge=0, description="Number of items to skip for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of items to return"),
    detect_outliers: Literal["off", "iqr"] = Query(
        "iqr", description="Outlier detection method: 'off' or 'iqr'"
    ),
    include_unverified: bool = Query(False, description="Include unverified (outlier) values"),
    isolate_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to isolate"),
    exclude_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to exclude"),
) -> MetricValueCollection | StreamingResponse:
    """
    Get all the diagnostic values for a given diagnostic (both scalar and series)

    - `value_type`: Type of metric values - 'scalar', 'series', or 'all' (required)
    - `format`: Return format - 'json' (default) or 'csv'
    - `offset`: Number of items to skip (default 0)
    - `limit`: Maximum number of items to return (default 50, max 500)
    """
    # Validates the provider/diagnostic exist and are not excluded (raises 404 otherwise).
    await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    # Scope to this diagnostic/provider via exact-match slugs. ``promoted_only`` is disabled so
    # values from every diagnostic version are returned (matching the previous query, which did
    # not filter by promoted version), and retracted executions are included as before.
    metric_filter = MetricValueFilter(
        diagnostic_slug=diagnostic_slug,
        provider_slug=provider_slug,
        dimensions=parse_dimension_filters(request.query_params),
        isolate_ids=parse_id_list(isolate_ids) if isolate_ids else None,
        exclude_ids=parse_id_list(exclude_ids) if exclude_ids else None,
        promoted_only=False,
        include_retracted=True,
    )

    if value_type == MetricValueType.SCALAR:
        detection_ran = detect_outliers == "iqr"
        outlier_policy = OutlierPolicy(method=detect_outliers)

        if format == "csv":
            # CSV export returns all results without pagination
            collection = app_context.reader.values.scalar_values(
                metric_filter,
                outliers=outlier_policy,
                include_unverified=include_unverified,
            )
            filename = f"metric_values_scalar_{provider_slug}_{diagnostic_slug}.csv"
            return generate_csv_response_scalar(collection, detection_ran, filename)

        collection = app_context.reader.values.scalar_values(
            metric_filter,
            outliers=outlier_policy,
            include_unverified=include_unverified,
            offset=offset,
            limit=limit,
        )
        return MetricValueCollection.build_scalar_from_reader(collection, detection_ran)

    elif value_type == MetricValueType.SERIES:
        if format == "csv":
            # CSV export returns all results without pagination
            series_collection = app_context.reader.values.series_values(metric_filter)
            filename = f"metric_values_series_{provider_slug}_{diagnostic_slug}.csv"
            return generate_csv_response_series(series_collection, filename)

        series_collection = app_context.reader.values.series_values(
            metric_filter,
            offset=offset,
            limit=limit,
        )
        return MetricValueCollection.build_series_from_reader(series_collection)
    else:
        raise HTTPException(status_code=500, detail="Unknown value_type")
