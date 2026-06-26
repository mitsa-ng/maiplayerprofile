import os
import gradio as gr
from PIL import Image
from main import call_user_img


# === 路徑設定 ===
BASE_PATH = os.path.join(os.getcwd(), "res", "images")
CHARA_PATH = os.path.join(BASE_PATH, "Chara")
ICON_PATH = os.path.join(BASE_PATH, "Icon")
FRAME_PATH = os.path.join(BASE_PATH, "Frame")
PLATE_PATH = os.path.join(BASE_PATH, "Plate")

# === 自訂主題 (Maimai 粉紫 x 賽博青) ===
theme = gr.themes.Soft(
    primary_hue="pink",
    secondary_hue="cyan",
    neutral_hue="gray",
    spacing_size="md",
    radius_size="md",
    text_size="md",
)

# === 全域自訂 CSS（三階 Adaptive） ===
CUSTOM_CSS = """
footer { display: none !important; }

/* ── Desktop (>1024px) ── */
@media (min-width: 1025px) {
    .gradio-container { max-width: 1400px !important; margin: 0 auto; }
    .form-col, .output-col { min-width: 400px; }
}

/* ── Tablet (769-1024px) ── */
@media (min-width: 769px) and (max-width: 1024px) {
    .gradio-container { max-width: 100% !important; padding: 0 10px; }
    .form-col { min-width: 55% !important; }
    .output-col { min-width: 40% !important; }
    .form-card { padding: 12px 16px; }
}

/* ── Mobile (<769px) ── */
@media (max-width: 768px) {
    .form-col, .output-col { min-width: 100% !important; }
    .form-card { padding: 10px 12px; }
    .section-title { font-size: 14px; }
    label { font-size: 13px !important; }
}

/* 表單區塊卡片 */
.form-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: box-shadow 0.2s ease;
}
.form-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

/* 區塊標題 */
.section-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #f472b6;
    color: #1f2937;
}
.section-title p { margin: 0; }

/* 素材預覽縮圖 */
.asset-thumb {
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    overflow: hidden;
    background: #f9fafb;
}

/* 生成按鈕漸層 */
.gradio-container .generate-btn button {
    background: linear-gradient(135deg, #e86bff, #00d2ff) !important;
    color: white !important;
    font-weight: 700 !important;
    font-size: 16px !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 12px 32px !important;
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
.gradio-container .generate-btn button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(232, 107, 255, 0.35) !important;
}

/* 輸出卡片 */
.output-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 20px;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    min-height: 350px;
}

/* 頁碼區塊 */
.page-info {
    font-size: 14px;
    color: #6b7280;
}

/* Tab 樣式微調 */
.tabs-nav button {
    font-size: 15px !important;
    font-weight: 600 !important;
}

/* 素材庫內部間距 */
.gallery-accordion .accordion-content { padding: 12px 16px; }

/* 搜尋框緊湊 */
.search-box { margin-bottom: 4px; }
.search-box label { display: none !important; }
.search-box input { padding: 6px 10px !important; font-size: 13px !important; }

/* 頁碼資訊獨立一列，不擠壓 */
.page-info p { margin: 4px 0 8px 0; font-size: 13px; text-align: center; }

/* Gallery 內間距 */
[id^="gallery"] { margin-top: 4px; }

/* ID 列緊湊 */
.id-row input { font-size: 13px !important; padding: 4px 8px !important; }

/* Gallery 響應式欄數 */
@media (max-width: 600px) {
    .gallery-grid { --columns: 3 !important; }
}
"""


# === 素材庫工具函數 ===
def list_assets(folder):
    """掃描資料夾中的 png 檔，回傳路徑與 ID"""
    if not os.path.exists(folder):
        return [], []
    files = sorted([f for f in os.listdir(folder) if f.lower().endswith(".png")])
    image_paths = [os.path.join(folder, f) for f in files]
    ids = [os.path.splitext(f)[0].replace("UI_", "") for f in files]
    return image_paths, ids


def get_preview_path(category, asset_id):
    """根據類別與 ID 回傳預覽圖片路徑（與 main.py 命名一致）"""
    if not asset_id or not str(asset_id).strip():
        return None
    folder_map = {"icon": ICON_PATH, "frame": FRAME_PATH, "plate": PLATE_PATH}
    prefix_map = {"icon": "UI_Icon_", "frame": "UI_Frame_", "plate": "UI_Plate_"}
    folder = folder_map.get(category)
    prefix = prefix_map.get(category)
    if not folder or not prefix:
        return None
    try:
        aid = int(str(asset_id).strip())
        path = os.path.join(folder, f"{prefix}{aid:06d}.png")
        if os.path.exists(path):
            return path
    except ValueError:
        pass
    return None


