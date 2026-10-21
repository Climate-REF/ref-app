"""How executions that do not sit in exactly one MIP era are scoped and labelled."""

from types import SimpleNamespace

import pytest
from sqlalchemy import select

from climate_ref import models
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.core.mip_eras import (
    CMIP_ERAS,
    cmip_dataset_filter,
    dataset_model_for,
    eras_in_scope,
    executions_in_mip_era,
    mip_eras_for_executions,
)
from ref_backend.core.reader_values import annotate_mip_eras
from ref_backend.models.values import MetricValueCollection, SeriesValue


@pytest.mark.parametrize(
    ("mip_era", "expected"),
    [
        (None, CMIP_ERAS),
        ("", CMIP_ERAS),
        ("CMIP7", (SourceDatasetType.CMIP7,)),
        ("cmip7", (SourceDatasetType.CMIP7,)),
        ("CmIp6", (SourceDatasetType.CMIP6,)),
        ("CMIP5", ()),
        ("obs4MIPs", ()),
    ],
)
def test_eras_in_scope(mip_era, expected):
    assert eras_in_scope(mip_era) == expected


def _cmip6_execution(session) -> models.Execution:
    cmip6 = dataset_model_for(SourceDatasetType.CMIP6)
    return session.scalars(
        select(models.Execution).join(models.Execution.datasets.of_type(cmip6)).limit(1)
    ).one()


def _cmip7_dataset(session) -> models.Dataset:
    dataset = dataset_model_for(SourceDatasetType.CMIP7)(
        slug="CMIP7.probe.v1",
        activity_id="CMIP",
        institution_id="probe",
        source_id="PROBE-ESM",
        experiment_id="historical",
        variant_label="r1i1p1f1",
        variable_id="tas",
        grid_label="gn",
        frequency="mon",
        region="glb",
        branding_suffix="tavg-h2m-hxy-u",
        version="v1",
        mip_era="CMIP7",
        instance_id="CMIP7.probe.v1",
        version_key="v1",
    )
    session.add(dataset)
    return dataset


def _obs_only_execution(session) -> models.Execution:
    template = _cmip6_execution(session)
    obs = session.scalars(
        select(models.Dataset).where(models.Dataset.dataset_type == SourceDatasetType.obs4MIPs).limit(1)
    ).one()
    execution = models.Execution(
        execution_group_id=template.execution_group_id,
        dataset_hash="obs-only",
        output_fragment="obs-only",
        successful=True,
    )
    execution.datasets.append(obs)
    session.add(execution)
    session.flush()
    return execution


def _matches(session, execution_id: int, mip_era: str) -> bool:
    return (
        execution_id
        in session.scalars(select(models.Execution.id).where(cmip_dataset_filter({"mip_era": mip_era}))).all()
    )


def _values(*items: SeriesValue) -> MetricValueCollection:
    return MetricValueCollection(
        data=list(items), count=len(items), total_count=len(items), facets=[], types=[]
    )


def _value(execution_id: int, **dimensions: str) -> SeriesValue:
    return SeriesValue(
        id=1, dimensions=dimensions, values=[], execution_group_id=1, execution_id=execution_id
    )


def test_a_mixed_era_execution_has_no_era_but_passes_both_filters(writable_session):
    execution = _cmip6_execution(writable_session)
    execution.datasets.append(_cmip7_dataset(writable_session))
    writable_session.flush()
    diagnostic_id = execution.execution_group.diagnostic_id

    assert mip_eras_for_executions(writable_session, [execution.id]) == {}
    for era in ("CMIP6", "CMIP7"):
        assert _matches(writable_session, execution.id, era)
        assert execution.id in executions_in_mip_era(writable_session, era, diagnostic_id)


def test_an_execution_without_cmip_input_answers_to_every_era(writable_session):
    execution = _obs_only_execution(writable_session)
    diagnostic_id = execution.execution_group.diagnostic_id

    assert mip_eras_for_executions(writable_session, [execution.id]) == {}
    for era in ("CMIP6", "cmip7"):
        assert not _matches(writable_session, execution.id, era)
        assert execution.id in executions_in_mip_era(writable_session, era, diagnostic_id)


def test_an_unknown_era_still_keeps_executions_without_cmip_input(writable_session):
    """Pins current behaviour: the no-CMIP half of the rule ignores whether the era exists."""
    execution = _obs_only_execution(writable_session)
    diagnostic_id = execution.execution_group.diagnostic_id

    assert executions_in_mip_era(writable_session, "CMIP5", diagnostic_id) == [execution.id]


def test_mip_id_labels_an_execution_the_inputs_do_not_settle(writable_session):
    mixed = _cmip6_execution(writable_session)
    mixed.datasets.append(_cmip7_dataset(writable_session))
    obs_only = _obs_only_execution(writable_session)
    app_context = SimpleNamespace(session=writable_session)

    collection = annotate_mip_eras(
        app_context,
        _values(
            _value(mixed.id, mip_id="cmip7"),
            _value(obs_only.id, mip_id="CMIP6"),
            _value(mixed.id),
        ),
    )

    assert [v.dimensions.get("mip_era") for v in collection.data] == ["CMIP7", "CMIP6", None]


def test_the_inputs_outrank_mip_id_and_a_recorded_era_is_kept(writable_session):
    cmip6 = _cmip6_execution(writable_session)
    app_context = SimpleNamespace(session=writable_session)

    collection = annotate_mip_eras(
        app_context,
        _values(_value(cmip6.id, mip_id="CMIP7"), _value(cmip6.id, mip_era="CMIP7")),
    )

    assert [v.dimensions["mip_era"] for v in collection.data] == ["CMIP6", "CMIP7"]
