"""
Pydantic representations of the REF data, as served by the API.

These are the response models for the API, and drive the generated frontend client.
They are deliberately separate from the SQLAlchemy models in `climate_ref.models`.
"""

from ref_backend.models.about import About
from ref_backend.models.aft import (
    AFTDiagnosticBase,
    AFTDiagnosticDetail,
    AFTDiagnosticSummary,
    RefDiagnosticLink,
)
from ref_backend.models.common import Collection, GroupBy, ProviderSummary, T
from ref_backend.models.datasets import CMIPDatasetMetadata, Dataset
from ref_backend.models.diagnostics import DiagnosticSummary, DiagnosticValueFlags
from ref_backend.models.executions import (
    Execution,
    ExecutionGroup,
    ExecutionOutput,
    ExecutionStats,
)
from ref_backend.models.model_runs import (
    DiagnosticRuns,
    EnsembleComparison,
    EnsembleStatistics,
    FailedRun,
    ModelDetail,
    ModelSummary,
    RunCounts,
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
    "About",
    "CMIPDatasetMetadata",
    "Collection",
    "Dataset",
    "DiagnosticRuns",
    "DiagnosticSummary",
    "DiagnosticValueFlags",
    "EnsembleComparison",
    "EnsembleStatistics",
    "Execution",
    "ExecutionGroup",
    "ExecutionOutput",
    "ExecutionStats",
    "Facet",
    "FailedRun",
    "GroupBy",
    "MetricValueCollection",
    "MetricValueFacetSummary",
    "ModelDetail",
    "ModelSummary",
    "ProviderSummary",
    "RefDiagnosticLink",
    "RunCounts",
    "ScalarValue",
    "SeriesValue",
    "T",
]
