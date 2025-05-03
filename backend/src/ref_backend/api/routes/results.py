import mimetypes

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from climate_ref.models import ExecutionOutput
from ref_backend.api.deps import ConfigDep, SessionDep
from ref_backend.core.file_handling import file_iterator

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/{result_id}")
async def get_result(
    session: SessionDep, config: ConfigDep, result_id: int
) -> StreamingResponse:
    """
    Fetch a result
    """
    result = session.query(ExecutionOutput).get(result_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")

    file_path = (
        config.paths.results
        / result.metric_execution_result.output_fragment
        / result.filename
    )
    mime_type, encoding = mimetypes.guess_type(file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")

    return StreamingResponse(
        file_iterator(file_path),
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename={result.filename}"},
    )
