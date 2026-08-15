import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ImageOff, Search, Star } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge, Skeleton } from "@/components/ui/misc"
import { useAssetIndex } from "@/hooks/useAssetIndex"
import { useAssetMemory } from "@/hooks/useRecentAssets"
import { thumbUrl } from "@/lib/api"
import {
  CATEGORY_ASPECT,
  CATEGORY_COLUMNS,
  CATEGORY_LABEL,
  type Category,
} from "@/lib/types"
import { cn, pad6 } from "@/lib/utils"

interface Props {
  category: Category
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onSelect: (id: string) => void
}

type Tab = "all" | "recent" | "fav"

function useColumns(category: Category) {
  const conf = CATEGORY_COLUMNS[category]
  const [cols, setCols] = useState(conf.lg)
  useEffect(() => {
    const pick = () => {
      const w = window.innerWidth
      setCols(w < 640 ? conf.base : w < 1024 ? conf.md : conf.lg)
    }
    pick()
    window.addEventListener("resize", pick)
    return () => window.removeEventListener("resize", pick)
  }, [conf])
  return cols
}

export function AssetPicker({ category, open, onOpenChange, value, onSelect }: Props) {
  const { data, loading, error } = useAssetIndex(category, open)
  const { recent, favourites, pushRecent, toggleFavourite } = useAssetMemory(category)
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("all")
  const [focusIdx, setFocusIdx] = useState(0)
  const [flashId, setFlashId] = useState<string | null>(null)

  // 用 state 而非 ref 持有捲動容器。Dialog 是 portal，第一次 render 時
  // ref.current 還是 null，virtualizer 會拿不到元素而永遠不掛 scroll listener
  // —— 症狀是清單捲得動、但內容永遠停在第一頁。
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const cols = useColumns(category)
  const aspect = CATEGORY_ASPECT[category]
  const label = CATEGORY_LABEL[category]

  const allIds = useMemo(() => (data ? data.ids.map(pad6) : []), [data])

  // 搜尋是「跳至 ID」而非過濾：輸入完整 6 碼且存在時保留全部上下文，
  // 只把該張捲到畫面中央並高亮。子字串比對（現況做法）噪音太大 ——
  // 打 "01" 會命中 350103、000101、450012…
  const exactHit = useMemo(() => {
    if (!query) return null
    const padded = query.padStart(6, "0")
    return allIds.includes(padded) ? padded : null
  }, [query, allIds])

  const items = useMemo(() => {
    let pool =
      tab === "recent"
        ? recent.filter((id) => allIds.includes(id))
        : tab === "fav"
          ? favourites.filter((id) => allIds.includes(id))
          : allIds

    if (tab === "all" && group) pool = pool.filter((id) => id.startsWith(group))
    if (!query || exactHit) return pool

    // 1-5 碼：前綴優先，其次包含
    const prefix = pool.filter((id) => id.startsWith(query))
    const contains = pool.filter((id) => !id.startsWith(query) && id.includes(query))
    return [...prefix, ...contains]
  }, [tab, group, query, exactHit, allIds, recent, favourites])

  const rowCount = Math.ceil(items.length / cols)
  const rowHeight = useMemo(() => {
    const width = scrollEl ? scrollEl.clientWidth - 24 : 800
    const tileW = width / cols - 8
    return Math.round(tileW / aspect) + 34
  }, [cols, aspect, scrollEl])

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollEl,
    estimateSize: () => rowHeight,
    overscan: 4,
  })

  /** 直接設 scrollTop。列高固定，算得出來，也不必等 virtualizer 完成量測
   *  —— 實測 scrollToIndex 在容器剛掛載那一幀會算在 0 高度上而無效。 */
  const scrollToIdx = useCallback(
    (idx: number, center: boolean) => {
      const el = scrollEl
      if (!el) return
      const row = Math.floor(idx / cols)
      const target = center
        ? row * rowHeight - (el.clientHeight - rowHeight) / 2
        : row * rowHeight
      // 上界用 rowCount*rowHeight 推算，不要用 el.scrollHeight ——
      // 剛開啟時內層格線可能還沒撐開，scrollHeight 會等於 clientHeight，
      // 夾出來的結果是 0，等於整個對齊被吃掉。
      const maxTop = Math.max(0, rowCount * rowHeight - el.clientHeight)
      el.scrollTop = Math.max(0, Math.min(target, maxTop))
      // 開啟當下這次捲動可能早於 virtualizer 掛上 scroll listener，
      // 那樣畫面會停在第一頁。主動補一個事件讓它重算可視範圍。
      el.dispatchEvent(new Event("scroll"))
    },
    [cols, rowHeight, rowCount, scrollEl],
  )

  // 命中完整 ID → 捲到該張並閃爍高亮，而不是把清單過濾掉
  useEffect(() => {
    if (!exactHit) return
    const idx = items.indexOf(exactHit)
    if (idx < 0) return
    setFocusIdx(idx)
    scrollToIdx(idx, true)
    setFlashId(exactHit)
    const t = setTimeout(() => setFlashId(null), 2000)
    return () => clearTimeout(t)
  }, [exactHit, items, scrollToIdx])

  // 開啟時捲到目前選中的素材。
  // 必須把 scrollEl 納入依賴：清單資料與捲動容器是分兩次到位的，
  // 只看 [open, items.length] 的話，這個 effect 會在 scrollEl 還是 null 時
  // 跑掉，之後再也不會重跑。用 alignedRef 確保每次開啟只對齊一次。
  // 記下這次開啟要對齊到哪個 ID
  const alignTargetRef = useRef<string | null>(null)
  useEffect(() => {
    alignTargetRef.current = open && value ? pad6(value) : null
  }, [open, value])

  // 條件齊備（容器已掛載、清單已載入、列高已算出）時對齊一次。
  // 刻意不用 rAF：effect 的 cleanup 會在依賴變動時取消排程中的 rAF，
  // 配上「只做一次」的旗標就會變成永遠不執行。
  useEffect(() => {
    const target = alignTargetRef.current
    if (!target || !scrollEl || items.length === 0 || rowHeight <= 0) return
    const idx = items.indexOf(target)
    alignTargetRef.current = null
    if (idx < 0) return
    setFocusIdx(idx)
    scrollToIdx(idx, true)
  }, [scrollEl, items, rowHeight, scrollToIdx])

  const commit = useCallback(
    (id: string) => {
      pushRecent(id)
      onSelect(id)
      onOpenChange(false)
    },
    [onSelect, onOpenChange, pushRecent],
  )

  // roving tabindex。移動後不能直接 focus()：目標那一列可能還沒被虛擬化
  // 掛載，rAF 也未必等得到 React 重繪。改成設旗標，由下方的 effect 在
  // 節點真的出現時才 focus。
  const wantFocusRef = useRef(false)
  const moveFocus = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, next))
      wantFocusRef.current = true
      setFocusIdx(clamped)
      // 先把目標列捲進可視範圍，虛擬化才會掛載它
      const el = scrollEl
      if (el) {
        const row = Math.floor(clamped / cols)
        const top = row * rowHeight
        if (top < el.scrollTop) {
          el.scrollTop = top
          el.dispatchEvent(new Event("scroll"))
        } else if (top + rowHeight > el.scrollTop + el.clientHeight) {
          el.scrollTop = top + rowHeight - el.clientHeight
          el.dispatchEvent(new Event("scroll"))
        }
      }
    },
    [items.length, cols, rowHeight, scrollEl],
  )

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key
    let next: number | null = null
    if (k === "ArrowRight") next = focusIdx + 1
    else if (k === "ArrowLeft") next = focusIdx - 1
    else if (k === "ArrowDown") next = focusIdx + cols
    else if (k === "ArrowUp") next = focusIdx - cols
    else if (k === "Home") next = Math.floor(focusIdx / cols) * cols
    else if (k === "End") next = Math.floor(focusIdx / cols) * cols + cols - 1
    else if (k === "PageDown") next = focusIdx + cols * 4
    else if (k === "PageUp") next = focusIdx - cols * 4
    else if (k === "Enter" || k === " ") {
      e.preventDefault()
      if (items[focusIdx]) commit(items[focusIdx])
      return
    } else if (k === "f" || k === "F") {
      if (items[focusIdx]) toggleFavourite(items[focusIdx])
      return
    } else if (/^\d$/.test(k)) {
      // 數字鍵直接轉送到搜尋框
      setQuery((q) => q + k)
      return
    } else return

    if (e.ctrlKey || e.metaKey) {
      if (k === "Home") next = 0
      if (k === "End") next = items.length - 1
    }
    e.preventDefault()
    if (next !== null) moveFocus(next)
  }

  // 虛擬捲動下，focusIdx 指向的那格可能根本沒被渲染（例如開啟時選中的素材
  // 在清單很後面）。若照 focusIdx 直接發 tabIndex=0，DOM 裡會一格可 Tab 的
  // 都沒有，鍵盤使用者根本進不了格線。所以把錨點夾回目前渲染範圍。
  const virtualRows = virtualizer.getVirtualItems()
  const anchorIdx = useMemo(() => {
    if (virtualRows.length === 0) return focusIdx
    const min = virtualRows[0].index * cols
    const max = Math.min(
      items.length - 1,
      virtualRows[virtualRows.length - 1].index * cols + cols - 1,
    )
    return focusIdx >= min && focusIdx <= max ? focusIdx : min
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualRows, focusIdx, cols, items.length])

  // 鍵盤移動後，等目標節點真的被虛擬化掛載出來再 focus。
  // virtualRows 每次重繪都是新陣列，所以這個 effect 會持續重試到成功為止。
  useEffect(() => {
    if (!wantFocusRef.current || !scrollEl) return
    const el = scrollEl.querySelector<HTMLButtonElement>(`[data-idx="${focusIdx}"]`)
    if (el) {
      el.focus()
      wantFocusRef.current = false
    }
  }, [focusIdx, scrollEl, virtualRows])

  const groups = data?.groups ?? []
  const nearest = useMemo(() => {
    if (!query || items.length > 0 || allIds.length === 0) return []
    const target = Number(query)
    return [...allIds]
      .sort((a, b) => Math.abs(Number(a) - target) - Math.abs(Number(b) - target))
      .slice(0, 5)
  }, [query, items.length, allIds])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(46rem,88vh)]">
        <header className="border-b px-4 py-3">
          <DialogTitle>選擇{label}</DialogTitle>
          <DialogDescription className="sr-only">
            用方向鍵瀏覽，Enter 選取，Esc 關閉。輸入數字可跳至指定 ID。
          </DialogDescription>
        </header>

        <div className="border-b px-4 py-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              className="pl-9"
              placeholder={`輸入 ID 數字，例如 ${allIds[0] ?? "000000"}`}
              aria-label={`以 ID 搜尋${label}`}
            />
          </div>
        </div>

        {/* 系列 chips：ID 前兩碼是素材唯一免費的分類軸，
            把 1039 筆切成平均 80 筆 */}
        {tab === "all" && groups.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2">
            <Chip active={group === null} onClick={() => setGroup(null)}>
              全部 <Badge className="ml-1">{allIds.length}</Badge>
            </Chip>
            {groups.map(({ prefix, count }) => (
              <Chip
                key={prefix}
                active={group === prefix}
                onClick={() => setGroup(prefix === group ? null : prefix)}
              >
                {prefix} <Badge className="ml-1">{count}</Badge>
              </Chip>
            ))}
          </div>
        )}

        <div role="tablist" className="flex gap-1 border-b px-4 py-1.5 text-sm">
          {(
            [
              ["all", `全部 ${allIds.length}`],
              ["recent", `最近使用 ${recent.length}`],
              ["fav", `我的最愛 ${favourites.length}`],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                tab === id ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {text}
            </button>
          ))}
        </div>

        {/* 可捲動區域必須自己可聚焦，否則只用鍵盤的人無法捲動它 */}
        <div
          ref={setScrollEl}
          tabIndex={0}
          aria-label={`${label}素材清單`}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        >
          {loading && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
              {Array.from({ length: cols * 3 }).map((_, i) => (
                <Skeleton key={i} style={{ aspectRatio: String(aspect) }} />
              ))}
            </div>
          )}

          {error && (
            <p className="py-12 text-center text-sm text-destructive">
              {error}。重新整理頁面通常能解決。
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <p>沒有 ID 開頭是「{query}」的{label}。</p>
              {nearest.length > 0 && (
                <p className="mt-2">
                  最接近的是{" "}
                  {nearest.map((id, i) => (
                    <span key={id}>
                      {i > 0 && "、"}
                      <button
                        className="text-primary-ink underline"
                        onClick={() => setQuery(id)}
                      >
                        {id}
                      </button>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div
              role="grid"
              aria-label={`${label}素材`}
              aria-rowcount={rowCount}
              aria-colcount={cols}
              onKeyDown={onGridKeyDown}
              style={{ height: virtualizer.getTotalSize(), position: "relative" }}
            >
              {virtualRows.map((row) => (
                <div
                  key={row.key}
                  role="row"
                  aria-rowindex={row.index + 1}
                  className="absolute left-0 grid w-full gap-2 px-1"
                  style={{
                    top: 0,
                    transform: `translateY(${row.start}px)`,
                    height: row.size,
                    gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
                  }}
                >
                  {items
                    .slice(row.index * cols, row.index * cols + cols)
                    .map((id, colOffset) => {
                      const idx = row.index * cols + colOffset
                      return (
                        <Tile
                          key={id}
                          id={id}
                          idx={idx}
                          colIndex={colOffset + 1}
                          category={category}
                          label={label}
                          aspect={aspect}
                          selected={value ? pad6(value) === id : false}
                          focused={anchorIdx === idx}
                          flashing={flashId === id}
                          favourite={favourites.includes(id)}
                          onPick={() => commit(id)}
                          onToggleFav={() => toggleFavourite(id)}
                        />
                      )
                    })}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t px-4 py-2 text-xs text-muted-foreground">
          ↑↓←→ 移動 · Enter 選取 · F 加入最愛 · Esc 關閉
        </footer>
      </DialogContent>
    </Dialog>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1 text-xs transition-colors",
        active ? "border-primary bg-secondary font-medium" : "border-input hover:bg-secondary",
      )}
    >
      {children}
    </button>
  )
}

function Tile({
  id,
  idx,
  colIndex,
  category,
  label,
  aspect,
  selected,
  focused,
  flashing,
  favourite,
  onPick,
  onToggleFav,
}: {
  id: string
  idx: number
  colIndex: number
  category: Category
  label: string
  aspect: number
  selected: boolean
  focused: boolean
  flashing: boolean
  favourite: boolean
  onPick: () => void
  onToggleFav: () => void
}) {
  const [broken, setBroken] = useState(false)
  return (
    // aria-selected 掛在 gridcell 上。不要在 grid 裡用 role="option" ——
    // option 必須是 listbox 的子孫，兩套語意混用會讓 AT 解析錯誤。
    <div role="gridcell" aria-colindex={colIndex} aria-selected={selected} className="relative">
      <button
        data-idx={idx}
        // roving tabindex：整個格線同時只有一格可 Tab 進入
        tabIndex={focused ? 0 : -1}
        aria-label={`${label} ${id}`}
        onClick={onPick}
        className={cn(
          "spotlight group block w-full overflow-hidden rounded-md border bg-muted/30 transition-transform duration-150",
          "hover:scale-[1.02] hover:ring-1 hover:ring-primary/40",
          selected && "ring-2 ring-primary",
          flashing && "ring-2 ring-primary animate-pulse",
        )}
      >
        <div style={{ aspectRatio: String(aspect) }} className="flex items-center justify-center">
          {broken ? (
            <ImageOff className="size-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <img
              src={thumbUrl(category, id)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
              className="size-full object-contain"
            />
          )}
        </div>
        <span className="block truncate px-1 py-1 text-center text-[11px] tabular-nums text-muted-foreground">
          {id}
        </span>
      </button>
      <button
        onClick={onToggleFav}
        aria-label={favourite ? `將 ${id} 移出我的最愛` : `將 ${id} 加入我的最愛`}
        aria-pressed={favourite}
        tabIndex={-1}
        className={cn(
          "absolute right-1 top-1 rounded p-1 transition-opacity",
          // 觸控裝置沒有 hover，星號必須永遠顯示
          favourite ? "opacity-100" : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <Star
          className={cn("size-3.5", favourite ? "fill-[var(--rarity-gold)] text-[var(--rarity-gold)]" : "text-muted-foreground")}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
