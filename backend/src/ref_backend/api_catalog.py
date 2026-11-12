"""
API catalog at /.well-known/api-catalog (RFC 9727).

Lets crawlers and agents that land on the dashboard find the REST API.
It only links to the OpenAPI spec and the docs, so endpoint changes need no update here.
"""

from typing import Any

from fastapi import APIRouter
from starlette.responses import JSONResponse

API_CATALOG_PATH = "/.well-known/api-catalog"
LINKSET_MEDIA_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'


def build_linkset(backend_host: str, api_prefix: str, openapi_url: str, docs_url: str) -> dict[str, Any]:
    """
    Describe the API as an RFC 9264 linkset.

    The links are absolute, built from the configured public host,
    because the scheme the app sees behind the proxy may not be the public one.
    """
    host = backend_host.rstrip("/")
    api_prefix = api_prefix.rstrip("/")
    return {
        "linkset": [
            {
                "anchor": f"{host}{api_prefix}/",
                "service-desc": [{"href": f"{host}{openapi_url}", "type": "application/openapi+json"}],
                "service-doc": [{"href": f"{host}{docs_url}", "type": "text/html"}],
                "status": [{"href": f"{host}{api_prefix}/utils/health-check/", "type": "application/json"}],
            }
        ]
    }


def make_router(linkset: dict[str, Any]) -> APIRouter:
    """Serve the linkset at the well-known path, for GET and HEAD as RFC 9727 requires."""
    router = APIRouter(include_in_schema=False)

    @router.api_route(API_CATALOG_PATH, methods=["GET", "HEAD"])
    def api_catalog() -> JSONResponse:
        return JSONResponse(linkset, media_type=LINKSET_MEDIA_TYPE)

    return router
