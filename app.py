import os
import gradio as gr
from PIL import Image
from main import call_user_img


# === 主功能：生成卡片 ===
def generate_card(nickname, title, icon, frame, plate, rating, classRank, courseRank, titleRare, chara, charaLevel):
    try:
        chara_list = [int(x) for x in chara.split(",")]
        chara_level_list = [int(x) for x in charaLevel.split(",")]

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

        result: Image.Image = call_user_img(user_data, False)
        return result
    except Exception as e:
        return f"❌ 發生錯誤：{e}"


# === 素材庫展示功能 ===
def list_assets(folder):
    """掃描資料夾中的 png 檔，回傳路徑與 ID"""
    if not os.path.exists(folder):
        return [], []
    files = sorted([f for f in os.listdir(folder) if f.lower().endswith(".png")])
    image_paths = [os.path.join(folder, f) for f in files]
    ids = [os.path.splitext(f)[0].replace("UI_", "") for f in files]
    return image_paths, ids


def show_id(evt: gr.SelectData, ids):
    """顯示點擊圖片後的素材 ID"""
    idx = evt.index
    if 0 <= idx < len(ids):
        return ids[idx]
    return "❌ 找不到對應的素材"


# 設定素材目錄
BASE_PATH = os.path.join(os.getcwd(), "res", "images")
CHARA_PATH = os.path.join(BASE_PATH, "Chara")
ICON_PATH = os.path.join(BASE_PATH, "Icon")
FRAME_PATH = os.path.join(BASE_PATH, "Frame")
PLATE_PATH = os.path.join(BASE_PATH, "Plate")

chara_images, chara_ids = list_assets(CHARA_PATH)
icon_images, icon_ids = list_assets(ICON_PATH)
frame_images, frame_ids = list_assets(FRAME_PATH)
plate_images, plate_ids = list_assets(PLATE_PATH)


# === 主介面 ===
with gr.Blocks(title="🎴 Maimai 玩家卡片生成器") as demo:
    gr.Markdown("# 🎨 Maimai 玩家卡片生成器\n原作者：[HoshinoStarry](https://github.com/HoshinoStarry)")

    with gr.Tabs():
        # === 頁籤 1：卡片生成 ===
        with gr.TabItem("🎴 卡片生成"):
            with gr.Row():
                with gr.Column():
                    nickname = gr.Textbox(label="玩家名稱", value="Natsuki")
                    title = gr.Textbox(label="稱號", value="WIREPULLER")
                    titleRare = gr.Dropdown(["Normal", "Bronze", "Silver", "Gold", "Rainbow"], label="稱號稀有度", value="Rainbow")
                    rating = gr.Number(label="Rating", value=99999)
                    classRank = gr.Number(label="友人對戰等級", value=1)
                    courseRank = gr.Number(label="段位認定等級", value=1)

                with gr.Column():
                    icon = gr.Textbox(label="頭像ID", value="458025")
                    frame = gr.Textbox(label="背景框ID", value="309102")
                    plate = gr.Textbox(label="姓名框ID", value="458014")
                    chara = gr.Textbox(label="旅行夥伴ID (用逗號分隔)", value="350103,200105,150104,150106,000302")
                    charaLevel = gr.Textbox(label="旅行夥伴等級 (用逗號分隔)", value="9999,9999,9999,9999,9999")

            btn = gr.Button("✨ 生成卡片")
            output = gr.Image(label="生成結果")

            btn.click(
                fn=generate_card,
                inputs=[nickname, title, icon, frame, plate, rating, classRank, courseRank, titleRare, chara, charaLevel],
                outputs=output
            )

        # === 頁籤 2：素材庫展示 ===
        with gr.TabItem("🖼 素材庫展示"):
            gr.Markdown("點擊任意圖片以顯示素材 ID，可複製到上方頁面使用。")

            # JS function：複製純數字部分
            def copy_to_clipboard_js():
                return """
                async (text) => {
                    try {
                        // 僅擷取數字部分
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

            # 建立素材展示區塊
            def make_asset_section(label, images, ids):
                with gr.Accordion(f"{label} 素材", open=(label == "角色")):
                    gallery = gr.Gallery(value=images, columns=6, label=label, interactive=True)
                    with gr.Row():
                        id_box = gr.Textbox(label=f"{label} ID", interactive=False)
                        copy_btn = gr.Button("📋 複製", variant="secondary")
                    gallery.select(fn=show_id, inputs=gr.State(ids), outputs=id_box)
                    copy_btn.click(None, inputs=id_box, outputs=None, js=copy_to_clipboard_js())

            make_asset_section("角色", chara_images, chara_ids)
            make_asset_section("頭像", icon_images, icon_ids)
            make_asset_section("背景", frame_images, frame_ids)
            make_asset_section("姓名框", plate_images, plate_ids)

if __name__ == "__main__":
    demo.launch()
