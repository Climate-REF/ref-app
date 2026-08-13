"""Shared response wrappers and small summaries used across the API."""

from typing import Generic, TypeVar

from pydantic import BaseModel, computed_field

from climate_ref import models

T = TypeVar("T")


class Collection(BaseModel, Generic[T]):
    data: list[T]
    total_count: int | None = None

    @computed_field  # type: ignore
    @property
    def count(self) -> int:
        """
        Number of data items present
        """
        return len(self.data)


class ProviderSummary(BaseModel):
    """
    Summary information about a Metric Provider.

    The diagnostic provider is the framework that was used to generate a set of metrics.
    """

    slug: str
    name: str

    @staticmethod
    def build(provider: models.Provider) -> "ProviderSummary":
        return ProviderSummary(
            slug=provider.slug,
            name=provider.name,
        )


class GroupBy(BaseModel):
    source_type: str
    group_by: list[str] | None
