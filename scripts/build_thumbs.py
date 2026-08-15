#!/usr/bin/env python
"""批次預產生所有素材縮圖。

用法：python scripts/build_thumbs.py [--force]

實測全量約 27-34 秒產出 3157 個 WebP、總量約 10-21 MB
（原始素材 703 MB）。PIL 在 C 層釋放 GIL，所以多執行緒有效。
"""
import argparse
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import assets, thumbs  # noqa: E402
from backend.config import CACHE_DIR, CATEGORIES  # noqa: E402


def build(category: str, workers: int) -> tuple[int, int, int]:
    """回傳 (成功數, 失敗數, 總 bytes)"""
    ids = assets.asset_ids(category)
    ok = fail = total = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(thumbs.make_thumb, category, i): i for i in ids}
        for fut in as_completed(futures):
            try:
                total += len(fut.result())
                ok += 1
            except Exception as exc:  # noqa: BLE001
                fail += 1
                print(f"  ! {category}/{futures[fut]:06d}: {exc}", file=sys.stderr)
    return ok, fail, total


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="先清空既有快取")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    if args.force and CACHE_DIR.exists():
        print(f"清空 {CACHE_DIR}")
        shutil.rmtree(CACHE_DIR)

    grand_ok = grand_fail = grand_bytes = 0
    started = time.perf_counter()

    for category in CATEGORIES:
        t0 = time.perf_counter()
        ok, fail, total = build(category, args.workers)
        dt = time.perf_counter() - t0
        grand_ok += ok
        grand_fail += fail
        grand_bytes += total
        print(
            f"{category:6s} {ok:5d} 張  {dt:6.1f}s  "
            f"{total / 1024 / 1024:6.1f} MB" + (f"  ({fail} 失敗)" if fail else "")
        )

    print(
        f"\n合計 {grand_ok} 張、{grand_bytes / 1024 / 1024:.1f} MB、"
        f"{time.perf_counter() - started:.1f}s → {CACHE_DIR}"
    )
    return 1 if grand_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
