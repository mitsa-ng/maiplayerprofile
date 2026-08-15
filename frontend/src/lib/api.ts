import type { AssetIndex, CardForm, Category } from "./types"
import { pad6 } from "./utils"

export const thumbUrl = (category: Category, id: number | string) =>
  `/api/assets/${category}/${pad6(id)}/thumb.webp`

export const fullUrl = (category: Category, id: number | string) =>
  `/api/assets/${category}/${pad6(id)}/full.png`

/** 後端 422 的錯誤形狀，loc 可機械映射成 react-hook-form 的欄位路徑 */
export interface ApiFieldError {
  type: string
  loc: (string | number)[]
  msg: string
  input?: unknown
}

export class ApiError extends Error {
  status: number
  fieldErrors: ApiFieldError[]

  constructor(status: number, fieldErrors: ApiFieldError[], message: string) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const indexCache = new Map<Category, Promise<AssetIndex>>()

/** 一次取回整個類別的 ID 清單（1150 筆 gzip 後約 2.6 KB）。
 *  拿到之後搜尋、跳轉、虛擬捲動全在前端完成，零往返。 */
export function fetchAssetIndex(category: Category): Promise<AssetIndex> {
  let cached = indexCache.get(category)
  if (!cached) {
    cached = fetch(`/api/assets/${category}/index`).then((r) => {
      if (!r.ok) throw new Error(`素材清單載入失敗（${r.status}）`)
      return r.json() as Promise<AssetIndex>
    })
    // 失敗不要留下毒化的 promise，讓下次重試
    cached.catch(() => indexCache.delete(category))
    indexCache.set(category, cached)
  }
  return cached
}

/** 表單狀態 → 後端 CardRequest。
 *  partners 陣列同時展開成 chara 物件陣列，長度不可能錯位。 */
export function toRequestBody(form: CardForm) {
  return {
    nickname: form.nickname,
    title: form.title,
    titleRare: form.titleRare,
    icon: Number(form.icon),
    frame: Number(form.frame),
    plate: Number(form.plate),
    rating: form.rating,
    classRank: form.classRank,
    courseRank: form.courseRank,
    chara: form.partners.map((p) => ({ id: Number(p.charaId), level: p.level })),
  }
}

async function readError(res: Response): Promise<never> {
  let fieldErrors: ApiFieldError[] = []
  try {
    const body = await res.json()
    if (Array.isArray(body?.detail)) fieldErrors = body.detail
  } catch {
    /* 非 JSON 回應 */
  }
  const msg =
    fieldErrors.length > 0
      ? fieldErrors.map((e) => e.msg).join("；")
      : res.status >= 500
        ? "伺服器處理時發生問題"
        : `請求失敗（${res.status}）`
  throw new ApiError(res.status, fieldErrors, msg)
}

export interface PreviewResult {
  blob: Blob
  renderMs: number
  cached: boolean
}

export async function fetchPreview(
  form: CardForm,
  signal: AbortSignal,
  scale = 0.5,
): Promise<PreviewResult> {
  const res = await fetch(`/api/cards/preview?scale=${scale}&format=webp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toRequestBody(form)),
    signal,
  })
  if (!res.ok) await readError(res)
  return {
    blob: await res.blob(),
    renderMs: Number(res.headers.get("X-Render-Ms") ?? 0),
    cached: res.headers.get("X-Cache") === "HIT",
  }
}

/** 全尺寸 PNG。stamp 走真實時間，所以不快取。 */
export async function fetchFullCard(form: CardForm): Promise<Blob> {
  const res = await fetch("/api/cards/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toRequestBody(form)),
  })
  if (!res.ok) await readError(res)
  return res.blob()
}

/** 把後端的 loc 陣列轉成 RHF 的欄位路徑。
 *  ["body","chara",2,"id"] → "partners.2.charaId" */
export function locToFormPath(loc: (string | number)[]): string | null {
  const parts = loc.filter((p) => p !== "body")
  if (parts.length === 0) return null
  if (parts[0] === "chara") {
    if (parts.length >= 3) {
      const field = parts[2] === "id" ? "charaId" : String(parts[2])
      return `partners.${parts[1]}.${field}`
    }
    return "partners"
  }
  return parts.join(".")
}
