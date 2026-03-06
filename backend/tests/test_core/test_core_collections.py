"""Tests for collection loading and mapping functionality."""

import json
import logging
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

from ref_backend.core.collections import (
    AFTCollectionCard,
    AFTCollectionCardContent,
    AFTCollectionDetail,
    AFTCollectionGroupingConfig,
    AFTCollectionSummary,
    ThemeDetail,
    get_collection_by_id,
    get_collection_summaries,
    get_theme_by_slug,
    get_theme_summaries,
    load_all_collections,
    load_theme_mapping,
)


@pytest.fixture(autouse=True)
def clear_collection_caches():
    """Clear all lru_cache'd functions before and after each test."""
    load_all_collections.cache_clear()
    load_theme_mapping.cache_clear()
    yield
    load_all_collections.cache_clear()
    load_theme_mapping.cache_clear()


def _write_collection(tmp_path: Path, filename: str, data: dict) -> Path:
    """Write a collection YAML file and return its path."""
    p = tmp_path / filename
    with open(p, "w") as f:
        yaml.dump(data, f)
    return p


def _write_themes(tmp_path: Path, data: dict) -> Path:
    """Write a themes.yaml file and return its path."""
    p = tmp_path / "themes.yaml"
    with open(p, "w") as f:
        yaml.dump(data, f)
    return p


_MINIMAL_COLLECTION = {
    "id": "1.1",
    "name": "Test Collection",
    "theme": "Ocean",
    "endorser": "WCRP",
    "version_control": "1.0",
    "reference_dataset": "ERA5",
    "provider_link": "https://example.com",
    "content": {
        "description": "Full description",
        "short_description": "Short",
    },
    "diagnostics": [
        {"provider_slug": "pmp", "diagnostic_slug": "annual-cycle"},
    ],
    "explorer_cards": [
        {
            "title": "Card One",
            "description": "A card",
            "content": [
                {
                    "type": "box-whisker-chart",
                    "provider": "pmp",
                    "diagnostic": "annual-cycle",
                    "title": "Annual Cycle Chart",
                    "grouping_config": {
                        "group_by": "model",
                        "hue": "experiment",
                    },
                }
            ],
        }
    ],
}