# === 主功能：生成卡片（含輸入驗證） ===
def generate_card(nickname, title, icon, frame, plate, rating, classRank, courseRank, titleRare, chara, charaLevel):
    errors = []

    if not icon or not str(icon).strip():
        errors.append("頭像 ID 不能為空")
    if not frame or not str(frame).strip():
        errors.append("背景框 ID 不能為空")
    if not plate or not str(plate).strip():
        errors.append("姓名框 ID 不能為空")

    try:
        chara_list = [int(x.strip()) for x in chara.split(",") if x.strip()]
        if len(chara_list) != 5:
            errors.append(f"旅行夥伴需要 5 個 ID，目前有 {len(chara_list)} 個")
    except ValueError:
        errors.append("旅行夥伴 ID 格式錯誤，請用逗號分隔純數字")

    try:
        chara_level_list = [int(x.strip()) for x in charaLevel.split(",") if x.strip()]
        if len(chara_level_list) != 5:
            errors.append(f"旅行夥伴等級需要 5 個，目前有 {len(chara_level_list)} 個")
    except ValueError:
        errors.append("旅行夥伴等級格式錯誤，請用逗號分隔純數字")

    if errors:
        return "\n".join(["❌ " + e for e in errors])

    try:
        user_data = {
            "nickname": nickname,
            "title": title,
            "icon": int(icon),
            "frame": int(frame),
            "plate": int(plate),
            "rating": int(rating),
            "classRank": int(classRank),
            "courseRank": int(courseRank),
            "titleRare": titleRare,
            "chara": chara_list,
            "charaLevel": chara_level_list,
        }
        result = call_user_img(user_data, False)
        return result
    except Exception as e:
        return f"❌ 發生錯誤：{e}"


# === 素材庫分頁邏輯 ===
PAGE_SIZE = 20

