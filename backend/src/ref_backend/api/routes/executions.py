import mimetypes
import os
import tarfile
import tempfile
from collections.abc import Generator
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from loguru import logger
from sqlalchemy import and_, exists, func, select
from sqlalchemy.orm import Session, aliased
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset, DatasetFile
from climate_ref_core.logging import EXECUTION_LOG_FILENAME
from climate_ref_core.pycmec.metric import CMECMetric
from ref_backend.api.deps import AppContextDep
from ref_backend.core.file_handling import file_iterator
from ref_backend.core.filter_utils import build_filter_clause
from ref_backend.core.metric_values import (
    MetricValueType,
    apply_metric_filters,
    generate_csv_response_scalar,
    generate_csv_response_series,
    process_scalar_values,
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


@router.get("/statistics")
async def get_execution_statistics(app_context: AppContextDep) -> ExecutionStats:
    """
    Get execution statistics for the dashboard.

    Returns counts of total, successful, and failed execution groups,
    plus recent activity count.
    """
    session = app_context.session

    # Total execution groups
    total_execution_groups = session.query(models.ExecutionGroup).count()

    # Successful execution groups (latest execution is successful)
    latest_execution_subquery = (
        session.query(
            models.Execution.execution_group_id.label("egid"),
            func.max(models.Execution.id).label("max_id"),
        )
        .group_by(models.Execution.execution_group_id)
        .subquery()
    )

    successful_execution_groups = (
        session.query(models.ExecutionGroup)
        .join(
            latest_execution_subquery,
            models.ExecutionGroup.id == latest_execution_subquery.c.egid,
        )
        .join(
            models.Execution,
            models.Execution.id == latest_execution_subquery.c.max_id,
        )
        .filter(models.Execution.successful)
        .count()
    )

    # Failed execution groups (total - successful)
    failed_execution_groups = total_execution_groups - successful_execution_groups

    # Recent activity (last 50 execution groups by updated_at)
    scalar_value_count = session.query(models.ScalarMetricValue).count()
    series_value_count = session.query(models.SeriesMetricValue).count()

    total_datasets = session.query(models.Dataset).count()
    total_files = session.query(DatasetFile).count()

    return ExecutionStats(
        total_execution_groups=total_execution_groups,
        successful_execution_groups=successful_execution_groups,
        failed_execution_groups=failed_execution_groups,
        scalar_value_count=scalar_value_count,
        series_value_count=series_value_count,
        total_datasets=total_datasets,
        total_files=total_files,
    )


@router.get("/")
async def list_recent_execution_groups(  # noqa: PLR0913
    app_context: AppContextDep,
    limit: int = 10,
    offset: int = 0,
    diagnostic_name_contains: str | None = None,
    provider_name_contains: str | None = None,
    dirty: bool | None = None,
    successful: bool | None = None,
    source_id: str | None = None,
) -> Collection[ExecutionGroup]:
    """
    List the most recent execution groups

    Supports filtering by:
    - diagnostic_name_contains
    - provider_name_contains
    - dirty
    - successful (filters by latest execution success)
    - source_id (filters groups that include an execution whose datasets
        include a CMIP6 dataset with this source_id)
    """
    session = app_context.session

    query = session.query(models.ExecutionGroup).join(models.ExecutionGroup.diagnostic)

    if diagnostic_name_contains:
        query = query.filter(models.Diagnostic.name.ilike(f"%{diagnostic_name_contains}%"))
    if provider_name_contains:
        query = query.join(models.Diagnostic.provider).filter(
            models.Provider.name.ilike(f"%{provider_name_contains}%")
        )
    if dirty is not None:
        query = query.filter(models.ExecutionGroup.dirty == dirty)

    # Filter by latest execution successful flag (joins to a subquery of latest executions)
    if successful is not None:
        latest_execution_subquery = (
            session.query(
                models.Execution.execution_group_id.label("egid"),
                func.max(models.Execution.id).label("max_id"),
            )
            .group_by(models.Execution.execution_group_id)
            .subquery()
        )

        query = (
            query.join(
                latest_execution_subquery,
                models.ExecutionGroup.id == latest_execution_subquery.c.egid,
            )
            .join(
                models.Execution,
                models.Execution.id == latest_execution_subquery.c.max_id,
            )
            .filter(models.Execution.successful == successful)
        )

    # Filter by source_id using a correlated EXISTS to avoid DISTINCT across joins
    if source_id and CMIP6Dataset is not None:
        EG = aliased(models.ExecutionGroup)
        E = aliased(models.Execution)
        DS = aliased(CMIP6Dataset)

        # Build a SQLAlchemy Core selectable for EXISTS (required by typing/runtime)
        source_condition = build_filter_clause(DS.source_id, source_id)
        exists_select = (
            select(E.id)
            .join(EG, E.execution_group_id == EG.id)
            .join(DS, E.datasets)
            .where(and_(EG.id == models.ExecutionGroup.id, source_condition))
        )
        query = query.filter(exists(exists_select))

    total_count = query.count()

    execution_groups = (
        query.order_by(models.ExecutionGroup.updated_at.desc()).limit(limit).offset(offset).all()
    )

    data = []
    for eg in execution_groups:
        try:
            # Eagerly load executions to avoid lazy loading during serialization
            eg.executions
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
    execution_group = app_context.session.query(models.ExecutionGroup).get(group_id)
    if not execution_group:
        raise HTTPException(status_code=404, detail="Execution not found")

    return ExecutionGroup.build(execution_group, app_context)


async def _get_execution(group_id: str, execution_id: str | None, session: Session) -> models.Execution:
    if execution_id is not None:
        execution: models.Execution | None = session.query(models.Execution).get(execution_id)
    else:
        # Fetch only the latest execution for the group without loading the full collection
        execution = (
            session.query(models.Execution)
            .filter(models.Execution.execution_group_id == int(group_id))
            .order_by(models.Execution.id.desc())
            .limit(1)
            .one_or_none()
        )

    if not execution or not execution.execution_group_id == int(group_id):
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
    execution = await _get_execution(group_id, execution_id, app_context.session)

    return Execution.build(execution, app_context)


@router.get("/{group_id}/datasets")
async def execution_datasets(
    app_context: AppContextDep, group_id: str, execution_id: str | None = None
) -> Collection[Dataset]:
    """
    Query the datasets that were used for a specific execution
    """
    execution = await _get_execution(group_id, execution_id, app_context.session)

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
    execution = await _get_execution(group_id, execution_id, app_context.session)

    file_path = app_context.ref_config.paths.results / execution.output_fragment / EXECUTION_LOG_FILENAME
    mime_type, encoding = mimetypes.guess_type(file_path)

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
    execution = await _get_execution(group_id, execution_id, app_context.session)

    file_path = app_context.ref_config.paths.results / execution.output_fragment / "diagnostic.json"

    if not file_path.exists():
        logger.warning(f"Metric bundle not found: {file_path}")
        raise HTTPException(status_code=404, detail="Metrics bundle not found")

    return CMECMetric.load_from_json(file_path)


@router.get("/{group_id}/values", response_model=MetricValueCollection)
async def list_metric_values(  # noqa: PLR0913
    app_context: AppContextDep,
    request: Request,
    group_id: str,
    execution_id: str | None = None,
    value_type: MetricValueType = Query(..., description="Type of metric values to return"),
    format: str | None = None,
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
    """
    execution = await _get_execution(group_id, execution_id, app_context.session)
    # Extract additional filters from query parameters
    query_params = request.query_params
    filter_params = {}
    for key, value in query_params.items():
        if key in {"format", "value_type"}:
            continue
        filter_params[key] = value
    if value_type == MetricValueType.SCALAR:
        scalar_query = app_context.session.query(models.ScalarMetricValue).filter(
            models.ScalarMetricValue.execution_id == execution.id
        )
        scalar_query = apply_metric_filters(scalar_query, filter_params, isolate_ids, exclude_ids)

        scalar_values = scalar_query.all() if scalar_query else []

        # Process scalar values with outlier detection
        annotated_scalar_values, had_outliers, outlier_count, detection_ran = process_scalar_values(
            scalar_values, detect_outliers, include_unverified
        )

        if format == "csv":
            filename = f"metric_values_scalar_{group_id}_{execution.id}.csv"
            return generate_csv_response_scalar(
                annotated_scalar_values,
                detection_ran,
                had_outliers,
                outlier_count,
                filename,
            )
        else:
            return MetricValueCollection.build_scalar(
                scalar_values=annotated_scalar_values,
                had_outliers=had_outliers if detection_ran else None,
                outlier_count=outlier_count if detection_ran else None,
            )

    elif value_type == MetricValueType.SERIES:
        series_query = app_context.session.query(models.SeriesMetricValue).filter(
            models.SeriesMetricValue.execution_id == execution.id
        )

        series_query = apply_metric_filters(series_query, filter_params, isolate_ids, exclude_ids)

        series_values = series_query.all() if series_query else []

        if format == "csv":
            filename = f"metric_values_series_{group_id}_{execution.id}.csv"
            return generate_csv_response_series(
                series_values,
                detection_ran=False,
                had_outliers=False,
                outlier_count=0,
                filename=filename,
            )
        else:
            return MetricValueCollection.build_series(
                series_values=series_values,
                had_outliers=None,
                outlier_count=None,
            )
    else:
        raise HTTPException(status_code=500, detail="Unknown value_type")


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
    execution = await _get_execution(group_id, execution_id, app_context.session)
    result_path = app_context.ref_config.paths.results / execution.output_fragment

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
