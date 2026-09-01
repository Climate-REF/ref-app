"""Helpers for serving CMIP6 and CMIP7 side by side."""

from collections.abc import Mapping
from typing import Any

from sqlalchemy import ColumnElement, and_, false, or_, true

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset, CMIP7Dataset
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.core.filter_utils import build_filter_clause

#: The model eras the app presents. Data from the two is never combined on a chart.
CMIP_ERAS: dict[SourceDatasetType, Any] = {
    SourceDatasetType.CMIP6: CMIP6Dataset,
    SourceDatasetType.CMIP7: CMIP7Dataset,
}


def mip_era_for(dataset_type: str) -> str | None:
    """Map a source dataset type onto the MIP era label used to keep the eras apart."""
    # `str()` of the enum can render as "SourceDatasetType.CMIP6", so compare the trailing name.
    name = dataset_type.rsplit(".", 1)[-1].lower()
    for source_type in CMIP_ERAS:
        if str(source_type.value).lower() == name:
            return str(source_type.value).upper()
    return None


def _facet_column(dataset_model: Any, key: str) -> Any:
    """Return the mapped column for a facet, or None when the era does not carry it."""
    column = getattr(dataset_model, key, None)
    return column if column is not None and hasattr(column, "type") else None


def cmip_dataset_filter(
    facets: Mapping[str, str],
    execution: Any = models.Execution,
) -> ColumnElement[bool]:
    """
    Match executions holding a CMIP6 or CMIP7 dataset that satisfies every facet in `facets`.

    A facet no CMIP era carries is ignored, which keeps unknown query parameters harmless. A facet
    only one era carries excludes the other, so a CMIP7-only facet does not pull in all of CMIP6.
    """
    requested_era = facets.get("mip_era")
    known = {
        key: value
        for key, value in facets.items()
        if key != "mip_era" and any(_facet_column(model, key) is not None for model in CMIP_ERAS.values())
    }
    branches = []

    for source_type, dataset_model in CMIP_ERAS.items():
        if requested_era and requested_era.upper() != str(source_type.value).upper():
            continue

        conditions = []
        for key, value in known.items():
            column = _facet_column(dataset_model, key)
            if column is None:
                break
            conditions.append(build_filter_clause(column, value))
        else:
            branches.append(execution.datasets.of_type(dataset_model).any(and_(true(), *conditions)))

    if not branches:
        # Nothing can satisfy the request, so match no rows rather than every row.
        return false()
    return or_(*branches)
