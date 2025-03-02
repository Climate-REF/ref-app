from pydantic import BaseModel

from cmip_ref import models


class MetricExecution(BaseModel):
    id: int
    latest_result: "MetricExecutionResult | None"

    @staticmethod
    def build(execution: models.MetricExecution):
        latest_result = None
        if len(execution.results):
            latest_result = MetricExecutionResult.build(execution.results[-1])
        return MetricExecution(id=execution.id, latest_result=latest_result)


class MetricExecutionResult(BaseModel):
    id: int
    metric_execution_id: int
    dataset_hash: str
    successful: bool

    @staticmethod
    def build(execution_result: models.MetricExecutionResult):
        return MetricExecutionResult(
            id=execution_result.id,
            metric_execution_id=execution_result.metric_execution_id,
            successful=execution_result.successful,
            dataset_hash=execution_result.dataset_hash,
        )


class MetricExecutions(BaseModel):
    data: list[MetricExecution]
    count: int
