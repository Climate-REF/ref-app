import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from climate_ref import models
from climate_ref.datasets import get_dataset_adapter
from climate_ref.results import DatasetFilter
from climate_ref.results.datasets import DatasetView, select_datasets
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.api.deps import AppContextDep, ReaderDep, SessionDep
from ref_backend.models import (
    Collection,
    Dataset,
    ExecutionGroup,
)

router = APIRouter(prefix="/datasets", tags=["datasets"])


def _parse_facets(facets: str) -> dict[str, Any]:
    try:
        facet_filters = json.loads(facets)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="facets must be a JSON object") from None
    if not isinstance(facet_filters, dict):
        raise HTTPException(status_code=400, detail="facets must be a JSON object")
    return facet_filters


def _parse_source_type(dataset_type: str) -> SourceDatasetType:
    try:
        return SourceDatasetType(dataset_type.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown dataset type {dataset_type!r}") from None


@router.get("/", name="list")
async def _list(  # noqa: PLR0913, PLR0917
    session: SessionDep,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    name_contains: str = Query(None, description="Filter datasets by name"),
    dataset_type: str = Query(
        SourceDatasetType.CMIP6.value,
        description="Filter datasets by the type of dataset",
    ),
    facets: str = Query(None, description="Filter datasets by facets (JSON string)"),
) -> Collection[Dataset]:
    """
    Paginated list of currently ingested datasets

    Only the latest version of each dataset is returned.
    """
    if not dataset_type:
        if facets:
            raise HTTPException(
                status_code=400, detail="Cannot filter using facets if a source type is not specified"
            )
        dataset_type = SourceDatasetType.CMIP6.value

    source_type = _parse_source_type(dataset_type)
    adapter = get_dataset_adapter(source_type.value)

    dataset_filter = DatasetFilter(
        source_type=source_type,
        facets=_parse_facets(facets) if facets else None,
        # Retracted datasets stay visible: this is an inspection view, not a solve-time query.
        include_retracted=True,
    )
    try:
        statement = select_datasets(dataset_filter, latest_group_by=adapter.dataset_id_metadata)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    if name_contains:
        statement = statement.where(models.Dataset.slug.ilike(f"%{name_contains}%"))

    total_count = session.execute(select(func.count()).select_from(statement.subquery())).scalar_one()
    datasets = session.execute(statement.offset(offset).limit(limit)).scalars().unique().all()

    return Collection(data=[Dataset.build(ds) for ds in datasets], total_count=total_count)


@router.get("/{slug}", name="get")
async def get(
    reader: ReaderDep,
    slug: str,
) -> Dataset:
    """
    Get a single dataset by slug

    When several versions share a slug, the latest is returned.
    """
    dataset: DatasetView | None = reader.datasets.get(slug)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return Dataset.build_from_view(dataset)


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
