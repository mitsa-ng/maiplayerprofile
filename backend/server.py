"""FastAPI 進入點。

啟動：uvicorn backend.server:app --port 7860
（config 會先 chdir 到專案根目錄，所以從任何工作目錄啟動都能跑）
"""
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import WEB_DIR
from .routers import assets, cards, health

app = FastAPI(
    title="maiplayerprofile API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# 素材索引是純 int 陣列，gzip 後從約 8 KB 降到 4 KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(health.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(cards.router, prefix="/api")


if WEB_DIR.is_dir():
    static_dir = WEB_DIR / "assets"
    if static_dir.is_dir():
        # Vite 產物掛在 /assets，與 /api/assets 前綴不同不會衝突
        app.mount("/assets", StaticFiles(directory=static_dir), name="static")

    # catch-all 必須最後註冊，否則會吃掉 /api/*
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = WEB_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(WEB_DIR / "index.html")
