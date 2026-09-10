from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import ColumnElement, Integer, func, select
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.results import MetricValueFilter
from ref_backend.api.deps import AppContextDep
from ref_backend.core.metric_values import (
    MetricValueType,
    parse_id_list,
)
from ref_backend.core.mip_eras import (
    cmip_dataset_filter,
    execution_group_filter,
    executions_in_mip_era,
)
from ref_backend.core.reader_values import (
    fetch_metric_values,
    parse_dimension_filters,
)
from ref_backend.core.resource_usage import RESOURCE_AGGREGATES, summary_from_row
from ref_backend.models import (
    Collection,
    DiagnosticCatalogEntry,
    DiagnosticSummary,
    DiagnosticValueFlags,
    Execution,
    ExecutionGroup,
    MetricValueCollection,
    MetricValueFacetSummary,
)
from ref_backend.models.executions import EXECUTION_GROUP_LOAD_OPTIONS

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


def _listed_diagnostics(app_context: AppContextDep) -> list[models.Diagnostic]:
    query = app_context.session.query(models.Diagnostic)
    if app_context.settings.DIAGNOSTIC_PROVIDERS:
        query = query.join(models.Provider).filter(
            models.Provider.slug.in_(app_context.settings.DIAGNOSTIC_PROVIDERS)
        )
    if app_context.settings.DIAGNOSTIC_EXCLUDE:
        query = query.filter(models.Diagnostic.slug.notin_(app_context.settings.DIAGNOSTIC_EXCLUDE))
    return query.all()


def _group_scope(diagnostic_ids: list[int], mip_era: str | None) -> list[ColumnElement[bool]]:
    promoted_version = (
        select(models.Diagnostic.promoted_version)
        .where(models.Diagnostic.id == models.ExecutionGroup.diagnostic_id)
        .scalar_subquery()
    )
    group_scope: list[ColumnElement[bool]] = [
        models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids),
        models.ExecutionGroup.diagnostic_version == promoted_version,
    ]
    if mip_era:
        era_groups = select(models.ExecutionGroup.id).where(execution_group_filter({"mip_era": mip_era}))
        group_scope.append(models.ExecutionGroup.id.in_(era_groups))
    return group_scope


def _diagnostics_with_values(
    app_context: AppContextDep, value_class: type[models.MetricValue], group_scope: list[ColumnElement[bool]]
) -> set[int]:
    rows = (
        app_context.session.query(models.ExecutionGroup.diagnostic_id)
        .join(models.Execution)
        .join(value_class)
        .filter(*group_scope)
        .distinct()
    )
    return {row[0] for row in rows}


