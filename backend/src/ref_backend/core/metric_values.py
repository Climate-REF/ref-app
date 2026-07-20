"""Shared logic for querying and formatting metric values."""

from enum import StrEnum

from fastapi import HTTPException


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
