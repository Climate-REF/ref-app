import inspect

from fastapi.routing import APIRoute

from ref_backend.api.main import api_router


def test_api_routes_run_in_threadpool():
    # The database layer blocks, so an async endpoint would stall every request on its worker.
    async_routes = [
        route.path
        for route in api_router.routes
        if isinstance(route, APIRoute) and inspect.iscoroutinefunction(route.endpoint)
    ]

    assert async_routes == []
