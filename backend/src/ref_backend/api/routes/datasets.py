import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from climate_ref.results import DatasetFilter, ExecutionGroupFilter, InputDatasetFilter
from climate_ref.results.datasets import DatasetView
from climate_ref_core.datasets import SourceDatasetType
from ref_backend.api.deps import AppContextDep, ReaderDep
from ref_backend.core.execution_groups import load_execution_groups
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
def _list(  # noqa: PLR0913, PLR0917
    reader: ReaderDep,
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

    dataset_filter = DatasetFilter(
        source_type=_parse_source_type(dataset_type),
        facets=_parse_facets(facets) if facets else None,
        slug_contains=name_contains or None,
        # Retracted datasets stay visible: this is an inspection view, not a solve-time query.
        include_retracted=True,
    )
    try:
        datasets = reader.datasets.list(dataset_filter, offset=offset, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    return Collection(
        data=[Dataset.build_from_view(ds) for ds in datasets.items], total_count=datasets.total_count
    )


@router.get("/{slug}", name="get")
def get(
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
def executions(
    app_context: AppContextDep,
    dataset_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
) -> Collection[ExecutionGroup]:
    """
    List the execution groups whose latest execution used this dataset

    Groups from every diagnostic version are returned, retracted ones included.
    """
    groups, total_count = load_execution_groups(
        app_context.session,
        ExecutionGroupFilter(
            input_datasets=InputDatasetFilter(dataset_ids=dataset_id),
            include_superseded=True,
            include_retracted=True,
        ),
        offset=offset,
        limit=limit,
    )
    return Collection(data=[ExecutionGroup.build(g, app_context) for g in groups], total_count=total_count)
