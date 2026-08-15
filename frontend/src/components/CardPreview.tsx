import { AlertTriangle, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/misc"
import { useSpotlight } from "@/hooks/useSpotlight"
import type { PreviewStatus } from "@/hooks/useCardPreview"
import { cn } from "@/lib/utils"

interface Props {
  url: string | null
  status: PreviewStatus
  error: string | null
  renderMs: number
  cached: boolean
  altText: string
  downloading: boolean
  onDownload: () => void
  onRetry: () => void
  onLoadExample: () => void
}

export function CardPreview({
  url,
  status,
  error,
  renderMs,
  cached,
  altText,
  downloading,
  onDownload,
  onRetry,
  onLoadExample,
}: Props) {
  const spotRef = useSpotlight<HTMLDivElement>()
  const busy = status === "loading" || status === "stale"

  return (
    <div className="space-y-3">
      <div className="spotlight rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]" ref={spotRef}>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-bold">即時預覽</h2>
          <span className="text-xs text-muted-foreground">1080×477</span>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              aria-label="重新生成卡片"
            >
              <RefreshCw className={cn("size-4", busy && "animate-spin")} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDownload}
              disabled={status !== "ready" || downloading}
            >
              <Download className="size-4" aria-hidden="true" />
              {downloading ? "產生中…" : "下載 PNG"}
            </Button>
          </div>
        </div>

        {/* aspect-ratio 鎖住比例，切換時版面不跳動（CLS = 0） */}
        <div
          className="relative overflow-hidden rounded-lg bg-muted/30"
          style={{ aspectRatio: "1080 / 477" }}
          aria-busy={busy}
        >
          {busy && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/20">
              <div className="h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-primary" />
            </div>
          )}

          {status === "loading" && !url && <Skeleton className="size-full" />}

          {status === "empty" && !url && (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
              <EmptyWireframe />
              <p className="text-sm text-muted-foreground">
                填好左邊的欄位，卡片會在這裡即時出現
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onLoadExample}>
                載入範例，先看看長什麼樣
              </Button>
            </div>
          )}

          {url && (
            <img
              src={url}
              alt={altText}
              width={1080}
              height={477}
              className={cn(
                "size-full object-contain transition-[opacity,filter] duration-200",
                status === "stale" && "opacity-55 blur-[1px]",
                status === "error" && "grayscale-[0.4] opacity-70",
              )}
            />
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {/* polite 而非 assertive —— assertive 會打斷正在打字的螢幕閱讀器使用者 */}
          <span role="status" aria-live="polite" className="sr-only">
            {busy ? "預覽更新中" : status === "ready" ? "預覽已更新" : ""}
          </span>
          {status === "ready" && (
            <span>
              已更新 · {cached ? "快取命中" : `${renderMs.toFixed(0)} ms`}
            </span>
          )}
        </div>
      </div>

      {/* 失敗用常駐 Alert 而非 toast：toast 會消失，
          而使用者可能正在看別的地方 */}
      {status === "error" && error && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-2">
            <p>{error}</p>
            {url && <p className="text-muted-foreground">目前顯示的是上一次成功的結果。</p>}
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              重試
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** 空狀態同時是說明書：線框畫出卡片的真實構圖，
 *  使用者在填第一個欄位前就知道每個欄位對應到圖上哪裡。 */
function EmptyWireframe() {
  return (
    <svg
      viewBox="0 0 216 95"
      className="w-2/3 max-w-72 text-muted-foreground/25"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="3 2"
    >
      <rect x="1" y="1" width="214" height="93" rx="4" />
      <rect x="7" y="7" width="20" height="20" rx="3" />
      <rect x="31" y="7" width="80" height="8" rx="2" />
      <rect x="31" y="19" width="52" height="8" rx="2" />
      <rect x="7" y="34" width="46" height="54" rx="3" />
      <rect x="57" y="40" width="24" height="48" rx="3" />
      <rect x="85" y="40" width="24" height="48" rx="3" />
      <rect x="113" y="40" width="24" height="48" rx="3" />
      <rect x="141" y="40" width="24" height="48" rx="3" />
    </svg>
  )
}
