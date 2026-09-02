import mimetypes
import os
import tarfile
import tempfile
from collections.abc import Generator, Sequence
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import DatasetFile
from climate_ref.results import ExecutionGroupFilter, MetricValueFilter
from climate_ref_core.pycmec.metric import CMECMetric
from ref_backend.api.deps import AppContext, AppContextDep
from ref_backend.core.file_handling import file_iterator, resolve_artifact
from ref_backend.core.metric_values import (
    MetricValueType,
    parse_id_list,
)
from ref_backend.core.mip_eras import cmip_dataset_filter
from ref_backend.core.reader_values import (
    fetch_metric_values,
    parse_dimension_filters,
)
from ref_backend.models import (
    Collection,
    Dataset,
    Execution,
    ExecutionGroup,
    ExecutionStats,
    MetricValueCollection,
)

router = APIRouter(prefix="/executions", tags=["executions"])


def _parse_int_id(value: str, resource: str) -> int:
    try:
        return int(value)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"{resource} not found") from None


def _load_execution_groups(session: Session, group_ids: Sequence[int]) -> list[models.ExecutionGroup]:
    """
    Load the ORM rows for execution groups the reader has already selected

    The response builders still need ORM objects, so the reader decides which groups to show
    and this hydrates them, preserving the order of ``group_ids``.
    """
    if not group_ids:
        return []

    rows = (
        session.query(models.ExecutionGroup)
        .options(
            selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.outputs),
            selectinload(models.ExecutionGroup.executions).selectinload(models.Execution.datasets),
            selectinload(models.ExecutionGroup.diagnostic),
        )
        .filter(models.ExecutionGroup.id.in_(group_ids))
        .all()
    )
    by_id = {row.id: row for row in rows}
    return [by_id[group_id] for group_id in group_ids if group_id in by_id]


@router.get("/statistics")
async def get_execution_statistics(app_context: AppContextDep) -> ExecutionStats:
    """
    Get execution statistics for the dashboard.

    Execution groups are counted at the promoted version of each diagnostic,
    and classified by the outcome of their latest execution.
    """
    session = app_context.session
    stats = app_context.reader.executions.statistics()

    return ExecutionStats(
        total_execution_groups=sum(s.total for s in stats),
        successful_execution_groups=sum(s.successful for s in stats),
        failed_execution_groups=sum(s.failed for s in stats),
        running_execution_groups=sum(s.running for s in stats),
        not_started_execution_groups=sum(s.not_started for s in stats),
        scalar_value_count=session.query(models.ScalarMetricValue).count(),
        series_value_count=session.query(models.SeriesMetricValue).count(),
        total_datasets=session.query(models.Dataset).count(),
        total_files=session.query(DatasetFile).count(),
    )


@router.get("/")
async def list_recent_execution_groups(  # noqa: PLR0913, PLR0917
    app_context: AppContextDep,
    limit: int = 10,
    offset: int = 0,
    diagnostic_name_contains: str | None = None,
    provider_name_contains: str | None = None,
    dirty: bool | None = None,
    successful: bool | None = None,
    source_id: str | None = None,
    mip_era: str | None = None,
) -> Collection[ExecutionGroup]:
    """
    List the most recent execution groups

    Only groups at the promoted version of their diagnostic are returned.

    Supports filtering by:
    - diagnostic_name_contains (case-insensitive substring of the diagnostic slug)
    - provider_name_contains (case-insensitive substring of the provider slug)
    - dirty
    - successful (filters by latest execution success)
    - source_id (filters groups that include an execution whose datasets
        include a CMIP6 or CMIP7 dataset with this source_id)
    - mip_era (restricts the above to a single era, CMIP6 or CMIP7)
    """
    session = app_context.session

    filters = ExecutionGroupFilter(
        diagnostic_contains=[diagnostic_name_contains] if diagnostic_name_contains else None,
        provider_contains=[provider_name_contains] if provider_name_contains else None,
        dirty=dirty,
        successful=successful,
    )
    # The reader orders by id, so sort here to keep the most recently updated groups first.
    groups = sorted(
        app_context.reader.executions.groups(filters),
        key=lambda group: (group.updated_at, group.id),
        reverse=True,
    )

    # Selectors do not record source_id, so match on the datasets used.
    if source_id or mip_era:
        facets = {key: value for key, value in {"source_id": source_id, "mip_era": mip_era}.items() if value}
        matching_ids = set(
            session.scalars(
                select(models.ExecutionGroup.id).where(
                    models.ExecutionGroup.executions.any(cmip_dataset_filter(facets))
                )
            )
        )
        groups = [group for group in groups if group.id in matching_ids]

    total_count = len(groups)
    page_ids = [group.id for group in groups[offset : offset + limit]]

    data = []
    for eg in _load_execution_groups(session, page_ids):
        try:
            data.append(ExecutionGroup.build(eg, app_context))
        except Exception as e:
            logger.error(f"Error building execution group ID {eg.id}: {e}")
            continue

    return Collection(
        total_count=total_count,
        data=data,
    )


