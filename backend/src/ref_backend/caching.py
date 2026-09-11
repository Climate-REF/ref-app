"""
Cache-Control policy for every response the app serves.

dashboard.climate-ref.org is fronted by Cloudflare, which handles the caching according to the headers we set.
"""

from starlette import status
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

NO_STORE = "no-store"
IMMUTABLE = "public, max-age=31536000, immutable"
# Unhashed static files such as favicons and the manifest.
STATIC_ONE_HOUR = "public, max-age=3600"

# Live status, and answers that change on every deploy.
UNCACHED_PATHS = frozenset(
    {
        "/metrics",
        "/api/v1/utils/health-check/",
        "/api/v1/utils/about",
    }
)


class CacheControlMiddleware:
    """
    Sets ``Cache-Control`` on successful responses that did not choose their own.

    HTML is decided by ``SPAStaticFiles``, which marks it ``no-cache`` before this runs.
    """

    def __init__(self, app: ASGIApp, api_prefix: str, api_max_age: int, results_max_age: int):
        self.app = app
        self.api_prefix = api_prefix.rstrip("/") + "/"
        self.results_prefix = self.api_prefix + "results/"
        self.api_max_age = api_max_age
        self.results_max_age = results_max_age

    def policy(self, method: str, path: str) -> str:
        if method not in ("GET", "HEAD"):
            return NO_STORE
        if path in UNCACHED_PATHS:
            return NO_STORE
        if path.startswith("/assets/"):
            return IMMUTABLE
        if path.startswith(self.results_prefix):
            return f"public, max-age={self.results_max_age}"
        if path.startswith(self.api_prefix):
            return f"public, max-age={self.api_max_age}"
        return STATIC_ONE_HOUR

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        policy = self.policy(scope["method"], scope["path"])

        async def send_with_policy(message: Message) -> None:
            if message["type"] == "http.response.start" and message["status"] == status.HTTP_200_OK:
                headers = MutableHeaders(scope=message)
                if "cache-control" not in headers:
                    headers["cache-control"] = policy
            await send(message)

        await self.app(scope, receive, send_with_policy)
