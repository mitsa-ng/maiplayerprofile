"""縮圖產生與磁碟快取。

原始素材 703 MB，Frame 平均 664 KB/張 —— 一頁 20 張就是 13 MB，
絕對不能直接送進格線。壓成 WebP 後 664 KB → 約 6-20 KB。
"""
import io

from PIL import Image

from . import assets
from .config import CACHE_DIR, CATEGORIES


def thumb_path(category: str, asset_id: int):
    return CACHE_DIR / category / f"{asset_id:06d}.webp"


def make_thumb(category: str, asset_id: int) -> bytes:
    """產生縮圖 bytes。有磁碟快取就直接讀，否則現做並嘗試落盤。

    raises KeyError: 素材不存在
    """
    dst = thumb_path(category, asset_id)
    if dst.is_file():
        return dst.read_bytes()

    src = assets.asset_path(category, asset_id)
    if src is None:
        raise KeyError(f"{category}/{asset_id:06d} 不存在")

    _, _, size, quality = CATEGORIES[category]
    with Image.open(src) as im:
        im = im.convert("RGBA")
        im.thumbnail(size, Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=quality, method=4)
    data = buf.getvalue()

    try:
        dst.parent.mkdir(parents=True, exist_ok=True)
        # 原子寫入：避免併發時讀到只寫了一半的檔案
        tmp = dst.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(dst)
    except OSError:
        # 唯讀檔案系統 → 降級為只回 bytes 不落盤
        pass

    return data


def cached_count(category: str) -> int:
    d = CACHE_DIR / category
    if not d.is_dir():
        return 0
    return sum(1 for _ in d.glob("*.webp"))