@router.get("/{group_id}")
async def get(app_context: AppContextDep, group_id: str) -> ExecutionGroup:
    """
    Inspect a specific execution
    """
    group_id_int = _parse_int_id(group_id, "Execution group")
    if app_context.reader.executions.group(group_id_int) is None:
        raise HTTPException(status_code=404, detail="Execution not found")

    execution_groups = _load_execution_groups(app_context.session, [group_id_int])
    if not execution_groups:
        raise HTTPException(status_code=404, detail="Execution not found")
    return ExecutionGroup.build(execution_groups[0], app_context)


async def _get_execution(
    group_id: str, execution_id: str | None, app_context: AppContext
) -> models.Execution:
    """
    Resolve the execution a route is asking about

    The reader picks the execution, the latest for the group when none is named.
    """
    group_id_int = _parse_int_id(group_id, "Execution group")
    executions = app_context.reader.executions

    if execution_id is not None:
        view = executions.execution(_parse_int_id(execution_id, "Execution"))
    else:
        view = executions.latest_execution(group_id_int)

    execution = None
    if view is not None and view.execution_group_id == group_id_int:
        execution = app_context.session.get(models.Execution, view.id)
    if execution is None:
        raise HTTPException(status_code=404, detail="Result not found")
    return execution


@router.get("/{group_id}/execution")
async def execution(
    app_context: AppContextDep,
    group_id: str,
    execution_id: str | None = None,
) -> Execution:
    """
    Inspect a specific execution

    Gets the latest result if no execution_id is provided
    """
    execution = await _get_execution(group_id, execution_id, app_context)

    return Execution.build(execution, app_context)


@router.get("/{group_id}/datasets")
async def execution_datasets(
    app_context: AppContextDep, group_id: str, execution_id: str | None = None
) -> Collection[Dataset]:
    """
    Query the datasets that were used for a specific execution
    """
    execution = await _get_execution(group_id, execution_id, app_context)

    return Collection(data=[Dataset.build(dataset) for dataset in execution.datasets])


@router.get("/{group_id}/logs")
async def execution_logs(
    app_context: AppContextDep,
    group_id: str,
    execution_id: str | None = None,
) -> StreamingResponse:
    """
    Fetch the logs for an execution result
    """
    execution = await _get_execution(group_id, execution_id, app_context)

    file_path = resolve_artifact(app_context.reader.artifacts.log_file, execution.output_fragment)
    mime_type, _encoding = mimetypes.guess_type(file_path)

    if not file_path.exists():
        logger.warning(f"Log file not found: {file_path}")
        raise HTTPException(status_code=404, detail="Log file not found")

    return StreamingResponse(
        file_iterator(str(file_path)),
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename=execution_result_{execution_id}.log"},
    )


