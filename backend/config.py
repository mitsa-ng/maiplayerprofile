"""路徑與常數設定。

重要：main.py 的 maimaiImgPath 綁定 os.getcwd() 而非 __file__，
所以任何 import main 之前都必須先 chdir 到專案根目錄，
否則從其他目錄啟動 uvicorn 會全盤崩潰。
"""
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# 必須在 import main 之前執行 —— 見上方說明
os.chdir(PROJECT_ROOT)

RES_IMAGES = PROJECT_ROOT / "res" / "images"
WEB_DIR = PROJECT_ROOT / "web"
CACHE_DIR = Path(
    os.environ.get("THUMB_CACHE_DIR", PROJECT_ROOT / ".cache" / "thumbs")
)

# category -> (資料夾, 檔名前綴, 縮圖尺寸, WebP 品質)
CATEGORIES = {
    "chara": ("Chara", "UI_Chara_", (256, 256), 78),
    "icon": ("Icon", "UI_Icon_", (128, 128), 78),
    "frame": ("Frame", "UI_Frame_", (432, 181), 78),
    "plate": ("Plate", "UI_Plate_", (432, 70), 80),
}

# PIL 在 C 層釋放 GIL，但核心數少時無限併發會 thrash
RENDER_CONCURRENCY = int(os.environ.get("RENDER_CONCURRENCY", "2"))

# 預覽快取上限（bytes）。41KB/張 → 約 1600 張
PREVIEW_CACHE_MAX_BYTES = int(
    os.environ.get("PREVIEW_CACHE_MAX_BYTES", str(64 * 1024 * 1024))
)

# 預覽用的固定時間戳：讓相同輸入產生相同 bytes，快取才有意義。
# 下載路徑傳 None，燒進圖片的就是真實時間。
PREVIEW_STAMP = "preview"
