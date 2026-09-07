"""Rolling execution groups up per climate model, keyed by `source_id`."""

from collections import Counter, defaultdict
from collections.abc import Sequence
from typing import Any, NamedTuple

from sqlalchemy import CompoundSelect, Select, case, distinct, func, select, union
from sqlalchemy.orm import Session, aliased

from climate_ref import models
from ref_backend.core.mip_eras import CMIP_ERAS, cv_column, dataset_model_for, mip_era_for
from ref_backend.models.climate_models import RunCounts


class ModelRunRow(NamedTuple):
    """One (model, diagnostic, outcome) tally."""

    source_id: str
    diagnostic_id: int
    outcome: str
    group_count: int


class ModelFacets(NamedTuple):
    """What the ingested datasets say about a model, whatever it went on to run."""

    mip_eras: list[str]
    institution_ids: list[str]
    dataset_count: int


def _eras_in_scope(mip_era: str | None) -> tuple[Any, ...]:
    if mip_era is None:
        return CMIP_ERAS
    return tuple(era for era in CMIP_ERAS if mip_era_for(era) == mip_era.upper())


def _model_groups(mip_era: str | None, source_id: str | None) -> CompoundSelect[Any] | Select[Any] | None:
    """
    Select every (execution group, model) pairing at the promoted version of each diagnostic.

    A group that ran several models appears once per model, so the counts answer
    "what did this model take part in" rather than partitioning the groups.
    Only `source_id` is carried, so a group naming one model across two eras or two
    institutions still yields one row and is counted once.
    """
    statements = []
    for era in _eras_in_scope(mip_era):
        dataset_model = dataset_model_for(era)
        model_source_id = cv_column(dataset_model, "source_id")
        statement = (
            select(
                models.ExecutionGroup.id.label("group_id"),
                models.ExecutionGroup.diagnostic_id.label("diagnostic_id"),
                model_source_id.label("source_id"),
            )
            .join(models.Diagnostic, models.ExecutionGroup.diagnostic_id == models.Diagnostic.id)
            .join(models.ExecutionGroup.executions)
            .join(models.Execution.datasets.of_type(dataset_model))
            .where(
                models.ExecutionGroup.diagnostic_version == models.Diagnostic.promoted_version,
                model_source_id.isnot(None),
            )
            .distinct()
        )
        if source_id:
            statement = statement.where(model_source_id == source_id)
        statements.append(statement)

    return union(*statements) if statements else None


def latest_executions() -> Any:
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
        (execution.successful.is_(True), "successful"),
        (execution.successful.is_(False), "failed"),
        else_="running",
    )


def model_run_rows(
    session: Session, *, mip_era: str | None = None, source_id: str | None = None
) -> list[ModelRunRow]:
    """Tally execution groups per model, diagnostic and outcome."""
    groups = _model_groups(mip_era, source_id)
    if groups is None:
        return []

    subquery = groups.subquery("model_groups")
    latest = latest_executions()
    execution = aliased(models.Execution)
    outcome = _outcome(execution)

    rows = session.execute(
        select(
            subquery.c.source_id,
            subquery.c.diagnostic_id,
            outcome.label("outcome"),
            func.count(distinct(subquery.c.group_id)).label("group_count"),
        )
        .join(latest, latest.c.group_id == subquery.c.group_id)
        .join(execution, execution.id == latest.c.execution_id)
        .group_by(subquery.c.source_id, subquery.c.diagnostic_id, outcome)
    ).all()

    return [ModelRunRow(*row) for row in rows]


def model_facets(
    session: Session, *, mip_era: str | None = None, source_id: str | None = None
) -> dict[str, ModelFacets]:
    """Describe each model from its ingested datasets, counting every version."""
    eras: dict[str, set[str]] = defaultdict(set)
    institutions: dict[str, set[str]] = defaultdict(set)
    counts: dict[str, int] = defaultdict(int)

    for era in _eras_in_scope(mip_era):
        dataset_model = dataset_model_for(era)
        model_source_id = cv_column(dataset_model, "source_id")
        institution_id = cv_column(dataset_model, "institution_id")
        statement = (
            select(model_source_id, institution_id, func.count(dataset_model.id))
            .where(model_source_id.isnot(None))
            .group_by(model_source_id, institution_id)
        )
        if source_id:
            statement = statement.where(model_source_id == source_id)

        era_label = mip_era_for(era)
        for row_source_id, row_institution_id, count in session.execute(statement).all():
            if era_label:
                eras[row_source_id].add(era_label)
            if row_institution_id:
                institutions[row_source_id].add(row_institution_id)
            counts[row_source_id] += count

    return {
        model: ModelFacets(
            mip_eras=sorted(eras[model]),
            institution_ids=sorted(institutions[model]),
            dataset_count=counts[model],
        )
        for model in counts
    }


def tally(rows: Sequence[ModelRunRow]) -> RunCounts:
    """Fold a set of tallied rows into the counts the API returns."""
    totals: Counter[str] = Counter()
    for row in rows:
        totals[row.outcome] += row.group_count
    return RunCounts(
        total=sum(totals.values()),
        successful=totals["successful"],
        failed=totals["failed"],
        running=totals["running"],
    )


def failed_runs(
    session: Session, *, source_id: str, mip_era: str | None = None
) -> list[tuple[models.ExecutionGroup, int, str]]:
    """
    Find the groups this model ran in whose latest execution did not succeed.

    Returns the group, the id of the execution that decided the outcome, and the outcome itself.
    """
    groups = _model_groups(mip_era, source_id)
    if groups is None:
        return []

    subquery = groups.subquery("model_groups")
    latest = latest_executions()
    execution = aliased(models.Execution)
    outcome = _outcome(execution)

    rows = session.execute(
        select(models.ExecutionGroup, execution.id, outcome.label("outcome"))
        .select_from(subquery)
        .join(models.ExecutionGroup, models.ExecutionGroup.id == subquery.c.group_id)
        .join(latest, latest.c.group_id == subquery.c.group_id)
        .join(execution, execution.id == latest.c.execution_id)
        .where(outcome != "successful")
        .distinct()
        .order_by(models.ExecutionGroup.updated_at.desc())
    ).all()

    return [(row[0], row[1], row[2]) for row in rows]
