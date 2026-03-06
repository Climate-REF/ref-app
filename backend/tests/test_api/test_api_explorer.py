"""Tests for the /api/v1/explorer/* endpoints."""

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from ref_backend.core.collections import load_all_collections, load_theme_mapping


@pytest.fixture(autouse=True)
def clear_collection_caches():
    """Clear collection lru_caches before and after each test."""
    load_all_collections.cache_clear()
    load_theme_mapping.cache_clear()
    yield
    load_all_collections.cache_clear()
    load_theme_mapping.cache_clear()


def _write_yaml(path: Path, data) -> None:
    with open(path, "w") as f:
        yaml.dump(data, f)


@pytest.fixture
def collections_dir(tmp_path: Path, monkeypatch):
    """Create a temp collections directory with fixture YAML files."""
    cols_dir = tmp_path / "collections"
    cols_dir.mkdir()

    # Collection 1.2 — atmosphere collection with y_min/y_max
    _write_yaml(
        cols_dir / "1.2.yaml",
        {
            "id": "1.2",
            "name": "Atmosphere Collection",
            "theme": "Atmosphere",
            "endorser": "WCRP",
            "diagnostics": [{"provider_slug": "pmp", "diagnostic_slug": "mean-climate"}],
            "explorer_cards": [
                {
                    "title": "Temperature Bias",
                    "content": [
                        {
                            "type": "box-whisker-chart",
                            "provider": "pmp",
                            "diagnostic": "mean-climate",
                            "title": "Temperature Bias Chart",
                            "y_min": -5.0,
                            "y_max": 5.0,
                            "grouping_config": {"group_by": "model", "hue": "experiment"},
                        }
                    ],
                }
            ],
        },
    )

    # Collection for sea ice with other_filters
    _write_yaml(
        cols_dir / "2.1.yaml",
        {
            "id": "2.1",
            "name": "Sea Ice Collection",
            "theme": "Ocean",
            "diagnostics": [],
            "explorer_cards": [
                {
                    "title": "Sea Ice Extent",
                    "content": [
                        {
                            "type": "series-chart",
                            "provider": "pmp",
                            "diagnostic": "sea-ice",
                            "title": "Sea Ice Series",
                            "other_filters": {
                                "isolate_ids": "CMIP6.ssp585.NH",
                                "exclude_ids": "CMIP6.piControl",
                            },
                            "grouping_config": {"group_by": "model", "hue": "experiment"},
                        }
                    ],
                }
            ],
        },
    )

    # ENSO collection with placeholder card (empty content)
    _write_yaml(
        cols_dir / "3.1.yaml",
        {
            "id": "3.1",
            "name": "ENSO Collection",
            "theme": "Earth System",
            "diagnostics": [],
            "explorer_cards": [
                {
                    "title": "ENSO Placeholder",
                    "placeholder": True,
                    "content": [],
                }
            ],
        },
    )

    # themes.yaml
    _write_yaml(
        cols_dir / "themes.yaml",
        [
            {
                "slug": "ocean",
                "title": "Ocean Theme",
                "description": "Ocean diagnostics",
                "collections": ["2.1"],
            },
            {
                "slug": "earth-system",
                "title": "Earth System Theme",
                "collections": ["1.2", "3.1"],
            },
        ],
    )

    monkeypatch.setattr(
        "ref_backend.core.collections.get_collections_dir",
        lambda: cols_dir,
    )
    monkeypatch.setattr(
        "ref_backend.core.collections.get_themes_path",
        lambda: cols_dir / "themes.yaml",
    )

    return cols_dir


def test_list_collections_returns_all_ids(client: TestClient, settings, collections_dir):
    """GET /explorer/collections/ returns all collection IDs."""
    r = client.get(f"{settings.API_V1_STR}/explorer/collections/")
    assert r.status_code == 200
    data = r.json()
    ids = [c["id"] for c in data]
    assert "1.2" in ids
    assert "2.1" in ids
    assert "3.1" in ids


