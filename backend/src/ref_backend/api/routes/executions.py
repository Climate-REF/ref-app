from fastapi import APIRouter, HTTPException

from cmip_ref import models
from ref_backend.api.deps import SessionDep
from ref_backend.models import MetricExecution, MetricExecutionResult, MetricExecutions

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("/")
async def list_executions(session: SessionDep, limit: int = 10) -> MetricExecutions:
    """
    List the latest executions
    """
    metrics = (
        session.query(models.MetricExecution)
        .order_by(models.MetricExecution.updated_at)
        .limit(limit)
        .all()
    )

    return MetricExecutions(
        data=[MetricExecution.build(m) for m in metrics], count=len(metrics)
    )


@router.get("/{execution_id}")
async def get_execution(session: SessionDep, execution_id: int) -> MetricExecution:
    """
    Inspect a specific execution
    """
    metric_execution = session.query(models.MetricExecution).get(execution_id)

    return MetricExecution.build(metric_execution)


@router.get("/{execution_id}/result/{result_id}")
async def get_execution_result(
    session: SessionDep, execution_id: int, result_id: int
) -> MetricExecutionResult:
    """
    Inspect a specific execution result
    """
    metric_result = session.query(models.MetricExecutionResult).get(result_id)
    if not metric_result or not metric_result.execution_id == execution_id:
        raise HTTPException(status_code=404, detail="Result not found")

    return MetricExecutionResult.build(metric_result)
