import { useEffect, useState } from "react"
import { fetchAssetIndex } from "@/lib/api"
import type { AssetIndex, Category } from "@/lib/types"

interface State {
  data: AssetIndex | null
  loading: boolean
  error: string | null
}

/** 取整個類別的 ID 索引。模組層有快取，同 session 每個類別只打一次 API。 */
export function useAssetIndex(category: Category, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null })

  useEffect(() => {
    if (!enabled) return
    let alive = true
    setState((s) => (s.data ? s : { ...s, loading: true }))
    fetchAssetIndex(category)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch(
        (e: Error) => alive && setState({ data: null, loading: false, error: e.message }),
      )
    return () => {
      alive = false
    }
  }, [category, enabled])

  return state
}
