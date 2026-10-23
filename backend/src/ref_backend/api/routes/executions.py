import mimetypes
import os
import tarfile
import tempfile
from collections.abc import Generator
from pathlib import Path
from typing import Literal, get_args

from fastapi import APIRouter, HTTPException, Query, Request
from loguru import logger
from starlette.responses import Response, StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import DatasetFile
from climate_ref.models.execution import ExecutionFailureReason
from climate_ref.query import select_group_counts
from climate_ref.results import DiagnosticFilter, ExecutionGroupFilter, MetricValueFilter, ResourceFilter
from climate_ref_core.datasets import SourceDatasetType
from climate_ref_core.pycmec.metric import CMECMetric
from ref_backend.api.deps import AppContext, AppContextDep
from ref_backend.core.execution_groups import load_execution_groups
from ref_backend.core.file_handling import file_iterator, resolve_artifact, tail_lines
from ref_backend.core.metric_values import (
    MetricValueType,
    parse_id_list,
)
from ref_backend.core.mip_eras import MipEra, source_id_datasets, source_types_for
from ref_backend.core.reader_values import (
    fetch_facets,
    fetch_metric_values,
    parse_dimension_filters,
)
from ref_backend.core.resource_usage import resource_usage
from ref_backend.models import (
    Collection,
    Dataset,
    Execution,
    ExecutionGroup,
    ExecutionStats,
    Facet,
    GroupCounts,
    MetricValueCollection,
)

router = APIRouter(prefix="/executions", tags=["executions"])


def _parse_int_id(value: str, resource: str) -> int:
    try:
        return int(value)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"{resource} not found") from None


@router.get("/statistics")
async def get_execution_statistics(app_context: AppContextDep) -> ExecutionStats:
    """
    Get execution statistics for the dashboard.

    Execution groups are counted at the promoted version of each diagnostic,
    by the outcome of their latest execution, leaving out retracted executions.
    Metric values, datasets and files are counted as stored, whatever their version or retraction.
    """
    session = app_context.reader.session

    def group_counts(source_types: tuple[SourceDatasetType, ...] | None = None) -> GroupCounts:
        filters = DiagnosticFilter(
            include_superseded=False, include_retracted=False, source_types=source_types
        )
        return GroupCounts.summed(session.execute(select_group_counts(filters)).all())

    return ExecutionStats(
        groups=group_counts(),
        groups_by_mip_era={era: group_counts(source_types_for(era)) for era in get_args(MipEra)},
        scalar_value_count=session.query(models.ScalarMetricValue).count(),
        series_value_count=session.query(models.SeriesMetricValue).count(),
        total_datasets=session.query(models.Dataset).count(),
        total_files=session.query(DatasetFile).count(),
        resource_usage=resource_usage(
            app_context.reader,
            ResourceFilter(include_superseded=False, include_retracted=True, latest_only=False),
        ),
    )


@router.get("/")
async def list_recent_execution_groups(  # noqa: PLR0913, PLR0917
    app_context: AppContextDep,
    limit: int = Query(10, ge=0),
    offset: int = Query(0, ge=0),
    diagnostic_name_contains: str | None = None,
    provider_name_contains: str | None = None,
    dirty: bool | None = None,
    successful: bool | None = None,
    failure_reason: ExecutionFailureReason | None = None,
    source_id: str | None = Query(
        None, description="Keep only the groups whose latest execution ran this model"
    ),
    mip_era: MipEra | None = Query(None, description="Keep only the groups that draw on this era"),
    include_outputs: bool = Query(
        False, description="Include the files produced by each execution; they are left out by default"
    ),
) -> Collection[ExecutionGroup]:
    """
    List the most recently updated execution groups

    Only groups at the promoted version of their diagnostic are returned,
    and groups whose latest execution is retracted are left out.

    Supports filtering by:
    - diagnostic_name_contains (case-insensitive substring of the diagnostic slug)
    - provider_name_contains (case-insensitive substring of the provider slug)
    - dirty
    - successful (filters by latest execution success)
    - failure_reason (filters by why the latest execution failed, e.g. `system_error`)
    - source_id (the latest execution ran against a dataset of this model)
    - mip_era (the group draws on this era)

    Each execution's `outputs` are null unless `include_outputs` is set, because the file lists
    make up most of the response. Fetch one group's files from `/executions/{group_id}`.
    """
    filters = ExecutionGroupFilter(
        diagnostic_contains=diagnostic_name_contains or None,
        provider_contains=provider_name_contains or None,
        include_superseded=False,
        include_retracted=False,
        dirty=dirty,
        successful=successful,
        failure_reasons=failure_reason,
        source_types=source_types_for(mip_era),
        input_datasets=source_id_datasets(source_id),
    )
    groups, total_count = load_execution_groups(
        app_context.session,
        filters,
        order="recently_updated",
        offset=offset,
        limit=limit,
        include_outputs=include_outputs,
    )
    data = []
    for eg in groups:
        try:
            data.append(ExecutionGroup.build(eg, app_context, include_outputs=include_outputs))
        except Exception as e:
            logger.error(f"Error building execution group ID {eg.id}: {e}")
    return Collection(total_count=total_count, data=data)


