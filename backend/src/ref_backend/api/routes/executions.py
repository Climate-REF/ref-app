import mimetypes

from fastapi import APIRouter, HTTPException
from starlette.responses import StreamingResponse

from cmip_ref import models
from cmip_ref_core.executor import EXECUTION_LOG_FILENAME
from ref_backend.api.deps import ConfigDep, SessionDep
from ref_backend.core.file_handling import file_iterator
from ref_backend.models import (
    DatasetCollection,
    MetricExecutionGroup,
    MetricExecutionResult,
    MetricExecutions,
)

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("/")
async def list_executions(session: SessionDep, limit: int = 10) -> MetricExecutions:
    """
    List the most recent executions
    """
    metrics = (
        session.query(models.MetricExecution)
        .order_by(models.MetricExecution.updated_at)
        .limit(limit)
        .all()
    )

    return MetricExecutions(
        data=[MetricExecutionGroup.build(m) for m in metrics], count=len(metrics)
    )


@router.get("/{execution_id}")
async def get_execution_group(
    session: SessionDep, execution_id: int
) -> MetricExecutionGroup:
    """
    Inspect a specific execution
    """
    metric_execution = session.query(models.MetricExecutionGroup).get(execution_id)
    if not metric_execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return MetricExecutionGroup.build(metric_execution)


async def _get_result(execution_id, result_id, session) -> models.MetricExecutionResult:
    metric_result: models.MetricExecutionResult | None = session.query(
        models.MetricExecutionResult
    ).get(result_id)
    if not metric_result or not metric_result.metric_execution_group_id == execution_id:
        raise HTTPException(status_code=404, detail="Result not found")
    return metric_result


@router.get("/{execution_id}/result/{result_id}")
async def get_execution_result(
    session: SessionDep, execution_id: int, result_id: int
) -> MetricExecutionResult:
    """
    Inspect a specific execution result
    """
    metric_result = await _get_result(execution_id, result_id, session)

    return MetricExecutionResult.build(metric_result)


@router.get("/{execution_id}/result/{result_id}/datasets")
async def get_execution_result_datasets(
    session: SessionDep, execution_id: int, result_id: int
) -> DatasetCollection:
    """
    Query the datasets that were used for a specific execution
    """
    metric_result = await _get_result(execution_id, result_id, session)

    return DatasetCollection.build(metric_result.datasets)


@router.get("/{execution_id}/result/{result_id}/logs")
async def get_execution_result_logs(
    session: SessionDep, config: ConfigDep, execution_id: int, result_id: int
) -> StreamingResponse:
    """
    Fetch the logs for an execution result
    """
    metric_result = await _get_result(execution_id, result_id, session)

    file_path = (
        config.paths.results / metric_result.output_fragment / EXECUTION_LOG_FILENAME
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
