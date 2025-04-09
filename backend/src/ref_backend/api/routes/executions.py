import mimetypes

from fastapi import APIRouter, HTTPException
from starlette.responses import StreamingResponse

from cmip_ref import models
from cmip_ref_core.executor import EXECUTION_LOG_FILENAME
from cmip_ref_core.pycmec.metric import CMECMetric, MetricValue
from ref_backend.api.deps import ConfigDep, SessionDep
from ref_backend.core.file_handling import file_iterator
from ref_backend.models import (
    Collection,
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


@router.get("/{group_id}")
async def get_execution_group(
    session: SessionDep, group_id: int
) -> MetricExecutionGroup:
    """
    Inspect a specific execution
    """
    metric_execution = session.query(models.MetricExecutionGroup).get(group_id)
    if not metric_execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return MetricExecutionGroup.build(metric_execution)


async def _get_result(group_id, result_id, session) -> models.MetricExecutionResult:
    metric_result: models.MetricExecutionResult | None = session.query(
        models.MetricExecutionResult
    ).get(result_id)
    if not metric_result or not metric_result.metric_execution_group_id == int(
        group_id
    ):
        raise HTTPException(status_code=404, detail="Result not found")
    return metric_result


@router.get("/{group_id}/result/{result_id}")
async def get_execution_result(
    session: SessionDep, group_id: int, result_id: int
) -> MetricExecutionResult:
    """
    Inspect a specific execution result
    """
    metric_result = await _get_result(group_id, result_id, session)

    return MetricExecutionResult.build(metric_result)


@router.get("/{group_id}/result/{result_id}/datasets")
async def get_execution_result_datasets(
    session: SessionDep, group_id: int, result_id: int
) -> DatasetCollection:
    """
    Query the datasets that were used for a specific execution
    """
    metric_result = await _get_result(group_id, result_id, session)

    return DatasetCollection.build(metric_result.datasets)


@router.get("/{group_id}/result/{result_id}/logs")
async def get_execution_result_logs(
    session: SessionDep, config: ConfigDep, group_id: int, result_id: int
) -> StreamingResponse:
    """
    Fetch the logs for an execution result
    """
    metric_result = await _get_result(group_id, result_id, session)

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


@router.get("/{group_id}/result/{result_id}/metric_bundle")
async def get_metric_bundle(
    session: SessionDep, config: ConfigDep, group_id: int, result_id: int
) -> CMECMetric:
    """
    Fetch a result using the slug
    """
    metric_result = await _get_result(group_id, result_id, session)

    file_path = config.paths.results / metric_result.output_fragment / "metric.json"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Metrics bundle not found")

    return CMECMetric.load_from_json(file_path)


@router.get("/{group_id}/result/{result_id}/values")
async def get_metric_values(
    session: SessionDep, group_id: int, result_id: int
) -> Collection[MetricValue]:
    """
    Fetch a result using the slug
    """
    metric_result = await _get_result(group_id, result_id, session)

    metric_values = (
        session.query(models.MetricValue)
        .filter(models.MetricValue.metric_execution_result_id == metric_result.id)
        .all()
    )

    return Collection(data=metric_values)
