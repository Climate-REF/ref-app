"""
Liveness and readiness probes

Mounted at the root rather than under the versioned API, so an orchestrator can probe the
process without knowing anything about the API surface.
"""

import inspect
import logging

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(include_in_schema=False)


@router.get("/livez")
def liveness_probe() -> dict[str, str]:
    """
    Report process liveness without touching any dependency
    """
    return {"status": "alive"}


@router.get("/readyz")
async def readiness_probe(request: Request) -> dict[str, str]:
    """
    Report readiness by running the checks registered on ``app.state.readiness_checks``

    Each check is a callable that returns a falsy value or raises to signal it is not ready.
    A check may be async, in which case what it returns is awaited.
    An empty (or unset) check list means the service is always ready.
    """
    checks = getattr(request.app.state, "readiness_checks", [])
    failures: dict[str, str] = {}
    for check in checks:
        name = getattr(check, "__name__", repr(check))
        try:
            ok = check()
            if inspect.isawaitable(ok):
                ok = await ok
        except Exception as exc:
            logger.warning(f"Readiness check {name} failed", exc_info=True)
            failures[name] = str(exc)
            continue
        if not ok:
            failures[name] = "check returned a falsy result"

    if failures:
        raise HTTPException(status_code=503, detail=failures)
    return {"status": "ready"}
