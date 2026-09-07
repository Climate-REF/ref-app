"""Comparing one model's scalar values against the ensemble that reported the same metric."""

from collections import defaultdict
from collections.abc import Sequence
from statistics import fmean, pstdev, quantiles
from typing import Any, NamedTuple

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from climate_ref import models
from ref_backend.core.mip_eras import cmip_dataset_filter, cv_column
from ref_backend.core.model_runs import latest_executions
from ref_backend.models.climate_models import EnsembleComparison, EnsembleStatistics

#: Dimensions that say which run produced a value rather than what the value measures.
#: Dropping them is what lets values from different models land in the same comparison.
RUN_DIMENSIONS = frozenset({"kind", "source_id", "member_id", "variant_label", "grid_label"})

#: A comparison needs at least this many models before the ensemble spread means anything.
MIN_ENSEMBLE_SIZE = 3


def grouping_dimensions() -> list[str]:
    """List the CV dimensions that identify a metric, in the order the CV declares them."""
    return [
        name
        for name in models.ScalarMetricValue._cv_dimensions
        if name not in RUN_DIMENSIONS and hasattr(models.ScalarMetricValue, name)
    ]


def _statistics(values: Sequence[float]) -> EnsembleStatistics:
    """Describe the spread of one metric, using the interpolated quartiles the charts draw."""
    ordered = sorted(values)
    lower, median, upper = quantiles(ordered, n=4, method="inclusive")

    return EnsembleStatistics(
        count=len(ordered),
        min=ordered[0],
        lower_quartile=lower,
        median=median,
        upper_quartile=upper,
        max=ordered[-1],
        mean=fmean(ordered),
        std_dev=pstdev(ordered) if len(ordered) > 1 else None,
    )


#: Providers disagree on the attribute key carrying a value's units.
_UNIT_KEYS = ("value_units", "units")


def _units(attributes: Any) -> str | None:
    """Read the units off a value's attributes, whichever key the provider used."""
    if not isinstance(attributes, dict):
        return None
    for key in _UNIT_KEYS:
        if attributes.get(key):
            return str(attributes[key])
    return None


def _percentile(ordered: Sequence[float], value: float) -> float:
    """
    Where `value` sits in `ordered`, counting ties as half, on a 0 to 100 scale.
    """
    below = sum(1 for other in ordered if other < value)
    equal = sum(1 for other in ordered if other == value)
    return round(((below + equal / 2) / len(ordered)) * 100, 1)


class ScalarRow(NamedTuple):
    """One scalar value, with the dimensions that place it in a comparison."""

    diagnostic_id: int
    source_id: str
    value: float
    units: str | None
    dimensions: tuple[str | None, ...]


def _scalar_rows(
    session: Session,
    *,
    diagnostic_ids: Sequence[int],
    dimensions: Sequence[str],
    mip_era: str | None,
) -> list[ScalarRow]:
    value = models.ScalarMetricValue
    columns = [cv_column(value, name) for name in dimensions]
    # A retried group holds a value per attempt, so only the execution that decided it counts.
    latest = latest_executions()

    statement = (
        select(
            models.ExecutionGroup.diagnostic_id,
            cv_column(value, "source_id"),
            value.value,
            value.attributes,
            *columns,
        )
        .join(models.Execution, value.execution_id == models.Execution.id)
        .join(models.ExecutionGroup, models.Execution.execution_group_id == models.ExecutionGroup.id)
        .join(models.Diagnostic, models.ExecutionGroup.diagnostic_id == models.Diagnostic.id)
        .join(latest, latest.c.execution_id == models.Execution.id)
        .where(
            models.ExecutionGroup.diagnostic_version == models.Diagnostic.promoted_version,
            models.ExecutionGroup.diagnostic_id.in_(diagnostic_ids),
            cv_column(value, "kind") == "model",
            cv_column(value, "source_id").isnot(None),
            value.value.isnot(None),
        )
    )
    if mip_era:
        # An execution with no CMIP input carries no era, so it answers to whichever is asked for.
        statement = statement.where(or_(cmip_dataset_filter({"mip_era": mip_era}), ~cmip_dataset_filter({})))

    return [
        ScalarRow(row[0], row[1], row[2], _units(row[3]), tuple(row[4:]))
        for row in session.execute(statement).all()
    ]


