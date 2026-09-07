"""Per-model views: what a `source_id` ran, and how it sits against the ensemble."""

from datetime import datetime

from pydantic import BaseModel, computed_field

from climate_ref.results import OutlierPolicy

_OUTLIERS = OutlierPolicy()


class RunCounts(BaseModel):
    """
    Execution groups classified by the outcome of their latest execution.

    A group that has never run names no model, so it is absent rather than counted.
    """

    total: int
    successful: int
    failed: int
    running: int

    @computed_field  # type: ignore
    @property
    def success_rate_percentage(self) -> float:
        """
        Successful groups as a percentage of the total, rounded to one decimal place.
        """
        if self.total == 0:
            return 0.0
        return round((self.successful / self.total) * 100, 1)


class ModelSummary(BaseModel):
    """One row of the model index: a source_id and how its runs went."""

    source_id: str
    mip_eras: list[str]
    """
    MIP eras this model has data for, such as `["CMIP6"]`.
    """
    institution_ids: list[str]
    dataset_count: int
    """
    Ingested datasets carrying this source_id, counting every version.
    """
    diagnostic_count: int
    """
    Diagnostics this model was run through.
    """
    execution_groups: RunCounts


class DiagnosticRuns(BaseModel):
    """How one diagnostic went for one model."""

    diagnostic_id: int
    diagnostic_slug: str
    diagnostic_name: str
    provider_slug: str
    provider_name: str
    execution_groups: RunCounts


class FailedRun(BaseModel):
    """An execution group whose latest execution did not succeed."""

    execution_group_id: int
    key: str
    diagnostic_slug: str
    diagnostic_name: str
    provider_slug: str
    execution_id: int | None
    outcome: str
    """
    Either `failed` or `running`.
    """
    updated_at: datetime


class ModelDetail(ModelSummary):
    """Everything the model page needs about a single source_id."""

    diagnostics: list[DiagnosticRuns]
    failures: list[FailedRun]


class EnsembleStatistics(BaseModel):
    """The spread of one metric across every model that reported it."""

    count: int
    """
    Distinct models contributing a value, including the model being compared.
    """
    min: float
    lower_quartile: float
    median: float
    upper_quartile: float
    max: float
    mean: float
    std_dev: float | None
    """
    Population standard deviation, or None when fewer than two models reported.
    """


class EnsembleComparison(BaseModel):
    """One metric, comparing a single model against the rest of the ensemble."""

    diagnostic_id: int
    diagnostic_slug: str
    diagnostic_name: str
    provider_slug: str
    dimensions: dict[str, str]
    """
    The dimensions that identify the metric, with the run-specific ones dropped.
    """
    units: str | None
    """
    Units the values carry, when the provider recorded them.
    """
    model_value: float
    """
    The model's value, averaged over its members when it ran more than one.
    """
    model_member_count: int
    ensemble: EnsembleStatistics
    percentile: float
    """
    Where the model sits in the ensemble, 0 (lowest) to 100 (highest).
    """
    z_score: float | None
    """
    Distance from the ensemble mean in standard deviations, or None when it cannot be formed.
    """

    @computed_field  # type: ignore
    @property
    def is_outlier(self) -> bool:
        """
        Whether the model falls outside the ensemble's inter-quartile fences.

        Uses `OutlierPolicy` which is the defaults for the values list.
        """
        spread = self.ensemble.upper_quartile - self.ensemble.lower_quartile
        if spread == 0 or self.ensemble.count < _OUTLIERS.min_n:
            return False
        return (
            self.model_value < self.ensemble.lower_quartile - _OUTLIERS.factor * spread
            or self.model_value > self.ensemble.upper_quartile + _OUTLIERS.factor * spread
        )
