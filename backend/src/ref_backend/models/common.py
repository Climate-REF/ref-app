"""Shared response wrappers and small summaries used across the API."""

from collections.abc import Sequence
from typing import Any, Generic, TypeVar

import attrs
from pydantic import BaseModel, computed_field

from climate_ref import models
from climate_ref.results.diagnostics import DiagnosticView

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


class GroupCounts(BaseModel):
    """
    How many execution groups are running, failed, succeeded or not started.

    Each group is counted once, by the outcome of its latest execution,
    so `successful + failed + running + not_started == total`.
    `dirty` overlaps the others.
    """

    total: int
    successful: int
    failed: int
    running: int
    not_started: int
    dirty: int
    """
    Groups whose inputs have changed, so they need to be run again
    """

    @staticmethod
    def of(view: DiagnosticView | None) -> "GroupCounts":
        """Convert a diagnostic's counts from the reader, with `None` for one that has no groups."""
        if view is None:
            return GroupCounts.summed([])
        return GroupCounts.model_validate(attrs.asdict(view.groups))

    @staticmethod
    def summed(rows: Sequence[Any]) -> "GroupCounts":
        """Add up the per-diagnostic rows of `select_group_counts`."""
        return GroupCounts(
            total=sum(row.group_count for row in rows),
            **{name: sum(getattr(row, name) for row in rows) for name in _OUTCOMES},
        )


_OUTCOMES = ("successful", "failed", "running", "not_started", "dirty")
