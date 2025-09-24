from collections.abc import Callable
from contextvars import ContextVar
from typing import Any

from sqlalchemy import Engine
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from .action import Action
from .statistics import AlchemyStatistics

class SQLAlchemyMonitor(BaseHTTPMiddleware):
    request_context: ContextVar[AlchemyStatistics | None]

    def __init__(
        self,
        app: ASGIApp,
        engine: Engine | AsyncEngine | None = None,
        engine_factory: Callable[[], Engine | AsyncEngine] | None = None,
        actions: list[Action] | None = None,
        allow_no_request_context: bool = False,
    ) -> None: ...
    def init_statistics(self) -> None: ...
    @property
    def statistics(self) -> AlchemyStatistics | None: ...
    def before_cursor_execute(
        self,
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None: ...
    def after_cursor_execute(
        self,
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None: ...
    def on_do_orm_execute(self, orm_execute_state: Any) -> None: ...
    async def dispatch(self, request: Request, call_next: Callable[..., Any]) -> Any: ...
    async def _dispatch(self, request: Request, call_next: Callable[..., Any]) -> Any: ...
    def _register_listener(self, engine: Engine | AsyncEngine) -> Engine: ...
