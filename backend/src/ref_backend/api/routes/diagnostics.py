from typing import Literal, NamedTuple

from fastapi import APIRouter, HTTPException, Query, Request
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.metric_value import MetricValueType as StoredMetricValueType
from climate_ref.results import DiagnosticFilter, InputDatasetFilter, MetricValueFilter, ResourceFilter
from ref_backend.api.deps import AppContextDep
from ref_backend.core.metric_values import (
    MetricValueType,
    parse_id_list,
)
from ref_backend.core.mip_eras import (
    cmip_input_filter,
    execution_group_filter,
)
from ref_backend.core.reader_values import (
    fetch_metric_values,
    parse_dimension_filters,
)
from ref_backend.core.resource_usage import resource_usage_by_diagnostic
from ref_backend.models import (
    Collection,
    DiagnosticCatalogEntry,
    DiagnosticSummary,
    DiagnosticValueFlags,
    Execution,
    ExecutionGroup,
    MetricValueCollection,
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


class _Scope(NamedTuple):
    """The listed diagnostics, and which of their execution groups count towards them"""

    diagnostics: list[models.Diagnostic]
    input_datasets: InputDatasetFilter | None
    matches_nothing: bool


def _scoped_diagnostics(app_context: AppContextDep, mip_era: str | None, source_id: str | None) -> _Scope:
    """
    Get the listed diagnostics, with the scope that counts their groups for `mip_era` and `source_id`

    Without any listed diagnostic the scope matches no group, so the counts come out empty.
    """
    diagnostics = _listed_diagnostics(app_context)
    # Selectors do not record source_id, so match on the datasets used, as the executions list does.
    facets = {key: value for key, value in {"mip_era": mip_era, "source_id": source_id}.items() if value}
    input_datasets = cmip_input_filter(facets) if facets else None
    matches_nothing = not diagnostics or (bool(facets) and input_datasets is None)
    return _Scope(diagnostics, input_datasets, matches_nothing)


def _diagnostics_with_values(
    app_context: AppContextDep, value_type: StoredMetricValueType, scope: _Scope
) -> set[int]:
    if scope.matches_nothing:
        return set()
    pairs = app_context.reader.diagnostics.with_values(
        value_type, DiagnosticFilter(input_datasets=scope.input_datasets)
    )
    return {d.id for d in scope.diagnostics if (d.provider.slug, d.slug) in pairs}


class _ValueTypes(NamedTuple):
    """The ids of the diagnostics with scalar values and of those with series values"""

    scalar: set[int]
    series: set[int]


def _value_types(app_context: AppContextDep, scope: _Scope) -> _ValueTypes:
    return _ValueTypes(
        scalar=_diagnostics_with_values(app_context, StoredMetricValueType.SCALAR, scope),
        series=_diagnostics_with_values(app_context, StoredMetricValueType.SERIES, scope),
    )


def _catalog_entries(app_context: AppContextDep, scope: _Scope) -> list[DiagnosticCatalogEntry]:
    resource_usage = (
        {}
        if scope.matches_nothing
        else resource_usage_by_diagnostic(
            app_context.reader,
            ResourceFilter(
                include_superseded=False, include_retracted=True, input_datasets=scope.input_datasets
            ),
        )
    )

    group_stats = (
        {}
        if scope.matches_nothing
        else {
            (stats.provider, stats.diagnostic): stats
            for stats in app_context.reader.diagnostics.stats(input_datasets=scope.input_datasets)
        }
    )

    entries = []
    for m in scope.diagnostics:
        stats = group_stats.get((m.provider.slug, m.slug))
        entries.append(
            DiagnosticCatalogEntry.build_with_stats(
                m,
                app_context,
                execution_group_count=stats.total if stats else 0,
                successful_execution_group_count=stats.successful if stats else 0,
                resource_usage=resource_usage.get((m.provider.slug, m.slug)),
            )
        )
    return entries


@router.get("/", name="list")
async def _list(
    app_context: AppContextDep, mip_era: str | None = None, source_id: str | None = None
) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics

    Pass `mip_era` to count only the execution groups that ran against that era,
    and `source_id` to count only those that ran against that model.
    """
    scope = _scoped_diagnostics(app_context, mip_era, source_id)
    value_types = _value_types(app_context, scope)
    return Collection(
        data=[
            DiagnosticSummary.from_catalog_entry(
                entry,
                has_scalar_values=entry.id in value_types.scalar,
                has_series_values=entry.id in value_types.series,
            )
            for entry in _catalog_entries(app_context, scope)
        ]
    )


@router.get("/catalog", name="catalog")
async def catalog(
    app_context: AppContextDep, mip_era: str | None = None, source_id: str | None = None
) -> Collection[DiagnosticCatalogEntry]:
    """
    List the diagnostics like `/diagnostics/`, without whether each has metric values

    Checking for metric values is most of the cost of the full listing.
    Fetch those from `/diagnostics/value-flags`.

    Pass `mip_era` and `source_id` to count only the execution groups that ran against that era or model.
    """
    scope = _scoped_diagnostics(app_context, mip_era, source_id)
    return Collection(data=_catalog_entries(app_context, scope))


@router.get("/value-flags", name="value_flags")
async def value_flags(
    app_context: AppContextDep, mip_era: str | None = None, source_id: str | None = None
) -> Collection[DiagnosticValueFlags]:
    """
    Whether each listed diagnostic has scalar and series values

    These are the flags `/diagnostics/catalog` leaves out.
    """
    scope = _scoped_diagnostics(app_context, mip_era, source_id)
    value_types = _value_types(app_context, scope)
    return Collection(
        data=[
            DiagnosticValueFlags(
                id=d.id,
                has_metric_values=d.id in value_types.scalar or d.id in value_types.series,
                has_scalar_values=d.id in value_types.scalar,
                has_series_values=d.id in value_types.series,
            )
            for d in scope.diagnostics
        ]
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

    # Eager-load relationships to avoid per-item queries
    execution_groups = (
        app_context.session.query(models.ExecutionGroup)
        .options(*EXECUTION_GROUP_LOAD_OPTIONS)
        .filter(*group_filters)
        .all()
    )

    return Collection(data=[ExecutionGroup.build(e, app_context) for e in execution_groups])


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
    input_filter = cmip_input_filter(dict(request.query_params))
    if input_filter is None:
        return Collection(data=[])

    executions = (
        app_context.session.query(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .filter(input_filter.execution_clause())
        .all()
    )

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
    await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    input_datasets = cmip_input_filter({"mip_era": mip_era}, or_no_model_input=True) if mip_era else None

    # Scope to this diagnostic/provider via exact-match slugs. The filter keeps only the
    # promoted diagnostic version, so values from superseded versions are hidden. Exposing
    # previous versions needs a separate design (TODO). Retracted executions are hidden.
    metric_filter = MetricValueFilter(
        diagnostic_slug=diagnostic_slug,
        provider_slug=provider_slug,
        # An unknown era matches no execution.
        execution_ids=() if mip_era and input_datasets is None else None,
        input_datasets=input_datasets,
        dimensions=parse_dimension_filters(request.query_params),
        isolate_ids=parse_id_list(isolate_ids),
        exclude_ids=parse_id_list(exclude_ids),
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
