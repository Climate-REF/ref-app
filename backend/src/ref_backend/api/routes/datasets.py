from fastapi import APIRouter, HTTPException, Query

from climate_ref import models
from ref_backend.api.deps import AppContextDep, SessionDep
from ref_backend.models import (
    Collection,
    Dataset,
    DiagnosticSummary,
    Execution,
    ExecutionGroup,
)

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("/", name="list")
async def _list(
    session: SessionDep,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
) -> Collection[Dataset]:
    """
    Paginated list of currently ingested datasets
    """
    dataset_query = session.query(models.Dataset)
    total_count = dataset_query.count()
    datasets = dataset_query.offset(offset).limit(limit)

    return Collection(
        data=[Dataset.build(ds) for ds in datasets], total_count=total_count
    )


@router.get("/{slug}", name="get")
async def get(
    session: SessionDep,
    slug: str,
) -> Dataset:
    """
    Get a single dataset by slug
    """
    dataset = (
        session.query(models.Dataset).filter(models.Dataset.slug == slug).one_or_none()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return Dataset.build(dataset)


@router.get("/{dataset_id}/executions")
async def executions(
    app_context: AppContextDep,
    dataset_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
) -> Collection[ExecutionGroup]:
    """
    List the currently registered diagnostics
    """
    execution_groups_query = (
        app_context.session.query(models.ExecutionGroup)
        .join(models.ExecutionGroup.executions)
        .join(models.Execution.datasets)
        .filter(models.Dataset.id == dataset_id)
        .distinct()
    )
    total_count = execution_groups_query.count()
    _execution_groups = execution_groups_query.offset(offset).limit(limit).all()

    return Collection(
        data=[ExecutionGroup.build(eg, app_context) for eg in _execution_groups],
        total_count=total_count,
    )
