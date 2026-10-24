"""Rolling execution groups up per climate model, keyed by `source_id`."""

from collections import Counter, defaultdict
from collections.abc import Sequence
from typing import Any, NamedTuple

from sqlalchemy import Select, Subquery, case, distinct, func, select, union
from sqlalchemy.orm import Session

from climate_ref import models
from climate_ref.models.execution import execution_datasets
from climate_ref.query import select_execution_group_ids, select_execution_groups
from climate_ref.results import ExecutionGroupFilter
from ref_backend.core.mip_eras import (
    MipEra,
    cv_column,
    dataset_model_for,
    era_scope,
    eras_in_scope,
    mip_era_for,
    source_id_datasets,
)
from ref_backend.models.model_runs import RunCounts


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


def _model_filter(mip_era: MipEra | None, **kwargs: Any) -> ExecutionGroupFilter:
    return ExecutionGroupFilter(**era_scope(mip_era), **kwargs)


def _outcome(execution: Any) -> Any:
    return case(
        (execution.successful.is_(True), "successful"),
        (execution.successful.is_(False), "failed"),
        else_="running",
    )


def _model_datasets(mip_era: MipEra | None, source_id: str | None) -> Subquery:
    """Select the id and `source_id` of every model dataset in scope, across the eras' dataset tables."""
    statements = []
    for era in eras_in_scope(mip_era):
        dataset_model = dataset_model_for(era)
        model_source_id = cv_column(dataset_model, "source_id")
        statement = select(dataset_model.id.label("dataset_id"), model_source_id.label("source_id")).where(
            model_source_id.isnot(None)
        )
        if source_id:
            statement = statement.where(model_source_id == source_id)
        statements.append(statement)
    return (union(*statements) if len(statements) > 1 else statements[0]).subquery("model_datasets")


def _model_groups(mip_era: MipEra | None, source_id: str | None) -> Select[Any]:
    """
    Select every (execution group, model) pairing the group filter keeps, with the group's outcome.

    A group that ran several models appears once per model, so the counts answer
    "what did this model take part in" rather than partitioning the groups.

    Participation is read from the execution that decides the group, the same one the outcome
    comes from. A retry run against different datasets would otherwise report the latest outcome
    for a model that took no part in it.
    A group whose deciding execution is retracted is left out, rather than falling back to an older run.
    Only `source_id` is carried alongside, so a group naming one model across two eras or two
    institutions still yields one row and is counted once.
    """
    # Joined once, because a select per era would look up every group's latest execution again.
    datasets = _model_datasets(mip_era, source_id)
    return (
        select_execution_group_ids(_model_filter(mip_era))
        .with_only_columns(
            models.ExecutionGroup.id.label("group_id"),
            models.ExecutionGroup.diagnostic_id.label("diagnostic_id"),
            datasets.c.source_id,
            models.Execution.id.label("execution_id"),
            _outcome(models.Execution).label("outcome"),
        )
        .join(execution_datasets, execution_datasets.c.execution_id == models.Execution.id)
        .join(datasets, datasets.c.dataset_id == execution_datasets.c.dataset_id)
        .distinct()
    )


def model_run_rows(
    session: Session, *, mip_era: MipEra | None = None, source_id: str | None = None
) -> list[ModelRunRow]:
    """Tally execution groups per model, diagnostic and outcome."""
    subquery = _model_groups(mip_era, source_id).subquery("model_groups")
    rows = session.execute(
        select(
            subquery.c.source_id,
            subquery.c.diagnostic_id,
            subquery.c.outcome,
            func.count(distinct(subquery.c.group_id)).label("group_count"),
        ).group_by(subquery.c.source_id, subquery.c.diagnostic_id, subquery.c.outcome)
    ).all()

    return [ModelRunRow(*row) for row in rows]


def model_facets(
    session: Session, *, mip_era: MipEra | None = None, source_id: str | None = None
) -> dict[str, ModelFacets]:
    """Describe each model from its ingested datasets, counting every version."""
    eras: dict[str, set[str]] = defaultdict(set)
    institutions: dict[str, set[str]] = defaultdict(set)
    counts: dict[str, int] = defaultdict(int)

    for era in eras_in_scope(mip_era):
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
    session: Session, *, source_id: str, mip_era: MipEra | None = None
) -> list[tuple[models.ExecutionGroup, int, str]]:
    """
    Find the groups this model ran in whose latest execution did not succeed.

    Returns the group, the id of the execution that decided the outcome, and the outcome itself.
    """
    filters = _model_filter(mip_era, successful=False, input_datasets=source_id_datasets(source_id))
    statement: Select[Any] = (
        select_execution_groups(filters).order_by(None).order_by(models.ExecutionGroup.updated_at.desc())
    )
    rows = session.execute(statement).tuples().all()

    return [
        (group, execution.id, "failed" if execution.successful is False else "running")
        for group, execution in rows
        if execution
    ]
