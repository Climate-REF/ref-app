from datetime import datetime

from pydantic import BaseModel

from cmip_ref import models
from cmip_ref.models.dataset import CMIP6Dataset
from cmip_ref.models.metric_execution import ResultOutput as ResultOutputModel
from cmip_ref.models.metric_execution import ResultOutputType
from ref_backend.core.config import settings


class Metric(BaseModel):
    """
    A unique metric
    """

    id: int
    provider: str
    slug: str

    @staticmethod
    def build(metric: models.Metric) -> "Metric":
        return Metric(id=metric.id, provider=metric.provider.slug, slug=metric.slug)


class ResultOutput(BaseModel):
    id: int
    output_type: ResultOutputType
    filename: str
    short_name: str
    long_name: str
    description: str
    url: str | None = None

    @property
    def url(self) -> str:
        return f"{settings.API_V1_STR}/results/{self.id}"

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
        )


class MetricExecution(BaseModel):
    id: int
    key: str
    results: "list[MetricExecutionResult]"
    latest_result: "MetricExecutionResult | None"
    outputs: "list[ResultOutput]"
    metric: Metric

    @staticmethod
    def build(execution: models.MetricExecution):
        latest_result = None
        if len(execution.results):
            latest_result = MetricExecutionResult.build(execution.results[-1])
        return MetricExecution(
            id=execution.id,
            key=execution.key,
            results=[MetricExecutionResult.build(r) for r in execution.results],
            latest_result=latest_result,
            metric=Metric.build(execution.metric),
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
    data: list[MetricExecution]
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
