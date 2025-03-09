from fastapi import APIRouter, HTTPException

from cmip_ref.models.metric import Metric
from ref_backend.api.deps import SessionDep
from ref_backend.models import Collection, MetricSummary

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/")
async def list_metrics(session: SessionDep) -> Collection[MetricSummary]:
    """
    List the currently registered metrics
    """
    metrics = session.query(Metric).all()

    return Collection(data=[MetricSummary.build(m) for m in metrics])


@router.get("/{metric_id}")
async def get_metric(session: SessionDep, metric_id: int) -> MetricSummary:
    """
    Fetch a result
    """
    metric = session.query(Metric).get(metric_id)
    if metric is None:
        raise HTTPException(status_code=404, detail="Result not found")

    return MetricSummary.build(metric)
