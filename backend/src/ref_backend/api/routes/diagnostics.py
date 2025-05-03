from fastapi import APIRouter, HTTPException

from climate_ref import models
from ref_backend.api.deps import SessionDep
from ref_backend.models import (
    Collection,
    DiagnosticSummary,
    ExecutionGroup,
    MetricValueCollection,
)

router = APIRouter(prefix="/diagnostics", tags=["metrics"])


async def _get_diagnostic(
    session, provider_slug: str, metric_slug: str
) -> models.Diagnostic:
    diagnostic = (
        session.query(models.Diagnostic)
        .join(models.Diagnostic.provider)
        .filter(
            models.Diagnostic.slug == metric_slug,
            models.Provider.slug == provider_slug,
        )
        .one_or_none()
    )
    if diagnostic is None:
        raise HTTPException(status_code=404, detail="Metric not found")
    return diagnostic


@router.get("/")
async def list_metrics(session: SessionDep) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics
    """
    diagnostics = session.query(models.Diagnostic).all()

    return Collection(data=[DiagnosticSummary.build(m) for m in diagnostics])


@router.get("/{provider_slug}/{metric_slug}")
async def get_metric(
    session: SessionDep, provider_slug: str, metric_slug: str
) -> DiagnosticSummary:
    """
    Fetch a result using the slug
    """
    diagnostic = await _get_diagnostic(session, provider_slug, metric_slug)

    return DiagnosticSummary.build(diagnostic)


@router.get("/{provider_slug}/{metric_slug}/executions")
async def list_execution_groups(
    session: SessionDep, provider_slug: str, metric_slug: str
) -> Collection[ExecutionGroup]:
    """
    Fetch a result using the slug
    """
    diagnostic = await _get_diagnostic(session, provider_slug, metric_slug)

    execution_groups = (
        session.query(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .all()
    )

    return Collection(data=[ExecutionGroup.build(e) for e in execution_groups])


@router.get("/{provider_slug}/{metric_slug}/values")
async def list_metric_values(
    session: SessionDep, provider_slug: str, metric_slug: str
) -> MetricValueCollection:
    """
    Get all the diagnostic values for a given diagnostic
    """
    diagnostic = await _get_diagnostic(session, provider_slug, metric_slug)

    metric_values = (
        session.query(models.MetricValue)
        .join(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .all()
    )

    return MetricValueCollection.build(metric_values)
