"""Diagnostic summaries, including the YAML metadata overrides."""

from collections.abc import Mapping
from typing import TYPE_CHECKING

from loguru import logger
from pydantic import BaseModel
from sqlalchemy import func

from climate_ref import models
from ref_backend.core.diagnostic_metadata import (
    DiagnosticMetadata,
    ReferenceDatasetLink,
    load_diagnostic_metadata_cached,
)
from ref_backend.core.resource_usage import ExecutionResourceSummary, resource_usage_for_diagnostic
from ref_backend.models.aft import AFTDiagnosticDetail
from ref_backend.models.common import GroupBy, ProviderSummary

if TYPE_CHECKING:
    from ref_backend.api.deps import AppContext


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
    promoted_version: int
    """
    Diagnostic version the counts and the values endpoints are scoped to

    Runs from earlier versions stay in the database but are not shown by default.
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
    resource_usage: ExecutionResourceSummary | None = None
    """
    Wall, CPU and memory usage rolled up across all executions of this diagnostic

    Absent when no execution has recorded a wall time.
    """

    @staticmethod
    def _ensure_metadata_cache(app_context: "AppContext") -> Mapping[str, DiagnosticMetadata]:
        """Load the diagnostic metadata for the configured path, keyed by that path."""
        return load_diagnostic_metadata_cached(app_context.settings.diagnostic_metadata_path_resolved)

    @staticmethod
    def _build_group_by_summary(diagnostic: models.Diagnostic, app_context: "AppContext") -> list[GroupBy]:
        """Extract and build group_by information from diagnostic data requirements."""
        try:
            concrete_diagnostic = app_context.provider_registry.get_metric(
                diagnostic.provider.slug, diagnostic.slug
            )
        except KeyError:
            logger.warning(
                f"Could not find concrete diagnostic for {diagnostic.provider.slug}/{diagnostic.slug}"
            )
            return []
        data_requirements = sorted(
            list(concrete_diagnostic.data_requirements),
            key=lambda dr: dr[0].source_type.value if isinstance(dr, tuple) else dr.source_type.value,  # type: ignore
        )

        # A diagnostic often declares one data requirement per variable, all grouping the same way,
        # so the same pairing would otherwise be listed dozens of times.
        group_by_summary: list[GroupBy] = []
        seen: set[tuple[str, tuple[str, ...] | None]] = set()
        for dr in data_requirements:
            if isinstance(dr, tuple):
                dr_ = dr[0]  # unwrap (DataRequirement, Optional[Any]) tuples to DataRequirement
            else:
                dr_ = dr
            # Normalize group_by to list[str] | None
            gb = list(dr_.group_by) if getattr(dr_, "group_by", None) is not None else None  # pyright: ignore
            source_type = dr_.source_type.value  # pyright: ignore
            key = (source_type, tuple(gb) if gb is not None else None)
            if key in seen:
                continue
            seen.add(key)
            group_by_summary.append(GroupBy(source_type=source_type, group_by=gb))
        return group_by_summary

    @staticmethod
    def _get_aft_link(diagnostic: models.Diagnostic) -> "AFTDiagnosticDetail | None":
        """Get AFT diagnostic link for the given diagnostic."""
        from ref_backend.core.aft import get_aft_diagnostic_by_id, get_aft_for_ref_diagnostic  # noqa: PLC0415

        aft_id = get_aft_for_ref_diagnostic(diagnostic.provider.slug, diagnostic.slug)
        if aft_id:
            return get_aft_diagnostic_by_id(aft_id)
        else:
            logger.warning(f"No AFT found for diagnostic {diagnostic.provider.slug}/{diagnostic.slug}")
            return None

    @staticmethod
    def _apply_metadata_overrides(
        summary: "DiagnosticSummary",
        diagnostic: models.Diagnostic,
        metadata_cache: Mapping[str, DiagnosticMetadata],
    ) -> None:
        """Apply metadata overrides from YAML to the summary."""
        diagnostic_key = f"{diagnostic.provider.slug}/{diagnostic.slug}"
        if diagnostic_key in metadata_cache:
            metadata = metadata_cache[diagnostic_key]

            # Apply overrides: YAML values override database values
            if metadata.display_name is not None:
                summary.name = metadata.display_name
            if metadata.description is not None:
                summary.description = metadata.description
            if metadata.reference_datasets is not None:
                summary.reference_datasets = metadata.reference_datasets
            if metadata.tags is not None:
                summary.tags = metadata.tags

            logger.debug(f"Applied metadata overrides for diagnostic {diagnostic_key}")

    @staticmethod
    def build(diagnostic: models.Diagnostic, app_context: "AppContext") -> "DiagnosticSummary":
        """Build a DiagnosticSummary with individual database queries."""
        metadata_cache = DiagnosticSummary._ensure_metadata_cache(app_context)
        group_by_summary = DiagnosticSummary._build_group_by_summary(diagnostic, app_context)
        aft = DiagnosticSummary._get_aft_link(diagnostic)

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

        # Every count below is scoped to the promoted version, matching the values endpoints.
        # Without that scoping a page can report thousands of successful groups and still show an
        # empty table, because the values of a superseded version are hidden.
        promoted_scope = (
            models.ExecutionGroup.diagnostic_id == diagnostic.id,
            models.ExecutionGroup.diagnostic_version == diagnostic.promoted_version,
        )

        # Execution counts for this diagnostic
        execution_count = (
            app_context.session.query(models.Execution)
            .join(models.ExecutionGroup)
            .filter(*promoted_scope)
            .count()
        )
        successful_execution_count = (
            app_context.session.query(models.Execution)
            .join(models.ExecutionGroup)
            .filter(
                *promoted_scope,
                models.Execution.successful.is_(True),
            )
            .count()
        )

        # Execution group counts for this diagnostic
        execution_group_count = (
            app_context.session.query(models.ExecutionGroup).filter(*promoted_scope).count()
        )

        # Count execution groups whose latest execution is successful
        ExecutionGroup = models.ExecutionGroup
        Execution = models.Execution

        # Subquery: latest execution id per group
        latest_exec_per_group = (
            app_context.session.query(
                Execution.execution_group_id.label("egid"),
                func.max(Execution.id).label("latest_exec_id"),
            )
            .join(ExecutionGroup, Execution.execution_group_id == ExecutionGroup.id)
            .filter(*promoted_scope)
            .group_by(Execution.execution_group_id)
            .subquery()
        )

        # Join back to executions to check success of latest
        successful_execution_group_count = (
            app_context.session.query(latest_exec_per_group.c.egid)
            .join(Execution, Execution.id == latest_exec_per_group.c.latest_exec_id)
            .filter(Execution.successful.is_(True))
            .count()
        )

        concrete_diagnostic = app_context.provider_registry.get_metric(
            diagnostic.provider.slug, diagnostic.slug
        )

        resource_usage = resource_usage_for_diagnostic(app_context.session, diagnostic.id)

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
            promoted_version=diagnostic.promoted_version,
            group_by=group_by_summary,
            aft_link=aft,
            resource_usage=resource_usage,
        )

        # Apply metadata overrides from YAML if available
        DiagnosticSummary._apply_metadata_overrides(summary, diagnostic, metadata_cache)

        return summary

    @staticmethod
    def build_with_stats(  # noqa: PLR0913
        diagnostic: models.Diagnostic,
        app_context: "AppContext",
        *,
        has_scalar_values: bool,
        has_series_values: bool,
        execution_stats: dict[str, int],
        execution_group_count: int,
        successful_execution_group_count: int,
        resource_usage: ExecutionResourceSummary | None = None,
    ) -> "DiagnosticSummary":
        """Build a DiagnosticSummary with pre-computed statistics to avoid N+1 queries."""
        metadata_cache = DiagnosticSummary._ensure_metadata_cache(app_context)
        group_by_summary = DiagnosticSummary._build_group_by_summary(diagnostic, app_context)
        aft = DiagnosticSummary._get_aft_link(diagnostic)

        has_metric_values = has_scalar_values or has_series_values
        try:
            concrete_diagnostic = app_context.provider_registry.get_metric(
                diagnostic.provider.slug, diagnostic.slug
            )
            description = concrete_diagnostic.__doc__ or ""
        except KeyError:
            logger.warning(
                f"Could not find concrete diagnostic for {diagnostic.provider.slug}/{diagnostic.slug}"
            )
            description = ""

        # Build the base diagnostic summary
        summary = DiagnosticSummary(
            id=diagnostic.id,
            provider=ProviderSummary.build(diagnostic.provider),
            slug=diagnostic.slug,
            name=diagnostic.name,
            description=description,
            execution_groups=[e.id for e in diagnostic.execution_groups],
            has_metric_values=has_metric_values,
            has_scalar_values=has_scalar_values,
            has_series_values=has_series_values,
            execution_count=execution_stats["total"],
            successful_execution_count=execution_stats["successful"],
            execution_group_count=execution_group_count,
            successful_execution_group_count=successful_execution_group_count,
            promoted_version=diagnostic.promoted_version,
            group_by=group_by_summary,
            aft_link=aft,
            resource_usage=resource_usage,
        )

        # Apply metadata overrides from YAML if available
        DiagnosticSummary._apply_metadata_overrides(summary, diagnostic, metadata_cache)

        return summary
