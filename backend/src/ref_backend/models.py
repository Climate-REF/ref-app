from collections.abc import Sequence
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar, Generic, Literal, TypeVar, Union

from attr import define
from loguru import logger
from pydantic import BaseModel, HttpUrl, computed_field
from sqlalchemy import func

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset
from climate_ref.models.execution import ResultOutputType
from climate_ref_core.metric_values import ScalarMetricValue
from ref_backend.core.diagnostic_metadata import (
    DiagnosticMetadata,
    ReferenceDatasetLink,
    load_diagnostic_metadata,
)
from ref_backend.core.json_utils import sanitize_float_list, sanitize_float_value

if TYPE_CHECKING:
    from ref_backend.api.deps import AppContext


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


class DiagnosticSummary(BaseModel):
    """
    Summary information about a diagnostic.

    A diagnostic is a specific metric or set of metrics calculated by a provider.
    Each diagnostic is associated may be associated with one CMIP Assessment Fast Track (AFT) diagnostics.
    """

    id: int
    """
    ID of the provider
    """
    provider: ProviderSummary
    """
    Summary of the provider that produces this provider
    """
    slug: str
    """
    Unique slug for the provider
    """
    name: str
    """
    Long name of the provider
    """
    description: str
    """
    Description of the diagnostic
    """
    execution_groups: list[int]
    """
    List of IDs for the provider executions associated with this provider
    """
    has_metric_values: bool
    """
    Whether any scalar or series metric values exist in the database for this diagnostic
    """
    has_scalar_values: bool
    """
    Whether any scalar metric values exist in the database for this diagnostic
    """
    has_series_values: bool
    """
    Whether any series metric values exist in the database for this diagnostic
    """
    execution_count: int
    """
    Total number of executions across all execution groups for this diagnostic
    """
    successful_execution_count: int
    """
    Number of successful executions across all execution groups for this diagnostic
    """
    execution_group_count: int
    """
    Number of execution groups for this diagnostic
    """
    successful_execution_group_count: int
    """
    Number of execution groups whose latest execution is successful
    """
    group_by: list[GroupBy]
    """
    Dimensions used for grouping datasets
    """
    aft_link: "AFTDiagnosticDetail | None"
    """
    Associated AFT diagnostics
    """
    reference_datasets: list[ReferenceDatasetLink] | None = None
    """
    Reference datasets used by this diagnostic (from metadata overrides)

    These are manually curated and may not be complete at this time.
    """
    tags: list[str] | None = None
    """
    Tags for categorizing the diagnostic (from metadata overrides)
    """

    # Cache for loaded diagnostic metadata (class variable)
    _metadata_cache: ClassVar[dict[str, DiagnosticMetadata] | None] = None

    @staticmethod
    def build(diagnostic: models.Diagnostic, app_context: "AppContext") -> "DiagnosticSummary":
        # Import here to avoid circular import issues
        from ref_backend.core.aft import get_aft_diagnostic_by_id, get_aft_for_ref_diagnostic

        # Load metadata YAML on first use (cached)
        if DiagnosticSummary._metadata_cache is None:
            metadata_path = app_context.settings.diagnostic_metadata_path_resolved
            DiagnosticSummary._metadata_cache = load_diagnostic_metadata(metadata_path)
            logger.debug(
                f"Loaded diagnostic metadata cache with {len(DiagnosticSummary._metadata_cache)} entries"
            )

        concrete_diagnostic = app_context.provider_registry.get_metric(
            diagnostic.provider.slug, diagnostic.slug
        )
        data_requirements = sorted(
            list(concrete_diagnostic.data_requirements),
            key=lambda dr: (dr[0].source_type.value if isinstance(dr, tuple) else dr.source_type.value),  # type: ignore
        )
        group_by_summary: list[GroupBy] = []
        for dr in data_requirements:
            if isinstance(dr, tuple):
                dr_ = dr[0]  # unwrap (DataRequirement, Optional[Any]) tuples to DataRequirement
            else:
                dr_ = dr
            # Normalize group_by to list[str] | None
            gb = list(dr_.group_by) if getattr(dr_, "group_by", None) is not None else None  # pyright: ignore
            group_by_summary.append(
                GroupBy(
                    source_type=dr_.source_type.value,  # pyright: ignore
                    group_by=gb,
                )
            )

        # Efficient existence check for both scalar and series metric values for this diagnostic
        has_scalar_values = (
            app_context.session.query(models.ScalarMetricValue)
            .join(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
            .first()
            is not None
        )

        has_series_values = (
            app_context.session.query(models.SeriesMetricValue)
            .join(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
            .first()
            is not None
        )

        has_metric_values = has_scalar_values or has_series_values

        # Execution counts for this diagnostic
        execution_count = (
            app_context.session.query(models.Execution)
            .join(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
            .count()
        )
        successful_execution_count = (
            app_context.session.query(models.Execution)
            .join(models.ExecutionGroup)
            .filter(
                models.ExecutionGroup.diagnostic_id == diagnostic.id,
                models.Execution.successful.is_(True),
            )
            .count()
        )

        # Execution group counts for this diagnostic
        execution_group_count = (
            app_context.session.query(models.ExecutionGroup)
            .filter(models.ExecutionGroup.diagnostic_id == diagnostic.id)
            .count()
        )

        # Count execution groups whose latest execution is successful.
        # We define "currently successful" as groups
        # with at least one execution and the last (max id) successful.
        ExecutionGroup = models.ExecutionGroup
        Execution = models.Execution

        # Subquery: latest execution id per group
        latest_exec_per_group = (
            app_context.session.query(
                Execution.execution_group_id.label("egid"),
                func.max(Execution.id).label("latest_exec_id"),
            )
            .join(ExecutionGroup, Execution.execution_group_id == ExecutionGroup.id)
            .filter(ExecutionGroup.diagnostic_id == diagnostic.id)
            .group_by(Execution.execution_group_id)
            .subquery()
        )

        # Join back to executions to check success of latest
        successful_execution_group_count = (
            app_context.session.query(Execution)
            .join(
                latest_exec_per_group,
                Execution.id == latest_exec_per_group.c.latest_exec_id,
            )
            .filter(Execution.successful.is_(True))
            .count()
        )

        aft_id = get_aft_for_ref_diagnostic(diagnostic.provider.slug, diagnostic.slug)

        if aft_id:
            aft = get_aft_diagnostic_by_id(aft_id)
        else:
            logger.warning(f"No AFT found for diagnostic {diagnostic.provider.slug}/{diagnostic.slug}")
            aft = None

        # Build the base diagnostic summary
        summary = DiagnosticSummary(
            id=diagnostic.id,
            provider=ProviderSummary.build(diagnostic.provider),
            slug=diagnostic.slug,
            name=diagnostic.name,
            description=concrete_diagnostic.__doc__ or "",
            execution_groups=[e.id for e in diagnostic.execution_groups],
            has_metric_values=has_metric_values,
            has_scalar_values=has_scalar_values,
            has_series_values=has_series_values,
            execution_count=execution_count,
            successful_execution_count=successful_execution_count,
            execution_group_count=execution_group_count,
            successful_execution_group_count=successful_execution_group_count,
            group_by=group_by_summary,
            aft_link=aft,
        )

        # Apply metadata overrides from YAML if available
        diagnostic_key = f"{diagnostic.provider.slug}/{diagnostic.slug}"
        if diagnostic_key in DiagnosticSummary._metadata_cache:
            metadata = DiagnosticSummary._metadata_cache[diagnostic_key]

            # Apply overrides: YAML values override database values
            if metadata.display_name is not None:
                summary.name = metadata.display_name
            if metadata.reference_datasets is not None:
                summary.reference_datasets = metadata.reference_datasets
            if metadata.tags is not None:
                summary.tags = metadata.tags

            logger.debug(f"Applied metadata overrides for diagnostic {diagnostic_key}")

        return summary


class ExecutionOutput(BaseModel):
    id: int
    execution_id: int
    output_type: ResultOutputType
    filename: str
    short_name: str
    long_name: str
    description: str
    created_at: datetime
    updated_at: datetime
    url: str

    @staticmethod
    def build(output: models.ExecutionOutput, app_context: "AppContext") -> "ExecutionOutput":
        return ExecutionOutput(
            id=output.id,
            execution_id=output.execution_id,
            output_type=output.output_type,
            filename=output.filename,
            short_name=output.short_name,
            long_name=output.long_name,
            description=output.description,
            created_at=output.created_at,
            updated_at=output.updated_at,
            url=f"{app_context.settings.BACKEND_HOST}{app_context.settings.API_V1_STR}/results/{output.id}",
        )


class ExecutionGroup(BaseModel):
    id: int
    key: str
    dirty: bool
    executions: "list[Execution]"
    latest_execution: "Execution | None"
    selectors: dict[str, tuple[tuple[str, str], ...]]
    diagnostic: DiagnosticSummary
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def build(
        execution_group: models.ExecutionGroup,
        app_context: "AppContext",
        diagnostic_summary: "DiagnosticSummary | None" = None,
    ) -> "ExecutionGroup":
        latest_execution = None
        if len(execution_group.executions):
            latest_execution = execution_group.executions[-1]

        # Reuse a precomputed DiagnosticSummary when provided to avoid N+1 DB queries
        diagnostic = diagnostic_summary or DiagnosticSummary.build(execution_group.diagnostic, app_context)

        return ExecutionGroup(
            id=execution_group.id,
            key=execution_group.key,
            dirty=execution_group.dirty,
            executions=[Execution.build(r, app_context) for r in execution_group.executions],
            latest_execution=Execution.build(latest_execution, app_context) if latest_execution else None,
            selectors=execution_group.selectors,
            diagnostic=diagnostic,
            created_at=execution_group.created_at,
            updated_at=execution_group.updated_at,
        )


class Execution(BaseModel):
    id: int
    dataset_hash: str
    dataset_count: int
    successful: bool
    retracted: bool
    created_at: datetime
    updated_at: datetime
    outputs: "list[ExecutionOutput]"

    @staticmethod
    def build(execution: models.Execution, app_context: "AppContext") -> "Execution":
        outputs = [ExecutionOutput.build(o, app_context) for o in execution.outputs]
        return Execution(
            id=execution.id,
            successful=execution.successful or False,
            retracted=execution.retracted,
            dataset_hash=execution.dataset_hash,
            dataset_count=len(execution.datasets),
            updated_at=execution.updated_at,
            created_at=execution.created_at,
            outputs=outputs,
        )


class ExecutionGroupSummary(BaseModel):
    data: list[ExecutionGroup]
    count: int


class CMIP6DatasetMetadata(BaseModel):
    variable_id: str
    source_id: str
    experiment_id: str
    variant_label: str


class Dataset(BaseModel):
    id: int
    slug: str
    dataset_type: str
    metadata: CMIP6DatasetMetadata | None

    @computed_field  # type: ignore
    @property
    def more_info_url(self) -> str | None:
        if "cmip6" in self.dataset_type:
            # Use the WDC service to look up the dataset
            return f"https://www.wdc-climate.de/ui/cmip6?input={self.slug}"
        return None

    @staticmethod
    def build(dataset: models.Dataset) -> "Dataset":
        if isinstance(dataset, CMIP6Dataset):
            metadata = CMIP6DatasetMetadata(
                variable_id=dataset.variable_id,
                source_id=dataset.source_id,
                experiment_id=dataset.experiment_id,
                variant_label=dataset.variant_label,
            )
        else:
            metadata = None

        return Dataset(
            id=dataset.id,
            slug=dataset.slug,
            dataset_type=str(dataset.dataset_type),
            metadata=metadata,
        )


class MetricValue(ScalarMetricValue):
    """
    A flattened representation of a scalar diagnostic value

    This includes the dimensions and the value of the diagnostic
    """

    execution_group_id: int
    execution_id: int
    is_outlier: bool | None = None
    verification_status: Literal["verified", "unverified"] | None = None


class SeriesValue(BaseModel):
    """
    A flattened representation of a series diagnostic value

    This includes the dimensions, values array, index array, and index name
    """

    dimensions: dict[str, str]
    values: list[float | None]
    index: list[Union[str, float]] | None = None
    index_name: str | None = None
    attributes: dict[str, Union[str, float]] | None = None
    execution_group_id: int
    execution_id: int


class Facet(BaseModel):
    key: str
    values: list[str]


@define
class AnnotatedScalarValue:
    value: models.ScalarMetricValue
    is_outlier: bool | None = None
    verification_status: Literal["verified", "unverified"] | None = None


class MetricValueCollection(BaseModel):
    data: Sequence[MetricValue | SeriesValue]
    count: int
    facets: list[Facet]
    types: list[str]  # List of types present: 'scalar', 'series', or both
    had_outliers: bool | None = None
    outlier_count: int | None = None

    @staticmethod
    def build(
        scalar_values: list[AnnotatedScalarValue] | None = None,
        series_values: list[models.SeriesMetricValue] | None = None,
        had_outliers: bool | None = None,
        outlier_count: int | None = None,
    ) -> "MetricValueCollection":
        """Build a MetricValueCollection from scalar and/or series values"""
        scalar_values = scalar_values or []
        series_values = series_values or []

        # TODO: Query this using SQL
        facets: dict[str, set[str]] = {}
        all_data: list[MetricValue | SeriesValue] = []
        types_present = set()

        # Process scalar values
        for item in scalar_values:
            print(item)
            v = item.value
            for key, value in v.dimensions.items():
                if key in facets:
                    facets[key].add(value)
                else:
                    facets[key] = {value}
            all_data.append(
                MetricValue(
                    dimensions=v.dimensions,
                    attributes=v.attributes,
                    value=sanitize_float_value(float(v.value)),
                    execution_group_id=v.execution.execution_group_id,
                    execution_id=v.execution_id,
                    is_outlier=item.is_outlier,
                )
            )
            types_present.add("scalar")

        # Process series values
        for series in series_values:
            for key, value in series.dimensions.items():
                if key in facets:
                    facets[key].add(value)
                else:
                    facets[key] = {value}

            all_data.append(
                SeriesValue(
                    dimensions=series.dimensions,
                    attributes=series.attributes,
                    values=sanitize_float_list(series.values or []),
                    index=series.index,
                    index_name=series.index_name,
                    execution_group_id=series.execution.execution_group_id,
                    execution_id=series.execution_id,
                )
            )
            types_present.add("series")

        return MetricValueCollection(
            data=all_data,
            count=len(all_data),
            facets=[
                Facet(key=facet_key, values=list(facet_values)) for facet_key, facet_values in facets.items()
            ],
            types=sorted(list(types_present)),
            had_outliers=had_outliers,
            outlier_count=outlier_count,
        )


class MetricValueComparison(BaseModel):
    """
    A comparison of metric values for a specific source against n ensemble.
    """

    source: MetricValueCollection
    """
    Metric values for the specified source_id.
    """
    ensemble: MetricValueCollection
    """
    Metric values for all other source_ids in the execution group.
    """


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


class ExecutionStats(BaseModel):
    """
    Statistics for execution groups and their success rates.
    """

    total_execution_groups: int
    """
    Total number of execution groups in the database.
    """
    successful_execution_groups: int
    """
    Number of execution groups whose latest execution was successful.
    """
    failed_execution_groups: int
    """
    Number of execution groups whose latest execution was not successful.
    """
    scalar_value_count: int
    """
    Number of scalar metric values available.
    """
    series_value_count: int
    """
    Number of series metric values available.
    """
    total_datasets: int
    """
    Total number of datasets tracked in the database.
    """
    total_files: int
    """
    Total number of files tracked across all datasets.
    """

    @computed_field  # type: ignore
    @property
    def success_rate_percentage(self) -> float:
        """
        Success rate as a percentage (0-100).
        """
        if self.total_execution_groups == 0:
            return 0.0
        return round((self.successful_execution_groups / self.total_execution_groups) * 100, 1)


class AFTDiagnosticBase(BaseModel):
    """CMIP7 Assessment Fast Track (AFT) diagnostic metadata.

    This represents the diagnostic metadata as defined by the Model Benchmarking Task Team,
    and approved by CMIP Panel.
    """

    id: str
    name: str
    theme: str | None
    version_control: str | None
    reference_dataset: str | None
    endorser: str | None
    provider_link: HttpUrl | None
    description: str | None
    short_description: str | None


class AFTDiagnosticSummary(AFTDiagnosticBase):
    pass


class RefDiagnosticLink(BaseModel):
    """Link to a specific diagnostic calculated by a provider."""

    provider_slug: str
    diagnostic_slug: str


class AFTDiagnosticDetail(AFTDiagnosticBase):
    diagnostics: list[RefDiagnosticLink]