class TestLoadAllCollections:
    def test_valid_collection_loading(self, tmp_path: Path):
        """Valid YAML loads into AFTCollectionDetail model correctly."""
        _write_collection(tmp_path, "1.1.yaml", _MINIMAL_COLLECTION)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            result = load_all_collections()

        assert "1.1" in result
        col = result["1.1"]
        assert isinstance(col, AFTCollectionDetail)
        assert col.id == "1.1"
        assert col.name == "Test Collection"
        assert col.theme == "Ocean"
        assert col.endorser == "WCRP"
        assert col.version_control == "1.0"
        assert col.reference_dataset == "ERA5"
        assert str(col.provider_link) == "https://example.com/"
        assert col.content is not None
        assert col.content.description == "Full description"
        assert col.content.short_description == "Short"
        assert len(col.diagnostics) == 1
        assert col.diagnostics[0].provider_slug == "pmp"
        assert col.diagnostics[0].diagnostic_slug == "annual-cycle"
        assert len(col.explorer_cards) == 1
        card = col.explorer_cards[0]
        assert isinstance(card, AFTCollectionCard)
        assert card.title == "Card One"
        assert len(card.content) == 1
        content = card.content[0]
        assert isinstance(content, AFTCollectionCardContent)
        assert content.type == "box-whisker-chart"
        assert content.grouping_config is not None
        assert isinstance(content.grouping_config, AFTCollectionGroupingConfig)
        assert content.grouping_config.group_by == "model"
        assert content.grouping_config.hue == "experiment"

    def test_all_optional_card_content_fields(self, tmp_path: Path):
        """All optional fields on AFTCollectionCardContent deserialize correctly."""
        data = {
            "id": "2.1",
            "name": "Full Fields Collection",
            "diagnostics": [],
            "explorer_cards": [
                {
                    "title": "Detailed Card",
                    "content": [
                        {
                            "type": "series-chart",
                            "provider": "ilamb",
                            "diagnostic": "biomass",
                            "title": "Biomass Series",
                            "description": "Desc",
                            "interpretation": "Some interpretation",
                            "span": 2,
                            "metric_units": "kg/m2",
                            "clip_min": -10.5,
                            "clip_max": 10.5,
                            "y_min": -5.0,
                            "y_max": 5.0,
                            "show_zero_line": True,
                            "symmetrical_axes": False,
                            "reference_stddev": 1.5,
                            "label_template": "{model} ({experiment})",
                            "other_filters": {
                                "isolate_ids": "CMIP6.ssp585",
                                "exclude_ids": "CMIP6.piControl",
                            },
                            "grouping_config": {
                                "group_by": "source_id",
                                "hue": "variant_label",
                                "style": "experiment_id",
                            },
                        }
                    ],
                }
            ],
        }
        _write_collection(tmp_path, "2.1.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            result = load_all_collections()

        col = result["2.1"]
        content = col.explorer_cards[0].content[0]
        assert content.label_template == "{model} ({experiment})"
        assert content.grouping_config is not None
        assert content.grouping_config.style == "experiment_id"
        assert content.other_filters == {
            "isolate_ids": "CMIP6.ssp585",
            "exclude_ids": "CMIP6.piControl",
        }
        assert content.y_min == -5.0
        assert content.y_max == 5.0
        assert content.clip_min == -10.5
        assert content.clip_max == 10.5
        assert content.span == 2
        assert content.show_zero_line is True
        assert content.symmetrical_axes is False
        assert content.reference_stddev == 1.5

    def test_missing_collections_directory_returns_empty(self, tmp_path: Path):
        """Missing collections directory returns empty dict without crashing."""
        nonexistent = tmp_path / "no_such_dir"
        with patch("ref_backend.core.collections.get_collections_dir", return_value=nonexistent):
            result = load_all_collections()

        assert result == {}

    def test_invalid_yaml_file_is_skipped_with_warning(self, tmp_path: Path, caplog):
        """A file with invalid YAML content is skipped and a warning is logged."""
        bad_file = tmp_path / "bad.yaml"
        bad_file.write_text("key: [unclosed bracket")

        good_data = {**_MINIMAL_COLLECTION, "id": "1.1", "name": "Good"}
        _write_collection(tmp_path, "1.1.yaml", good_data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            with caplog.at_level(logging.WARNING, logger="ref_backend.core.collections"):
                result = load_all_collections()

        assert "1.1" in result
        assert "bad" not in str(result)
        assert any("bad.yaml" in msg for msg in caplog.messages)

    def test_invalid_content_type_rejected(self, tmp_path: Path, caplog):
        """Invalid content type is rejected by Pydantic and file is skipped."""
        data = {
            "id": "3.1",
            "name": "Bad Type Collection",
            "diagnostics": [],
            "explorer_cards": [
                {
                    "title": "Bad Card",
                    "content": [
                        {
                            "type": "not-a-valid-chart-type",
                            "provider": "pmp",
                            "diagnostic": "test",
                            "title": "Chart",
                        }
                    ],
                }
            ],
        }
        _write_collection(tmp_path, "3.1.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            with caplog.at_level(logging.WARNING, logger="ref_backend.core.collections"):
                result = load_all_collections()

        assert "3.1" not in result
        assert any("3.1.yaml" in msg for msg in caplog.messages)

    def test_json_serialization_uses_snake_case(self, tmp_path: Path):
        """JSON serialization must use snake_case keys, not camelCase."""
        data = {
            "id": "4.1",
            "name": "Snake Case Test",
            "diagnostics": [],
            "explorer_cards": [
                {
                    "title": "Chart Card",
                    "content": [
                        {
                            "type": "series-chart",
                            "provider": "pmp",
                            "diagnostic": "mean-climate",
                            "title": "Mean Climate",
                            "y_min": -1.0,
                            "y_max": 1.0,
                            "show_zero_line": True,
                            "grouping_config": {
                                "group_by": "model",
                                "hue": "experiment",
                            },
                        }
                    ],
                }
            ],
        }
        _write_collection(tmp_path, "4.1.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            result = load_all_collections()

        col = result["4.1"]
        serialized = json.loads(col.model_dump_json())

        # Assert snake_case keys
        card_content = serialized["explorer_cards"][0]["content"][0]
        assert "y_min" in card_content
        assert "y_max" in card_content
        assert "show_zero_line" in card_content
        assert "grouping_config" in card_content
        assert "group_by" in card_content["grouping_config"]

        # Assert no camelCase keys
        camel_case_keys = ["yMin", "yMax", "showZeroLine", "groupingConfig", "groupBy"]
        for key in camel_case_keys:
            assert key not in card_content, f"Found camelCase key: {key}"
            assert key not in card_content.get("grouping_config", {})

    def test_summary_card_count(self, tmp_path: Path):
        """AFTCollectionSummary.card_count matches actual number of explorer_cards."""
        data = {**_MINIMAL_COLLECTION, "id": "5.1"}
        # has 1 card in _MINIMAL_COLLECTION
        _write_collection(tmp_path, "5.1.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            summaries = get_collection_summaries()

        assert len(summaries) == 1
        s = summaries[0]
        assert isinstance(s, AFTCollectionSummary)
        assert s.card_count == 1

    def test_collection_with_empty_explorer_cards(self, tmp_path: Path):
        """Collection with explorer_cards: [] loads without errors."""
        data = {
            "id": "6.1",
            "name": "Empty Cards",
            "diagnostics": [],
            "explorer_cards": [],
        }
        _write_collection(tmp_path, "6.1.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            result = load_all_collections()

        assert "6.1" in result
        assert result["6.1"].explorer_cards == []

    def test_placeholder_card_with_empty_content(self, tmp_path: Path):
        """Card with content: [] and placeholder: true loads (ENSO case)."""
        data = {
            "id": "7.1",
            "name": "ENSO Collection",
            "diagnostics": [],
            "explorer_cards": [
                {
                    "title": "ENSO Placeholder",
                    "placeholder": True,
                    "content": [],
                }
            ],
        }
        _write_collection(tmp_path, "7.1.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            result = load_all_collections()

        col = result["7.1"]
        assert len(col.explorer_cards) == 1
        card = col.explorer_cards[0]
        assert card.placeholder is True
        assert card.content == []

    def test_duplicate_collection_ids_logs_warning(self, tmp_path: Path, caplog):
        """Duplicate IDs across YAML files results in a warning for the second file."""
        data1 = {**_MINIMAL_COLLECTION, "id": "dup-1", "name": "First"}
        data2 = {**_MINIMAL_COLLECTION, "id": "dup-1", "name": "Second"}
        _write_collection(tmp_path, "a.yaml", data1)
        _write_collection(tmp_path, "b.yaml", data2)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            with caplog.at_level(logging.WARNING, logger="ref_backend.core.collections"):
                result = load_all_collections()

        # One file was skipped, so only one collection with dup-1
        assert len([c for c in result.values() if c.id == "dup-1"]) == 1

    def test_collections_sorted_by_id(self, tmp_path: Path):
        """Collections are returned sorted by ID for stable ordering."""
        for cid in ["3.1", "1.1", "2.1"]:
            data = {**_MINIMAL_COLLECTION, "id": cid, "name": f"Col {cid}"}
            _write_collection(tmp_path, f"{cid}.yaml", data)

        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            summaries = get_collection_summaries()

        ids = [s.id for s in summaries]
        assert ids == sorted(ids)


class TestLoadThemeMapping:
    def test_theme_mapping_loads_and_resolves_collections(self, tmp_path: Path):
        """Theme mapping loads correctly and resolves collection references."""
        _write_collection(tmp_path, "1.1.yaml", _MINIMAL_COLLECTION)
        col2 = {**_MINIMAL_COLLECTION, "id": "1.2", "name": "Second Collection"}
        _write_collection(tmp_path, "1.2.yaml", col2)

        themes = {
            "ocean": {
                "title": "Ocean Theme",
                "description": "Ocean diagnostics",
                "collections": ["1.1", "1.2"],
            }
        }
        _write_themes(tmp_path, themes)

        with (
            patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path),
            patch("ref_backend.core.collections.get_themes_path", return_value=tmp_path / "themes.yaml"),
        ):
            mapping = load_theme_mapping()

        assert "ocean" in mapping
        theme = mapping["ocean"]
        assert isinstance(theme, ThemeDetail)
        assert theme.slug == "ocean"
        assert theme.title == "Ocean Theme"
        assert theme.description == "Ocean diagnostics"
        assert len(theme.collections) == 2
        assert theme.collections[0].id == "1.1"
        assert theme.collections[1].id == "1.2"

    def test_theme_aggregates_explorer_cards_in_order(self, tmp_path: Path):
        """Theme.explorer_cards aggregates all cards from collections in order."""
        col1 = {
            **_MINIMAL_COLLECTION,
            "id": "c1",
            "explorer_cards": [
                {"title": "Card A", "content": []},
                {"title": "Card B", "content": []},
            ],
        }
        col2 = {
            **_MINIMAL_COLLECTION,
            "id": "c2",
            "explorer_cards": [
                {"title": "Card C", "content": []},
            ],
        }
        _write_collection(tmp_path, "c1.yaml", col1)
        _write_collection(tmp_path, "c2.yaml", col2)

        themes = {"climate": {"title": "Climate", "collections": ["c1", "c2"]}}
        _write_themes(tmp_path, themes)

        with (
            patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path),
            patch("ref_backend.core.collections.get_themes_path", return_value=tmp_path / "themes.yaml"),
        ):
            theme = get_theme_by_slug("climate")

        assert theme is not None
        assert len(theme.explorer_cards) == 3
        assert theme.explorer_cards[0].title == "Card A"
        assert theme.explorer_cards[1].title == "Card B"
        assert theme.explorer_cards[2].title == "Card C"

    def test_unknown_collection_id_in_themes_logs_warning(self, tmp_path: Path, caplog):
        """Unknown collection ID in themes.yaml is skipped with a warning."""
        _write_collection(tmp_path, "1.1.yaml", _MINIMAL_COLLECTION)
        themes = {
            "ocean": {
                "title": "Ocean",
                "collections": ["1.1", "nonexistent-id"],
            }
        }
        _write_themes(tmp_path, themes)

        with (
            patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path),
            patch("ref_backend.core.collections.get_themes_path", return_value=tmp_path / "themes.yaml"),
        ):
            with caplog.at_level(logging.WARNING, logger="ref_backend.core.collections"):
                theme = get_theme_by_slug("ocean")

        assert theme is not None
        assert len(theme.collections) == 1  # nonexistent was skipped
        assert any("nonexistent-id" in msg for msg in caplog.messages)

    def test_collection_shared_across_themes(self, tmp_path: Path):
        """A collection referenced in two themes appears in both theme details."""
        _write_collection(tmp_path, "shared.yaml", {**_MINIMAL_COLLECTION, "id": "shared"})

        themes = {
            "theme-a": {"title": "Theme A", "collections": ["shared"]},
            "theme-b": {"title": "Theme B", "collections": ["shared"]},
        }
        _write_themes(tmp_path, themes)

        with (
            patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path),
            patch("ref_backend.core.collections.get_themes_path", return_value=tmp_path / "themes.yaml"),
        ):
            theme_a = get_theme_by_slug("theme-a")
            theme_b = get_theme_by_slug("theme-b")

        assert theme_a is not None
        assert theme_b is not None
        assert any(c.id == "shared" for c in theme_a.collections)
        assert any(c.id == "shared" for c in theme_b.collections)

    def test_get_theme_summaries(self, tmp_path: Path):
        """get_theme_summaries returns ThemeSummary with correct counts."""
        col1 = {**_MINIMAL_COLLECTION, "id": "t1"}  # 1 card
        col2 = {
            **_MINIMAL_COLLECTION,
            "id": "t2",
            "explorer_cards": [
                {"title": "C1", "content": []},
                {"title": "C2", "content": []},
            ],
        }
        _write_collection(tmp_path, "t1.yaml", col1)
        _write_collection(tmp_path, "t2.yaml", col2)

        themes = {"big-theme": {"title": "Big Theme", "collections": ["t1", "t2"]}}
        _write_themes(tmp_path, themes)

        with (
            patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path),
            patch("ref_backend.core.collections.get_themes_path", return_value=tmp_path / "themes.yaml"),
        ):
            summaries = get_theme_summaries()

        assert len(summaries) == 1
        s = summaries[0]
        assert s.slug == "big-theme"
        assert s.collection_count == 2
        assert s.card_count == 3  # 1 from t1 + 2 from t2

    def test_get_collection_by_id_returns_none_for_missing(self, tmp_path: Path):
        """get_collection_by_id returns None for nonexistent ID."""
        with patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path):
            result = get_collection_by_id("does-not-exist")
        assert result is None

    def test_missing_themes_file_returns_empty(self, tmp_path: Path):
        """Missing themes.yaml returns empty dict without crashing."""
        nonexistent = tmp_path / "themes.yaml"
        with (
            patch("ref_backend.core.collections.get_collections_dir", return_value=tmp_path),
            patch("ref_backend.core.collections.get_themes_path", return_value=nonexistent),
        ):
            result = load_theme_mapping()

        assert result == {}
