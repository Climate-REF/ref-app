"""Aggregates of the wall, CPU and memory usage recorded against executions."""

import attrs
from pydantic import BaseModel

from climate_ref.results import Reader, ResourceFilter
from climate_ref.results.resources import ResourceSummary


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
    Sum of wall clock time across the timed executions, in seconds.

    Executions often run in parallel, so this can be more than the elapsed time of the run
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
    peak_memory_bytes_min: int | None
    """
    Smallest peak resident memory of any execution that recorded it, in bytes
    """
    peak_memory_bytes_max: int | None
    """
    Largest peak resident memory of any execution that recorded it, in bytes
    """


def _summary(summary: ResourceSummary) -> ExecutionResourceSummary:
    return ExecutionResourceSummary.model_validate(attrs.asdict(summary))


def resource_usage(reader: Reader, filters: ResourceFilter) -> ExecutionResourceSummary | None:
    """Roll up the resource usage of the executions matching ``filters``."""
    summary = reader.resources.summary(filters)
    return _summary(summary) if summary else None


def resource_usage_by_diagnostic(
    reader: Reader, filters: ResourceFilter
) -> dict[tuple[str | None, str | None], ExecutionResourceSummary]:
    """Roll up the resource usage of the executions matching ``filters``, per provider and diagnostic slug."""
    return {
        (summary.provider_slug, summary.diagnostic_slug): _summary(summary)
        for summary in reader.resources.summaries(filters, group_by="diagnostic")
    }
