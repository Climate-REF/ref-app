from datetime import datetime
from typing import TYPE_CHECKING, Generic, TypeVar

from pydantic import BaseModel, computed_field

from climate_ref import models
from climate_ref.models.dataset import CMIP6Dataset
from climate_ref.models.execution import ResultOutputType
from climate_ref_core.metric_values import ScalarMetricValue

if TYPE_CHECKING:
    from ref_backend.api.deps import AppContext


T = TypeVar("T")


class Collection(BaseModel, Generic[T]):
    data: list[T]
    total_count: int | None = None

    @computed_field
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
    A unique provider
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

    group_by: list[GroupBy]
    """
    Dimensions used for grouping datasets
    """

    @staticmethod
    def build(
        diagnostic: models.Diagnostic, app_context: "AppContext"
    ) -> "DiagnosticSummary":
        concrete_diagnostic = app_context.provider_registry.get_metric(
            diagnostic.provider.slug, diagnostic.slug
        )
        data_requirements = sorted(
            concrete_diagnostic.data_requirements,
            key=lambda dr: dr[0].source_type.value
            if isinstance(dr, tuple)
            else dr.source_type.value,
        )
        group_by_summary = [
            GroupBy(source_type=dr[0].source_type.value, group_by=dr[0].group_by)
            if isinstance(dr, tuple)
            else GroupBy(source_type=dr.source_type.value, group_by=dr.group_by)
            for dr in data_requirements
        ]

        return DiagnosticSummary(
            id=diagnostic.id,
            provider=ProviderSummary.build(diagnostic.provider),
            slug=diagnostic.slug,
            name=diagnostic.name,
            description=concrete_diagnostic.__doc__,
            execution_groups=[e.id for e in diagnostic.execution_groups],
            group_by=group_by_summary,
        )


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
    def build(
        output: models.ExecutionOutput, app_context: "AppContext"
    ) -> "ExecutionOutput":
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
        execution_group: models.ExecutionGroup, app_context: "AppContext"
    ) -> "ExecutionGroup":
        latest_execution = None
        if len(execution_group.executions):
            latest_execution = execution_group.executions[-1]

        return ExecutionGroup(
            id=execution_group.id,
            key=execution_group.key,
            dirty=execution_group.dirty,
            executions=[
                Execution.build(r, app_context) for r in execution_group.executions
            ],
            latest_execution=Execution.build(latest_execution, app_context)
            if latest_execution
            else None,
            selectors=execution_group.selectors,
            diagnostic=DiagnosticSummary.build(execution_group.diagnostic, app_context),
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

    @computed_field
    @property
    def more_info_url(self) -> str | None:
        if "cmip6" in self.dataset_type:
            # Use the WDC service to look up the dataset
            return f"https://www.wdc-climate.de/ui/cmip6?input={self.slug}"

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
            dataset_type=dataset.dataset_type,
            metadata=metadata,
        )


class MetricValue(ScalarMetricValue):
    """
    A flattened representation of a diagnostic value

    This includes the dimensions and the value of the diagnostic
    """

    execution_group_id: int
    execution_id: int


class Facet(BaseModel):
    key: str
    values: list[str]


class MetricValueCollection(BaseModel):
    data: list[MetricValue]
    count: int
    facets: list[Facet]

    @staticmethod
    def build(values: list[models.MetricValue]) -> "MetricValueCollection":
        # TODO: Query this using SQL
        facets: dict[str, set[str]] = {}
        for v in values:
            for key, value in v.dimensions.items():
                if key in facets:
                    facets[key].add(value)
                else:
                    facets[key] = {value}
        return MetricValueCollection(
            data=[
                MetricValue(
                    dimensions=v.dimensions,
                    attributes=v.attributes,
                    value=v.value,
                    execution_group_id=v.execution.execution_group_id,
                    execution_id=v.execution_id,
                )
                for v in values
            ],
            count=len(values),
            facets=[
                Facet(key=facet_key, values=list(facet_values))
                for facet_key, facet_values in facets.items()
            ],
        )
