"""Execution groups, executions and their outputs."""

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, computed_field

from climate_ref import models
from climate_ref.models.execution import ResultOutputType
from ref_backend.core.mip_eras import MipEra
from ref_backend.core.resource_usage import ExecutionResourceSummary
from ref_backend.models.common import GroupCounts

if TYPE_CHECKING:
    from ref_backend.api.deps import AppContext


class ExecutionOutput(BaseModel):
    id: int
    execution_id: int
    output_type: ResultOutputType
    filename: str | None
    short_name: str | None
    long_name: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime
    url: str

    @staticmethod
    def build(output: models.ExecutionOutput, app_context: "AppContext") -> "ExecutionOutput":
        return ExecutionOutput(
            id=output.id,
            execution_id=output.execution_id,
            output_type=output.output_type,
            filename=output.filename,
            short_name=output.short_name,
            long_name=output.long_name,
            description=output.description,
            created_at=output.created_at,
            updated_at=output.updated_at,
            url=f"{app_context.settings.BACKEND_HOST}{app_context.settings.API_V1_STR}/results/{output.id}",
        )


class ExecutionGroup(BaseModel):
    id: int
    key: str
    dirty: bool
    executions: "list[Execution]"
    """
    Executions of this group, oldest first, so the latest execution is the last one
    """
    selectors: dict[str, tuple[tuple[str, str], ...]]
    provider_slug: str
    """
    Slug of the provider of the diagnostic, which with `diagnostic_slug` identifies the diagnostic
    """
    diagnostic_slug: str
    """
    Slug of the diagnostic, unique within its provider
    """
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def build(
        execution_group: models.ExecutionGroup, app_context: "AppContext", include_outputs: bool = True
    ) -> "ExecutionGroup":
        return ExecutionGroup(
            id=execution_group.id,
            key=execution_group.key,
            dirty=execution_group.dirty,
            executions=[
                Execution.build(r, app_context, include_outputs=include_outputs)
                for r in execution_group.executions
            ],
            selectors=execution_group.selectors,
            provider_slug=execution_group.diagnostic.provider.slug,
            diagnostic_slug=execution_group.diagnostic.slug,
            created_at=execution_group.created_at,
            updated_at=execution_group.updated_at,
        )


class Execution(BaseModel):
    id: int
    dataset_hash: str
    dataset_count: int
    successful: bool | None
    """
    Whether the execution succeeded, or null while it is still running
    """
    failure_reason: str | None
    """
    Why a failed execution failed, or null for one that succeeded or is still running

    One of climate-ref's `ExecutionFailureReason` values: `diagnostic_error`, `system_error`,
    `result_error`, `abandoned`, `not_started`, `cancelled` or `unknown`.
    Failures recorded before climate-ref 0.19 are `unknown`.
    It is plain text, so values added by later climate-ref versions pass through unchanged.
    """
    retracted: bool
    created_at: datetime
    updated_at: datetime
    outputs: "list[ExecutionOutput] | None"
    """
    Files produced by the execution, or null when the request left them out
    """
    wall_seconds: float | None
    """
    Wall clock time taken by the execution, in seconds
    """
    cpu_seconds: float | None
    """
    CPU time consumed by the execution and its children, in seconds
    """
    peak_memory_bytes: int | None
    """
    Peak resident memory observed during the execution, in bytes
    """

    @staticmethod
    def build(
        execution: models.Execution, app_context: "AppContext", include_outputs: bool = True
    ) -> "Execution":
        outputs = (
            [ExecutionOutput.build(o, app_context) for o in execution.outputs] if include_outputs else None
        )
        return Execution(
            id=execution.id,
            successful=execution.successful,
            failure_reason=execution.failure_reason,
            retracted=execution.retracted,
            dataset_hash=execution.dataset_hash,
            dataset_count=len(execution.datasets),
            updated_at=execution.updated_at,
            created_at=execution.created_at,
            outputs=outputs,
            wall_seconds=execution.wall_seconds,
            cpu_seconds=execution.cpu_seconds,
            peak_memory_bytes=execution.peak_memory_bytes,
        )


class ExecutionStats(BaseModel):
    """
    Statistics for execution groups and their success rates.
    """

    groups: GroupCounts
    """
    Execution groups at the promoted version of each diagnostic, by the outcome of their latest execution
    """
    groups_by_mip_era: dict[MipEra, GroupCounts]
    """
    The same counts for the groups that draw on each MIP era.

    A group drawing on both eras counts in each, so these do not add up to `groups`.
    """
    scalar_value_count: int
    """
    Number of scalar metric values stored, from every version.
    """
    series_value_count: int
    """
    Number of series metric values stored, from every version.
    """
    total_datasets: int
    """
    Total number of datasets tracked in the database.
    """
    total_files: int
    """
    Total number of files tracked across all datasets.
    """
    resource_usage: ExecutionResourceSummary | None
    """
    Wall, CPU and memory usage rolled up across every execution at the promoted versions.

    Absent when no execution has recorded a wall time.
    """

    @computed_field  # type: ignore
    @property
    def success_rate_percentage(self) -> float:
        """
        Share of the groups whose latest execution succeeded, as a percentage (0-100).
        """
        if self.groups.total == 0:
            return 0.0
        return round(self.groups.successful / self.groups.total * 100, 1)
