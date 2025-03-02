from fastapi import APIRouter

from ref_backend.models import MetricExecutions, MetricExecution

router = APIRouter(prefix="/executions", tags=["utils"])

@router.get("/")
async def list_executions() -> MetricExecutions:
    return MetricExecutions(data=[MetricExecution(id=1)], count=1)
