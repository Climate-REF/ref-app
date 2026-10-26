from typing import Literal, NamedTuple

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy.orm import joinedload, selectinload
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.metric_value import MetricValueType as StoredMetricValueType
from climate_ref.query import select_group_counts
from climate_ref.results import DiagnosticFilter, ExecutionGroupFilter, MetricValueFilter, ResourceFilter
from ref_backend.api.deps import AppContextDep
from ref_backend.core.execution_groups import load_execution_groups
from ref_backend.core.metric_values import (
    MetricValueType,
    parse_id_list,
)
from ref_backend.core.mip_eras import MipEra, era_scope, source_id_datasets
from ref_backend.core.reader_values import (
    fetch_facets,
    fetch_metric_values,
    parse_dimension_filters,
)
from ref_backend.core.resource_usage import resource_usage_by_diagnostic
from ref_backend.models import (
    Collection,
    DiagnosticCatalogEntry,
    DiagnosticSummary,
    DiagnosticValueFlags,
    ExecutionGroup,
    Facet,
    GroupCounts,
    MetricValueCollection,
)

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


def _get_diagnostic(
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


def _listed_diagnostics(
    app_context: AppContextDep, *, with_group_ids: bool = False
) -> list[models.Diagnostic]:
    query = app_context.session.query(models.Diagnostic).options(joinedload(models.Diagnostic.provider))
    if with_group_ids:
        # One query for every diagnostic's group ids, rather than one per diagnostic.
        query = query.options(
            selectinload(models.Diagnostic.execution_groups).load_only(models.ExecutionGroup.id)
        )
    if app_context.settings.DIAGNOSTIC_PROVIDERS:
        query = query.join(models.Provider).filter(
            models.Provider.slug.in_(app_context.settings.DIAGNOSTIC_PROVIDERS)
        )
    if app_context.settings.DIAGNOSTIC_EXCLUDE:
        query = query.filter(models.Diagnostic.slug.notin_(app_context.settings.DIAGNOSTIC_EXCLUDE))
    return query.all()


class _Scope(NamedTuple):
    """The listed diagnostics, and the filter that picks which of their execution groups count"""

    diagnostics: list[models.Diagnostic]
    filters: DiagnosticFilter


def _scoped_diagnostics(
    app_context: AppContextDep, mip_era: MipEra | None, source_id: str | None, *, with_group_ids: bool = False
) -> _Scope:
    """Get the listed diagnostics, counting only the groups that draw on `mip_era` and ran `source_id`"""
    return _Scope(
        _listed_diagnostics(app_context, with_group_ids=with_group_ids),
        DiagnosticFilter(
            include_superseded=False,
            include_retracted=False,
            **era_scope(mip_era),
            input_datasets=source_id_datasets(source_id),
        ),
    )


class _ValueTypes(NamedTuple):
    """The (provider, diagnostic) slugs of the diagnostics with scalar values and of those with series"""

    scalar: frozenset[tuple[str, str]]
    series: frozenset[tuple[str, str]]


def _value_types(app_context: AppContextDep, scope: _Scope) -> _ValueTypes:
    with_values = app_context.reader.diagnostics.with_values
    return _ValueTypes(
        scalar=with_values(StoredMetricValueType.SCALAR, scope.filters),
        series=with_values(StoredMetricValueType.SERIES, scope.filters),
    )


def _key(diagnostic: models.Diagnostic | DiagnosticCatalogEntry) -> tuple[str, str]:
    return diagnostic.provider.slug, diagnostic.slug


def _catalog_entries(app_context: AppContextDep, scope: _Scope) -> list[DiagnosticCatalogEntry]:
    resource_usage = resource_usage_by_diagnostic(
        app_context.reader,
        ResourceFilter(
            include_superseded=False,
            include_retracted=True,
            source_types=scope.filters.source_types,
            or_no_model_input=scope.filters.or_no_model_input,
            input_datasets=scope.filters.input_datasets,
        ),
    )
    counts = {
        (row.provider_slug, row.diagnostic_slug): row
        for row in app_context.session.execute(select_group_counts(scope.filters))
    }
    return [
        DiagnosticCatalogEntry.build_with_stats(
            m,
            app_context,
            groups=GroupCounts.of(counts.get(_key(m))),
            resource_usage=resource_usage.get(_key(m)),
        )
        for m in scope.diagnostics
    ]


@router.get("/", name="list")
def _list(
    app_context: AppContextDep,
    mip_era: MipEra | None = Query(None, description="Count only the execution groups that draw on this era"),
    source_id: str | None = Query(None, description="Count only the execution groups that ran this model"),
) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics

    Counts cover the promoted version of each diagnostic and leave out retracted executions.
    """
    scope = _scoped_diagnostics(app_context, mip_era, source_id, with_group_ids=True)
    value_types = _value_types(app_context, scope)
    return Collection(
        data=[
            DiagnosticSummary.from_catalog_entry(
                entry,
                has_scalar_values=_key(entry) in value_types.scalar,
                has_series_values=_key(entry) in value_types.series,
            )
            for entry in _catalog_entries(app_context, scope)
        ]
    )


@router.get("/catalog", name="catalog")
def catalog(
    app_context: AppContextDep,
    mip_era: MipEra | None = Query(None, description="Count only the execution groups that draw on this era"),
    source_id: str | None = Query(None, description="Count only the execution groups that ran this model"),
) -> Collection[DiagnosticCatalogEntry]:
    """
    List the diagnostics like `/diagnostics/`, without whether each has metric values

    Checking for metric values is most of the cost of the full listing.
    Fetch those from `/diagnostics/value-flags`.
    """
    scope = _scoped_diagnostics(app_context, mip_era, source_id, with_group_ids=True)
    return Collection(data=_catalog_entries(app_context, scope))


@router.get("/value-flags", name="value_flags")
def value_flags(
    app_context: AppContextDep,
    mip_era: MipEra | None = Query(None, description="Check only the execution groups that draw on this era"),
    source_id: str | None = Query(None, description="Check only the execution groups that ran this model"),
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
                has_metric_values=_key(d) in value_types.scalar or _key(d) in value_types.series,
                has_scalar_values=_key(d) in value_types.scalar,
                has_series_values=_key(d) in value_types.series,
            )
            for d in scope.diagnostics
        ]
    )


@router.get("/{provider_slug}/{diagnostic_slug}")
def get(app_context: AppContextDep, provider_slug: str, diagnostic_slug: str) -> DiagnosticSummary:
    """
    Fetch a result using the slug
    """
    diagnostic = _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    return DiagnosticSummary.build(diagnostic, app_context)


@router.get("/{provider_slug}/{diagnostic_slug}/execution_groups")
def list_execution_groups(
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    mip_era: MipEra | None = Query(None, description="Keep only the execution groups that draw on this era"),
) -> Collection[ExecutionGroup]:
    """
    Fetch the execution groups of a diagnostic, at its promoted version

    Groups whose latest execution is retracted are left out, matching the counts.
    """
    _get_diagnostic(app_context, provider_slug, diagnostic_slug)
    groups, _ = load_execution_groups(
        app_context.session,
        ExecutionGroupFilter(
            provider_slug=provider_slug,
            diagnostic_slug=diagnostic_slug,
            include_superseded=False,
            include_retracted=False,
            **era_scope(mip_era),
        ),
        with_count=False,
    )
    return Collection(data=[ExecutionGroup.build(g, app_context) for g in groups], total_count=len(groups))


def _metric_filter(  # noqa: PLR0913, PLR0917
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    mip_era: MipEra | None,
    isolate_ids: str | None,
    exclude_ids: str | None,
) -> MetricValueFilter:
    # Validates the provider/diagnostic exist and are not excluded (raises 404 otherwise).
    _get_diagnostic(app_context, provider_slug, diagnostic_slug)
    return MetricValueFilter(
        diagnostic_slug=diagnostic_slug,
        provider_slug=provider_slug,
        include_superseded=False,
        include_retracted=False,
        latest_only=False,
        **era_scope(mip_era),
        dimensions=parse_dimension_filters(request.query_params),
        isolate_ids=parse_id_list(isolate_ids),
        exclude_ids=parse_id_list(exclude_ids),
    )


@router.get("/{provider_slug}/{diagnostic_slug}/values/facets")
def list_metric_value_facets(  # noqa: PLR0913, PLR0917
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    value_type: MetricValueType = Query(..., description="Type of metric values to read the facets of"),
    isolate_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to isolate"),
    exclude_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to exclude"),
    mip_era: MipEra | None = Query(
        None, description="Keep only the execution groups that draw on this era, or on no model data"
    ),
) -> list[Facet]:
    """
    Get the facets of the values `/values` returns for the same filters, without the values.

    They cover every page and the outliers too, so a client can keep them while it pages.
    """
    metric_filter = _metric_filter(
        app_context, provider_slug, diagnostic_slug, request, mip_era, isolate_ids, exclude_ids
    )
    return fetch_facets(app_context, metric_filter, value_type)


@router.get("/{provider_slug}/{diagnostic_slug}/values", response_model=MetricValueCollection)
def list_metric_values(  # noqa: PLR0913, PLR0917
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
    mip_era: MipEra | None = Query(
        None, description="Keep only the execution groups that draw on this era, or on no model data"
    ),
    with_facets: bool = Query(True, description="Fill `facets`, which `/values/facets` also returns"),
) -> MetricValueCollection | StreamingResponse:
    """
    Get all the diagnostic values for a given diagnostic (both scalar and series)

    - `value_type`: Type of metric values - 'scalar', 'series', or 'all' (required)
    - `format`: Return format - 'json' (default) or 'csv'
    - `offset`: Number of items to skip (default 0)
    - `limit`: Maximum number of items to return (default 50, max 500)
    - `mip_era`: Restrict to the groups of one era, so outlier detection and pagination
      see only the values the caller is charting.
      Groups that use no model data, such as observation-only ones, are kept.

    Values come from the promoted diagnostic version, and retracted executions are left out.
    """
    metric_filter = _metric_filter(
        app_context, provider_slug, diagnostic_slug, request, mip_era, isolate_ids, exclude_ids
    )

    return fetch_metric_values(
        app_context,
        metric_filter,
        with_facets=with_facets,
        value_type=value_type,
        format=format,
        offset=offset,
        limit=limit,
        detect_outliers=detect_outliers,
        include_unverified=include_unverified,
        filename_stem=f"{provider_slug}_{diagnostic_slug}",
    )