def get_page(images, ids, page):
    """回傳指定頁面的圖片與 ID"""
    start = int(page) * PAGE_SIZE
    end = start + PAGE_SIZE
    total_pages = max(1, (len(images) - 1) // PAGE_SIZE + 1)
    info = f"第 {int(page)+1} 頁 / 共 {total_pages} 頁（共 {len(images)} 個素材）"
    return images[start:end], ids[start:end], info


def copy_to_clipboard_js():
    return """
    async (text) => {
        try {
            const match = text.match(/\\d+/g);
            const pureId = match ? match.join('') : text;
            if (!pureId) {
                alert('⚠️ 無法識別有效的數字 ID');
                return;
            }
            await navigator.clipboard.writeText(pureId);
            alert('✅ 已複製 ID：' + pureId);
        } catch (err) {
            alert('❌ 無法複製：' + err);
        }
    }
    """


def make_paged_gallery(label, all_images, all_ids, default_open=False):
    """建立一個分頁素材庫元件（含搜尋功能）"""
    init_imgs, init_ids, init_info = get_page(all_images, all_ids, 0)

    with gr.Accordion(f"📁 {label}（{len(all_images)}）", open=default_open):
        # ── 搜尋框 ──
        search_input = gr.Textbox(
            label="🔍 搜尋 ID",
            placeholder="輸入數字過濾素材，留空顯示全部",
            scale=1,
        )

        # ── 狀態 ──
        current_page = gr.State(0)
        filtered_images = gr.State(all_images)
        filtered_ids = gr.State(all_ids)

        with gr.Row():
            prev_btn = gr.Button("◀ 上一頁", size="sm", scale=1)
            page_input = gr.Number(
                value=1, minimum=1, maximum=9999,
                step=1, label="📖 頁碼", scale=1,
            )
            next_btn = gr.Button("下一頁 ▶", size="sm", scale=1)

        page_label = gr.Markdown(init_info, elem_classes="page-info")

        current_ids = gr.State(init_ids)
        current_images = gr.State(init_imgs)

        gallery = gr.Gallery(
            value=init_imgs,
            columns=4,
            label=False,
            interactive=True,
            object_fit="contain",
            height=280,
        )

        with gr.Row():
            id_box = gr.Textbox(
                label=f"{label} ID",
                placeholder="點擊圖片即顯示 ID",
                interactive=False,
                scale=4,
            )
            copy_btn = gr.Button("📋 複製", variant="secondary", scale=1)

        # ── 搜尋邏輯（輕量 Python 字串比對） ──
        def do_search(text):
            if not text or not text.strip():
                result = list(zip(all_images, all_ids))
            else:
                result = [(img, id_) for img, id_ in zip(all_images, all_ids) if text in id_]
            if not result:
                return [], [], [], [], "❌ 無符合結果", 0, 1
            r_imgs, r_ids = zip(*result)
            r_imgs, r_ids = list(r_imgs), list(r_ids)
            page_imgs, page_ids, info = get_page(r_imgs, r_ids, 0)
            return r_imgs, r_ids, page_imgs, page_ids, info, 0, 1

        # ── 分頁邏輯（使用過濾後列表） ──
        outputs = [filtered_images, filtered_ids, current_images, current_ids, gallery, page_label, current_page, page_input]

        def go_to_page(p, f_imgs, f_ids):
            p = int(p) - 1
            max_p = max(1, (len(f_imgs) - 1) // PAGE_SIZE + 1)
            p = max(0, min(p, max_p - 1))
            imgs, ids_page, info = get_page(f_imgs, f_ids, p)
            return f_imgs, f_ids, imgs, ids_page, imgs, info, p, p + 1

        def go_prev(p, f_imgs, f_ids):
            p = max(0, p - 1)
            imgs, ids_page, info = get_page(f_imgs, f_ids, p)
            return f_imgs, f_ids, imgs, ids_page, imgs, info, p, p + 1

        def go_next(p, f_imgs, f_ids):
            max_p = max(1, (len(f_imgs) - 1) // PAGE_SIZE + 1) - 1
            p = min(max_p, p + 1)
            imgs, ids_page, info = get_page(f_imgs, f_ids, p)
            return f_imgs, f_ids, imgs, ids_page, imgs, info, p, p + 1

        # ── 事件繫結 ──
        search_input.change(fn=do_search, inputs=search_input, outputs=outputs)
        prev_btn.click(fn=go_prev, inputs=[current_page, filtered_images, filtered_ids], outputs=outputs)
        next_btn.click(fn=go_next, inputs=[current_page, filtered_images, filtered_ids], outputs=outputs)
        page_input.submit(fn=go_to_page, inputs=[page_input, filtered_images, filtered_ids], outputs=outputs)

        # ── 點擊顯示 ID ──
        def show_id(evt: gr.SelectData, ids_page, imgs_page):
            try:
                selected_img = evt.value
                if isinstance(selected_img, dict):
                    index = evt.index[0] if isinstance(evt.index, (list, tuple)) else evt.index
                    return ids_page[index] if 0 <= index < len(ids_page) else "❌ 找不到素材 ID"
                else:
                    selected_filename = os.path.basename(selected_img)
                    for path, id_ in zip(imgs_page, ids_page):
                        if os.path.basename(path) == selected_filename:
                            return id_
                    return "❌ 找不到對應的素材 ID"
            except Exception as e:
                return f"❌ 錯誤：{e}"

        gallery.select(fn=show_id, inputs=[current_ids, current_images], outputs=id_box)
        copy_btn.click(None, inputs=id_box, outputs=None, js=copy_to_clipboard_js())


# === 素材資料載入 ===
chara_images, chara_ids = list_assets(CHARA_PATH)
icon_images, icon_ids = list_assets(ICON_PATH)
frame_images, frame_ids = list_assets(FRAME_PATH)
plate_images, plate_ids = list_assets(PLATE_PATH)


# === 範例資料函數（含預覽路徑） ===
def load_example():
    return [
        " ",                      # nickname
        "WIREPULLER",             # title
        "458025",                 # icon
        "309102",                 # frame
        "458014",                 # plate
        99999,                    # rating
        25,                       # classRank
        23,                       # courseRank
        "Rainbow",                # titleRare
        "350103,200105,150104,150106,000302",  # chara
        "9999,9999,9999,9999,9999",            # charaLevel
        get_preview_path("icon", "458025"),    # icon_preview
        get_preview_path("frame", "309102"),   # frame_preview
        get_preview_path("plate", "458014"),   # plate_preview
    ]


# === 主介面 ===
with gr.Blocks(
    title="🎴 Maimai 玩家卡片生成器",
    theme=theme,
    css=CUSTOM_CSS,
) as demo:
    gr.Markdown(
        "# 🎨 Maimai 玩家卡片生成器\n"
        "原作者：[HoshinoStarry](https://github.com/HoshinoStarry)  "
        "｜選取素材後再到卡片生成頁貼上 ID 即可使用"
    )

    with gr.Tabs():
        # ================================================================
        # 頁籤 1：卡片生成
        # ================================================================
        with gr.TabItem("🎴 卡片生成"):
            with gr.Row():
                # --- 左欄：表單 ---
                with gr.Column(scale=1, min_width=400, elem_classes="form-col"):
                    # 玩家資訊
                    with gr.Group(elem_classes="form-card"):
                        gr.Markdown("### 👤 玩家資訊", elem_classes="section-title")
                        nickname = gr.Textbox(label="玩家名稱", value=" ")
                        with gr.Row():
                            title = gr.Textbox(label="稱號", value="WIREPULLER", scale=3)
                            titleRare = gr.Dropdown(
                                ["Normal", "Bronze", "Silver", "Gold", "Rainbow"],
                                label="稀有度", value="Rainbow", scale=2,
                            )

                    # 評級段位
                    with gr.Group(elem_classes="form-card"):
                        gr.Markdown("### ⭐ 評級段位", elem_classes="section-title")
                        rating = gr.Number(label="Rating", value=99999)
                        with gr.Row():
                            classRank = gr.Number(label="友人對戰等級", value=25)
                            courseRank = gr.Number(label="段位認定等級", value=23)

                    # 素材選擇（附縮圖預覽）
                    with gr.Group(elem_classes="form-card"):
                        gr.Markdown("### 🖼 素材選擇", elem_classes="section-title")
                        with gr.Row():
                            icon = gr.Textbox(
                                label="頭像 ID（僅數字）", value="458025", scale=4,
                            )
                            icon_preview = gr.Image(
                                value=get_preview_path("icon", "458025"),
                                show_label=False, show_download_button=False,
                                container=False, scale=1, height=56, width=56,
                                elem_classes="asset-thumb",
                            )
                        with gr.Row():
                            frame = gr.Textbox(
                                label="背景框 ID（僅數字）", value="309102", scale=4,
                            )
                            frame_preview = gr.Image(
                                value=get_preview_path("frame", "309102"),
                                show_label=False, show_download_button=False,
                                container=False, scale=1, height=56, width=56,
                                elem_classes="asset-thumb",
                            )
                        with gr.Row():
                            plate = gr.Textbox(
                                label="姓名框 ID（僅數字）", value="458014", scale=4,
                            )
                            plate_preview = gr.Image(
                                value=get_preview_path("plate", "458014"),
                                show_label=False, show_download_button=False,
                                container=False, scale=1, height=56, width=56,
                                elem_classes="asset-thumb",
                            )

                    # 旅行夥伴
                    with gr.Group(elem_classes="form-card"):
                        gr.Markdown("### 🎭 旅行夥伴", elem_classes="section-title")
                        chara = gr.Textbox(
                            label="角色 ID（用逗號分隔 5 個，如 350103,200105,150104,150106,000302）",
                            value="350103,200105,150104,150106,000302",
                        )
                        charaLevel = gr.Textbox(
                            label="角色等級（用逗號分隔 5 個，範圍 1-9999）",
                            value="9999,9999,9999,9999,9999",
                        )

                    # 操作按鈕
                    with gr.Row():
                        example_btn = gr.Button("📂 載入範例", variant="secondary", size="sm", scale=1)
                        btn = gr.Button("✨ 生成卡片", variant="primary", size="lg", scale=3, elem_classes="generate-btn")

                # --- 右欄：輸出 ---
                with gr.Column(scale=1, min_width=400, elem_classes="output-col"):
                    with gr.Group(elem_classes="output-card"):
                        gr.Markdown("### 🖼 預覽輸出", elem_classes="section-title")
                        output = gr.Image(
                            label="點擊「生成卡片」產生結果",
                            show_label=True,
                            show_download_button=True,
                            height=400,
                        )

            # === 事件繫結 ===
            # 即時縮圖預覽
            icon.change(
                fn=lambda x: get_preview_path("icon", x),
                inputs=icon, outputs=icon_preview,
            )
            frame.change(
                fn=lambda x: get_preview_path("frame", x),
                inputs=frame, outputs=frame_preview,
            )
            plate.change(
                fn=lambda x: get_preview_path("plate", x),
                inputs=plate, outputs=plate_preview,
            )

            # 生成卡片
            btn.click(
                fn=generate_card,
                inputs=[nickname, title, icon, frame, plate, rating, classRank, courseRank, titleRare, chara, charaLevel],
                outputs=output,
            )

            # 載入範例（一次更新所有欄位含預覽）
            example_btn.click(
                fn=load_example,
                inputs=[],
                outputs=[
                    nickname, title, icon, frame, plate,
                    rating, classRank, courseRank, titleRare,
                    chara, charaLevel,
                    icon_preview, frame_preview, plate_preview,
                ],
            )

        # ================================================================
        # 頁籤 2：素材庫展示
        # ================================================================
        with gr.TabItem("🖼 素材庫展示"):
            gr.Markdown(
                "點擊任意圖片以顯示素材 ID，複製後到「卡片生成」分頁貼上即可使用。\n\n"
                "💡 **提示**：頭像 ID → 頭像欄位，背景框 ID → 背景框欄位，姓名框 ID → 姓名框欄位"
            )
            make_paged_gallery("角色", chara_images, chara_ids, default_open=True)
            make_paged_gallery("頭像", icon_images, icon_ids)
            make_paged_gallery("背景", frame_images, frame_ids)
            make_paged_gallery("姓名框", plate_images, plate_ids)


if __name__ == "__main__":
    demo.launch(show_api=False, share=False, server_port=7861)
