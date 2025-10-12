import gradio as gr
from main import call_user_img
from PIL import Image

def generate_card(nickname, title, icon, frame, plate, rating, classRank, courseRank, titleRare, chara, charaLevel):
    try:
        # 將字串轉成整數或列表
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

with gr.Blocks(title="🎴 Maimai 玩家卡片生成器") as demo:
    gr.Markdown("# 🎨 Maimai 玩家卡片生成器\n輸入角色與分數資料，即可生成卡片圖片 原作者https://github.com/HoshinoStarry")

    with gr.Row():
        with gr.Column():
            nickname = gr.Textbox(label="玩家名稱", value="Ｈｏｓｈｉｎｏ☆")
            title = gr.Textbox(label="稱號", value="THE LAST")
            titleRare = gr.Dropdown(["Normal", "Bronze", "Silver", "Gold", "Rainbow"], label="稱號稀有度", value="Normal")
            rating = gr.Number(label="Rating", value=12345)
            classRank = gr.Number(label="友人對戰等級", value=7)
            courseRank = gr.Number(label="段位認定等級", value=10)

        with gr.Column():
            icon = gr.Textbox(label="頭像ID", value="350101")
            frame = gr.Textbox(label="背景框ID", value="350101")
            plate = gr.Textbox(label="姓名框ID", value="350101")
            chara = gr.Textbox(label="旅行夥伴ID (用逗號分隔)", value="101,104,355610,355611,355612")
            charaLevel = gr.Textbox(label="旅行夥伴等級 (用逗號分隔)", value="1000,9999,1000,9999,9999")

    btn = gr.Button("✨ 生成卡片")
    output = gr.Image(label="生成結果")

    btn.click(
        fn=generate_card,
        inputs=[nickname, title, icon, frame, plate, rating, classRank, courseRank, titleRare, chara, charaLevel],
        outputs=output
    )

if __name__ == "__main__":
    demo.launch()
