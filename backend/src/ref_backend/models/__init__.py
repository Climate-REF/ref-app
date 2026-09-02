"""
Pydantic representations of the REF data, as served by the API.

These are the response models for the API, and drive the generated frontend client.
They are deliberately separate from the SQLAlchemy models in `climate_ref.models`.
"""

from ref_backend.core.resource_usage import ExecutionResourceSummary
from ref_backend.models.aft import (
    AFTDiagnosticBase,
    AFTDiagnosticDetail,
    AFTDiagnosticSummary,
    RefDiagnosticLink,
)
from ref_backend.models.common import Collection, GroupBy, ProviderSummary, T
from ref_backend.models.datasets import CMIPDatasetMetadata, Dataset
from ref_backend.models.diagnostics import DiagnosticSummary
from ref_backend.models.executions import (
    Execution,
    ExecutionGroup,
    ExecutionOutput,
    ExecutionStats,
)
from ref_backend.models.values import (
    NON_FACET_DIMENSIONS,
    Facet,
    MetricValueCollection,
    MetricValueFacetSummary,
    ScalarValue,
    SeriesValue,
)

__all__ = [
    "NON_FACET_DIMENSIONS",
    "AFTDiagnosticBase",
    "AFTDiagnosticDetail",
    "AFTDiagnosticSummary",
    "CMIPDatasetMetadata",
    "Collection",
    "Dataset",
    "DiagnosticSummary",
    "Execution",
    "ExecutionGroup",
    "ExecutionOutput",
    "ExecutionResourceSummary",
    "ExecutionStats",
    "Facet",
    "GroupBy",
    "MetricValueCollection",
    "MetricValueFacetSummary",
    "ProviderSummary",
    "RefDiagnosticLink",
    "ScalarValue",
    "SeriesValue",
    "T",
]
