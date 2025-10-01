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
    tags: list[str] | None = Field(None, description="Tags for categorizing the diagnostic")


def load_diagnostic_metadata(yaml_path: Path) -> dict[str, DiagnosticMetadata]:
    """
    Load diagnostic metadata from a YAML file.

    This function loads metadata overrides from a YAML file, which should follow
    the structure defined in DiagnosticMetadata. The file uses diagnostic keys
    in the format "provider-slug/diagnostic-slug" to map metadata to diagnostics.

    Args:
        yaml_path: Path to the YAML metadata file

    Returns
    -------
        Dictionary mapping diagnostic keys (provider/diagnostic) to their metadata.
        Returns an empty dict if the file doesn't exist or cannot be parsed.

    Example YAML structure:
        ```yaml
        pmp/annual-cycle:
          reference_datasets:
            - slug: "obs4mips.CERES-EBAF.v4.2"
              description: "CERES Energy Balanced and Filled"
              type: "primary"
          display_name: "Annual Cycle Analysis"
          tags: ["atmosphere", "seasonal-cycle"]
        ```
    """
    if not yaml_path.exists():
        logger.warning(
            f"Diagnostic metadata file not found at {yaml_path}. "
            "No metadata overrides will be applied. This is expected if you haven't "
            "created the metadata file yet."
        )
        return {}

    try:
        with open(yaml_path) as f:
            raw_data = yaml.safe_load(f)

        if raw_data is None:
            logger.info(f"Diagnostic metadata file at {yaml_path} is empty.")
            return {}

        # Parse each diagnostic's metadata
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
