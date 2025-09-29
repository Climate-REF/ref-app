from fastapi import APIRouter

from ref_backend.api.routes import aft, datasets, diagnostics, executions, results, utils

api_router = APIRouter()
api_router.include_router(aft.router)
api_router.include_router(datasets.router)
api_router.include_router(diagnostics.router)
api_router.include_router(executions.router)
api_router.include_router(results.router)
api_router.include_router(utils.router)
