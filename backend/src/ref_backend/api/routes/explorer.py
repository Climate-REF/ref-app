from fastapi import APIRouter, HTTPException

from ref_backend.core.collections import (
    AFTCollectionDetail,
    AFTCollectionSummary,
    ThemeDetail,
    ThemeSummary,
    get_collection_by_id,
    get_collection_summaries,
    get_theme_by_slug,
    get_theme_summaries,
)

router = APIRouter(prefix="/explorer", tags=["Explorer"])


@router.get("/collections/", response_model=list[AFTCollectionSummary])
async def list_collections() -> list[AFTCollectionSummary]:
    return get_collection_summaries()


@router.get("/collections/{collection_id}", response_model=AFTCollectionDetail)
async def get_collection(collection_id: str) -> AFTCollectionDetail:
    result = get_collection_by_id(collection_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_id}' not found")
    return result


@router.get("/themes/", response_model=list[ThemeSummary])
async def list_themes() -> list[ThemeSummary]:
    return get_theme_summaries()


@router.get("/themes/{theme_slug}", response_model=ThemeDetail)
async def get_theme(theme_slug: str) -> ThemeDetail:
    result = get_theme_by_slug(theme_slug)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Theme '{theme_slug}' not found")
    return result
