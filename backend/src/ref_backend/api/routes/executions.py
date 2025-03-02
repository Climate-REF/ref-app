from fastapi import APIRouter

from cmip_ref import models
from ref_backend.api.deps import SessionDep
from ref_backend.models import MetricExecution, MetricExecutions

router = APIRouter(prefix="/executions", tags=["utils"])


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
