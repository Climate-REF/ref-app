from fastapi import APIRouter

from ref_backend.api.routes import executions, metrics, results, utils

api_router = APIRouter()
api_router.include_router(metrics.router)
api_router.include_router(executions.router)
api_router.include_router(results.router)
api_router.include_router(utils.router)
