import logging
from functools import lru_cache
from pathlib import Path

import pandas as pd
import yaml
from pydantic import ValidationError

from ref_backend.models import AFTDiagnosticBase, AFTDiagnosticDetail, AFTDiagnosticSummary, RefDiagnosticLink

logger = logging.getLogger(__name__)


def get_aft_paths() -> tuple[Path, Path]:
    """
    Get paths to the official AFT CSV and YAML mapping files.

    This can be overridden in tests.
    """
    static_dir = Path(__file__).parents[3] / "static" / "aft"

    aft_csv = static_dir / "AFT REF Diagnostics-v2_draft_clean.csv"
    aft_yaml = static_dir / "ref_mapping.yaml"

    return aft_csv, aft_yaml


@lru_cache(maxsize=1)
def load_official_aft_diagnostics() -> list[AFTDiagnosticBase]:
    """
    Load official AFT diagnostics from CSV file.

    Returns
    -------
        List of AFTDiagnostic instances

    Raises
    ------
        ValueError: If CSV schema is invalid
    """
    diagnostics: list[AFTDiagnosticBase] = []
    csv_path, _ = get_aft_paths()

    expected_headers = {
        "id",
        "name",
        "theme",
        "version_control",
        "reference_dataset",
        "endorser",
        "provider_link",
        "description",
        "short_description",
    }
    try:
        df = pd.read_csv(csv_path)

        if set(df.columns) != {
            "id",
            "name",
            "theme",
            "version_control",
            "reference_dataset",
            "endorser",
            "provider_link",
            "description",
            "short_description",
        }:
            raise ValueError(f"CSV headers mismatch. Expected: {expected_headers}, Got: {set(df.columns)}")

        if df.id.unique().size != len(df):
            raise ValueError("Duplicate 'id' values found in AFT CSV")

        # Clean data: strip whitespace and convert empty strings to None
        for key in df.columns:
            df[key] = df[key].astype(str).str.strip().replace({"": None})

        for _, row in df.iterrows():  # Start at 2 since row 1 is headers
            try:
                diagnostic = AFTDiagnosticBase(**row.to_dict())
                diagnostics.append(diagnostic)
            except ValidationError as e:
                raise ValueError(f"Validation error at row {row}: {e}") from e

    except FileNotFoundError:
        raise ValueError(f"AFT CSV file not found: {csv_path}")
    except Exception as e:
        raise ValueError(f"Error loading AFT CSV: {e}") from e

    # Sort by id for stable ordering
    diagnostics.sort(key=lambda d: d.id)

    return diagnostics


@lru_cache(maxsize=1)
def load_ref_mapping() -> dict[str, list[RefDiagnosticLink]]:
    """
    Load REF diagnostic mapping from YAML file.

    Returns
    -------
        Dict mapping AFT ID to list of RefDiagnosticLink

    Raises
    ------
        ValueError: If YAML schema is invalid
    """
    _, yaml_path = get_aft_paths()
    try:
        with open(yaml_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except FileNotFoundError:
        raise ValueError(f"AFT mapping YAML file not found: {yaml_path}")
    except Exception as e:
        raise ValueError(f"Error loading AFT mapping YAML: {e}") from e

    data = {str(k): v for k, v in data.items()}  # Ensure keys are strings

    mapping = {}
    official_ids = {d.id for d in load_official_aft_diagnostics()}

    for aft_id, refs in data.items():
        if aft_id not in official_ids:
            logger.warning(f"AFT_CSV: Unknown AFT ID '{aft_id}' in {official_ids} official IDs), ignoring")
            continue

        if not isinstance(refs, list):
            raise ValueError(f"AFT_MAPPING: Expected list for AFT ID '{aft_id}', got {type(refs)}")

        links = []
        seen = set()
        for ref in refs:
            if not isinstance(ref, dict):
                raise ValueError(f"AFT_MAPPING: Expected dict for ref in AFT ID '{aft_id}', got {type(ref)}")

            provider_slug = ref.get("provider_slug")
            diagnostic_slug = ref.get("diagnostic_slug")

            if not provider_slug or not diagnostic_slug:
                raise ValueError(
                    f"AFT_MAPPING: Missing provider_slug or diagnostic_slug in AFT ID '{aft_id}'"
                )

            key = (provider_slug, diagnostic_slug)
            if key in seen:
                logger.warning(f"AFT_MAPPING: Duplicate ref {key} for AFT ID '{aft_id}', deduplicating")
                continue
            seen.add(key)

            links.append(RefDiagnosticLink(provider_slug=provider_slug, diagnostic_slug=diagnostic_slug))

        mapping[aft_id] = links

    return mapping


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
    diagnostics = load_official_aft_diagnostics()
    mapping = load_ref_mapping()

    for d in diagnostics:
        if d.id == aft_id:
            refs = mapping.get(aft_id, [])
            return AFTDiagnosticDetail(**d.model_dump(), diagnostics=refs)

    return None


@lru_cache(maxsize=128)
def get_aft_for_ref_diagnostic(provider_slug: str, diagnostic_slug: str) -> str | None:
    """
    Get AFT diagnostic associated with a REF diagnostic.

    Args:
        provider_slug: Provider slug
        diagnostic_slug: Diagnostic slug

    Returns
    -------
        The AFT diagnostic if found, None otherwise
    """
    mapping = load_ref_mapping()
    aft_ids = []

    for aft_id, ref_diagnostics in mapping.items():
        logger.info(f"Checking AFT ID {aft_id} with refs {ref_diagnostics}")
        for ref in ref_diagnostics:
            if ref.provider_slug == provider_slug and ref.diagnostic_slug == diagnostic_slug:
                aft_ids.append(aft_id)

    if len(aft_ids) == 1:
        return aft_ids[0]
    if len(aft_ids) > 1:
        logger.warning(f"Multiple AFT IDs found for {provider_slug}/{diagnostic_slug}: {aft_ids}")
        return aft_ids[0]
    return None
