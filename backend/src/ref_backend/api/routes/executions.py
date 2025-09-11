import csv
import io
import mimetypes
import os
import tarfile
import tempfile
from collections.abc import Generator
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import and_, exists, func, select
from sqlalchemy.orm import Session, aliased
from starlette.responses import StreamingResponse

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset
from climate_ref_core.logging import EXECUTION_LOG_FILENAME
from climate_ref_core.pycmec.metric import CMECMetric
from ref_backend.api.deps import AppContextDep
from ref_backend.core.file_handling import file_iterator
from ref_backend.models import (
    Collection,
    Dataset,
    Execution,
    ExecutionGroup,
    MetricValueCollection,
)

router = APIRouter(prefix="/executions", tags=["executions"])


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
        exists_select = (
            select(E.id)
            .join(EG, E.execution_group_id == EG.id)
            .join(DS, E.datasets)
            .where(and_(EG.id == models.ExecutionGroup.id, DS.source_id == source_id))
        )
        query = query.filter(exists(exists_select))

    total_count = query.count()

    execution_groups = (
        query.order_by(models.ExecutionGroup.updated_at.desc()).limit(limit).offset(offset).all()
    )

    return Collection(
        total_count=total_count,
        data=[ExecutionGroup.build(m, app_context) for m in execution_groups],
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
        raise HTTPException(status_code=404, detail="Metrics bundle not found")

    return CMECMetric.load_from_json(file_path)


@router.get("/{group_id}/values", response_model=None)
async def metric_values(
    app_context: AppContextDep,
    group_id: str,
    execution_id: str | None = None,
    format: str | None = None,
    type: str = Query("all", description="Type of metric values to return: 'scalar', 'series', or 'all'"),
) -> MetricValueCollection | StreamingResponse:
    """
    Fetch metric values for a specific execution (both scalar and series)

    - `type`: Filter by metric value type - 'scalar', 'series', or 'all' (default)
    - `format`: Return format - 'json' (default) or 'csv'
    """
    execution = await _get_execution(group_id, execution_id, app_context.session)

    # Build queries for scalar and series values
    scalar_values = []
    series_values = []

    if type in ("scalar", "all"):
        scalar_query = app_context.session.query(models.ScalarMetricValue).filter(
            models.ScalarMetricValue.execution_id == execution.id
        )
        scalar_values = scalar_query.all()

    if type in ("series", "all"):
        series_query = app_context.session.query(models.SeriesMetricValue).filter(
            models.SeriesMetricValue.execution_id == execution.id
        )
        series_values = series_query.all()

    # Return metric values as a CSV file
    if format == "csv":

        def generate_csv() -> Generator[str]:
            output = io.StringIO()
            writer = csv.writer(output)

            if not scalar_values and not series_values:
                yield ""
                return

            # For CSV, we'll handle scalar and series differently
            # Scalar values: dimensions + value
            # Series values: dimensions + values (flattened) + index info

            if scalar_values:
                # Write scalar values
                dimensions = sorted(scalar_values[0].dimensions.keys())
                header = [*dimensions, "value", "type"]
                writer.writerow(header)

                for mv in scalar_values:
                    row = [mv.dimensions.get(d) for d in dimensions] + [mv.value, "scalar"]
                    writer.writerow(row)

            if series_values:
                # Write series values (flattened)
                for sv in series_values:
                    dimensions = sorted(sv.dimensions.keys())
                    if not scalar_values:  # Write header if not already written
                        header = [*dimensions, "value", "index", "index_name", "type"]
                        writer.writerow(header)

                    # Flatten series into multiple rows
                    for i, value in enumerate(sv.values):
                        index_value = sv.index[i] if sv.index and i < len(sv.index) else i
                        row = [sv.dimensions.get(d) for d in dimensions] + [
                            value,
                            index_value,
                            sv.index_name or "index",
                            "series",
                        ]
                        writer.writerow(row)

            output.seek(0)
            yield output.read()

        return StreamingResponse(
            generate_csv(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=metric_values_{group_id}_{execution.id}.csv"
            },
        )
    else:
        return MetricValueCollection.build(scalar_values=scalar_values, series_values=series_values)


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
