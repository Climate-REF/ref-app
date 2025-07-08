from fastapi import APIRouter, Query

from climate_ref import models
from ref_backend.api.deps import AppContextDep, SessionDep
from ref_backend.models import Collection, Dataset, DiagnosticSummary, Execution

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


@router.get("/{dataset_id}/executions")
async def executions(
    app_context: AppContextDep,
    dataset_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics
    """
    executions_query = (
        app_context.session.query(models.Execution)
        .join(models.Execution.datasets)
        .filter(models.Dataset.id == dataset_id)
    )
    total_count = executions_query.count()
    _executions = executions_query.offset(offset).limit(limit).all()

    return Collection(
        data=[Execution.build(m, app_context) for m in _executions],
        total_count=total_count,
    )
