"""
Cache-Control policy for every response the app serves.

dashboard.climate-ref.org is fronted by Cloudflare, which handles the caching according to the headers we set.
"""

from starlette import status
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

NO_STORE = "no-store"
NO_CACHE = "no-cache"
IMMUTABLE = "public, max-age=31536000, immutable"
# Unhashed static files such as favicons and the manifest.
STATIC_ONE_HOUR = "public, max-age=3600"

# Live status, and answers that change on every deploy.
UNCACHED_API_PATHS = ("utils/health-check/", "utils/about")


class CacheControlMiddleware:
    """
    Sets ``Cache-Control`` on successful responses that did not choose their own.

    HTML names hashed asset files that the next deploy removes, so it is always revalidated.
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
            # A CORS preflight keeps its own Access-Control-Max-Age, anything else is a write.
            return None if method == "OPTIONS" else NO_STORE
        if path in self.uncached_paths:
            return NO_STORE
        if path.startswith("/assets/"):
            return IMMUTABLE
        if path.startswith(self.results_prefix):
            return self.results_policy
        if path.startswith(self.api_prefix):
            return self.api_policy
        return STATIC_ONE_HOUR

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        policy = self.policy(scope["method"], scope["path"])
        if policy is None:
            await self.app(scope, receive, send)
            return

        async def send_with_policy(message: Message) -> None:
            if message["type"] == "http.response.start" and message["status"] == status.HTTP_200_OK:
                headers = MutableHeaders(scope=message)
                if "cache-control" not in headers:
                    is_html = headers.get("content-type", "").startswith("text/html")
                    headers["cache-control"] = NO_CACHE if is_html else policy
            await send(message)

        await self.app(scope, receive, send_with_policy)
