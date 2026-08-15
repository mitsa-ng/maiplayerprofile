import { useCallback, useState } from "react"
import type { Category } from "@/lib/types"

const LIMIT = 24

const key = (kind: "recent" | "fav", c: Category) => `maicard.${kind}.${c}`

function read(kind: "recent" | "fav", c: Category): string[] {
  try {
    const raw = localStorage.getItem(key(kind, c))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

function write(kind: "recent" | "fav", c: Category, v: string[]) {
  try {
    localStorage.setItem(key(kind, c), JSON.stringify(v))
  } catch {
    /* 無痕模式或配額滿 —— 功能降級但不該讓 UI 爆掉 */
  }
}

/** 最近使用（LRU）與我的最愛。
 *  素材只有數字 ID、沒有名稱，這兩份清單是實務上最有效的「回到剛才那張」。 */
export function useAssetMemory(category: Category) {
  const [recent, setRecent] = useState<string[]>(() => read("recent", category))
  const [favourites, setFavourites] = useState<string[]>(() => read("fav", category))

  const pushRecent = useCallback(
    (id: string) => {
      setRecent((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)].slice(0, LIMIT)
        write("recent", category, next)
        return next
      })
    },
    [category],
  )

  const toggleFavourite = useCallback(
    (id: string) => {
      setFavourites((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
        write("fav", category, next)
        return next
      })
    },
    [category],
  )

  return { recent, favourites, pushRecent, toggleFavourite }
}
