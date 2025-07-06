from fastapi import APIRouter, Query

from climate_ref import models
from ref_backend.api.deps import SessionDep, SettingsDep
from ref_backend.models import Collection, Dataset, DiagnosticSummary, Execution

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("/")
async def list(
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
    session: SessionDep,
    settings: SettingsDep,
    dataset_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
) -> Collection[DiagnosticSummary]:
    """
    List the currently registered diagnostics
    """
    executions_query = (
        session.query(models.Execution)
        .join(models.Execution.datasets)
        .filter(models.Dataset.id == dataset_id)
    )
    total_count = executions_query.count()
    _executions = executions_query.offset(offset).limit(limit).all()

    return Collection(
        data=[Execution.build(m, settings) for m in _executions], total_count=total_count
    )
