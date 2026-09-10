"""Shared logic for querying and formatting metric values."""

from enum import StrEnum

from fastapi import HTTPException
from sqlalchemy import ColumnElement, String, cast

from climate_ref import models
from climate_ref.models.metric_value import MetricValueType as StoredMetricValueType


class MetricValueType(StrEnum):
    """Type of metric values to query."""

    SCALAR = "scalar"
    SERIES = "series"


def parse_id_list(id_str: str) -> list[int]:
    """Parse comma-separated list of IDs into integers."""
    try:
        return [int(i.strip()) for i in id_str.split(",") if i.strip()]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid id in list: {e}") from e


def metric_value_type_is(value_type: StoredMetricValueType) -> ColumnElement[bool]:
    """
    Match metric values of one type without letting SQLite use `ix_metric_value_type`

    That index splits every row into two values, but with no planner stats
    SQLite prefers it over the selective index on the other side of a join.
    """
    return cast(models.MetricValue.type, String) == value_type.name
