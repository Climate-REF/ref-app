"""
Cache-Control and Vary policy for every response the app serves.

dashboard.climate-ref.org is fronted by Cloudflare, which handles the caching according to the headers we set.
"""

from starlette import status
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

NO_STORE = "no-store"
NO_CACHE = "no-cache"
IMMUTABLE = "public, max-age=31536000, immutable"
# Unhashed static files such as favicons and the manifest.
STATIC_DEFAULT = "public, max-age=3600"

# Live status, and answers that change on every deploy.
UNCACHED_API_PATHS = ("utils/health-check/", "utils/about")


def _vary_names(vary: str) -> set[str]:
    return {name.strip().lower() for name in vary.split(",")}


class CacheControlMiddleware:
    """
    Sets ``Cache-Control`` on responses that did not choose their own, and ``Vary: Origin`` on the API.

    HTML pages name hashed asset files that the next deploy removes, so they are always revalidated.
    """

    def __init__(self, app: ASGIApp, api_prefix: str, api_max_age: int, results_max_age: int):
        self.app = app
        self.api_prefix = api_prefix.rstrip("/") + "/"
        self.results_prefix = self.api_prefix + "results/"
        self.uncached_paths = frozenset({"/metrics", *(self.api_prefix + p for p in UNCACHED_API_PATHS)})
        self.api_policy = f"public, max-age={api_max_age}"
        self.results_policy = f"public, max-age={results_max_age}"

    def policy(self, method: str, path: str) -> str | None:
        if method not in ("GET", "HEAD"):
            # A CORS preflight keeps its own Access-Control-Max-Age.
            return None if method == "OPTIONS" else NO_STORE
        if path in self.uncached_paths:
            return NO_STORE
        if path.startswith("/assets/"):
            return IMMUTABLE
        if path.startswith(self.results_prefix):
            return self.results_policy
        if path.startswith(self.api_prefix):
            return self.api_policy
        return STATIC_DEFAULT

    @staticmethod
    def header_value(policy: str, status_code: int, content_type: str) -> str | None:
        """Return the header for one response, or None when the status should keep its own caching."""
        if policy == NO_STORE or status_code >= status.HTTP_400_BAD_REQUEST:
            return NO_STORE
        if status_code != status.HTTP_200_OK:
            return None
        # Only pages are HTML on the static surface. An HTML result file is still a result.
        if policy == STATIC_DEFAULT and content_type.startswith("text/html"):
            return NO_CACHE
        return policy

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]
        policy = self.policy(scope["method"], path)
        if policy is None:
            await self.app(scope, receive, send)
            return
        is_api = path.startswith(self.api_prefix)

        async def send_with_policy(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                value = self.header_value(policy, message["status"], headers.get("content-type", ""))
                if value is not None and "cache-control" not in headers:
                    headers["cache-control"] = value
                # CORS reflects the caller's origin, so the edge must keep one copy per origin.
                if is_api and "origin" not in _vary_names(headers.get("vary", "")):
                    headers.add_vary_header("Origin")
            await send(message)

        await self.app(scope, receive, send_with_policy)
