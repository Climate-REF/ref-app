"""Tests for diagnostic metadata loading functionality."""

from pathlib import Path

import yaml

from ref_backend.core.diagnostic_metadata import (
    DiagnosticMetadata,
    ReferenceDatasetLink,
    load_diagnostic_metadata,
)


class TestLoadDiagnosticMetadata:
    """Test the load_diagnostic_metadata function."""

    def test_valid_yaml_loads_correctly(self, tmp_path: Path):
        """Test that valid YAML with proper structure loads and validates correctly."""
        yaml_content = {
            "pmp/annual-cycle": {
                "reference_datasets": [
                    {
                        "slug": "obs4mips.CERES-EBAF.v4.2",
                        "description": "CERES Energy Balanced and Filled",
                        "type": "primary",
                    },
                    {
                        "slug": "obs4mips.GPCP.v2.3",
                        "description": "Global Precipitation Climatology Project",
                        "type": "secondary",
                    },
                ],
                "display_name": "Annual Cycle Analysis",
                "tags": ["atmosphere", "seasonal-cycle"],
            },
            "ilamb/biomass": {
                "reference_datasets": [
                    {
                        "slug": "ilamb.GEOCARBON.v1",
                        "type": "comparison",
                    }
                ],
            },
        }

        yaml_path = tmp_path / "test_metadata.yaml"
        with open(yaml_path, "w") as f:
            yaml.dump(yaml_content, f)

        result = load_diagnostic_metadata(yaml_path)

        assert len(result) == 2
        assert "pmp/annual-cycle" in result
        assert "ilamb/biomass" in result

        # Validate pmp/annual-cycle
        pmp_meta = result["pmp/annual-cycle"]
        assert isinstance(pmp_meta, DiagnosticMetadata)
        assert pmp_meta.display_name == "Annual Cycle Analysis"
        assert pmp_meta.tags == ["atmosphere", "seasonal-cycle"]
        assert pmp_meta.reference_datasets is not None
        assert len(pmp_meta.reference_datasets) == 2

        # Validate reference datasets
        ref1 = pmp_meta.reference_datasets[0]
        assert isinstance(ref1, ReferenceDatasetLink)
        assert ref1.slug == "obs4mips.CERES-EBAF.v4.2"
        assert ref1.description == "CERES Energy Balanced and Filled"
        assert ref1.type == "primary"

        ref2 = pmp_meta.reference_datasets[1]
        assert ref2.slug == "obs4mips.GPCP.v2.3"
        assert ref2.type == "secondary"

        # Validate ilamb/biomass
        ilamb_meta = result["ilamb/biomass"]
        assert ilamb_meta.reference_datasets is not None
        assert len(ilamb_meta.reference_datasets) == 1
        assert ilamb_meta.reference_datasets[0].slug == "ilamb.GEOCARBON.v1"
        assert ilamb_meta.reference_datasets[0].type == "comparison"

    def test_missing_file_returns_empty_dict(self, tmp_path: Path):
        """Test that passing a nonexistent path returns an empty dict."""
        nonexistent_path = tmp_path / "nonexistent.yaml"
        result = load_diagnostic_metadata(nonexistent_path)

        assert result == {}

    def test_empty_yaml_returns_empty_dict(self, tmp_path: Path):
        """Test that an empty YAML file returns an empty dict."""
        yaml_path = tmp_path / "empty.yaml"
        yaml_path.write_text("")

        result = load_diagnostic_metadata(yaml_path)

        assert result == {}

    def test_malformed_yaml_returns_empty_dict(self, tmp_path: Path):
        """Test that malformed YAML is handled gracefully."""
        yaml_path = tmp_path / "malformed.yaml"
        yaml_path.write_text("{ invalid: yaml: content: [")

        result = load_diagnostic_metadata(yaml_path)

        assert result == {}

    def test_invalid_pydantic_validation_skips_entry(self, tmp_path: Path, caplog):
        """Test that entries with invalid types or missing required fields are skipped."""
        yaml_content = {
            "valid/diagnostic": {
                "reference_datasets": [
                    {
                        "slug": "obs4mips.CERES-EBAF.v4.2",
                        "type": "primary",
                    }
                ],
            },
            "invalid/diagnostic": {
                "reference_datasets": [
                    {
                        "slug": "obs4mips.GPCP.v2.3",
                        # Missing required 'type' field
                    }
                ],
            },
            "another-invalid/diagnostic": {
                "reference_datasets": [
                    {
                        "slug": "test.dataset.v1",
                        "type": "invalid_type",  # Invalid literal value
                    }
                ],
            },
        }

        yaml_path = tmp_path / "invalid.yaml"
        with open(yaml_path, "w") as f:
            yaml.dump(yaml_content, f)

        result = load_diagnostic_metadata(yaml_path)

        # Only the valid entry should be loaded
        assert len(result) == 1
        assert "valid/diagnostic" in result
        assert "invalid/diagnostic" not in result
        assert "another-invalid/diagnostic" not in result

        # Verify the valid entry is correct
        assert result["valid/diagnostic"].reference_datasets is not None
        assert len(result["valid/diagnostic"].reference_datasets) == 1

    def test_all_reference_dataset_types(self, tmp_path: Path):
        """Test that all literal types (primary, secondary, comparison) are accepted."""
        yaml_content = {
            "test/diagnostic": {
                "reference_datasets": [
                    {"slug": "dataset1", "type": "primary"},
                    {"slug": "dataset2", "type": "secondary"},
                    {"slug": "dataset3", "type": "comparison"},
                ],
            }
        }

        yaml_path = tmp_path / "types.yaml"
        with open(yaml_path, "w") as f:
            yaml.dump(yaml_content, f)

        result = load_diagnostic_metadata(yaml_path)

        assert len(result) == 1
        assert "test/diagnostic" in result

        refs = result["test/diagnostic"].reference_datasets
        assert refs is not None
        assert len(refs) == 3
        assert refs[0].type == "primary"
        assert refs[1].type == "secondary"
        assert refs[2].type == "comparison"

    def test_optional_fields(self, tmp_path: Path):
        """Test that optional fields (display_name, tags, description) work correctly."""
        yaml_content = {
            "minimal/diagnostic": {
                "reference_datasets": [{"slug": "dataset1", "type": "primary"}],
            },
            "full/diagnostic": {
                "reference_datasets": [
                    {
                        "slug": "dataset2",
                        "type": "secondary",
                        "description": "A test dataset",
                    }
                ],
                "display_name": "Full Diagnostic",
                "tags": ["tag1", "tag2"],
            },
        }

        yaml_path = tmp_path / "optional.yaml"
        with open(yaml_path, "w") as f:
            yaml.dump(yaml_content, f)

        result = load_diagnostic_metadata(yaml_path)

        # Minimal entry
        minimal = result["minimal/diagnostic"]
        assert minimal.display_name is None
        assert minimal.tags is None
        assert minimal.reference_datasets is not None
        assert minimal.reference_datasets[0].description is None

        # Full entry
        full = result["full/diagnostic"]
        assert full.display_name == "Full Diagnostic"
        assert full.tags == ["tag1", "tag2"]
        assert full.reference_datasets is not None
        assert full.reference_datasets[0].description == "A test dataset"
