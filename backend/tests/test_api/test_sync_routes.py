import importlib
import inspect
import pkgutil

from fastapi.routing import APIRoute

from ref_backend.api import routes


def test_api_routes_run_in_threadpool():
    # The database layer blocks, so an async endpoint would stall every request on its worker.
    api_routes = [
        route
        for module in pkgutil.iter_modules(routes.__path__)
        for route in importlib.import_module(f"{routes.__name__}.{module.name}").router.routes
        if isinstance(route, APIRoute)
    ]

    assert api_routes
    assert [route.path for route in api_routes if inspect.iscoroutinefunction(route.endpoint)] == []
