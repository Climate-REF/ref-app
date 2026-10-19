"""Execution groups, executions and their outputs."""

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, computed_field
from sqlalchemy.orm import selectinload

from climate_ref import models
from climate_ref.models.execution import ResultOutputType
from ref_backend.core.resource_usage import ExecutionResourceSummary

if TYPE_CHECKING:
    from ref_backend.api.deps import AppContext


class ExecutionOutput(BaseModel):
    id: int
    execution_id: int
    output_type: ResultOutputType
    filename: str
    short_name: str
    long_name: str
    description: str
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


# Everything ExecutionGroup.build touches without outputs,
# so a page of groups loads in a fixed number of queries.
EXECUTION_GROUP_LOAD_OPTIONS_WITHOUT_OUTPUTS = (
    selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.datasets),
    selectinload(models.ExecutionGroup.diagnostic).selectinload(models.Diagnostic.provider),
)
# Everything ExecutionGroup.build touches, including each execution's outputs.
EXECUTION_GROUP_LOAD_OPTIONS = (
    selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.outputs),
    *EXECUTION_GROUP_LOAD_OPTIONS_WITHOUT_OUTPUTS,
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

    total_execution_groups: int
    """
    Total number of execution groups in the database.
    """
    successful_execution_groups: int
    """
    Number of execution groups whose latest execution was successful.
    """
    failed_execution_groups: int
    """
    Number of execution groups whose latest execution failed.
    """
    running_execution_groups: int
    """
    Number of execution groups whose latest execution is still running.
    """
    not_started_execution_groups: int
    """
    Number of execution groups that have not been executed yet.
    """
    execution_groups_by_mip_era: dict[str, int]
    """
    Number of execution groups that ran against each MIP era, keyed by era label.
    """
    scalar_value_count: int
    """
    Number of scalar metric values available.
    """
    series_value_count: int
    """
    Number of series metric values available.
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
    Wall, CPU and memory usage rolled up across every execution.

    Absent when no execution has recorded a wall time.
    """

    @computed_field  # type: ignore
    @property
    def success_rate_percentage(self) -> float:
        """
        Success rate as a percentage (0-100).
        """
        if self.total_execution_groups == 0:
            return 0.0
        return round((self.successful_execution_groups / self.total_execution_groups) * 100, 1)
