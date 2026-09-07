"""
Route reporting what is actually deployed

Not included in the schema: it is an operator diagnostic, not part of the public API.
The build stamps here are the same values the wide events carry.
"""

import os
from importlib.metadata import version

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/deploy", include_in_schema=False)


class DeployInfo(BaseModel):
    """
    Information about the running deployment
    """

    version: str
    git_commit: str | None
    image_tag: str | None
    build_time: str | None


@router.get("/info")
def deploy_info() -> DeployInfo:
    """
    Return the version and build stamps baked into the image
    """
    return DeployInfo(
        version=version("ref-backend"),
        git_commit=os.environ.get("GIT_COMMIT") or None,
        image_tag=os.environ.get("IMAGE_TAG") or None,
        build_time=os.environ.get("BUILD_TIME") or None,
    )
