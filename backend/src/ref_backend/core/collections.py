import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)


class AFTCollectionGroupingConfig(BaseModel):
    group_by: str
    hue: str
    style: str | None = None


class AFTCollectionCardContent(BaseModel):
    type: Literal["box-whisker-chart", "figure-gallery", "series-chart", "taylor-diagram"]
    provider: str
    diagnostic: str
    title: str
    description: str | None = None
    interpretation: str | None = None
    span: Literal[1, 2] | None = None
    placeholder: bool | None = None
    metric_units: str | None = None
    clip_min: float | None = None
    clip_max: float | None = None
    y_min: float | None = None
    y_max: float | None = None
    show_zero_line: bool | None = None
    symmetrical_axes: bool | None = None
    reference_stddev: float | None = None
    label_template: str | None = None
    other_filters: dict[str, str] | None = None
    grouping_config: AFTCollectionGroupingConfig | None = None


class AFTCollectionCard(BaseModel):
    title: str
    description: str | None = None
    placeholder: bool | None = None
    content: list[AFTCollectionCardContent]


class AFTCollectionContent(BaseModel):
    description: str | None = None
    short_description: str | None = None


class AFTCollectionDiagnosticLink(BaseModel):
    provider_slug: str
    diagnostic_slug: str


class AFTCollectionSummary(BaseModel):
    id: str
    name: str
    theme: str | None = None
    endorser: str | None = None
    card_count: int


class AFTCollectionDetail(BaseModel):
    id: str
    name: str
    theme: str | None = None
    endorser: str | None = None
    version_control: str | None = None
    reference_dataset: str | None = None
    provider_link: str | None = None
    content: AFTCollectionContent | None = None
    diagnostics: list[AFTCollectionDiagnosticLink]
    explorer_cards: list[AFTCollectionCard]


class ThemeSummary(BaseModel):
    slug: str
    title: str
    description: str | None = None
    collection_count: int
    card_count: int


class ThemeDetail(BaseModel):
    slug: str
    title: str
    description: str | None = None
    collections: list[AFTCollectionDetail]
    explorer_cards: list[AFTCollectionCard]


def get_collections_dir() -> Path:
    return Path(__file__).parents[3] / "static" / "collections"


def get_themes_path() -> Path:
    return get_collections_dir() / "themes.yaml"


@lru_cache(maxsize=1)
def load_all_collections() -> dict[str, AFTCollectionDetail]:
    collections_dir = get_collections_dir()

    if not collections_dir.exists():
        logger.warning(f"Collections directory not found: {collections_dir}")
        return {}

    result: dict[str, AFTCollectionDetail] = {}

    yaml_files = sorted(
        [p for p in collections_dir.glob("*.yaml") if p.name != "themes.yaml"],
        key=lambda p: p.stem,
    )

    for yaml_file in yaml_files:
        try:
            with open(yaml_file, encoding="utf-8") as f:
                data = yaml.safe_load(f)

            if not isinstance(data, dict):
                logger.warning(f"Skipping {yaml_file.name}: expected a YAML mapping at top level")
                continue

            collection = AFTCollectionDetail(**data)

            if collection.id in result:
                raise ValueError(f"Duplicate collection ID '{collection.id}' found in {yaml_file.name}")

            result[collection.id] = collection

        except ValidationError as e:
            logger.warning(f"Skipping {yaml_file.name}: validation error: {e}")
        except Exception as e:
            logger.warning(f"Skipping {yaml_file.name}: parse error: {e}")

    return result


def get_collection_by_id(collection_id: str) -> AFTCollectionDetail | None:
    return load_all_collections().get(collection_id)


def get_collection_summaries() -> list[AFTCollectionSummary]:
    collections = load_all_collections()
    return [
        AFTCollectionSummary(
            id=c.id,
            name=c.name,
            theme=c.theme,
            endorser=c.endorser,
            card_count=len(c.explorer_cards),
        )
        for c in sorted(collections.values(), key=lambda c: c.id)
    ]


@lru_cache(maxsize=1)
def load_theme_mapping() -> dict[str, ThemeDetail]:
    themes_path = get_themes_path()

    if not themes_path.exists():
        logger.warning(f"Themes file not found: {themes_path}")
        return {}

    try:
        with open(themes_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or []
    except Exception as e:
        logger.warning(f"Error loading themes.yaml: {e}")
        return {}

    all_collections = load_all_collections()
    result: dict[str, ThemeDetail] = {}

    for theme_data in data:
        try:
            slug = theme_data["slug"]
            title = theme_data["title"]
            description = theme_data.get("description")
            collection_ids: list[str] = theme_data.get("collections", [])

            collections: list[AFTCollectionDetail] = []
            explorer_cards: list[AFTCollectionCard] = []

            for cid in collection_ids:
                col = all_collections.get(cid)
                if col is None:
                    logger.warning(f"Theme '{slug}' references unknown collection ID '{cid}', skipping")
                    continue
                collections.append(col)
                explorer_cards.extend(col.explorer_cards)

            result[slug] = ThemeDetail(
                slug=slug,
                title=title,
                description=description,
                collections=collections,
                explorer_cards=explorer_cards,
            )

        except Exception as e:
            logger.warning(f"Skipping theme entry: {e}")

    return result


def get_theme_summaries() -> list[ThemeSummary]:
    themes = load_theme_mapping()
    return [
        ThemeSummary(
            slug=t.slug,
            title=t.title,
            description=t.description,
            collection_count=len(t.collections),
            card_count=len(t.explorer_cards),
        )
        for t in themes.values()
    ]


def get_theme_by_slug(slug: str) -> ThemeDetail | None:
    return load_theme_mapping().get(slug)