def _catalog_entries(
    app_context: AppContextDep, diagnostics: list[models.Diagnostic], group_scope: list[ColumnElement[bool]]
) -> list[DiagnosticCatalogEntry]:
    # Count executions and roll up their resource usage per diagnostic
    execution_counts = (
        app_context.session.query(
            models.ExecutionGroup.diagnostic_id,
            func.count(models.Execution.id).label("total_count"),
            func.sum(func.cast(models.Execution.successful, Integer)).label("successful_count"),
            *RESOURCE_AGGREGATES,
        )
        .join(models.Execution)
        .filter(*group_scope)
        .group_by(models.ExecutionGroup.diagnostic_id)
        .all()
    )
    execution_stats = {
        row.diagnostic_id: {"total": row.total_count, "successful": row.successful_count or 0}
        for row in execution_counts
    }
    resource_usage = {row.diagnostic_id: summary_from_row(row) for row in execution_counts}

    # Count execution groups per diagnostic
    execution_group_counts = (
        app_context.session.query(
            models.ExecutionGroup.diagnostic_id, func.count(models.ExecutionGroup.id).label("group_count")
        )
        .filter(*group_scope)
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
        .filter(*group_scope)
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

    return [
        DiagnosticCatalogEntry.build_with_stats(
            m,
            app_context,
            execution_stats=execution_stats.get(m.id, {"total": 0, "successful": 0}),
            execution_group_count=group_counts.get(m.id, 0),
            successful_execution_group_count=successful_group_counts_dict.get(m.id, 0),
            resource_usage=resource_usage.get(m.id),
        )
        for m in diagnostics
    ]


@router.get("/", name="list")
async def _list(app_context: AppContextDep, mip_era: str | None = None) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics

    Pass `mip_era` to count only the execution groups that ran against that era.
    """
    diagnostics = _listed_diagnostics(app_context)
    if not diagnostics:
        return Collection(data=[])

    group_scope = _group_scope([d.id for d in diagnostics], mip_era)
    scalar_ids = _diagnostics_with_values(app_context, models.ScalarMetricValue, group_scope)
    series_ids = _diagnostics_with_values(app_context, models.SeriesMetricValue, group_scope)
    return Collection(
        data=[
            DiagnosticSummary.from_catalog_entry(
                entry,
                has_scalar_values=entry.id in scalar_ids,
                has_series_values=entry.id in series_ids,
            )
            for entry in _catalog_entries(app_context, diagnostics, group_scope)
        ]
    )


@router.get("/catalog", name="catalog")
async def catalog(
    app_context: AppContextDep, mip_era: str | None = None
) -> Collection[DiagnosticCatalogEntry]:
    """
    List the diagnostics like `/diagnostics/`, without whether each has metric values

    Checking for metric values is most of the cost of the full listing.
    Fetch those from `/diagnostics/value-flags`.
    """
    diagnostics = _listed_diagnostics(app_context)
    if not diagnostics:
        return Collection(data=[])

    group_scope = _group_scope([d.id for d in diagnostics], mip_era)
    return Collection(data=_catalog_entries(app_context, diagnostics, group_scope))


@router.get("/value-flags", name="value_flags")
async def value_flags(
    app_context: AppContextDep, mip_era: str | None = None
) -> Collection[DiagnosticValueFlags]:
    """
    Whether each listed diagnostic has scalar and series values

    These are the flags `/diagnostics/catalog` leaves out.
    """
    diagnostics = _listed_diagnostics(app_context)
    if not diagnostics:
        return Collection(data=[])

    group_scope = _group_scope([d.id for d in diagnostics], mip_era)
    scalar_ids = _diagnostics_with_values(app_context, models.ScalarMetricValue, group_scope)
    series_ids = _diagnostics_with_values(app_context, models.SeriesMetricValue, group_scope)
    return Collection(
        data=[
            DiagnosticValueFlags(
                id=d.id,
                has_metric_values=d.id in scalar_ids or d.id in series_ids,
                has_scalar_values=d.id in scalar_ids,
                has_series_values=d.id in series_ids,
            )
            for d in diagnostics
        ]
    )


@router.get("/facets", name="facets")
async def facets(app_context: AppContextDep) -> MetricValueFacetSummary:
    """
    Query the unique dimensions and metrics for all diagnostics (both scalar and series)
    """
    # Query the base class so no type filter is added.
    # With one, SQLite walks the type index instead of the covering index on each dimension.
    session = app_context.session
    dimension_summary = {}
    for dimension_name in models.MetricValue._cv_dimensions:
        if not hasattr(models.MetricValue, dimension_name):
            continue

        column = getattr(models.MetricValue, dimension_name)
        values = session.scalars(select(column).where(column.isnot(None)).distinct())
        dimension_summary[dimension_name] = sorted(values)

    count = session.scalar(select(func.count(models.MetricValue.id))) or 0

    return MetricValueFacetSummary(
        dimensions=dimension_summary,
        count=count,
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
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str, mip_era: str | None = None
) -> Collection[ExecutionGroup]:
    """
    Fetch execution groups for a diagnostic.

    Pass `mip_era` to keep only the groups that ran against that era.
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)
    group_filters = [models.ExecutionGroup.diagnostic_id == diagnostic.id]
    if mip_era:
        group_filters.append(execution_group_filter({"mip_era": mip_era}))

    # Precompute the diagnostic summary once (shared across all groups)
    diagnostic_summary = DiagnosticSummary.build(diagnostic, app_context)

    # Eager-load relationships to avoid per-item queries
    execution_groups = (
        app_context.session.query(models.ExecutionGroup)
        .options(*EXECUTION_GROUP_LOAD_OPTIONS)
        .filter(*group_filters)
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

    e.g. `?source_id=MIROC6&experiment_id=ssp585`. Pass `mip_era` to restrict to one era.
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    executions_query = (
        app_context.session.query(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .filter(cmip_dataset_filter(dict(request.query_params)))
    )

    executions = executions_query.all()

    return Collection(data=[Execution.build(e, app_context) for e in executions])


@router.get("/{provider_slug}/{diagnostic_slug}/values", response_model=MetricValueCollection)
async def list_metric_values(  # noqa: PLR0913, PLR0917
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
    mip_era: str | None = Query(None, description="Restrict to one MIP era, CMIP6 or CMIP7"),
) -> MetricValueCollection | StreamingResponse:
    """
    Get all the diagnostic values for a given diagnostic (both scalar and series)

    - `value_type`: Type of metric values - 'scalar', 'series', or 'all' (required)
    - `format`: Return format - 'json' (default) or 'csv'
    - `offset`: Number of items to skip (default 0)
    - `limit`: Maximum number of items to return (default 50, max 500)
    - `mip_era`: Restrict to the executions of one era, so outlier detection and pagination
      see only the values the caller is charting
    """
    # Validates the provider/diagnostic exist and are not excluded (raises 404 otherwise).
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    execution_ids = None
    if mip_era:
        # The reader reads an empty id list as unconstrained, so an era that matched no execution
        # needs an id no value can carry rather than no filter at all.
        execution_ids = executions_in_mip_era(app_context.session, mip_era, diagnostic.id) or [0]

    # Scope to this diagnostic/provider via exact-match slugs. ``promoted_only`` keeps only the
    # promoted diagnostic version, so values from superseded versions are hidden. Exposing
    # previous versions needs a separate design (TODO). Retracted executions are still included.
    metric_filter = MetricValueFilter(
        diagnostic_slug=diagnostic_slug,
        provider_slug=provider_slug,
        execution_ids=execution_ids,
        dimensions=parse_dimension_filters(request.query_params),
        isolate_ids=parse_id_list(isolate_ids) if isolate_ids else None,
        exclude_ids=parse_id_list(exclude_ids) if exclude_ids else None,
        promoted_only=True,
        include_retracted=True,
    )

    return fetch_metric_values(
        app_context,
        metric_filter,
        value_type=value_type,
        format=format,
        offset=offset,
        limit=limit,
        detect_outliers=detect_outliers,
        include_unverified=include_unverified,
        filename_stem=f"{provider_slug}_{diagnostic_slug}",
    )
