import csv
import io
from typing import cast

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
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
            raise HTTPException(status_code=404, detail="Metric not found")

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
        raise HTTPException(status_code=404, detail="Metric not found")
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

    return Collection(
        data=[DiagnosticSummary.build(m, app_context) for m in diagnostics]
    )


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
        """)
        dimension_result = app_context.session.execute(dimension_query).fetchall()
        dimension_summary[dimension_name] = [row[0] for row in dimension_result]

    return MetricValueFacetSummary(
        dimensions=dimension_summary,
        count=app_context.session.query(models.ScalarMetricValue).count(),
    )


@router.get("/{provider_slug}/{diagnostic_slug}")
async def get(
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str
) -> DiagnosticSummary:
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

    return Collection(
        data=[ExecutionGroup.build(e, app_context) for e in execution_groups]
    )


@router.get("/{provider_slug}/{diagnostic_slug}/comparison")
async def comparison(
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
    source_id: str,
    metrics: list[str] = Query(...),
) -> MetricValueComparison:
    """
    Get all the diagnostic values for a given diagnostic
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    metric_values_query = (
        app_context.session.query(models.ScalarMetricValue)
        .join(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .filter(models.ScalarMetricValue.metric.in_(metrics))
    )

    source_values = metric_values_query.filter(
        models.ScalarMetricValue.source_id == source_id
    ).all()
    ensemble_values = metric_values_query.filter(
        models.ScalarMetricValue.source_id != source_id
    ).all()
    return MetricValueComparison(
        source=MetricValueCollection.build(
            cast(list[models.MetricValue], source_values)
        ),
        ensemble=MetricValueCollection.build(
            cast(list[models.MetricValue], ensemble_values)
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
    source_id: str,
) -> Collection[Execution]:
    """
    Fetch executions for a specific diagnostic and source_id
    """
    diagnostic = await _get_diagnostic(app_context, provider_slug, diagnostic_slug)

    executions = (
        app_context.session.query(models.Execution)
        .join(CMIP6Dataset, models.Execution.datasets)
        .join(models.ExecutionGroup)
        .filter(
            models.ExecutionGroup.diagnostic_id == diagnostic.id,
            CMIP6Dataset.source_id == source_id,
        )
        .all()
    )

    return Collection(data=[Execution.build(e, app_context) for e in executions])


@router.get("/{provider_slug}/{diagnostic_slug}/values", response_model=None)
async def list_metric_values(
    app_context: AppContextDep,
    provider_slug: str,
    diagnostic_slug: str,
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

    if format == "csv":
        metric_values = metric_values_query.all()

        def generate_csv():
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
        return MetricValueCollection.build(
            cast(list[models.MetricValue], metric_values_query.all())
        )
