from fastapi import APIRouter

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
async def health_check() -> bool:
    return True


# @router.get("/cv")
# async def list_cv(
#     cv: CVDep,
# ) -> CV:
#     """
#     List the most recent executions
#     """
#     return cv
