import hashlib

from fastapi import APIRouter, HTTPException, Path, Request, Response
from fastapi.responses import FileResponse

from .. import assets as asset_index
from .. import thumbs
from ..config import CATEGORIES
from ..schemas import AssetGroup, AssetIndexResponse, Category

router = APIRouter(prefix="/assets", tags=["assets"])

# 素材檔名含 ID、內容永不改變 → 可以放心 immutable
IMMUTABLE = "public, max-age=31536000, immutable"


def _check_category(category: str) -> None:
    if category not in CATEGORIES:
        raise HTTPException(404, f"未知的素材類別：{category}")


@router.get("/{category}/index", response_model=AssetIndexResponse)
def get_index(category: Category):
    """一次回傳整個類別的 ID 清單。

    1150 筆 int 經 gzip 約 4-8 KB。前端拿完就能做零延遲的本地搜尋、
    跳至 ID 與虛擬捲動，不必為了搜尋往返伺服器。
    """
    _check_category(category)
    ids = asset_index.asset_ids(category)
    return AssetIndexResponse(
        category=category,
        total=len(ids),
        ids=list(ids),
        groups=[AssetGroup(prefix=p, count=n) for p, n in asset_index.id_groups(category)],
    )


@router.get("/{category}/{asset_id}/thumb.webp")
def get_thumb(request: Request, category: Category, asset_id: int = Path(ge=0, le=999999)):
    _check_category(category)
    try:
        data = thumbs.make_thumb(category, asset_id)
    except KeyError:
        raise HTTPException(404, f"{category} ID {asset_id:06d} 不存在")

    etag = '"' + hashlib.sha256(data).hexdigest()[:32] + '"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": IMMUTABLE})

    return Response(
        content=data,
        media_type="image/webp",
        headers={"ETag": etag, "Cache-Control": IMMUTABLE},
    )


@router.get("/{category}/{asset_id}/full.png")
def get_full(category: Category, asset_id: int = Path(ge=0, le=999999)):
    _check_category(category)
    path = asset_index.asset_path(category, asset_id)
    if path is None:
        raise HTTPException(404, f"{category} ID {asset_id:06d} 不存在")
    return FileResponse(
        path, media_type="image/png", headers={"Cache-Control": IMMUTABLE}
    )