@router.get("/{group_id}/metric_bundle")
async def metric_bundle(
    app_context: AppContextDep,
    group_id: str,
    execution_id: str | None = None,
) -> CMECMetric:
    """
    Fetch a result using the slug
    """
    execution = await _get_execution(group_id, execution_id, app_context)

    file_path = resolve_artifact(
        app_context.reader.artifacts.output_file, execution.output_fragment, "diagnostic.json"
    )

    if not file_path.exists():
        logger.warning(f"Metric bundle not found: {file_path}")
        raise HTTPException(status_code=404, detail="Metrics bundle not found")

    return CMECMetric.load_from_json(file_path)


@router.get("/{group_id}/values", response_model=MetricValueCollection)
async def list_metric_values(  # noqa: PLR0913, PLR0917
    app_context: AppContextDep,
    request: Request,
    group_id: str,
    execution_id: str | None = None,
    value_type: MetricValueType = Query(..., description="Type of metric values to return"),
    format: str | None = None,
    offset: int = Query(0, ge=0, description="Number of items to skip for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of items to return"),
    detect_outliers: Literal["off", "iqr"] = Query(
        "iqr", description="Outlier detection method: 'off' or 'iqr'"
    ),
    include_unverified: bool = Query(False, description="Include unverified (outlier) values"),
    isolate_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to isolate"),
    exclude_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to exclude"),
) -> MetricValueCollection | StreamingResponse:
    """
    Fetch metric values for a specific execution (both scalar and series)

    - `value_type`: Type of metric values - 'scalar', 'series', or 'all' (required)
    - `format`: Return format - 'json' (default) or 'csv'
    - `offset`: Number of items to skip (default 0)
    - `limit`: Maximum number of items to return (default 50, max 500)
    """
    execution = await _get_execution(group_id, execution_id, app_context)

    # Restrict to the selected execution's values; ``_get_execution`` already resolves the
    # latest execution when no ``execution_id`` is supplied. ``promoted_only`` keeps only the
    # promoted diagnostic version, so values from superseded versions are hidden. Exposing
    # previous versions needs a separate design (TODO). Retracted executions are still included.
    metric_filter = MetricValueFilter(
        execution_ids=[execution.id],
        dimensions=parse_dimension_filters(request.query_params),
        isolate_ids=parse_id_list(isolate_ids) if isolate_ids else None,
        exclude_ids=parse_id_list(exclude_ids) if exclude_ids else None,
        promoted_only=True,
        include_retracted=True,
    )

    return fetch_metric_values(
        app_context,
        metric_filter,
        value_type=value_type,
        format=format,
        offset=offset,
        limit=limit,
        detect_outliers=detect_outliers,
        include_unverified=include_unverified,
        filename_stem=f"{group_id}_{execution.id}",
    )


@router.get("/{group_id}/archive")
async def execution_archive(
    app_context: AppContextDep,
    group_id: str,
    execution_id: str | None = None,
) -> StreamingResponse:
    """
    Stream a tar.gz archive of the execution results

    The archive is created on-the-fly and streamed directly to the client.
    """
    execution = await _get_execution(group_id, execution_id, app_context)
    result_path = resolve_artifact(app_context.reader.artifacts.output_directory, execution.output_fragment)

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Execution output not found")

    # This is an arbitrary value as a placeholder
    # No experimentation has been done to find the best chunk size
    CHUNK_SIZE = 128 * 1024  # 128 KB chunks

    def generate_archive() -> Generator[bytes]:
        with tempfile.NamedTemporaryFile(delete=True) as temp_tar:
            # Open the tar file in write mode with gzip compression
            with tarfile.open(temp_tar.name, mode="w:gz") as tar:
                for root, _, files in os.walk(result_path):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = str(file_path.relative_to(result_path))
                        tar.add(file_path, arcname=arcname)

            # Read and stream the tar file in chunks
            with open(temp_tar.name, "rb") as f:
                while chunk := f.read(CHUNK_SIZE):
                    yield chunk
        # The temp file will be deleted automatically when closed

    return StreamingResponse(
        generate_archive(),
        media_type="application/x-gzip",
        headers={"Content-Disposition": f"attachment; filename=execution_{execution.id}.tar.gz"},
    )
