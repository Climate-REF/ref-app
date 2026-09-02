from importlib.metadata import version

from fastapi import APIRouter
from sqlalchemy import func, select

from climate_ref.models import ExecutionGroup
from ref_backend.api.deps import SessionDep, SettingsDep
from ref_backend.models import About

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
async def health_check() -> bool:
    return True


@router.get("/about")
async def about(session: SessionDep, settings: SettingsDep) -> About:
    """
    Version and freshness information about the deployment serving this API
    """
    last_updated = session.scalar(select(func.max(ExecutionGroup.updated_at)))

    return About(
        app_version=version("ref-backend"),
        ref_version=version("climate-ref"),
        last_updated=last_updated,
        environment=settings.ENVIRONMENT,
    )


# @router.get("/cv")
# async def list_cv(
#     cv: CVDep,
# ) -> CV:
#     """
#     List the most recent executions
#     """
#     return cv
