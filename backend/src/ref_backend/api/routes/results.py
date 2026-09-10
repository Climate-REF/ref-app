import mimetypes

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from climate_ref.models import ExecutionOutput
from ref_backend.api.deps import ReaderDep, SessionDep
from ref_backend.core.file_handling import file_iterator, resolve_artifact

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/{result_id}")
async def get_result(session: SessionDep, reader: ReaderDep, result_id: int) -> StreamingResponse:
    """
    Fetch a result
    """
    result = session.query(ExecutionOutput).get(result_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")

    filename = result.filename
    output_fragment = result.execution.output_fragment
    # Release the connection now, so streaming the file does not hold it open
    session.close()

    file_path = resolve_artifact(reader.artifacts.output_file, output_fragment, filename)
    mime_type, _encoding = mimetypes.guess_type(file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")

    return StreamingResponse(
        file_iterator(str(file_path)),
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
