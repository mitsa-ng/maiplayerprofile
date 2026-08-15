import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"
const KEY = "maicard.theme"

function initialTheme(): Theme {
  const stored = localStorage.getItem(KEY)
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem(KEY, theme)
  }, [theme])

  // 使用者沒有明確選過時，跟隨系統設定
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(KEY)) setTheme(e.matches ? "dark" : "light")
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])
  return { theme, toggle }
}
