# Loop State — My Project

Last run: 2026-08-16 (互動式任務，非 loop 自動執行)

## High Priority (loop is acting or waiting on human)

- React + shadcn 前端與 FastAPI 後端已完成並通過驗收（2026-08-16），全部為**新增檔案**，尚未 commit。`app.py` 一個字未改，Gradio Space 不受影響。
- DXPASS 功能已依使用者要求完整移除（2026-08-15）；`app.py` 已還原至 git 原版（diff 為零），等待人工決定是否 commit。

## Watch List

- `hf` remote 的 URL 內嵌明文 Hugging Face token（在 `.git/config`，未進版控）。建議撤銷輪換，改用 credential helper 或 SSH remote。
- HF 官方文件現已明訂 Docker Space 需付費方案（個人帳號 PRO $9/月）。React 版目前只做到本機可跑，部署方式待決定。

## Recent Noise (ignored this run)

---
Run log:

### 2026-08-16 UI/UX 重構：Gradio → React + shadcn/ui + FastAPI
背景：使用者要求參考 reactbits.dev 與 ui.shadcn.com 做 UI/UX 優化。兩者皆為 React 生態無法注入 Gradio，經確認後決定改寫前端，範圍限定「本機可跑」，部署留待日後。

**硬約束**：`README.md` 的 HF front-matter 指向 `app_file: app.py` 且該 Space 仍在線，因此 `app.py` 完全未改、未更名。每個階段都驗證過 `python app.py` 仍可載入。

新增：
- `backend/`（config / schemas / assets / thumbs / render / routers / server）
- `scripts/build_thumbs.py`、`frontend/`（Vite + React 19 + Tailwind v4 + Radix）
- `web/`、`.cache/thumbs/` 皆已加入 .gitignore

修改（僅此一處）：
- `main.py` 加 `stamp=None` 參數（向後相容）。原本 `datetime.now()` 燒進圖片，導致同輸入每秒產生不同 bytes、伺服器快取命中率為 0。

修掉的既有缺陷：
- `icon` / `plate` / `titleRare` 為無效值時原本是裸 `Image.open` → FileNotFoundError（500）。改為存在性驗證回 422（`frame`/`chara` 原本就有 fallback，容錯是不對稱的）。
- 生成按鈕白字打漸層：對 `#e86bff` 2.63:1、對 `#00d2ff` 1.80:1，AA 大字需 3:1 兩端皆不合格 → 改深墨字 `#15071b`（6.84 / 10.00）。
- 素材 ID 前兩碼恆為 00/05/10…60（實測 12-14 組），拿來當版本世代 chips，把 1039 筆切成平均 80 筆。素材無名稱無標籤，這是唯一免費的分類軸。

實測數據：
- 合成 110ms；全尺寸 PNG 772KB / 193ms vs 540×239 WebP 41KB / 17ms → 預覽走 WebP、下載才給 PNG
- 縮圖 3157 張、8.6s、34MB（原始 703MB，Frame 664KB→22KB）
- 打字 10 鍵只送出 1 次請求（分級防抖 120/400/700ms + AbortController）
- 素材選擇 7 步 → 2 次點擊；1150 筆只渲染約 100 個 DOM 節點

除錯過程中發現的四個真 bug（皆已修）：
1. `groups` 用 dict 回傳，JSON 物件的整數樣式 key（"10"）在 JS 會被提前並依數值排序，"00"/"05" 被擠到最後 → 改回傳 list。
2. Dialog 是 portal，第一次 render 時 ref.current 為 null，virtualizer 拿不到元素而永遠不掛 scroll listener（清單捲得動但內容停在第一頁）→ 改用 state 持有捲動容器。
3. 開啟時對齊選中素材的 effect，其 cleanup 會在依賴變動時取消排程中的 rAF，配上「只做一次」旗標就變成永不執行 → 改為條件齊備才執行的 effect。
4. 虛擬捲動下 roving tabindex 的錨點可能指向未渲染的格子，導致 DOM 裡沒有任何可 Tab 的元素，鍵盤使用者進不了格線 → 錨點夾回目前渲染範圍。

驗收證據：
- axe-core WCAG 2.0/2.1 A+AA：light 與 dark 主頁面、以及素材選擇器開啟狀態，皆 **0 violations**（27 / 26 passes）
- 五條原本會 500 的錯誤路徑全部回 422
- 從 `/` 目錄啟動 uvicorn 也能跑（`main.py` 綁 `os.getcwd()` 的陷阱由 `backend/config.py` 的 `os.chdir` 解掉）
- 鍵盤：方向鍵／PageDown 移動焦點、Enter 選取並關閉、全程只有 1 個 tab stop
- 單一 origin：`/`、`/deep/route` 皆回 SPA，`/api/health` 未被 catch-all 吃掉

### 2026-08-15 DXPASS 功能移除（人工指示「刪除DX 角色卡功能」）
背景：DXPASS 角色卡模組於同日實作並迭代多輪（三層素材合成、QR／名稱／rating 等元素、改用官方素材），最終依使用者指示完整移除。

變更：
- 刪除 `dxpass.py`、`res/images/dxpass/**`（580 檔；原始素材仍留存於 `~/Downloads/1.66素材包/`）
- `app.py` 還原至 git HEAD 版本（`git diff app.py` 為空）
- `.gitattributes` 移除 dxpass LFS 行；`requirements.txt` 移除 `qrcode`
- venv：解除安裝 qrcode、opencv-python-headless（皆為 DXPASS 開發/測試用途）；過程中誤刪 numpy 已重裝（gradio 依賴）

測試證據：
- `import app` 載入正常；`git diff` 僅餘 STATE.md 工作紀錄
- 伺服器重啟後 http://127.0.0.1:7860 僅含「卡片生成」「素材庫展示」兩頁籤
