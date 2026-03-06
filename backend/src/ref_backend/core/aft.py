import logging
from functools import lru_cache

from ref_backend.core.collections import AFTCollectionDetail, load_all_collections
from ref_backend.models import AFTDiagnosticBase, AFTDiagnosticDetail, AFTDiagnosticSummary, RefDiagnosticLink

logger = logging.getLogger(__name__)


def _collection_to_base(col: AFTCollectionDetail) -> AFTDiagnosticBase:
    """Convert a collection detail to an AFTDiagnosticBase."""
    return AFTDiagnosticBase(
        id=col.id,
        name=col.name,
        theme=col.theme,
        version_control=col.version_control,
        reference_dataset=col.reference_dataset,
        endorser=col.endorser,
        provider_link=col.provider_link,
        description=col.content.description if col.content else None,
        short_description=col.content.short_description if col.content else None,
    )


@lru_cache(maxsize=1)
def load_official_aft_diagnostics() -> list[AFTDiagnosticBase]:
    """
    Load official AFT diagnostics from collection YAML files.

    Returns
    -------
        List of AFTDiagnosticBase instances sorted by id
    """
    collections = load_all_collections()
    diagnostics = [_collection_to_base(col) for col in collections.values()]
    diagnostics.sort(key=lambda d: d.id)
    return diagnostics


@lru_cache(maxsize=1)
def get_aft_diagnostics_index() -> list[AFTDiagnosticSummary]:
    """
    Get all AFT diagnostics as summaries.

    Returns
    -------
        List of AFTDiagnosticSummary
    """
    diagnostics = load_official_aft_diagnostics()
    return [AFTDiagnosticSummary(**d.model_dump()) for d in diagnostics]


@lru_cache(maxsize=128)
def get_aft_diagnostic_by_id(aft_id: str) -> AFTDiagnosticDetail | None:
    """
    Get detailed AFT diagnostic by ID.

    Args:
        aft_id: The AFT diagnostic ID

    Returns
    -------
        AFTDiagnosticDetail if found, None otherwise
    """
    collections = load_all_collections()
    col = collections.get(aft_id)
    if col is None:
        return None

    base = _collection_to_base(col)
    refs = [
        RefDiagnosticLink(provider_slug=d.provider_slug, diagnostic_slug=d.diagnostic_slug)
        for d in col.diagnostics
    ]
    return AFTDiagnosticDetail(**base.model_dump(), diagnostics=refs)


@lru_cache(maxsize=128)
def get_aft_for_ref_diagnostic(provider_slug: str, diagnostic_slug: str) -> str | None:
    """
    Get AFT diagnostic ID associated with a REF diagnostic.

    Args:
        provider_slug: Provider slug
        diagnostic_slug: Diagnostic slug

    Returns
    -------
        The AFT diagnostic ID if found, None otherwise
    """
    collections = load_all_collections()
    aft_ids = []

    for col_id, col in collections.items():
        for diag in col.diagnostics:
            if diag.provider_slug == provider_slug and diag.diagnostic_slug == diagnostic_slug:
                aft_ids.append(col_id)

    if len(aft_ids) == 1:
        return aft_ids[0]
    if len(aft_ids) > 1:
        logger.warning(f"Multiple AFT IDs found for {provider_slug}/{diagnostic_slug}: {aft_ids}")
        return aft_ids[0]
    return None