def test_get_collection_12_returns_correct_cards(client: TestClient, settings, collections_dir):
    """GET /explorer/collections/1.2 returns the atmosphere collection with y_min/y_max."""
    r = client.get(f"{settings.API_V1_STR}/explorer/collections/1.2")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "1.2"
    assert data["name"] == "Atmosphere Collection"
    assert len(data["explorer_cards"]) == 1
    content = data["explorer_cards"][0]["content"][0]
    assert content["y_min"] == -5.0
    assert content["y_max"] == 5.0


def test_get_collection_nonexistent_returns_404(client: TestClient, settings, collections_dir):
    """GET /explorer/collections/nonexistent returns 404."""
    r = client.get(f"{settings.API_V1_STR}/explorer/collections/nonexistent")
    assert r.status_code == 404


def test_list_themes_returns_expected_slugs(client: TestClient, settings, collections_dir):
    """GET /explorer/themes/ returns expected theme slugs."""
    r = client.get(f"{settings.API_V1_STR}/explorer/themes/")
    assert r.status_code == 200
    data = r.json()
    slugs = [t["slug"] for t in data]
    assert "ocean" in slugs
    assert "earth-system" in slugs


def test_get_theme_ocean_returns_aggregated_cards(client: TestClient, settings, collections_dir):
    """GET /explorer/themes/ocean returns theme with aggregated sea-ice cards."""
    r = client.get(f"{settings.API_V1_STR}/explorer/themes/ocean")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "ocean"
    assert len(data["explorer_cards"]) == 1
    card = data["explorer_cards"][0]
    assert card["title"] == "Sea Ice Extent"


def test_get_theme_nonexistent_returns_404(client: TestClient, settings, collections_dir):
    """GET /explorer/themes/nonexistent returns 404."""
    r = client.get(f"{settings.API_V1_STR}/explorer/themes/nonexistent")
    assert r.status_code == 404


def test_response_field_names_are_snake_case(client: TestClient, settings, collections_dir):
    """Response fields use snake_case, not camelCase."""
    r = client.get(f"{settings.API_V1_STR}/explorer/collections/1.2")
    assert r.status_code == 200
    data = r.json()

    card_content = data["explorer_cards"][0]["content"][0]

    # These snake_case keys must be present
    assert "y_min" in card_content
    assert "y_max" in card_content
    assert "grouping_config" in card_content
    assert "group_by" in card_content["grouping_config"]

    # No camelCase variants allowed
    for key in ["yMin", "yMax", "groupingConfig", "groupBy", "showZeroLine"]:
        assert key not in card_content
        assert key not in card_content.get("grouping_config", {})

    # Top-level collection fields
    assert "explorer_cards" in data
    assert "explorerCards" not in data


def test_enso_placeholder_card_in_earth_system_theme(client: TestClient, settings, collections_dir):
    """ENSO placeholder card appears in earth-system theme with empty content list."""
    r = client.get(f"{settings.API_V1_STR}/explorer/themes/earth-system")
    assert r.status_code == 200
    data = r.json()

    all_cards = data["explorer_cards"]
    enso_cards = [c for c in all_cards if c.get("placeholder") is True]
    assert len(enso_cards) >= 1

    enso_card = enso_cards[0]
    assert enso_card["title"] == "ENSO Placeholder"
    assert enso_card["content"] == []


def test_sea_ice_cards_include_other_filters(client: TestClient, settings, collections_dir):
    """Sea ice card content includes isolate_ids and exclude_ids in other_filters."""
    r = client.get(f"{settings.API_V1_STR}/explorer/collections/2.1")
    assert r.status_code == 200
    data = r.json()

    content = data["explorer_cards"][0]["content"][0]
    assert "other_filters" in content
    filters = content["other_filters"]
    assert "isolate_ids" in filters
    assert "exclude_ids" in filters
    assert filters["isolate_ids"] == "CMIP6.ssp585.NH"
    assert filters["exclude_ids"] == "CMIP6.piControl"


def test_atmosphere_cards_include_y_min_y_max(client: TestClient, settings, collections_dir):
    """Atmosphere collection cards include y_min and y_max values."""
    r = client.get(f"{settings.API_V1_STR}/explorer/collections/1.2")
    assert r.status_code == 200
    data = r.json()

    content = data["explorer_cards"][0]["content"][0]
    assert content["y_min"] == -5.0
    assert content["y_max"] == 5.0
