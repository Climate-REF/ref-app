from fastapi import APIRouter, HTTPException

from ref_backend.core.aft import get_aft_diagnostic_by_id, get_aft_diagnostics_index
from ref_backend.models import AFTDiagnosticDetail, AFTDiagnosticSummary

router = APIRouter(prefix="/cmip7-aft-diagnostics", tags=["CMIP7 Assessment Fast Track (AFT)"])


@router.get("/", response_model=list[AFTDiagnosticSummary])
async def list_aft_diagnostics() -> list[AFTDiagnosticSummary]:
    """
    Get all AFT diagnostics.
    """
    try:
        return get_aft_diagnostics_index()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{aft_id}", response_model=AFTDiagnosticDetail)
async def get_aft_diagnostic(aft_id: str) -> AFTDiagnosticDetail:
    """
    Get detailed AFT diagnostic by ID.
    """
    try:
        diagnostic = get_aft_diagnostic_by_id(aft_id)
        if diagnostic is None:
            raise HTTPException(status_code=404, detail="AFT diagnostic not found")
        return diagnostic
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
