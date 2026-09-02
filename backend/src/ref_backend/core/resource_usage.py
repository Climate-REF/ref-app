"""Aggregates of the wall, CPU and memory usage recorded against executions."""

from collections.abc import Iterable

from pydantic import BaseModel
from sqlalchemy import func
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
    cpu_seconds_max: float | None
    """
    Largest CPU time of any execution that recorded it, in seconds
    """
    peak_memory_bytes_max: int | None
    """
    Largest peak resident memory of any execution that recorded it, in bytes
    """


_AGGREGATES = (
    func.count(models.Execution.wall_seconds),
    func.sum(models.Execution.wall_seconds),
    func.avg(models.Execution.wall_seconds),
    func.max(models.Execution.wall_seconds),
    func.sum(models.Execution.cpu_seconds),
    func.avg(models.Execution.cpu_seconds),
    func.max(models.Execution.cpu_seconds),
    func.max(models.Execution.peak_memory_bytes),
)


def _summary_from_row(row: tuple) -> ExecutionResourceSummary | None:  # type: ignore[type-arg]
    count, wall_total, wall_mean, wall_max, cpu_total, cpu_mean, cpu_max, memory_max = row
    if not count:
        return None
    return ExecutionResourceSummary(
        timed_execution_count=count,
        wall_seconds_total=float(wall_total),
        wall_seconds_mean=float(wall_mean),
        wall_seconds_max=float(wall_max),
        cpu_seconds_total=None if cpu_total is None else float(cpu_total),
        cpu_seconds_mean=None if cpu_mean is None else float(cpu_mean),
        cpu_seconds_max=None if cpu_max is None else float(cpu_max),
        peak_memory_bytes_max=None if memory_max is None else int(memory_max),
    )


def resource_usage_by_diagnostic(
    session: Session, diagnostic_ids: Iterable[int]
) -> dict[int, ExecutionResourceSummary]:
    """
    Roll up the resource usage of every execution, grouped by diagnostic.

    Diagnostics without any timed executions are absent from the result.
    """
    rows = (
        session.query(models.ExecutionGroup.diagnostic_id, *_AGGREGATES)
        .join(models.Execution)
        .filter(models.ExecutionGroup.diagnostic_id.in_(list(diagnostic_ids)))
        .group_by(models.ExecutionGroup.diagnostic_id)
        .all()
    )
    result = {}
    for row in rows:
        summary = _summary_from_row(tuple(row[1:]))
        if summary is not None:
            result[row[0]] = summary
    return result


def resource_usage_overall(session: Session) -> ExecutionResourceSummary | None:
    """Roll up the resource usage of every execution in the database."""
    row = session.query(*_AGGREGATES).one()
    return _summary_from_row(tuple(row))
