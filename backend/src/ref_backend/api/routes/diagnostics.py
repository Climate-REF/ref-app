from fastapi import APIRouter, HTTPException

from climate_ref import models
from ref_backend.api.deps import AppContextDep, SessionDep
from ref_backend.models import (
    Collection,
    DiagnosticSummary,
    ExecutionGroup,
    MetricValueCollection,
)

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


async def _get_diagnostic(
    session, provider_slug: str, diagnostic_slug: str
) -> models.Diagnostic:
    diagnostic = (
        session.query(models.Diagnostic)
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
    diagnostics = app_context.session.query(models.Diagnostic).all()

    return Collection(
        data=[DiagnosticSummary.build(m, app_context) for m in diagnostics]
    )


@router.get("/{provider_slug}/{diagnostic_slug}")
async def get(
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str
) -> DiagnosticSummary:
    """
    Fetch a result using the slug
    """
    diagnostic = await _get_diagnostic(
        app_context.session, provider_slug, diagnostic_slug
    )

    return DiagnosticSummary.build(diagnostic, app_context)


@router.get("/{provider_slug}/{diagnostic_slug}/executions")
async def list_execution_groups(
    app_context: AppContextDep, provider_slug: str, diagnostic_slug: str
) -> Collection[ExecutionGroup]:
    """
    Fetch a result using the slug
    """
    diagnostic = await _get_diagnostic(
        app_context.session, provider_slug, diagnostic_slug
    )

    execution_groups = (
        app_context.session.query(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .all()
    )

    return Collection(
        data=[ExecutionGroup.build(e, app_context) for e in execution_groups]
    )


@router.get("/{provider_slug}/{diagnostic_slug}/values")
async def list_metric_values(
    session: SessionDep, provider_slug: str, diagnostic_slug: str
) -> MetricValueCollection:
    """
    Get all the diagnostic values for a given diagnostic
    """
    diagnostic = await _get_diagnostic(session, provider_slug, diagnostic_slug)

    metric_values = (
        session.query(models.MetricValue)
        .join(models.Execution)
        .join(models.ExecutionGroup)
        .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
        .all()
    )

    return MetricValueCollection.build(metric_values)