@router.get("/{group_id}")
async def get(app_context: AppContextDep, group_id: str) -> ExecutionGroup:
    """
    Inspect a specific execution group, whatever its version or retraction
    """
    group_id_int = _parse_int_id(group_id, "Execution group")
    groups, _ = load_execution_groups(
        app_context.session,
        ExecutionGroupFilter(
            execution_group_ids=group_id_int, include_superseded=True, include_retracted=True
        ),
        with_count=False,
    )
    if not groups:
        raise HTTPException(status_code=404, detail="Execution not found")
    return ExecutionGroup.build(groups[0], app_context)


async def _get_execution(
    group_id: str, execution_id: str | None, app_context: AppContext
) -> models.Execution:
    """
    Resolve the execution a route is asking about

    When no execution is named, the reader picks the latest for the group.
    """
    group_id_int = _parse_int_id(group_id, "Execution group")

    if execution_id is not None:
        execution_id_int = _parse_int_id(execution_id, "Execution")
    else:
        latest = app_context.reader.executions.latest_execution(group_id_int)
        if latest is None:
            raise HTTPException(status_code=404, detail="Result not found")
        execution_id_int = latest.id

    execution = app_context.session.get(models.Execution, execution_id_int)
    if execution is None or execution.execution_group_id != group_id_int:
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
    lines: int | None = Query(
        None, ge=1, le=500, description="Only return this many lines from the end of the log"
    ),
) -> Response:
    """
    Fetch the logs for an execution result

    Pass `lines` to fetch only the end of the log, rather than the whole file.
    """
    execution = await _get_execution(group_id, execution_id, app_context)
    output_fragment = execution.output_fragment
    # Release the connection now, so streaming the file does not hold it open
    app_context.session.close()

    file_path = resolve_artifact(app_context.reader.artifacts.log_file, output_fragment)
    mime_type, _encoding = mimetypes.guess_type(file_path)

    if not file_path.exists():
        # Error, not warning: a missing log means the solve died before the execution wrote it.
        logger.error(f"Log file not found: {file_path}")
        raise HTTPException(status_code=404, detail="Log file not found")

    headers = {"Content-Disposition": f"attachment; filename=execution_result_{execution_id}.log"}
    if lines is not None:
        tail = "".join(f"{line}\n" for line in tail_lines(file_path, lines))
        return Response(tail, media_type=mime_type, headers=headers)

    return StreamingResponse(file_iterator(str(file_path)), media_type=mime_type, headers=headers)


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


def _metric_filter(
    execution: models.Execution, request: Request, isolate_ids: str | None, exclude_ids: str | None
) -> MetricValueFilter:
    return MetricValueFilter(
        execution_ids=execution.id,
        include_superseded=True,
        include_retracted=True,
        latest_only=False,
        dimensions=parse_dimension_filters(request.query_params),
        isolate_ids=parse_id_list(isolate_ids),
        exclude_ids=parse_id_list(exclude_ids),
    )


@router.get("/{group_id}/values/facets")
async def list_metric_value_facets(  # noqa: PLR0913, PLR0917
    app_context: AppContextDep,
    request: Request,
    group_id: str,
    execution_id: str | None = None,
    value_type: MetricValueType = Query(..., description="Type of metric values to read the facets of"),
    isolate_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to isolate"),
    exclude_ids: str | None = Query(None, description="Comma-separated list of metric value IDs to exclude"),
) -> list[Facet]:
    """
    Get the facets of the values `/values` returns for the same filters, without the values.

    They cover every page and the outliers too, so a client can keep them while it pages.
    """
    execution = await _get_execution(group_id, execution_id, app_context)
    return fetch_facets(app_context, _metric_filter(execution, request, isolate_ids, exclude_ids), value_type)


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
    with_facets: bool = Query(True, description="Fill `facets`, which `/values/facets` also returns"),
) -> MetricValueCollection | StreamingResponse:
    """
    Fetch metric values for a specific execution (both scalar and series)

    - `value_type`: Type of metric values - 'scalar', 'series', or 'all' (required)
    - `format`: Return format - 'json' (default) or 'csv'
    - `offset`: Number of items to skip (default 0)
    - `limit`: Maximum number of items to return (default 50, max 500)

    The values of the named execution are returned, whatever its version or retraction.
    """
    execution = await _get_execution(group_id, execution_id, app_context)

    return fetch_metric_values(
        app_context,
        _metric_filter(execution, request, isolate_ids, exclude_ids),
        with_facets=with_facets,
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
