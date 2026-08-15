"""素材索引。

取代 app.py 的 list_assets() / get_preview_path()。
差異：ID 存成 int（app.py:152 的 replace("UI_","") 產出的是 "Chara_000000"
這種字串，所以複製按鈕才要用 regex 抽數字補救）。
"""
import collections
from functools import lru_cache
from pathlib import Path

from .config import CATEGORIES, RES_IMAGES


@lru_cache(maxsize=None)
def asset_ids(category: str) -> tuple[int, ...]:
    """回傳排序後的素材 ID。啟動時掃一次，之後全部走快取。"""
    folder, prefix, _, _ = CATEGORIES[category]
    d = RES_IMAGES / folder
    if not d.is_dir():
        return ()
    out = []
    for f in d.iterdir():
        if f.suffix.lower() != ".png" or not f.name.startswith(prefix):
            continue
        stem = f.stem[len(prefix):]
        if stem.isdigit():
            out.append(int(stem))
    return tuple(sorted(out))


@lru_cache(maxsize=None)
def _id_set(category: str) -> frozenset[int]:
    return frozenset(asset_ids(category))


@lru_cache(maxsize=None)
def id_groups(category: str) -> list[tuple[str, int]]:
    """依 ID 前兩碼分組計數，依前綴字串排序。

    實測所有類別的前兩碼都落在 00/05/10/.../60 共 13 組（Icon 多一個孤兒
    組 11）。素材沒有名稱也沒有標籤，這是唯一免費的分類軸，把 1039 筆切成
    平均 80 筆。

    回傳 list 而非 dict —— dict 序列化成 JSON 後，JavaScript 會把 "10"
    這類整數樣式的 key 提前並依數值排序，"00"/"05" 會被擠到最後。
    """
    counter = collections.Counter(f"{i:06d}"[:2] for i in asset_ids(category))
    return sorted(counter.items())


def exists(category: str, asset_id: int) -> bool:
    return asset_id in _id_set(category)


def asset_path(category: str, asset_id: int) -> Path | None:
    folder, prefix, _, _ = CATEGORIES[category]
    p = RES_IMAGES / folder / f"{prefix}{asset_id:06d}.png"
    return p if p.is_file() else None
