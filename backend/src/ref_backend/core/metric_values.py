"""Shared logic for querying and formatting metric values."""

from enum import StrEnum

from fastapi import HTTPException


class MetricValueType(StrEnum):
    """Type of metric values to query."""

    SCALAR = "scalar"
    SERIES = "series"


def parse_id_list(id_str: str | None) -> list[int] | None:
    """
    Parse comma-separated list of IDs into integers.

    A missing or blank list is `None`, because the reader reads an empty list as matching nothing.
    """
    try:
        ids = [int(i.strip()) for i in (id_str or "").split(",") if i.strip()]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid id in list: {e}") from e
    return ids or None
