import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError, fetchPreview, type ApiFieldError } from "@/lib/api"
import type { CardForm } from "@/lib/types"

export type PreviewStatus = "empty" | "loading" | "stale" | "ready" | "error"

interface State {
  url: string | null
  status: PreviewStatus
  error: string | null
  fieldErrors: ApiFieldError[]
  renderMs: number
  cached: boolean
}

/** 欄位分級的防抖延遲。
 *  - 120ms：離散提交（選素材、切稀有度、增刪夥伴）。低於人類察覺門檻，
 *    使用者已明確表達意圖，等待只會覺得卡。
 *  - 400ms：數值微調。大於中位鍵擊間隔（~250ms）、小於思考停頓（~600ms），
 *    能把「9999」合併成一次請求。
 *  - 700ms：自由文字。稱號常是 10+ 字，且中文輸入法有 composition 階段。 */
export const DEBOUNCE = { discrete: 120, numeric: 400, text: 700 } as const
export type DebounceKind = keyof typeof DEBOUNCE

export function useCardPreview() {
  const [state, setState] = useState<State>({
    url: null,
    status: "empty",
    error: null,
    fieldErrors: [],
    renderMs: 0,
    cached: false,
  })

  const abortRef = useRef<AbortController | null>(null)
  const seqRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlRef = useRef<string | null>(null)
  // 中文輸入法組字期間不該送出請求
  const composingRef = useRef(false)

  const run = useCallback(async (form: CardForm) => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const mySeq = ++seqRef.current

    // 已經有圖時保留舊圖（stale-while-revalidate）。
    // 換成 skeleton 會讓大面積視覺每改一個字就閃一次。
    setState((s) => ({ ...s, status: s.url ? "stale" : "loading" }))

    try {
      const { blob, renderMs, cached } = await fetchPreview(form, ac.signal)
      if (mySeq !== seqRef.current) return // 過期回應直接丟棄
      const next = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current) // 不回收會漏掉數百 MB
      urlRef.current = next
      setState({
        url: next,
        status: "ready",
        error: null,
        fieldErrors: [],
        renderMs,
        cached,
      })
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      if (mySeq !== seqRef.current) return
      const apiErr = err instanceof ApiError ? err : null
      setState((s) => ({
        ...s,
        status: "error",
        error: apiErr?.message ?? "連線失敗，請再試一次。",
        fieldErrors: apiErr?.fieldErrors ?? [],
      }))
    }
  }, [])

  const schedule = useCallback(
    (form: CardForm, kind: DebounceKind) => {
      if (composingRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => run(form), DEBOUNCE[kind])
    },
    [run],
  )

  const flush = useCallback(
    (form: CardForm) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      void run(form)
    },
    [run],
  )

  const setComposing = useCallback((v: boolean) => {
    composingRef.current = v
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  return { ...state, schedule, flush, setComposing }
}
