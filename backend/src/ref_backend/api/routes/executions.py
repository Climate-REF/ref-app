import mimetypes

from fastapi import APIRouter, HTTPException
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref_core.executor import EXECUTION_LOG_FILENAME
from climate_ref_core.pycmec.metric import CMECMetric
from ref_backend.api.deps import ConfigDep, SessionDep
from ref_backend.core.file_handling import file_iterator
from ref_backend.models import (
    Collection,
    DatasetCollection,
    Execution,
    ExecutionGroup,
    MetricValueCollection,
)

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("/")
async def list(session: SessionDep, limit: int = 10) -> Collection[ExecutionGroup]:
    """
    List the most recent execution groups
    """
    execution_groups = (
        session.query(models.ExecutionGroup)
        .order_by(models.ExecutionGroup.updated_at.desc())
        .limit(limit)
        .all()
    )

    return Collection(data=[ExecutionGroup.build(m) for m in execution_groups])


@router.get("/{group_id}")
async def get(session: SessionDep, group_id: str) -> ExecutionGroup:
    """
    Inspect a specific execution
    """
    execution_group = session.query(models.ExecutionGroup).get(group_id)
    if not execution_group:
        raise HTTPException(status_code=404, detail="Execution not found")

    return ExecutionGroup.build(execution_group)


async def _get_execution(
    group_id: str, execution_id: str | None, session
) -> models.Execution:
    if execution_id is not None:
        execution: models.Execution | None = session.query(models.Execution).get(
            execution_id
        )
    else:
        group: models.ExecutionGroup = session.query(models.ExecutionGroup).get(
            group_id
        )
        if not group or len(group.executions) == 0:
            raise HTTPException(status_code=404, detail="Result not found")
        execution = group.executions[-1]

    if not execution or not execution.execution_group_id == int(group_id):
        raise HTTPException(status_code=404, detail="Result not found")
    return execution


@router.get("/{group_id}/execution")
async def execution(
    session: SessionDep, group_id: str, execution_id: str | None = None
) -> Execution:
    """
    Inspect a specific execution

    Gets the latest result if no execution_id is provided
    """
    execution = await _get_execution(group_id, execution_id, session)

    return Execution.build(execution)


@router.get("/{group_id}/datasets")
async def result_datasets(
    session: SessionDep, group_id: str, result_id: str | None = None
) -> DatasetCollection:
    """
    Query the datasets that were used for a specific execution
    """
    execution = await _get_execution(group_id, result_id, session)

    return DatasetCollection.build(execution.datasets)


@router.get("/{group_id}/logs")
async def result_logs(
    session: SessionDep, config: ConfigDep, group_id: str, result_id: str | None = None
) -> StreamingResponse:
    """
    Fetch the logs for an execution result
    """
    execution = await _get_execution(group_id, result_id, session)

    file_path = (
        config.paths.results / execution.output_fragment / EXECUTION_LOG_FILENAME
    )
    mime_type, encoding = mimetypes.guess_type(file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Log file not found")

    return StreamingResponse(
        file_iterator(file_path),
        media_type=mime_type,
        headers={
            "Content-Disposition": f"attachment; filename=execution_result_{result_id}.log"
        },
    )


@router.get("/{group_id}/metric_bundle")
async def metric_bundle(
    session: SessionDep, config: ConfigDep, group_id: str, result_id: str | None = None
) -> CMECMetric:
    """
    Fetch a result using the slug
    """
    execution = await _get_execution(group_id, result_id, session)

    file_path = config.paths.results / execution.output_fragment / "diagnostic.json"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Metrics bundle not found")

    return CMECMetric.load_from_json(file_path)


@router.get("/{group_id}/values")
async def list_metric_values(
    session: SessionDep, group_id: str, result_id: str | None = None
) -> MetricValueCollection:
    """
    Fetch a result using the slug
    """
    execution = await _get_execution(group_id, result_id, session)

    metric_values = (
        session.query(models.MetricValue)
        .filter(models.MetricValue.execution_id == execution.id)
        .all()
    )

    return MetricValueCollection.build(metric_values)
