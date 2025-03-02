from pydantic import BaseModel

class MetricExecution(BaseModel):
    id: int

class MetricExecutionResult(BaseModel):
    id: int
    metric_execution_id: int
    dataset_hash: str
    successful: bool



class MetricExecutions(BaseModel):
    data: list[MetricExecution]
    count: int
