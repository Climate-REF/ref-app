"""Rolling execution groups up per climate model, keyed by `source_id`."""

from collections import defaultdict
from collections.abc import Sequence
from typing import Any, NamedTuple

from sqlalchemy import Select, case, distinct, func, literal, select, union_all
from sqlalchemy.orm import Session, aliased

from climate_ref import models
from ref_backend.core.mip_eras import CMIP_ERAS, dataset_model_for, mip_era_for
from ref_backend.models.climate_models import RunCounts

#: The outcomes an execution group is classified into, ordered worst to best.
OUTCOMES = ("failed", "running", "not_started", "successful")


class ModelRunRow(NamedTuple):
    """One (model, era, diagnostic, outcome) tally."""

    source_id: str
    institution_id: str | None
    mip_era: str
    diagnostic_id: int
    outcome: str
    group_count: int


def _column(mapped: Any, name: str) -> Any:
    """Read a column the CV registers at runtime, which the mapped class does not declare."""
    return getattr(mapped, name)


def _eras_in_scope(mip_era: str | None) -> tuple[Any, ...]:
    if mip_era is None:
        return CMIP_ERAS
    return tuple(era for era in CMIP_ERAS if mip_era_for(era) == mip_era.upper())


def _model_groups(mip_era: str | None, source_id: str | None) -> Select[Any] | None:
    """
    Select every (execution group, model) pairing at the promoted version of each diagnostic.

    A group that ran several models appears once per model, so the counts answer
    "what did this model take part in" rather than partitioning the groups.
    """
    statements = []
    for era in _eras_in_scope(mip_era):
        dataset_model = dataset_model_for(era)
        statement = (
            select(
                models.ExecutionGroup.id.label("group_id"),
                models.ExecutionGroup.diagnostic_id.label("diagnostic_id"),
                _column(dataset_model, "source_id").label("source_id"),
                _column(dataset_model, "institution_id").label("institution_id"),
                literal(mip_era_for(era)).label("mip_era"),
            )
            .join(models.Diagnostic, models.ExecutionGroup.diagnostic_id == models.Diagnostic.id)
            .join(models.ExecutionGroup.executions)
            .join(models.Execution.datasets.of_type(dataset_model))
            .where(
                models.ExecutionGroup.diagnostic_version == models.Diagnostic.promoted_version,
                _column(dataset_model, "source_id").isnot(None),
            )
            .distinct()
        )
        if source_id:
            statement = statement.where(_column(dataset_model, "source_id") == source_id)
        statements.append(statement)

    if not statements:
        return None
    if len(statements) == 1:
        return statements[0]
    return select(union_all(*statements).subquery())


def _latest_executions() -> Any:
    """Select the most recent execution of each group, which is the one that decides its outcome."""
    return (
        select(
            models.Execution.execution_group_id.label("group_id"),
            func.max(models.Execution.id).label("execution_id"),
        )
        .group_by(models.Execution.execution_group_id)
        .subquery()
    )


def _outcome(execution: Any) -> Any:
    return case(
        (execution.id.is_(None), "not_started"),
        (execution.successful.is_(True), "successful"),
        (execution.successful.is_(False), "failed"),
        else_="running",
    )


def model_run_rows(
    session: Session, *, mip_era: str | None = None, source_id: str | None = None
) -> list[ModelRunRow]:
    """Tally execution groups per model, era, diagnostic and outcome."""
    groups = _model_groups(mip_era, source_id)
    if groups is None:
        return []

    subquery = groups.subquery("model_groups")
    latest = _latest_executions()
    execution = aliased(models.Execution)
    outcome = _outcome(execution)

    rows = session.execute(
        select(
            subquery.c.source_id,
            subquery.c.institution_id,
            subquery.c.mip_era,
            subquery.c.diagnostic_id,
            outcome.label("outcome"),
            func.count(distinct(subquery.c.group_id)).label("group_count"),
        )
        .outerjoin(latest, latest.c.group_id == subquery.c.group_id)
        .outerjoin(execution, execution.id == latest.c.execution_id)
        .group_by(
            subquery.c.source_id,
            subquery.c.institution_id,
            subquery.c.mip_era,
            subquery.c.diagnostic_id,
            outcome,
        )
    ).all()

    return [ModelRunRow(*row) for row in rows]


def dataset_counts(
    session: Session, *, mip_era: str | None = None, source_id: str | None = None
) -> dict[str, int]:
    """Count the ingested datasets carrying each source_id, across every version."""
    counts: dict[str, int] = defaultdict(int)
    for era in _eras_in_scope(mip_era):
        dataset_model = dataset_model_for(era)
        statement = (
            select(_column(dataset_model, "source_id"), func.count(dataset_model.id))
            .where(_column(dataset_model, "source_id").isnot(None))
            .group_by(_column(dataset_model, "source_id"))
        )
        if source_id:
            statement = statement.where(_column(dataset_model, "source_id") == source_id)
        for row_source_id, count in session.execute(statement).all():
            counts[row_source_id] += count
    return dict(counts)


def tally(rows: Sequence[ModelRunRow]) -> RunCounts:
    """Fold a set of tallied rows into the counts the API returns."""
    totals = dict.fromkeys(OUTCOMES, 0)
    for row in rows:
        totals[row.outcome] += row.group_count
    return RunCounts(
        total=sum(totals.values()),
        successful=totals["successful"],
        failed=totals["failed"],
        running=totals["running"],
        not_started=totals["not_started"],
    )


def failed_runs(
    session: Session, *, source_id: str, mip_era: str | None = None
) -> list[tuple[Any, int | None, str]]:
    """
    Find the groups this model ran in whose latest execution did not succeed.

    Returns the group, the id of the execution that decided the outcome, and the outcome itself.
    """
    groups = _model_groups(mip_era, source_id)
    if groups is None:
        return []

    subquery = groups.subquery("model_groups")
    latest = _latest_executions()
    execution = aliased(models.Execution)
    outcome = _outcome(execution)

    rows = session.execute(
        select(models.ExecutionGroup, execution.id, outcome.label("outcome"))
        .select_from(subquery)
        .join(models.ExecutionGroup, models.ExecutionGroup.id == subquery.c.group_id)
        .outerjoin(latest, latest.c.group_id == subquery.c.group_id)
        .outerjoin(execution, execution.id == latest.c.execution_id)
        .where(outcome != "successful")
        .distinct()
        .order_by(models.ExecutionGroup.updated_at.desc())
    ).all()

    return [(row[0], row[1], row[2]) for row in rows]
