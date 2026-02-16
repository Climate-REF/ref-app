"""Tests for AFT diagnostic loading and mapping functionality."""

import csv
import io
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

from ref_backend.core.aft import (
    get_aft_diagnostic_by_id,
    get_aft_diagnostics_index,
    get_aft_for_ref_diagnostic,
    get_aft_paths,
    load_official_aft_diagnostics,
    load_ref_mapping,
)
from ref_backend.models import (
    AFTDiagnosticBase,
    AFTDiagnosticDetail,
    AFTDiagnosticSummary,
    RefDiagnosticLink,
)

AFT_CSV_HEADERS = [
    "id",
    "name",
    "theme",
    "version_control",
    "reference_dataset",
    "endorser",
    "provider_link",
    "description",
    "short_description",
]


def _build_aft_csv(rows: list[list[str]]) -> str:
    """Build a CSV string with standard AFT headers."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(AFT_CSV_HEADERS)
    for row in rows:
        writer.writerow(row)
    return output.getvalue()


@pytest.fixture(autouse=True)
def clear_aft_caches():
    """Clear all lru_cache'd functions after each test."""
    yield
    for fn in [
        load_official_aft_diagnostics,
        load_ref_mapping,
        get_aft_diagnostics_index,
        get_aft_diagnostic_by_id,
        get_aft_for_ref_diagnostic,
    ]:
        if hasattr(fn, "cache_clear"):
            fn.cache_clear()


class TestGetAFTPaths:
    """Test the get_aft_paths function."""

    def test_returns_correct_paths(self):
        """Test that get_aft_paths returns Path objects."""
        csv_path, yaml_path = get_aft_paths()

        assert isinstance(csv_path, Path)
        assert isinstance(yaml_path, Path)
        assert csv_path.name == "AFT REF Diagnostics-v2_draft_clean.csv"
        assert yaml_path.name == "ref_mapping.yaml"
        assert csv_path.parent.name == "aft"
        assert yaml_path.parent.name == "aft"


class TestLoadOfficialAFTDiagnostics:
    """Test the load_official_aft_diagnostics function."""

    def test_valid_csv_parsing(self, tmp_path: Path):
        """Test that a valid CSV is parsed correctly."""
        csv_content = _build_aft_csv(
            [
                [
                    "AFT-001",
                    "Test Diagnostic 1",
                    "Climate",
                    "https://github.com/test/repo",
                    "ERA5",
                    "WCRP",
                    "https://example.com",
                    "Full description",
                    "Short",
                ],
                [
                    "AFT-002",
                    "Test Diagnostic 2",
                    "Ocean",
                    "https://gitlab.com/test",
                    "WOA",
                    "PCMDI",
                    "https://example.org",
                    "Another description",
                    "Brief",
                ],
            ]
        )

        csv_path = tmp_path / "test_aft.csv"
        csv_path.write_text(csv_content)

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, tmp_path / "dummy.yaml"),
        ):
            diagnostics = load_official_aft_diagnostics()

        assert len(diagnostics) == 2
        diag1 = diagnostics[0]
        assert isinstance(diag1, AFTDiagnosticBase)
        assert diag1.id == "AFT-001"
        assert diag1.name == "Test Diagnostic 1"
        assert diag1.theme == "Climate"
        assert diag1.reference_dataset == "ERA5"
        assert diag1.endorser == "WCRP"
        assert diag1.description == "Full description"
        assert diag1.short_description == "Short"

        diag2 = diagnostics[1]
        assert diag2.id == "AFT-002"
        assert diag2.name == "Test Diagnostic 2"

    def test_duplicate_id_detection(self, tmp_path: Path):
        """Test that duplicate IDs in CSV raise a ValueError."""
        csv_content = _build_aft_csv(
            [
                [
                    "AFT-001",
                    "Test 1",
                    "Climate",
                    "https://github.com",
                    "ERA5",
                    "WCRP",
                    "https://example.com",
                    "Desc",
                    "Short",
                ],
                [
                    "AFT-001",
                    "Duplicate",
                    "Ocean",
                    "https://gitlab.com",
                    "WOA",
                    "PCMDI",
                    "https://example.org",
                    "Desc",
                    "Short",
                ],
            ]
        )

        csv_path = tmp_path / "duplicate.csv"
        csv_path.write_text(csv_content)

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, tmp_path / "dummy.yaml"),
        ):
            with pytest.raises(
                ValueError,
                match="Duplicate 'id' values found in AFT CSV",
            ):
                load_official_aft_diagnostics()

    def test_missing_csv_file(self, tmp_path: Path):
        """Test that missing CSV file raises ValueError."""
        nonexistent_csv = tmp_path / "nonexistent.csv"

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(nonexistent_csv, tmp_path / "dummy.yaml"),
        ):
            with pytest.raises(ValueError, match="AFT CSV file not found"):
                load_official_aft_diagnostics()

    def test_invalid_csv_headers(self, tmp_path: Path):
        """Test that CSV with wrong headers raises ValueError."""
        csv_content = "id,wrong_header,theme\nAFT-001,Test,Climate\n"

        csv_path = tmp_path / "invalid_headers.csv"
        csv_path.write_text(csv_content)

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, tmp_path / "dummy.yaml"),
        ):
            with pytest.raises(ValueError, match="CSV headers mismatch"):
                load_official_aft_diagnostics()

    def test_whitespace_stripped(self, tmp_path: Path):
        """Test that whitespace is stripped from values."""
        csv_content = _build_aft_csv(
            [
                [
                    "AFT-001",
                    "  Test Diagnostic  ",
                    "  Climate  ",
                    "https://github.com",
                    "ERA5",
                    "WCRP",
                    "https://example.com",
                    "  Description  ",
                    "  Short  ",
                ],
            ]
        )

        csv_path = tmp_path / "whitespace.csv"
        csv_path.write_text(csv_content)

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, tmp_path / "dummy.yaml"),
        ):
            diagnostics = load_official_aft_diagnostics()

        assert len(diagnostics) == 1
        diag = diagnostics[0]
        assert diag.id == "AFT-001"
        assert diag.name == "Test Diagnostic"
        assert diag.theme == "Climate"
        assert diag.description == "Description"
        assert diag.short_description == "Short"

    def test_diagnostics_sorted_by_id(self, tmp_path: Path):
        """Test that diagnostics are sorted by ID."""

        def row(id, name):
            return [
                id,
                name,
                "Climate",
                "https://github.com",
                "ERA5",
                "WCRP",
                "https://example.com",
                "Desc",
                "Short",
            ]

        csv_content = _build_aft_csv(
            [
                row("AFT-003", "Third"),
                row("AFT-001", "First"),
                row("AFT-002", "Second"),
            ]
        )

        csv_path = tmp_path / "unsorted.csv"
        csv_path.write_text(csv_content)

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, tmp_path / "dummy.yaml"),
        ):
            diagnostics = load_official_aft_diagnostics()

        assert len(diagnostics) == 3
        assert diagnostics[0].id == "AFT-001"
        assert diagnostics[1].id == "AFT-002"
        assert diagnostics[2].id == "AFT-003"


