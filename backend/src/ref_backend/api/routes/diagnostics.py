import csv
import io
import json
from collections.abc import Generator

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import and_, not_, text
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset
from ref_backend.api.deps import AppContextDep
from ref_backend.models import (
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
    Query the unique dimensions and metrics for all diagnostics
    """
    # Get unique values for each CV dimension column
    dimension_summary = {}

    app_context.session.query(models.ScalarMetricValue).count()

    for dimension_name in models.ScalarMetricValue._cv_dimensions:
        dimension_query = text(f"""
            SELECT DISTINCT {dimension_name}
            FROM {models.ScalarMetricValue.__tablename__}
            WHERE {dimension_name} IS NOT NULL
            ORDER BY {dimension_name}
        """)  # noqa: S608
        dimension_result = app_context.session.execute(dimension_query).fetchall()
        dimension_summary[dimension_name] = [row[0] for row in dimension_result]

    return MetricValueFacetSummary(
        dimensions=dimension_summary,
        count=app_context.session.query(models.ScalarMetricValue).count(),
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
    Fetch a result using the slug
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    execution_groups = (
        app_context.session.query(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .all()
    )

    return Collection(data=[ExecutionGroup.build(e, app_context) for e in execution_groups])


@router.get("/{provider_slug}/{diagnostic_slug}/comparison")
async def comparison(
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    source_filters: str = Query(..., description="JSON string for source filters"),
) -> MetricValueComparison:
    """
    Get all the diagnostic values for a given diagnostic, with flexible filtering.

    - `source_filters`: A JSON string representing a dictionary of filters to apply to
      the source data. For example: `{"source_id": "MIROC6", "experiment_id": "ssp585"}`
    - Other query parameters are treated as filters to be applied to all data before
      being split into source and ensemble.
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    metric_values_query = (
        app_context.session.query(models.ScalarMetricValue)
        .join(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
    )

    try:
        source_filter_dict = json.loads(source_filters)
        if not isinstance(source_filter_dict, dict):
            raise ValueError("source_filters must be a JSON object")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid source_filters: {e}") from e

    # Apply general filters from query parameters
    query_params = request.query_params
    for key, value in query_params.items():
        if key == "source_filters":
            continue
        if key in models.ScalarMetricValue._cv_dimensions:
            metric_values_query = metric_values_query.filter(getattr(models.ScalarMetricValue, key) == value)

    source_filter_clauses = []
    for key, value in source_filter_dict.items():
        if key not in models.ScalarMetricValue._cv_dimensions:
            raise HTTPException(status_code=400, detail=f"Invalid filter key in source_filters: {key}")
        source_filter_clauses.append(getattr(models.ScalarMetricValue, key) == value)

    if not source_filter_clauses:
        raise HTTPException(status_code=400, detail="source_filters cannot be empty")

    source_conditions = and_(*source_filter_clauses)

    source_values = metric_values_query.filter(source_conditions).all()
    ensemble_values = metric_values_query.filter(not_(source_conditions)).all()

    return MetricValueComparison(
        source=MetricValueCollection.build(source_values),
        ensemble=MetricValueCollection.build(ensemble_values),
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
            executions_query = executions_query.filter(getattr(CMIP6Dataset, key) == value)

    executions = executions_query.all()

    return Collection(data=[Execution.build(e, app_context) for e in executions])


@router.get("/{provider_slug}/{diagnostic_slug}/values", response_model=None)
async def list_metric_values(
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    request: Request,
    format: str | None = None,
) -> MetricValueCollection | StreamingResponse:
    """
    Get all the diagnostic values for a given diagnostic
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    metric_values_query = (
        app_context.session.query(models.ScalarMetricValue)
        .join(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
    )

    # Apply general filters from query parameters
    query_params = request.query_params
    for key, value in query_params.items():
        if key == "format":
            continue
        if hasattr(models.ScalarMetricValue, key):
            metric_values_query = metric_values_query.filter(getattr(models.ScalarMetricValue, key) == value)

    if format == "csv":
        metric_values = metric_values_query.all()

        def generate_csv() -> Generator[str]:
            output = io.StringIO()
            writer = csv.writer(output)

            if not metric_values:
                yield ""
                return

            dimensions = sorted(metric_values[0].dimensions.keys())
            header = [*dimensions, "value"]
            writer.writerow(header)

            for mv in metric_values:
                row = [mv.dimensions.get(d) for d in dimensions] + [mv.value]
                writer.writerow(row)

            output.seek(0)
            yield output.read()

        return StreamingResponse(
            generate_csv(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; "
                f"filename=metric_values_{provider_slug}_{diagnostic_slug}.csv"
            },
        )
    else:
        return MetricValueCollection.build(metric_values_query.all())
