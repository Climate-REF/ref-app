from fastapi import APIRouter, HTTPException

from cmip_ref.models import Provider
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


@router.get("/{provider_slug}/{metric_slug}")
async def get_metric(
    session: SessionDep, provider_slug: str, metric_slug: str
) -> MetricSummary:
    """
    Fetch a result using the slug
    """
    metric = (
        session.query(Metric)
        .join(Metric.provider)
        .filter(
            Metric.slug == metric_slug,
            Provider.slug == provider_slug,
        )
        .one_or_none()
    )
    if metric is None:
        raise HTTPException(status_code=404, detail="Metric not found")

    return MetricSummary.build(metric)
