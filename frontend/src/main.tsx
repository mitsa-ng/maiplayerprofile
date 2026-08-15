import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MotionConfig } from "framer-motion"
import App from "./App.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* reducedMotion="user" 一次處理掉全部 Framer 動畫的減量 */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
