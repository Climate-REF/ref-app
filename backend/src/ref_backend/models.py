from datetime import datetime

from pydantic import BaseModel

from cmip_ref import models


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


class MetricExecution(BaseModel):
    id: int
    key: str
    results: "list[MetricExecutionResult]"
    latest_result: "MetricExecutionResult | None"
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
