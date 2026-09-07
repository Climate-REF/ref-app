import pytest
from sqlalchemy import distinct, func, select

from climate_ref import models
from climate_ref.database import Database
from ref_backend.core.mip_eras import CMIP_ERAS, cv_column, dataset_model_for
from ref_backend.core.model_runs import _model_groups, failed_runs, model_run_rows, tally
from ref_backend.testing import test_ref_config as fixture_ref_config


@pytest.fixture(scope="module")
def session():
    with Database.from_config(fixture_ref_config()).session_scope() as session:
        yield session


def group_ids(session, source_id: str) -> set[int]:
    """
    Find the promoted groups a model ran in, without going through the tally.

    Written a second way on purpose, so a grouping key leaking into the tally shows up here.
    """
    found: set[int] = set()
    for era in CMIP_ERAS:
        dataset_model = dataset_model_for(era)
        found.update(
            session.scalars(
                select(distinct(models.ExecutionGroup.id))
                .join(models.Diagnostic, models.ExecutionGroup.diagnostic_id == models.Diagnostic.id)
                .join(models.ExecutionGroup.executions)
                .join(models.Execution.datasets.of_type(dataset_model))
                .where(
                    models.ExecutionGroup.diagnostic_version == models.Diagnostic.promoted_version,
                    cv_column(dataset_model, "source_id") == source_id,
                )
            )
        )
    return found


def every_source_id(session) -> list[str]:
    source_ids: set[str] = set()
    for era in CMIP_ERAS:
        column = cv_column(dataset_model_for(era), "source_id")
        source_ids.update(s for s in session.scalars(select(distinct(column))) if s)
    return sorted(source_ids)


def test_tally_counts_each_group_once(session):
    """A group must count once per model, however many dataset rows tie it to that model."""
    for source_id in every_source_id(session):
        rows = model_run_rows(session, source_id=source_id)
        if not rows:
            continue
        assert tally(rows).total == len(group_ids(session, source_id))


def test_tally_matches_the_unscoped_listing(session):
    """Asking for one model must agree with picking that model out of the full listing."""
    all_rows = model_run_rows(session)
    for source_id in {row.source_id for row in all_rows}:
        from_listing = tally([row for row in all_rows if row.source_id == source_id])
        assert from_listing == tally(model_run_rows(session, source_id=source_id))


def test_failures_match_the_unsuccessful_counts(session):
    """The failure list and the counts are two views of the same rows, so they cannot disagree."""
    for source_id in {row.source_id for row in model_run_rows(session)}:
        counts = tally(model_run_rows(session, source_id=source_id))
        failures = failed_runs(session, source_id=source_id)
        assert len(failures) == counts.failed + counts.running


def test_only_executed_groups_are_counted(session):
    """A group with no execution names no model, so it is absent rather than counted."""
    never_run = session.scalar(
        select(func.count()).select_from(
            select(models.ExecutionGroup.id).where(~models.ExecutionGroup.executions.any()).subquery()
        )
    )
    assert never_run, "the fixture should hold groups that never ran, or this proves nothing"

    reachable: set[int] = set()
    for source_id in {row.source_id for row in model_run_rows(session)}:
        reachable.update(group_ids(session, source_id))
    executed = session.scalar(select(func.count(distinct(models.Execution.execution_group_id))))
    assert len(reachable) == executed


def test_model_groups_carries_only_the_keys_it_counts_on():
    """
    The pairing query must carry nothing beyond the group, its diagnostic and the model.

    Any extra column lands in the tally's GROUP BY, so a model described two ways, such as one
    holding two institutions or spanning both eras, would have its groups counted twice. The
    fixture has neither case, so the guarantee is pinned here rather than through the data.
    """
    statement = _model_groups(None, None)
    assert statement is not None
    assert list(statement.subquery().c.keys()) == ["group_id", "diagnostic_id", "source_id"]
