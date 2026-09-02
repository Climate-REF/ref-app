"""Aggregates of the wall, CPU and memory usage recorded against executions."""

from collections.abc import Iterable
from typing import Any

from pydantic import BaseModel
from sqlalchemy import Row, func
from sqlalchemy.orm import Session

from climate_ref import models


class ExecutionResourceSummary(BaseModel):
    """
    Roll-up of the resource usage recorded across a set of executions.

    Only executions that recorded a wall time are counted.
    CPU time and peak memory are optional, so they may be missing even when wall time is present.
    """

    timed_execution_count: int
    """
    Number of executions that recorded a wall time
    """
    wall_seconds_total: float
    """
    Sum of wall clock time across the timed executions, in seconds
    """
    wall_seconds_mean: float
    """
    Mean wall clock time per timed execution, in seconds
    """
    wall_seconds_max: float
    """
    Longest wall clock time of any timed execution, in seconds
    """
    cpu_seconds_total: float | None
    """
    Sum of CPU time across the executions that recorded it, in seconds
    """
    cpu_seconds_mean: float | None
    """
    Mean CPU time per execution that recorded it, in seconds
    """
    peak_memory_bytes_max: int | None
    """
    Largest peak resident memory of any execution that recorded it, in bytes
    """


RESOURCE_AGGREGATES = (
    func.count(models.Execution.wall_seconds).label("timed_execution_count"),
    func.sum(models.Execution.wall_seconds).label("wall_seconds_total"),
    func.avg(models.Execution.wall_seconds).label("wall_seconds_mean"),
    func.max(models.Execution.wall_seconds).label("wall_seconds_max"),
    func.sum(models.Execution.cpu_seconds).label("cpu_seconds_total"),
    func.avg(models.Execution.cpu_seconds).label("cpu_seconds_mean"),
    func.max(models.Execution.peak_memory_bytes).label("peak_memory_bytes_max"),
)


def summary_from_row(row: Row[Any]) -> ExecutionResourceSummary | None:
    """
    Build a summary from a row that carries the ``RESOURCERESOURCE_AGGREGATES`` labels.

    Returns ``None`` when the row holds no timed executions.
    """
    values = row._mapping
    if not values["timed_execution_count"]:
        return None
    return ExecutionResourceSummary.model_validate(dict(values))


def resource_usage_by_diagnostic(
    session: Session, diagnostic_ids: Iterable[int]
) -> dict[int, ExecutionResourceSummary]:
    """
    Roll up the resource usage of every execution, grouped by diagnostic.

    Diagnostics without any timed executions are absent from the result.
    """
    rows = (
        session.query(models.ExecutionGroup.diagnostic_id, *RESOURCE_AGGREGATES)
        .join(models.Execution)
        .filter(models.ExecutionGroup.diagnostic_id.in_(list(diagnostic_ids)))
        .group_by(models.ExecutionGroup.diagnostic_id)
        .all()
    )
    result = {}
    for row in rows:
        summary = summary_from_row(row)
        if summary is not None:
            result[row.diagnostic_id] = summary
    return result


def resource_usage_overall(session: Session) -> ExecutionResourceSummary | None:
    """Roll up the resource usage of every execution in the database."""
    return summary_from_row(session.query(*RESOURCE_AGGREGATES).one())
