from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from cmip_ref import models
from cmip_ref.models.dataset import CMIP6Dataset
from cmip_ref.models.metric_execution import ResultOutput as ResultOutputModel
from cmip_ref.models.metric_execution import ResultOutputType
from ref_backend.core.config import settings

T = TypeVar("T")


class Collection(BaseModel, Generic[T]):
    data: list[T]

    @property
    def count(self) -> int:
        """
        Number of data items present
        """
        return len(self.data)


class ProviderSummary(BaseModel):
    """
    Summary information about a Metric Provider.

    The metric provider is the framework that was used to generate a set of metrics.
    """

    slug: str
    name: str

    @staticmethod
    def build(provider: models.Provider) -> "ProviderSummary":
        return ProviderSummary(
            slug=provider.slug,
            name=provider.name,
        )


class MetricSummary(BaseModel):
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
    metric_executions: list[int]
    """
    List of IDs for the provider executions associated with this provider
    """

    @staticmethod
    def build(metric: models.Metric) -> "MetricSummary":
        return MetricSummary(
            id=metric.id,
            provider=ProviderSummary.build(metric.provider),
            slug=metric.slug,
            name=metric.name,
            metric_executions=[e.id for e in metric.execution_groups],
        )


class ResultOutput(BaseModel):
    id: int
    output_type: ResultOutputType
    filename: str
    short_name: str
    long_name: str
    description: str
    created_at: datetime
    updated_at: datetime
    url: str

    @staticmethod
    def build(output: ResultOutputModel) -> "ResultOutput":
        return ResultOutput(
            id=output.id,
            metric_execution_result_id=output.metric_execution_result_id,
            output_type=output.output_type,
            filename=output.filename,
            short_name=output.short_name,
            long_name=output.long_name,
            description=output.description,
            created_at=output.created_at,
            updated_at=output.updated_at,
            url=f"{settings.BACKEND_HOST}{settings.API_V1_STR}/results/{output.id}",
        )


class MetricExecutionGroup(BaseModel):
    id: int
    key: str
    results: "list[MetricExecutionResult]"
    latest_result: "MetricExecutionResult | None"
    outputs: "list[ResultOutput]"
    metric: MetricSummary
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def build(execution: models.MetricExecutionGroup):
        latest_result = None
        outputs = []
        if len(execution.results):
            latest_result = execution.results[-1]
            outputs = [ResultOutput.build(o) for o in latest_result.outputs]
        return MetricExecutionGroup(
            id=execution.id,
            key=execution.dataset_key,
            results=[MetricExecutionResult.build(r) for r in execution.results],
            latest_result=MetricExecutionResult.build(latest_result),
            outputs=outputs,
            metric=MetricSummary.build(execution.metric),
            created_at=execution.created_at,
            updated_at=execution.updated_at,
        )


class MetricExecutionResult(BaseModel):
    id: int
    dataset_hash: str
    successful: bool
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def build(execution_result: models.MetricExecutionResult):
        return MetricExecutionResult(
            id=execution_result.id,
            successful=execution_result.successful,
            dataset_hash=execution_result.dataset_hash,
            updated_at=execution_result.updated_at,
            created_at=execution_result.created_at,
        )


class MetricExecutions(BaseModel):
    data: list[MetricExecutionGroup]
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


class DatasetCollection(BaseModel):
    data: list[Dataset]
    count: int

    @staticmethod
    def build(datasets: list[models.Dataset]) -> "DatasetCollection":
        return DatasetCollection(
            data=[Dataset.build(d) for d in datasets], count=len(datasets)
        )
