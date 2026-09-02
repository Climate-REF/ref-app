"""Version and freshness information about the running deployment."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class About(BaseModel):
    app_version: str
    """Version of the ref-app that is serving this API."""

    ref_version: str
    """Version of the climate-ref package that the results were read with."""

    last_updated: datetime | None
    """When an execution group was last updated, or None if there are no executions."""

    environment: Literal["local", "staging", "production"]
    """
    The deployment this API is serving.

    Anything other than production is a staging site, where the frontend drops the sample-size
    floor so results from one or two models are still plotted.
    """
