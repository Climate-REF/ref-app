"""Scalar and series metric values, and the collections that wrap them."""

from collections.abc import Sequence
from typing import TYPE_CHECKING, Literal, Union, cast

from attr import define
from pydantic import BaseModel

from climate_ref import models
from climate_ref_core.metric_values import ScalarMetricValue
from ref_backend.core.json_utils import sanitize_float_list, sanitize_float_value

if TYPE_CHECKING:
    from climate_ref.results.values import ScalarValueCollection, SeriesValueCollection


class ScalarValue(ScalarMetricValue):
    """
    A flattened representation of a scalar diagnostic value

    This includes the dimensions and the value of the diagnostic
    """

    id: int
    execution_group_id: int
    execution_id: int
    is_outlier: bool | None = None
    verification_status: Literal["verified", "unverified"] | None = None


class SeriesValue(BaseModel):
    """
    A flattened representation of a series diagnostic value

    This includes the dimensions, values array, index array, and index name
    """

    id: int
    dimensions: dict[str, str]
    values: list[float | None]
    index: list[Union[str, float]] | None = None
    index_name: str | None = None
    attributes: dict[str, Union[str, float]] | None = None
    execution_group_id: int
    execution_id: int
    kind: Literal["model", "reference"] = "model"
    reference_id: str | None = None
    value_units: str | None = None
    value_long_name: str | None = None
    index_units: str | None = None
    calendar: str | None = None


class Facet(BaseModel):
    key: str
    values: list[str]


# ``kind`` is a CV dimension but is surfaced as a dedicated ``kind`` field on each value and
# excluded from the per-item ``dimensions`` mapping (see climate_ref ScalarValue.dimensions).
# Offering it as a facet would let callers filter on a key that never appears in item dimensions,
# so it is excluded to keep facets a subset of the item dimensions.
NON_FACET_DIMENSIONS = frozenset({"kind"})


@define
class AnnotatedScalarValue:
    value: models.ScalarMetricValue
    is_outlier: bool | None = None
    verification_status: Literal["verified", "unverified"] | None = None


_PRESENTATION_ATTRIBUTE_FALLBACKS: dict[str, tuple[str, ...]] = {
    "value_units": ("value_units", "units"),
    "value_long_name": ("value_long_name", "long_name"),
    "index_units": ("index_units",),
    "calendar": ("calendar",),
}


def _normalize_presentation_attributes(
    attributes: dict[str, Union[str, float]] | None,
) -> dict[str, str | None]:
    """
    Normalise provider-specific presentation attribute keys to the shared names.

    Providers disagree on attribute keys (ESMValTool already uses the target
    names, ILAMB uses ``units``/``long_name``), so the first present key in
    each fallback chain wins; a series with no matching key surfaces ``None``.
    """
    attributes = attributes or {}
    normalized: dict[str, str | None] = {}
    for target, fallback_keys in _PRESENTATION_ATTRIBUTE_FALLBACKS.items():
        value: str | None = None
        for key in fallback_keys:
            if key in attributes and attributes[key] is not None:
                value = str(attributes[key])
                break
        normalized[target] = value
    return normalized


class MetricValueCollection(BaseModel):
    data: Sequence[ScalarValue | SeriesValue]
    count: int
    total_count: int
    facets: list[Facet]
    types: list[str]  # List of types present: 'scalar' or 'series'
    had_outliers: bool | None = None
    outlier_count: int | None = None

    @staticmethod
    def build_scalar_from_reader(
        collection: "ScalarValueCollection",
        detection_ran: bool,
    ) -> "MetricValueCollection":
        """Build a MetricValueCollection from a reader scalar collection."""
        all_data: list[ScalarValue] = [
            ScalarValue(
                id=item.id,
                dimensions=dict(item.dimensions),
                attributes=dict(item.attributes) if item.attributes else None,
                kind=cast('Literal["model", "reference"]', item.kind),
                value=sanitize_float_value(float(cast(float, item.value))),
                execution_group_id=item.execution_group_id,
                execution_id=item.execution_id,
                is_outlier=item.is_outlier,
                verification_status=cast(
                    'Literal["verified", "unverified"] | None', item.verification_status
                ),
            )
            for item in collection.items
        ]

        facets = [
            Facet(key=f.key, values=list(f.values))
            for f in collection.facets
            if f.key not in NON_FACET_DIMENSIONS
        ]

        return MetricValueCollection(
            data=all_data,
            count=len(all_data),
            total_count=collection.total_count,
            facets=facets,
            types=["scalar"],
            had_outliers=collection.had_outliers if detection_ran else None,
            outlier_count=collection.outlier_count if detection_ran else None,
        )

    @staticmethod
    def build_series_from_reader(
        collection: "SeriesValueCollection",
    ) -> "MetricValueCollection":
        """Build a MetricValueCollection from a reader series collection."""
        all_data: list[ScalarValue | SeriesValue] = []
        for item in collection.items:
            attributes = dict(item.attributes) if item.attributes else None
            all_data.append(
                SeriesValue(
                    id=item.id,
                    dimensions=dict(item.dimensions),
                    attributes=attributes,
                    values=sanitize_float_list(list(item.values or [])),
                    index=list(item.index) if item.index is not None else None,
                    index_name=item.index_name,
                    execution_group_id=item.execution_group_id,
                    execution_id=item.execution_id,
                    kind=cast('Literal["model", "reference"]', item.kind),
                    reference_id=item.reference_id,
                    **_normalize_presentation_attributes(attributes),
                )
            )

        facets = [
            Facet(key=f.key, values=list(f.values))
            for f in collection.facets
            if f.key not in NON_FACET_DIMENSIONS
        ]

        return MetricValueCollection(
            data=all_data,
            count=len(all_data),
            total_count=collection.total_count,
            facets=facets,
            types=["series"],
            had_outliers=None,
            outlier_count=None,
        )


class MetricValueFacetSummary(BaseModel):
    """
    Summary of the dimensions used in a metric value collection.
    """

    dimensions: dict[str, list[str]]
    """
    Dimensions and their unique values for the current filter
    """
    count: int
    """
    Number of metric values with the current filter
    """
