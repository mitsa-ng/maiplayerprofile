import { z } from "zod"
import { RARITIES } from "./utils"

export type Category = "chara" | "icon" | "frame" | "plate"

export const CATEGORY_LABEL: Record<Category, string> = {
  chara: "旅行夥伴",
  icon: "頭像",
  frame: "背景框",
  plate: "姓名框",
}

/** 素材原始比例。Frame 是 2.389:1、Plate 是 6.207:1 —— 這兩個極端比例
 *  決定了選擇器的格線幾何：正方形格子會把 Plate 裁掉 84% 的內容。 */
export const CATEGORY_ASPECT: Record<Category, number> = {
  chara: 1,
  icon: 1,
  frame: 1080 / 452,
  plate: 720 / 116,
}

/** 每個類別在選擇器裡的欄數（lg 斷點）。
 *  Plate 用單欄清單：6.2:1 塞進方格不是被裁掉就是縮到看不出差別。 */
export const CATEGORY_COLUMNS: Record<Category, { base: number; md: number; lg: number }> = {
  icon: { base: 3, md: 6, lg: 8 },
  chara: { base: 3, md: 5, lg: 6 },
  frame: { base: 1, md: 2, lg: 2 },
  plate: { base: 1, md: 1, lg: 1 },
}

/** 與 backend/schemas.py 的 Pydantic model 1:1 鏡像。
 *  前端擋掉格式問題，後端只回報「ID 不存在」這種需要伺服器知識的錯誤。 */
export const charaSlotSchema = z.object({
  // 字串！轉 number 會讓 000302 變成 302
  charaId: z.string().regex(/^\d{1,6}$/, "角色 ID 必須是數字"),
  level: z.number().int().min(1, "最低 1 級").max(9999, "最高 9999 級"),
})

export const cardFormSchema = z.object({
  nickname: z.string().max(16, "玩家名稱最多 16 字"),
  title: z.string().max(32, "稱號最多 32 字"),
  titleRare: z.enum(RARITIES),
  icon: z.string().regex(/^\d{1,6}$/, "頭像 ID 必須是數字"),
  frame: z.string().regex(/^\d{1,6}$/, "背景框 ID 必須是數字"),
  plate: z.string().regex(/^\d{1,6}$/, "姓名框 ID 必須是數字"),
  rating: z.number().int().min(0).max(99999),
  classRank: z.number().int().min(-1).max(25),
  courseRank: z.number().int().min(-1).max(23),
  partners: z.array(charaSlotSchema).max(5, "旅行夥伴最多 5 位"),
})

export type CardForm = z.infer<typeof cardFormSchema>
export type PartnerSlot = z.infer<typeof charaSlotSchema>

export interface AssetGroup {
  prefix: string
  count: number
}

export interface AssetIndex {
  category: Category
  total: number
  ids: number[]
  /** 陣列而非物件：JSON 物件的整數樣式 key 在 JS 會被重新排序 */
  groups: AssetGroup[]
}

/** 沿用 app.py:371 load_example() 的那組值 */
export const EXAMPLE: CardForm = {
  nickname: " ",
  title: "WIREPULLER",
  titleRare: "Rainbow",
  icon: "458025",
  frame: "309102",
  plate: "458014",
  rating: 99999,
  classRank: 25,
  courseRank: 23,
  partners: [
    { charaId: "350103", level: 9999 },
    { charaId: "200105", level: 9999 },
    { charaId: "150104", level: 9999 },
    { charaId: "150106", level: 9999 },
    { charaId: "000302", level: 9999 },
  ],
}
