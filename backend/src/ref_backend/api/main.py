from fastapi import APIRouter

from ref_backend.api.routes import  utils, executions

api_router = APIRouter()
api_router.include_router(utils.router)
api_router.include_router(executions.router)

