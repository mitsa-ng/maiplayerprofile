"""卡片合成封裝：存在性驗證、併發閘、LRU 快取。

必須在 import main 之前先 import config（它會 os.chdir 到專案根目錄），
否則 main.py:13 綁定 os.getcwd() 的路徑會指向錯誤位置。
"""
import hashlib
import io
import json
import threading
import time
from collections import OrderedDict

from . import assets
from .config import PREVIEW_CACHE_MAX_BYTES, PREVIEW_STAMP, RENDER_CONCURRENCY  # noqa: F401  (先觸發 chdir)
from .schemas import CardRequest

from PIL import Image  # noqa: E402
from main import call_user_img  # noqa: E402  —— 必須在 config 之後

_sem = threading.Semaphore(RENDER_CONCURRENCY)
_cache: "OrderedDict[str, bytes]" = OrderedDict()
_cache_bytes = 0
_cache_lock = threading.Lock()


class AssetNotFound(Exception):
    """回 422 用；帶著 Pydantic 風格的 loc 讓前端能把錯誤釘到欄位上。"""

    def __init__(self, errors: list[dict]):
        self.errors = errors
        super().__init__(f"{len(errors)} 個素材 ID 不存在")


def validate_assets(req: CardRequest) -> None:
    """檢查素材是否存在。

    main.py 的容錯是不對稱的：frame 有 try/except fallback、chara 有
    os.path.exists 檢查，但 icon / plate / titleRare 都是裸 Image.open，
    ID 不存在會直接 FileNotFoundError → 500。即時預覽下這會變成持續噴錯，
    所以在這裡先擋掉並回 422。
    """
    errors: list[dict] = []

    for field, label in (("icon", "頭像"), ("plate", "姓名框"), ("frame", "背景框")):
        value = getattr(req, field)
        if not assets.exists(field, value):
            errors.append({
                "type": "asset_not_found",
                "loc": ["body", field],
                "msg": f"找不到{label} {value:06d}。這個 ID 不在素材庫裡。",
                "input": value,
            })

    for i, slot in enumerate(req.chara):
        if not assets.exists("chara", slot.id):
            errors.append({
                "type": "asset_not_found",
                "loc": ["body", "chara", i, "id"],
                "msg": f"找不到角色 {slot.id:06d}。這個 ID 不在素材庫裡。",
                "input": slot.id,
            })

    if errors:
        raise AssetNotFound(errors)


def _cache_key(req: CardRequest, scale: float, fmt: str) -> str:
    # 用 model_dump 而非 raw body：預設值已正規化，省略欄位與顯式帶入
    # 同一個值會命中同一格。
    payload = req.model_dump(mode="json")
    payload["_scale"] = scale
    payload["_fmt"] = fmt
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(blob).hexdigest()


def _cache_get(key: str) -> bytes | None:
    with _cache_lock:
        data = _cache.get(key)
        if data is not None:
            _cache.move_to_end(key)
        return data


def _cache_put(key: str, data: bytes) -> None:
    global _cache_bytes
    with _cache_lock:
        if key in _cache:
            return
        _cache[key] = data
        _cache_bytes += len(data)
        while _cache_bytes > PREVIEW_CACHE_MAX_BYTES and _cache:
            _, evicted = _cache.popitem(last=False)
            _cache_bytes -= len(evicted)


def render_preview(req: CardRequest, scale: float, fmt: str) -> tuple[bytes, float, bool]:
    """回傳 (bytes, 耗時毫秒, 是否快取命中)。

    預覽傳固定 stamp 讓相同輸入產生相同 bytes —— 否則 main.py:382 燒進去的
    datetime.now() 會讓快取命中率永遠是 0。
    """
    key = _cache_key(req, scale, fmt)
    hit = _cache_get(key)
    if hit is not None:
        return hit, 0.0, True

    started = time.perf_counter()
    with _sem:
        img = call_user_img(req.to_user_data(), False, stamp=PREVIEW_STAMP)
        if scale != 1.0:
            img = img.resize(
                (round(img.width * scale), round(img.height * scale)),
                Image.LANCZOS,
            )
        buf = io.BytesIO()
        if fmt == "webp":
            img.convert("RGB").save(buf, "WEBP", quality=80, method=4)
        else:
            img.save(buf, "PNG")
    data = buf.getvalue()
    elapsed = (time.perf_counter() - started) * 1000

    _cache_put(key, data)
    return data, elapsed, False


def render_full(req: CardRequest) -> bytes:
    """全尺寸 PNG，給下載用。stamp=None → 燒進真實生成時間。"""
    with _sem:
        img = call_user_img(req.to_user_data(), False, stamp=None)
        buf = io.BytesIO()
        img.save(buf, "PNG")
    return buf.getvalue()
