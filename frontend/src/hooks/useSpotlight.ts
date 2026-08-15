import { useEffect, useRef } from "react"

/** Spotlight（React Bits）：指標追蹤的徑向光暈。
 *  rAF 節流，只寫兩個 CSS 變數 —— 完全不觸發 React re-render。
 *  觸控裝置與 reduced-motion 下不掛 listener。 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(hover: none)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty("--mx", `${e.clientX - r.left}px`)
        el.style.setProperty("--my", `${e.clientY - r.top}px`)
      })
    }
    const onEnter = () => el.style.setProperty("--spot-o", "1")
    const onLeave = () => el.style.setProperty("--spot-o", "0")

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerenter", onEnter)
    el.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerenter", onEnter)
      el.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return ref
}
