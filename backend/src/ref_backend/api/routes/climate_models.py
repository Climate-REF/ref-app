from collections import defaultdict
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from climate_ref import models
from ref_backend.api.deps import SessionDep
from ref_backend.core.model_ensemble import ensemble_comparisons
from ref_backend.core.model_runs import (
    ModelRunRow,
    dataset_counts,
    failed_runs,
    model_run_rows,
    tally,
)
from ref_backend.models import Collection
from ref_backend.models.climate_models import (
    DiagnosticRuns,
    EnsembleComparison,
    FailedRun,
    ModelDetail,
    ModelSummary,
)

router = APIRouter(prefix="/models", tags=["models"])


def _group_by_source_id(rows: list[ModelRunRow]) -> dict[str, list[ModelRunRow]]:
    grouped: dict[str, list[ModelRunRow]] = defaultdict(list)
    for row in rows:
        grouped[row.source_id].append(row)
    return grouped


def _summary_fields(source_id: str, rows: list[ModelRunRow], dataset_count: int) -> dict[str, Any]:
    """Build the fields both the index row and the detail page share."""
    return dict(
        source_id=source_id,
        mip_eras=sorted({row.mip_era for row in rows}),
        institution_ids=sorted({row.institution_id for row in rows if row.institution_id}),
        dataset_count=dataset_count,
        diagnostic_count=len({row.diagnostic_id for row in rows}),
        execution_groups=tally(rows),
    )


@router.get("/", name="list")
async def _list(
    session: SessionDep,
    mip_era: str | None = Query(None, description="Restrict to one MIP era, CMIP6 or CMIP7"),
    source_id_contains: str | None = Query(None, description="Filter models by source_id substring"),
) -> Collection[ModelSummary]:
    """
    List the models that have been run, with a tally of how their runs went.

    Counts cover the promoted version of each diagnostic, matching the rest of the app.
    """
    rows = model_run_rows(session, mip_era=mip_era)
    counts = dataset_counts(session, mip_era=mip_era)

    summaries = [
        ModelSummary(**_summary_fields(source_id, source_rows, counts.get(source_id, 0)))
        for source_id, source_rows in _group_by_source_id(rows).items()
    ]
    if source_id_contains:
        needle = source_id_contains.lower()
        summaries = [summary for summary in summaries if needle in summary.source_id.lower()]

    summaries.sort(key=lambda summary: summary.source_id)
    return Collection(data=summaries, total_count=len(summaries))


@router.get("/{source_id}")
async def get(
    session: SessionDep,
    source_id: str,
    mip_era: str | None = Query(None, description="Restrict to one MIP era, CMIP6 or CMIP7"),
) -> ModelDetail:
    """
    Summarise the runs a single model took part in, broken down by diagnostic.
    """
    rows = model_run_rows(session, mip_era=mip_era, source_id=source_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Model not found")

    by_diagnostic: dict[int, list[ModelRunRow]] = defaultdict(list)
    for row in rows:
        by_diagnostic[row.diagnostic_id].append(row)

    diagnostics = {
        diagnostic.id: diagnostic
        for diagnostic in session.query(models.Diagnostic).filter(models.Diagnostic.id.in_(by_diagnostic))
    }

    diagnostic_runs = [
        DiagnosticRuns(
            diagnostic_id=diagnostic_id,
            diagnostic_slug=diagnostics[diagnostic_id].slug,
            diagnostic_name=diagnostics[diagnostic_id].name,
            provider_slug=diagnostics[diagnostic_id].provider.slug,
            provider_name=diagnostics[diagnostic_id].provider.name,
            execution_groups=tally(diagnostic_rows),
        )
        for diagnostic_id, diagnostic_rows in by_diagnostic.items()
        if diagnostic_id in diagnostics
    ]
    diagnostic_runs.sort(key=lambda runs: (runs.provider_slug, runs.diagnostic_slug))

    failures = [
        FailedRun(
            execution_group_id=group.id,
            key=group.key,
            diagnostic_slug=group.diagnostic.slug,
            diagnostic_name=group.diagnostic.name,
            provider_slug=group.diagnostic.provider.slug,
            execution_id=execution_id,
            outcome=outcome,
            updated_at=group.updated_at,
        )
        for group, execution_id, outcome in failed_runs(session, source_id=source_id, mip_era=mip_era)
    ]

    counts = dataset_counts(session, mip_era=mip_era, source_id=source_id)
    return ModelDetail(
        **_summary_fields(source_id, rows, counts.get(source_id, 0)),
        diagnostics=diagnostic_runs,
        failures=failures,
    )


@router.get("/{source_id}/ensemble")
async def ensemble(
    session: SessionDep,
    source_id: str,
    mip_era: str | None = Query(None, description="Restrict to one MIP era, CMIP6 or CMIP7"),
    diagnostic_slug: str | None = Query(None, description="Restrict to a single diagnostic"),
) -> Collection[EnsembleComparison]:
    """
    Compare this model against the ensemble, one entry per scalar metric it reported.

    Entries are ordered by how far the model sits from the ensemble mean, furthest first.
    """
    comparisons = ensemble_comparisons(
        session,
        source_id=source_id,
        mip_era=mip_era,
        diagnostic_slug=diagnostic_slug,
    )
    return Collection(data=comparisons, total_count=len(comparisons))
