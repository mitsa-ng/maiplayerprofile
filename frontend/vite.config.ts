import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  server: {
    // 同 origin：dev 與 production 的 fetch("/api/...") 行為一致
    proxy: { "/api": "http://127.0.0.1:7870" },
  },
  build: {
    outDir: "dist",
    // 素材縮圖與卡片都是 runtime 抓的，產物只有 JS/CSS
    chunkSizeWarningLimit: 700,
  },
})
