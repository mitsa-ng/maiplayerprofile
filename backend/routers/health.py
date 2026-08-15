from fastapi import APIRouter

from .. import assets, thumbs
from ..config import CATEGORIES
from ..schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        assetCounts={c: len(assets.asset_ids(c)) for c in CATEGORIES},
        thumbsCached={c: thumbs.cached_count(c) for c in CATEGORIES},
    )
