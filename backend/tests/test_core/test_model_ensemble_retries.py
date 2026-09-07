"""What a retried execution does to a model's place in the ensemble."""

import copy
import shutil

import pytest
from sqlalchemy import func, select

from climate_ref import models
from climate_ref.database import Database
from ref_backend.core.mip_eras import cv_column
from ref_backend.core.model_ensemble import ensemble_comparisons
from ref_backend.testing import test_ref_config as fixture_ref_config

MODEL = "ACCESS-ESM1-5"


@pytest.fixture
def writable_session(tmp_path):
    """A throwaway copy of the fixture database, so a test may insert into it."""
    config = copy.deepcopy(fixture_ref_config())
    source = str(config.db.database_url).removeprefix("sqlite:///")
    destination = tmp_path / "climate_ref.db"
    shutil.copy(source, destination)
    config.db.database_url = f"sqlite:///{destination}"

    with Database.from_config(config).session_scope() as session:
        yield session


def _comparisons_for(session, diagnostic_id: int):
    """The model's comparisons for one diagnostic, keyed by the metric they describe."""
    return {
        tuple(sorted(c.dimensions.items())): c
        for c in ensemble_comparisons(session, source_id=MODEL)
        if c.diagnostic_id == diagnostic_id
    }


def test_a_retry_does_not_add_a_second_member(writable_session):
    """
    Re-running a group must replace the model's value, not add a second one alongside it.

    The superseded execution keeps its values, so a comparison that ignored which execution
    decided the group would average the old run into the new one.
    """
    values = writable_session.scalars(
        select(models.ScalarMetricValue).where(cv_column(models.ScalarMetricValue, "source_id") == MODEL)
    ).all()

    # Retry whichever group actually feeds a comparison, or the assertions watch the wrong rows.
    for candidate in values:
        superseded = writable_session.get(models.Execution, candidate.execution_id)
        diagnostic_id = superseded.execution_group.diagnostic_id
        before = _comparisons_for(writable_session, diagnostic_id)
        if before:
            break
    else:
        pytest.skip("No metric of this model is reported by enough others in the fixture")

    # A retry of the same group, carrying a copy of every value the first attempt recorded.
    retry = models.Execution(
        execution_group_id=superseded.execution_group_id,
        dataset_hash=superseded.dataset_hash,
        output_fragment=superseded.output_fragment,
        successful=True,
        retracted=False,
    )
    writable_session.add(retry)
    writable_session.flush()

    # `dimensions` is assembled from the CV columns, so each one is copied across by name.
    dimension_names = [
        name for name in models.ScalarMetricValue._cv_dimensions if hasattr(models.ScalarMetricValue, name)
    ]
    # A retry re-records every value the group produced, for every model in it.
    replayed = writable_session.scalars(
        select(models.ScalarMetricValue).where(models.ScalarMetricValue.execution_id == superseded.id)
    ).all()
    for value in replayed:
        writable_session.add(
            models.ScalarMetricValue(
                execution_id=retry.id,
                value=value.value,
                attributes=value.attributes,
                **{name: getattr(value, name) for name in dimension_names},
            )
        )
    writable_session.flush()

    after = _comparisons_for(writable_session, diagnostic_id)
    assert set(after) == set(before)
    for key, comparison in after.items():
        assert comparison.model_member_count == before[key].model_member_count
        assert comparison.model_value == pytest.approx(before[key].model_value)
        assert comparison.ensemble.count == before[key].ensemble.count


def test_writes_do_not_reach_the_checked_in_fixture(writable_session):
    """A write to the copy must leave the fixture in the repository alone."""
    original = Database.from_config(fixture_ref_config()).session
    before = original.scalar(select(func.count(models.Execution.id)))

    group = writable_session.scalars(select(models.ExecutionGroup).limit(1)).one()
    writable_session.add(
        models.Execution(execution_group_id=group.id, dataset_hash="probe", output_fragment="probe")
    )
    writable_session.commit()

    assert writable_session.scalar(select(func.count(models.Execution.id))) == before + 1
    original.expire_all()
    assert original.scalar(select(func.count(models.Execution.id))) == before
