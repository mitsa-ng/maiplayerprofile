from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response

from .. import render
from ..schemas import CardRequest

router = APIRouter(prefix="/cards", tags=["cards"])


def _asset_error_response(exc: render.AssetNotFound) -> JSONResponse:
    # 用 Pydantic 的 detail 形狀，前端就能用同一套邏輯把 loc 映射到
    # react-hook-form 的欄位路徑（["body","chara",2,"id"] → chara.2.id）
    return JSONResponse(status_code=422, content={"detail": exc.errors})


@router.post("/preview")
def preview(
    req: CardRequest,
    scale: float = Query(0.5, ge=0.25, le=1.0),
    format: str = Query("webp", pattern="^(webp|png)$"),
):
    """縮小版預覽。540×239 WebP 約 41 KB / 17 ms，
    相對全尺寸 PNG 的 772 KB / 193 ms 是 19× 與 11× 的差距。"""
    try:
        render.validate_assets(req)
    except render.AssetNotFound as exc:
        return _asset_error_response(exc)

    data, elapsed, cached = render.render_preview(req, scale, format)
    return Response(
        content=data,
        media_type=f"image/{format}",
        headers={
            "X-Render-Ms": f"{elapsed:.1f}",
            "X-Cache": "HIT" if cached else "MISS",
            "Cache-Control": "no-store",
        },
    )


@router.post("/render")
def render_card(req: CardRequest):
    """全尺寸 1080×477 PNG，給下載用。"""
    try:
        render.validate_assets(req)
    except render.AssetNotFound as exc:
        return _asset_error_response(exc)

    data = render.render_full(req)
    return Response(
        content=data,
        media_type="image/png",
        headers={
            "Content-Disposition": 'attachment; filename="maicard.png"',
            "Cache-Control": "no-store",
        },
    )
