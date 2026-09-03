"""Helpers for telling the CMIP6 and CMIP7 eras apart."""

from collections.abc import Collection, Mapping
from typing import Any

from sqlalchemy import ColumnElement, and_, distinct, false, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import ColumnCollection

from climate_ref import models
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.core.filter_utils import build_filter_clause

#: The MIP eras the app presents. Data from the two is never combined on a chart.
CMIP_ERAS: tuple[SourceDatasetType, ...] = (SourceDatasetType.CMIP6, SourceDatasetType.CMIP7)


def dataset_model_for(source_type: SourceDatasetType) -> type[models.Dataset]:
    """Resolve the mapped class backing a source type."""
    return models.Dataset.__mapper__.polymorphic_map[source_type].class_


def dataset_type_label(source_type: SourceDatasetType) -> str:
    """
    Render a source type as the short name the API exposes, such as `cmip7`.

    `SourceDatasetType` is a plain enum, so `str()` on it yields `SourceDatasetType.CMIP7`.
    """
    return str(source_type.value)


def mip_era_for(source_type: SourceDatasetType) -> str | None:
    """Map a source dataset type onto the MIP era label used to keep the eras apart."""
    if source_type not in CMIP_ERAS:
        return None
    return dataset_type_label(source_type).upper()


def _mapped_columns(source_type: SourceDatasetType) -> ColumnCollection[str, Any]:
    """Return the columns an era's dataset table actually carries."""
    return dataset_model_for(source_type).__mapper__.columns


def cmip_dataset_filter(facets: Mapping[str, str]) -> ColumnElement[bool]:
    """
    Match executions holding a CMIP6 or CMIP7 dataset that satisfies every facet in `facets`.

    A facet no CMIP era carries is ignored, which keeps unknown query parameters harmless.
    A facet only one era carries excludes the other, so a CMIP7-only facet does not pull in
    all of CMIP6.
    """
    requested_era = facets.get("mip_era")
    columns_by_era = {era: _mapped_columns(era) for era in CMIP_ERAS}
    known = {
        key: value
        for key, value in facets.items()
        if key != "mip_era" and any(key in columns for columns in columns_by_era.values())
    }

    branches = []
    for source_type in CMIP_ERAS:
        if requested_era and requested_era.upper() != mip_era_for(source_type):
            continue

        dataset_model = dataset_model_for(source_type)
        if any(key not in columns_by_era[source_type] for key in known):
            continue

        conditions = [build_filter_clause(getattr(dataset_model, key), value) for key, value in known.items()]
        datasets = models.Execution.datasets.of_type(dataset_model)
        branches.append(datasets.any(and_(*conditions)) if conditions else datasets.any())

    if not branches:
        # Nothing can satisfy the request, so match no rows rather than every row.
        return false()
    return or_(*branches)


def execution_group_filter(facets: Mapping[str, str]) -> ColumnElement[bool]:
    """Match execution groups holding an execution that satisfies `cmip_dataset_filter`."""
    return models.ExecutionGroup.executions.any(cmip_dataset_filter(facets))


def execution_groups_per_era(session: Session) -> dict[str, int]:
    """
    Count the execution groups that ran against each MIP era, keyed by era label.

    A group holding both eras counts once for each, so the counts do not partition the total.
    """
    rows = session.execute(
        select(models.Dataset.dataset_type, func.count(distinct(models.ExecutionGroup.id)))
        .join(models.ExecutionGroup.executions)
        .join(models.Execution.datasets)
        .where(models.Dataset.dataset_type.in_(CMIP_ERAS))
        .group_by(models.Dataset.dataset_type)
    ).all()

    counts = {mip_era_for(source_type): count for source_type, count in rows}
    return {label: counts.get(label, 0) for era in CMIP_ERAS if (label := mip_era_for(era))}


def executions_in_mip_era(session: Session, mip_era: str, diagnostic_id: int) -> list[int]:
    """
    Find the executions of a diagnostic that ran against `mip_era`, plus any with no era at all.

    An execution with no CMIP input carries no era, so dropping it would lose values rather than
    label them. Scoping the values query this way is what keeps outlier detection and pagination
    inside a single era.
    """
    no_cmip_input = ~cmip_dataset_filter({})
    rows = session.execute(
        select(models.Execution.id)
        .join(models.Execution.execution_group)
        .where(
            models.ExecutionGroup.diagnostic_id == diagnostic_id,
            or_(cmip_dataset_filter({"mip_era": mip_era}), no_cmip_input),
        )
    ).scalars()
    return list(rows)


def mip_eras_for_executions(session: Session, execution_ids: Collection[int]) -> dict[int, str]:
    """
    Map each execution onto the MIP era of the model datasets it ran against.

    Most diagnostics never record an era on their own values, so this recovers it from the inputs.
    An execution mixing eras is left out, because no single era describes it.
    """
    if not execution_ids:
        return {}

    rows = session.execute(
        select(models.Execution.id, models.Dataset.dataset_type)
        .join(models.Execution.datasets)
        .where(
            models.Execution.id.in_(execution_ids),
            models.Dataset.dataset_type.in_(CMIP_ERAS),
        )
        .distinct()
    ).all()

    eras: dict[int, str | None] = {}
    for execution_id, dataset_type in rows:
        era = mip_era_for(dataset_type)
        eras[execution_id] = era if execution_id not in eras else None

    return {execution_id: era for execution_id, era in eras.items() if era is not None}
