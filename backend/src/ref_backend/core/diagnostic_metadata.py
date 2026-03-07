"""
Diagnostic metadata loading and override system.

This module provides functionality for loading diagnostic metadata from a YAML file
that can override or supplement the default metadata from diagnostic implementations.
It's particularly useful for exposing reference dataset information and other metadata
that may not be directly available from the diagnostic provider code.
"""

from pathlib import Path
from typing import Literal

import yaml
from loguru import logger
from pydantic import BaseModel, Field


class ReferenceDatasetLink(BaseModel):
    """
    Link to a reference dataset used by a diagnostic.

    Reference datasets are observational or reanalysis datasets that diagnostics
    compare model outputs against. They can be classified by their role in the analysis.
    """

    slug: str = Field(..., description="Unique identifier for the dataset(e.g., 'obs4mips.CERES-EBAF.v4.2')")
    description: str | None = Field(
        None, description="Description of how this dataset is used in the diagnostic"
    )
    type: Literal["primary", "secondary", "comparison"] = Field(
        ...,
        description=(
            "Role of this reference dataset:\n"
            "- 'primary': Main reference dataset for the diagnostic\n"
            "- 'secondary': Additional reference for comparison or validation\n"
            "- 'comparison': Used for comparative analysis"
        ),
    )


class DiagnosticMetadata(BaseModel):
    """
    Metadata overrides for a diagnostic.

    This model represents supplemental or override metadata for diagnostics,
    loaded from a YAML file. All fields are optional to allow partial overrides.
    """

    reference_datasets: list[ReferenceDatasetLink] | None = Field(
        None, description="Reference datasets used by this diagnostic"
    )
    display_name: str | None = Field(None, description="Display name override for the diagnostic")
    description: str | None = Field(None, description="Description override for the diagnostic")
    tags: list[str] | None = Field(None, description="Tags for categorizing the diagnostic")


def _load_metadata_from_file(yaml_path: Path) -> dict[str, DiagnosticMetadata]:
    """
    Load diagnostic metadata from a single YAML file.

    Args:
        yaml_path: Path to the YAML metadata file

    Returns
    -------
        Dictionary mapping diagnostic keys (provider/diagnostic) to their metadata.
        Returns an empty dict if the file cannot be parsed.
    """
    try:
        with open(yaml_path) as f:
            raw_data = yaml.safe_load(f)

        if raw_data is None:
            logger.info(f"Diagnostic metadata file at {yaml_path} is empty.")
            return {}

        metadata_dict: dict[str, DiagnosticMetadata] = {}
        for diagnostic_key, metadata_raw in raw_data.items():
            try:
                metadata = DiagnosticMetadata(**metadata_raw)
                metadata_dict[diagnostic_key] = metadata
                logger.debug(f"Loaded metadata for diagnostic: {diagnostic_key}")
            except Exception as e:
                logger.error(f"Failed to parse metadata for diagnostic '{diagnostic_key}': {e}")
                continue

        logger.info(f"Successfully loaded metadata for {len(metadata_dict)} diagnostics from {yaml_path}")
        return metadata_dict

    except yaml.YAMLError as e:
        logger.error(f"Failed to parse YAML file at {yaml_path}: {e}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error loading diagnostic metadata from {yaml_path}: {e}")
        return {}


def load_diagnostic_metadata(path: Path) -> dict[str, DiagnosticMetadata]:
    """
    Load diagnostic metadata from a YAML file or a directory of YAML files.

    When given a directory, all ``*.yaml`` and ``*.yml`` files in it are loaded
    and merged. When given a single file, it is loaded directly (backwards
    compatible with the old single-file layout).

    The YAML files should follow the structure defined in DiagnosticMetadata,
    using diagnostic keys in the format ``provider-slug/diagnostic-slug``.

    Args:
        path: Path to a YAML file or a directory containing YAML files

    Returns
    -------
        Dictionary mapping diagnostic keys (provider/diagnostic) to their metadata.
        Returns an empty dict if the path doesn't exist or cannot be parsed.

    Example YAML structure::

        pmp/annual-cycle:
          reference_datasets:
            - slug: "obs4mips.CERES-EBAF.v4.2"
              description: "CERES Energy Balanced and Filled"
              type: "primary"
          display_name: "Annual Cycle Analysis"
          tags: ["atmosphere", "seasonal-cycle"]
    """
    if not path.exists():
        logger.warning(
            f"Diagnostic metadata path not found at {path}. "
            "No metadata overrides will be applied. This is expected if you haven't "
            "created the metadata files yet."
        )
        return {}

    if path.is_file():
        return _load_metadata_from_file(path)

    # Load all YAML files from the directory
    yaml_files = sorted(path.glob("*.yaml")) + sorted(path.glob("*.yml"))
    if not yaml_files:
        logger.info(f"No YAML files found in directory {path}.")
        return {}

    merged: dict[str, DiagnosticMetadata] = {}
    for yaml_file in yaml_files:
        file_metadata = _load_metadata_from_file(yaml_file)
        # Check for duplicate keys across files
        duplicates = set(merged.keys()) & set(file_metadata.keys())
        if duplicates:
            logger.warning(
                f"Duplicate diagnostic keys found in {yaml_file.name}: "
                f"{', '.join(sorted(duplicates))}. Later values will override earlier ones."
            )
        merged.update(file_metadata)

    logger.info(f"Loaded metadata for {len(merged)} diagnostics from {len(yaml_files)} files in {path}")
    return merged
