"""Version and freshness information about the running deployment."""

from datetime import datetime

from pydantic import BaseModel


class About(BaseModel):
    """
    Version and freshness information about the deployment serving this API.
    """

    app_version: str
    """Version of the ref-app that is serving this API."""

    ref_version: str
    """Version of the climate-ref package that the results were read with."""

    last_updated: datetime | None
    """When an execution group was last updated, or None if there are no executions."""