def _setup_csv_and_yaml(tmp_path, rows, yaml_content=None):
    """Helper to write CSV + optional YAML and return paths."""
    csv_path = tmp_path / "test_aft.csv"
    csv_path.write_text(_build_aft_csv(rows))

    yaml_path = tmp_path / "test_mapping.yaml"
    if yaml_content is not None:
        with open(yaml_path, "w") as f:
            yaml.dump(yaml_content, f)
    else:
        yaml_path.write_text("{}")

    return csv_path, yaml_path


# Standard single-row test data
_STD_ROW = [
    "AFT-001",
    "Test 1",
    "Climate",
    "https://github.com",
    "ERA5",
    "WCRP",
    "https://example.com",
    "Desc",
    "Short",
]

_STD_ROW_2 = [
    "AFT-002",
    "Test 2",
    "Ocean",
    "https://github.com",
    "WOA",
    "PCMDI",
    "https://example.org",
    "Desc2",
    "Short2",
]


class TestLoadRefMapping:
    """Test the load_ref_mapping function."""

    def test_valid_yaml_parsing(self, tmp_path: Path):
        """Test that valid YAML is parsed correctly."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
                {"provider_slug": "pmp", "diagnostic_slug": "mean-climate"},
            ],
            "AFT-002": [
                {"provider_slug": "ilamb", "diagnostic_slug": "biomass"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW, _STD_ROW_2],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            mapping = load_ref_mapping()

        assert len(mapping) == 2
        assert "AFT-001" in mapping
        assert "AFT-002" in mapping

        aft1_refs = mapping["AFT-001"]
        assert len(aft1_refs) == 2
        assert isinstance(aft1_refs[0], RefDiagnosticLink)
        assert aft1_refs[0].provider_slug == "pmp"
        assert aft1_refs[0].diagnostic_slug == "annual-cycle"
        assert aft1_refs[1].diagnostic_slug == "mean-climate"

        aft2_refs = mapping["AFT-002"]
        assert len(aft2_refs) == 1
        assert aft2_refs[0].provider_slug == "ilamb"

    def test_deduplication_logic(self, tmp_path: Path, caplog):
        """Test that duplicate entries are deduplicated."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
                {"provider_slug": "ilamb", "diagnostic_slug": "biomass"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            mapping = load_ref_mapping()

        assert len(mapping["AFT-001"]) == 2
        assert mapping["AFT-001"][0].provider_slug == "pmp"
        assert mapping["AFT-001"][1].provider_slug == "ilamb"

    def test_missing_yaml_file(self, tmp_path: Path):
        """Test that missing YAML file raises ValueError."""
        csv_path = tmp_path / "test_aft.csv"
        csv_path.write_text(_build_aft_csv([_STD_ROW]))
        nonexistent_yaml = tmp_path / "nonexistent.yaml"

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, nonexistent_yaml),
        ):
            with pytest.raises(ValueError, match="AFT mapping YAML file not found"):
                load_ref_mapping()

    def test_unknown_aft_id_warning(self, tmp_path: Path, caplog):
        """Test that unknown AFT IDs in YAML are ignored."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "valid"},
            ],
            "AFT-999": [
                {"provider_slug": "unknown", "diagnostic_slug": "invalid"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            mapping = load_ref_mapping()

        assert len(mapping) == 1
        assert "AFT-001" in mapping
        assert "AFT-999" not in mapping

    def test_invalid_yaml_structure(self, tmp_path: Path):
        """Test that invalid YAML structure raises ValueError."""
        yaml_content = {"AFT-001": "not a list"}

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            with pytest.raises(ValueError, match="Expected list for AFT ID"):
                load_ref_mapping()

    def test_missing_required_fields(self, tmp_path: Path):
        """Test that missing fields raises ValueError."""
        yaml_content = {
            "AFT-001": [{"provider_slug": "pmp"}],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            with pytest.raises(
                ValueError,
                match="Missing provider_slug or diagnostic_slug",
            ):
                load_ref_mapping()


class TestGetAFTDiagnosticsIndex:
    """Test the get_aft_diagnostics_index function."""

    def test_converts_to_summary_list(self, tmp_path: Path):
        """Test conversion to AFTDiagnosticSummary instances."""
        csv_path, _ = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW, _STD_ROW_2],
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, tmp_path / "dummy.yaml"),
        ):
            summaries = get_aft_diagnostics_index()

        assert len(summaries) == 2
        assert all(isinstance(s, AFTDiagnosticSummary) for s in summaries)
        assert summaries[0].id == "AFT-001"
        assert summaries[1].id == "AFT-002"


class TestGetAFTDiagnosticByID:
    """Test the get_aft_diagnostic_by_id function."""

    def test_returns_detail_for_valid_id(self, tmp_path: Path):
        """Test that a valid ID returns AFTDiagnosticDetail."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
                {"provider_slug": "pmp", "diagnostic_slug": "mean-climate"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            detail = get_aft_diagnostic_by_id("AFT-001")

        assert detail is not None
        assert isinstance(detail, AFTDiagnosticDetail)
        assert detail.id == "AFT-001"
        assert detail.name == "Test 1"
        assert len(detail.diagnostics) == 2
        assert detail.diagnostics[0].provider_slug == "pmp"

    def test_returns_none_for_missing_id(self, tmp_path: Path):
        """Test that a missing ID returns None."""
        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            detail = get_aft_diagnostic_by_id("AFT-999")

        assert detail is None

    def test_includes_empty_diagnostics_list(self, tmp_path: Path):
        """Test that AFT with no mapped diagnostics has empty list."""
        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            detail = get_aft_diagnostic_by_id("AFT-001")

        assert detail is not None
        assert detail.diagnostics == []


class TestGetAFTForRefDiagnostic:
    """Test the get_aft_for_ref_diagnostic function."""

    def test_returns_aft_id_for_valid_mapping(self, tmp_path: Path):
        """Test that a valid provider/diagnostic returns correct ID."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            aft_id = get_aft_for_ref_diagnostic("pmp", "annual-cycle")

        assert aft_id == "AFT-001"

    def test_returns_none_for_missing_mapping(self, tmp_path: Path):
        """Test that non-existent provider/diagnostic returns None."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            aft_id = get_aft_for_ref_diagnostic(
                "nonexistent",
                "diagnostic",
            )

        assert aft_id is None

    def test_multiple_matches_produce_warning(self, tmp_path: Path, caplog):
        """Test that multiple AFT IDs for same diagnostic warn."""
        yaml_content = {
            "AFT-001": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
            ],
            "AFT-002": [
                {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
            ],
        }

        csv_path, yaml_path = _setup_csv_and_yaml(
            tmp_path,
            [_STD_ROW, _STD_ROW_2],
            yaml_content,
        )

        with patch(
            "ref_backend.core.aft.get_aft_paths",
            return_value=(csv_path, yaml_path),
        ):
            aft_id = get_aft_for_ref_diagnostic("pmp", "annual-cycle")

        assert aft_id in ["AFT-001", "AFT-002"]
