"""Helpers for telling the CMIP6 and CMIP7 eras apart."""

from collections.abc import Collection, Mapping
from typing import Any

from sqlalchemy import ColumnElement, and_, false, or_, select, true
from sqlalchemy.orm import Session

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset, CMIP7Dataset
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.core.filter_utils import build_filter_clause

#: The model eras the app presents. Data from the two is never combined on a chart.
CMIP_ERAS: dict[SourceDatasetType, Any] = {
    SourceDatasetType.CMIP6: CMIP6Dataset,
    SourceDatasetType.CMIP7: CMIP7Dataset,
}


def mip_era_for(source_type: SourceDatasetType) -> str | None:
    """Map a source dataset type onto the MIP era label used to keep the eras apart."""
    if source_type not in CMIP_ERAS:
        return None
    return str(source_type.value).upper()


def _facet_column(dataset_model: Any, key: str) -> Any:
    """Return the mapped column for a facet, or None when the era does not carry it."""
    column = getattr(dataset_model, key, None)
    return column if column is not None and hasattr(column, "type") else None


def cmip_dataset_filter(facets: Mapping[str, str]) -> ColumnElement[bool]:
    """
    Match executions holding a CMIP6 or CMIP7 dataset that satisfies every facet in `facets`.

    A facet no CMIP era carries is ignored, which keeps unknown query parameters harmless.
    A facet only one era carries excludes the other, so a CMIP7-only facet does not pull in
    all of CMIP6.
    """
    requested_era = facets.get("mip_era")
    known = {
        key: value
        for key, value in facets.items()
        if key != "mip_era" and any(_facet_column(model, key) is not None for model in CMIP_ERAS.values())
    }
    branches = []

    for source_type, dataset_model in CMIP_ERAS.items():
        if requested_era and requested_era.upper() != mip_era_for(source_type):
            continue

        columns = {key: _facet_column(dataset_model, key) for key in known}
        if any(column is None for column in columns.values()):
            continue

        conditions = [build_filter_clause(columns[key], value) for key, value in known.items()]
        # `and_()` with no arguments is deprecated, so seed it for the unfiltered case.
        branches.append(models.Execution.datasets.of_type(dataset_model).any(and_(true(), *conditions)))

    if not branches:
        # Nothing can satisfy the request, so match no rows rather than every row.
        return false()
    return or_(*branches)


def eras_for_executions(session: Session, execution_ids: Collection[int]) -> dict[int, str]:
    """
    Map each execution onto the MIP era of the model datasets it ran against.

    Most diagnostics never record an era on their own values, so this recovers it from the inputs.
    An execution mixing eras is left out, because no single era describes it.
    """
    if not execution_ids:
        return {}

    eras: dict[int, str | None] = {}
    for source_type, dataset_model in CMIP_ERAS.items():
        era = mip_era_for(source_type)
        rows = session.execute(
            select(models.Execution.id)
            .join(models.Execution.datasets.of_type(dataset_model))
            .where(models.Execution.id.in_(execution_ids))
            .distinct()
        ).scalars()
        for execution_id in rows:
            eras[execution_id] = era if execution_id not in eras else None

    return {execution_id: era for execution_id, era in eras.items() if era is not None}
