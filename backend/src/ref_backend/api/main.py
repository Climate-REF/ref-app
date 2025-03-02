from fastapi import APIRouter

from ref_backend.api.routes import  utils

api_router = APIRouter()
api_router.include_router(utils.router, tags=["utils"])

