"""Helpers for telling the CMIP6 and CMIP7 eras apart."""

from collections.abc import Collection
from typing import Any, Literal

from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import Session

from climate_ref import models
from climate_ref.models.execution import ExecutionGroupSourceType
from climate_ref.query.filters import ExecutionScope
from climate_ref.results import InputDatasetFilter
from climate_ref_core.datasets import SourceDatasetType

MipEra = Literal["CMIP6", "CMIP7"]

#: The MIP eras the app presents. Data from the two is never combined on a chart.
_ERA_TYPES: dict[MipEra, SourceDatasetType] = {
    "CMIP6": SourceDatasetType.CMIP6,
    "CMIP7": SourceDatasetType.CMIP7,
}
_TYPE_ERAS: dict[SourceDatasetType, MipEra] = {source_type: era for era, source_type in _ERA_TYPES.items()}
CMIP_ERAS: tuple[SourceDatasetType, ...] = tuple(_ERA_TYPES.values())


def dataset_model_for(source_type: SourceDatasetType) -> type[models.Dataset]:
    """Resolve the mapped class backing a source type."""
    return models.Dataset.__mapper__.polymorphic_map[source_type].class_


def dataset_type_label(source_type: SourceDatasetType) -> str:
    """
    Render a source type as the short name the API exposes, such as `cmip7`.

    `SourceDatasetType` is a plain enum, so `str()` on it yields `SourceDatasetType.CMIP7`.
    """
    return str(source_type.value)


def mip_era_for(source_type: SourceDatasetType) -> MipEra | None:
    """Map a source dataset type onto the MIP era label used to keep the eras apart."""
    return _TYPE_ERAS.get(source_type)


def source_types_for(mip_era: MipEra | None) -> tuple[SourceDatasetType, ...] | None:
    """Resolve a `mip_era` query value into the source types it keeps, or `None` to keep every group."""
    return None if mip_era is None else (_ERA_TYPES[mip_era],)


def eras_in_scope(mip_era: MipEra | None) -> tuple[SourceDatasetType, ...]:
    """Resolve a `mip_era` query value into the CMIP eras it keeps."""
    return source_types_for(mip_era) or CMIP_ERAS


def era_group_clauses(mip_era: MipEra) -> list[ColumnElement[bool]]:
    """Clauses over `ExecutionGroup` keeping the groups that draw on `mip_era`, or on no model data."""
    return ExecutionScope(source_types=source_types_for(mip_era), or_no_model_input=True).group_clauses()


def source_id_datasets(source_id: str | None) -> InputDatasetFilter | None:
    """Match executions that ran against a model, which selectors do not always record."""
    return InputDatasetFilter(facets={"source_id": source_id}) if source_id else None


def cv_column(mapped: Any, name: str) -> Any:
    """Read a column the CV registers at runtime, which the mapped class does not declare."""
    return getattr(mapped, name)


def mip_eras_for_executions(session: Session, execution_ids: Collection[int]) -> dict[int, MipEra]:
    """
    Map each execution onto the MIP era its group draws on.

    Most diagnostics never record an era on their own values, so this recovers it from the group.
    A group drawing on both eras is left out, because no single era describes it.
    """
    if not execution_ids:
        return {}

    rows = session.execute(
        select(models.Execution.id, ExecutionGroupSourceType.source_type)
        .join(
            ExecutionGroupSourceType,
            ExecutionGroupSourceType.execution_group_id == models.Execution.execution_group_id,
        )
        .where(
            models.Execution.id.in_(execution_ids),
            ExecutionGroupSourceType.source_type.in_(CMIP_ERAS),
        )
    ).all()

    eras: dict[int, MipEra | None] = {}
    for execution_id, source_type in rows:
        era = mip_era_for(source_type)
        eras[execution_id] = era if execution_id not in eras else None

    return {execution_id: era for execution_id, era in eras.items() if era is not None}