def _diagnostics_for_model(session: Session, *, source_id: str) -> list[int]:
    """Find the diagnostics that recorded a scalar value for this model."""
    statement = (
        select(models.ExecutionGroup.diagnostic_id)
        .join(models.Execution, models.Execution.execution_group_id == models.ExecutionGroup.id)
        .join(models.ScalarMetricValue, models.ScalarMetricValue.execution_id == models.Execution.id)
        .join(models.Diagnostic, models.ExecutionGroup.diagnostic_id == models.Diagnostic.id)
        .where(
            models.ExecutionGroup.diagnostic_version == models.Diagnostic.promoted_version,
            cv_column(models.ScalarMetricValue, "source_id") == source_id,
            cv_column(models.ScalarMetricValue, "kind") == "model",
        )
        .distinct()
    )
    return list(session.scalars(statement))


def ensemble_comparisons(
    session: Session,
    *,
    source_id: str,
    mip_era: str | None = None,
    diagnostic_slug: str | None = None,
) -> list[EnsembleComparison]:
    """
    Compare a model against the ensemble, one entry per metric it reported.

    Members of the same model are averaged first, so a model that ran thirty variants does not
    drag the ensemble spread towards itself. Metrics fewer than `MIN_ENSEMBLE_SIZE` models
    reported are dropped, because a spread over one or two models says nothing.
    """
    dimensions = grouping_dimensions()

    model_diagnostics = _diagnostics_for_model(session, source_id=source_id)
    diagnostics = {
        diagnostic.id: diagnostic
        for diagnostic in session.scalars(
            select(models.Diagnostic).where(models.Diagnostic.id.in_(model_diagnostics))
        )
    }
    if diagnostic_slug:
        diagnostics = {
            key: diagnostic for key, diagnostic in diagnostics.items() if diagnostic.slug == diagnostic_slug
        }
    if not diagnostics:
        return []

    rows = _scalar_rows(
        session,
        diagnostic_ids=list(diagnostics),
        dimensions=dimensions,
        mip_era=mip_era,
    )

    # (diagnostic, metric key) -> model -> its values, one per member.
    grouped: dict[tuple[int, tuple[str | None, ...]], dict[str, list[float]]] = defaultdict(
        lambda: defaultdict(list)
    )
    units: dict[tuple[int, tuple[str | None, ...]], str | None] = {}
    for row in rows:
        group_key = (row.diagnostic_id, row.dimensions)
        grouped[group_key][row.source_id].append(float(row.value))
        units.setdefault(group_key, row.units)

    comparisons = []
    for (diagnostic_id, dimension_key), by_model in grouped.items():
        if source_id not in by_model or len(by_model) < MIN_ENSEMBLE_SIZE:
            continue

        per_model = {model: sum(values) / len(values) for model, values in by_model.items()}
        ordered = sorted(per_model.values())
        statistics = _statistics(ordered)
        model_value = per_model[source_id]

        z_score = None
        if statistics.std_dev:
            z_score = round((model_value - statistics.mean) / statistics.std_dev, 3)

        diagnostic = diagnostics[diagnostic_id]
        comparisons.append(
            EnsembleComparison(
                diagnostic_id=diagnostic_id,
                diagnostic_slug=diagnostic.slug,
                diagnostic_name=diagnostic.name,
                provider_slug=diagnostic.provider.slug,
                dimensions={
                    name: str(value)
                    for name, value in zip(dimensions, dimension_key, strict=True)
                    if value is not None
                },
                units=units[(diagnostic_id, dimension_key)],
                model_value=model_value,
                model_member_count=len(by_model[source_id]),
                ensemble=statistics,
                percentile=_percentile(ordered, model_value),
                z_score=z_score,
            )
        )

    # Most anomalous first, because that is what a reviewer is looking for.
    comparisons.sort(key=lambda c: abs(c.z_score) if c.z_score is not None else -1.0, reverse=True)
    return comparisons
