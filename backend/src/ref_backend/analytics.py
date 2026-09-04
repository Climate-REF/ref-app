"""
Same-origin proxy for Plausible Analytics.

The tracker posts to a path on this app rather than to plausible.io directly,
so that content blockers and strict connect-src policies do not drop the events.
Netlify deploys handle the same paths through redirects in `frontend/netlify.toml`,
so both deploy targets need to stay in step.
"""

import httpx
from fastapi import APIRouter, Request, Response
from loguru import logger

PLAUSIBLE_SCRIPT_URL = "https://plausible.io/js/script.file-downloads.outbound-links.js"
PLAUSIBLE_EVENT_URL = "https://plausible.io/api/event"

UPSTREAM_TIMEOUT_SECONDS = 10.0

router = APIRouter(prefix="/log", tags=["analytics"], include_in_schema=False)

_client = httpx.AsyncClient(timeout=UPSTREAM_TIMEOUT_SECONDS, follow_redirects=True)


def _forwarded_for(request: Request) -> str | None:
    """
    Build the client chain that Plausible uses to derive a visitor hash.
    """
    existing = request.headers.get("x-forwarded-for")
    if existing:
        return existing
    if request.client:
        return request.client.host
    return None


@router.get("/script.js")
async def script() -> Response:
    """
    Serve the Plausible tracker script from this origin.
    """
    try:
        upstream = await _client.get(PLAUSIBLE_SCRIPT_URL)
    except httpx.HTTPError as exc:
        logger.warning(f"Could not fetch the Plausible script: {exc}")
        return Response(status_code=502)

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "application/javascript"),
        headers={"cache-control": upstream.headers.get("cache-control", "public, max-age=3600")},
    )


@router.post("/api/event")
async def event(request: Request) -> Response:
    """
    Forward a tracker event to Plausible.
    """
    headers = {
        "content-type": request.headers.get("content-type", "text/plain"),
        "user-agent": request.headers.get("user-agent", ""),
    }
    forwarded_for = _forwarded_for(request)
    if forwarded_for:
        headers["x-forwarded-for"] = forwarded_for

    try:
        upstream = await _client.post(PLAUSIBLE_EVENT_URL, content=await request.body(), headers=headers)
    except httpx.HTTPError as exc:
        # A dropped event is not worth failing the page over.
        logger.warning(f"Could not forward a Plausible event: {exc}")
        return Response(status_code=202)

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )
