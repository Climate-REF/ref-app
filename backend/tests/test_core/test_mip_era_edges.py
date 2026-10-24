"""How executions whose group does not draw on exactly one MIP era are labelled."""

from types import SimpleNamespace

import pytest
from sqlalchemy import select

from climate_ref import models
from climate_ref.models.execution import ExecutionGroupSourceType
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.core.mip_eras import CMIP_ERAS, eras_in_scope, mip_eras_for_executions, source_types_for
from ref_backend.core.reader_values import annotate_mip_eras
from ref_backend.models.values import MetricValueCollection, SeriesValue


@pytest.mark.parametrize(
    ("mip_era", "expected"),
    [
        (None, CMIP_ERAS),
        ("CMIP7", (SourceDatasetType.CMIP7,)),
        ("CMIP6", (SourceDatasetType.CMIP6,)),
    ],
)
def test_eras_in_scope(mip_era, expected):
    assert eras_in_scope(mip_era) == expected


def test_no_era_keeps_every_source_type():
    assert source_types_for(None) is None


def _cmip6_execution(session) -> models.Execution:
    return session.scalars(
        select(models.Execution)
        .join(
            ExecutionGroupSourceType,
            ExecutionGroupSourceType.execution_group_id == models.Execution.execution_group_id,
        )
        .where(ExecutionGroupSourceType.source_type == SourceDatasetType.CMIP6)
        .limit(1)
    ).one()


def _mixed_era_execution(session) -> models.Execution:
    execution = _cmip6_execution(session)
    execution.execution_group.source_types.append(
        ExecutionGroupSourceType(source_type=SourceDatasetType.CMIP7)
    )
    session.flush()
    return execution


def _obs_only_execution(session) -> models.Execution:
    execution = _cmip6_execution(session)
    group = execution.execution_group
    group.source_types = [t for t in group.source_types if t.source_type not in CMIP_ERAS]
    session.flush()
    return execution


def _values(*items: SeriesValue) -> MetricValueCollection:
    return MetricValueCollection(
        data=list(items), count=len(items), total_count=len(items), facets=[], types=[]
    )


def _value(execution_id: int, **dimensions: str) -> SeriesValue:
    return SeriesValue(
        id=1, dimensions=dimensions, values=[], execution_group_id=1, execution_id=execution_id
    )


def test_a_group_drawing_on_one_era_labels_its_executions(writable_session):
    execution = _cmip6_execution(writable_session)

    assert mip_eras_for_executions(writable_session, [execution.id]) == {execution.id: "CMIP6"}


def test_a_mixed_era_group_has_no_era(writable_session):
    execution = _mixed_era_execution(writable_session)

    assert mip_eras_for_executions(writable_session, [execution.id]) == {}


def test_a_group_without_cmip_input_has_no_era(writable_session):
    execution = _obs_only_execution(writable_session)

    assert mip_eras_for_executions(writable_session, [execution.id]) == {}


def test_mip_id_labels_an_execution_the_group_does_not_settle(writable_session):
    mixed = _mixed_era_execution(writable_session)
    app_context = SimpleNamespace(session=writable_session)

    collection = annotate_mip_eras(
        app_context,
        _values(_value(mixed.id, mip_id="cmip7"), _value(mixed.id)),
    )

    assert [v.dimensions.get("mip_era") for v in collection.data] == ["CMIP7", None]


def test_the_group_outranks_mip_id_and_a_recorded_era_is_kept(writable_session):
    cmip6 = _cmip6_execution(writable_session)
    app_context = SimpleNamespace(session=writable_session)

    collection = annotate_mip_eras(
        app_context,
        _values(_value(cmip6.id, mip_id="CMIP7"), _value(cmip6.id, mip_era="CMIP7")),
    )

    assert [v.dimensions["mip_era"] for v in collection.data] == ["CMIP6", "CMIP7"]
