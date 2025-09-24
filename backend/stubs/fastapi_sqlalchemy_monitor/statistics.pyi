from dataclasses import dataclass, field

@dataclass
class QueryStatistic:
    query: str
    total_invocations: int = 0
    total_invocation_time_ms: int = 0
    invocation_times_ms: list[int] = field(default_factory=lambda: [])

@dataclass
class AlchemyStatistics:
    total_invocations: int = 0
    total_invocation_time_ms: int = 0
    query_stats: dict[int, QueryStatistic] = field(default_factory=lambda: {})

    def add_query_stat(self, query: str, invocation_time_ms: int) -> None: ...
    def __str__(self) -> str: ...
