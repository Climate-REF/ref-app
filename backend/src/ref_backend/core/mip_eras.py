"""Helpers for telling the CMIP6 and CMIP7 eras apart."""

from collections.abc import Collection, Mapping
from typing import Any

from sqlalchemy import ColumnElement, false, or_, select
from sqlalchemy.orm import Session

from climate_ref import models
from climate_ref.results import InputDatasetFilter, Reader
from climate_ref_core.datasets import SourceDatasetType

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


def eras_in_scope(mip_era: str | None) -> tuple[SourceDatasetType, ...]:
    """
    Resolve a `mip_era` query value, in any case, into the eras it selects.

    No value selects every era and an unknown era selects none.
    """
    if not mip_era:
        return CMIP_ERAS
    return tuple(era for era in CMIP_ERAS if dataset_type_label(era) == mip_era.lower())


def cv_column(mapped: Any, name: str) -> Any:
    """Read a column the CV registers at runtime, which the mapped class does not declare."""
    return getattr(mapped, name)


def _carries(source_type: SourceDatasetType, facet: str) -> bool:
    return facet in dataset_model_for(source_type).__mapper__.columns


def _facet_values(value: str) -> tuple[str, ...]:
    if "," not in value:
        return (value,)
    return tuple(item.strip() for item in value.split(",") if item.strip())


def cmip_input_filter(facets: Mapping[str, str]) -> InputDatasetFilter | None:
    """
    Match executions holding a CMIP6 or CMIP7 dataset that satisfies every facet in `facets`.

    A facet no CMIP era carries is ignored, which keeps unknown query parameters harmless.
    A facet only one era carries excludes the other, so a CMIP7-only facet does not pull in
    all of CMIP6. Returns `None` when nothing can satisfy the request.
    """
    eras = eras_in_scope(facets.get("mip_era"))
    known = {
        key: _facet_values(value)
        for key, value in facets.items()
        if key != "mip_era" and any(_carries(era, key) for era in CMIP_ERAS)
    }
    if not eras or any(not any(_carries(era, key) for era in eras) for key in known):
        return None
    return _input_filter(eras, known or None)


def _input_filter(
    eras: tuple[SourceDatasetType, ...], facets: Mapping[str, tuple[str, ...]] | None = None
) -> InputDatasetFilter:
    # The attrs converter leaves mypy with an unbound Iterable[_T_co] for source_types.
    return InputDatasetFilter(source_types=eras, facets=facets)  # type: ignore[arg-type]


def cmip_dataset_filter(facets: Mapping[str, str]) -> ColumnElement[bool]:
    """Match executions as `cmip_input_filter` does, or no execution when nothing can match."""
    input_filter = cmip_input_filter(facets)
    return input_filter.execution_clause() if input_filter else false()


def execution_group_filter(facets: Mapping[str, str]) -> ColumnElement[bool]:
    """Match execution groups holding an execution that satisfies `cmip_dataset_filter`."""
    input_filter = cmip_input_filter(facets)
    return input_filter.execution_group_clause() if input_filter else false()


def execution_groups_per_era(reader: Reader) -> dict[str, int]:
    """
    Count the execution groups that ran against each MIP era, keyed by era label.

    A group holding both eras counts once for each, so the counts do not partition the total.
    Groups are counted at the promoted version of each diagnostic, matching the overall statistics.
    """
    counts = {}
    for era in CMIP_ERAS:
        if label := mip_era_for(era):
            stats = reader.executions.statistics(input_datasets=_input_filter((era,)))
            counts[label] = sum(s.total for s in stats)
    return counts


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
