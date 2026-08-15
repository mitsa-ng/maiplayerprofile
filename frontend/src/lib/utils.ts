import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 素材 ID 一律以 6 碼零填充的字串呈現。
 *  絕不把 ID 存成 number —— 範例值有 000302，轉 number 會變 302。 */
export const pad6 = (id: number | string) => String(id).padStart(6, "0")

/** 等級 → 星數。門檻抄自 main.py:18 的 awakening_levels，
 *  在前端重算讓「9999」這個數字第一次有了意義。 */
export function starCount(level: number): number {
  const thresholds = [9, 49, 99, 299, 999, 9999]
  let stars = 0
  for (const t of thresholds) {
    if (level >= t) stars++
    else break
  }
  return stars
}

export const RARITIES = ["Normal", "Bronze", "Silver", "Gold", "Rainbow"] as const
export type Rarity = (typeof RARITIES)[number]

export const RARITY_STYLE: Record<Rarity, string> = {
  Normal: "bg-[var(--rarity-normal)]",
  Bronze: "bg-[var(--rarity-bronze)]",
  Silver: "bg-[var(--rarity-silver)]",
  Gold: "bg-[var(--rarity-gold)]",
  Rainbow: "bg-[image:var(--rarity-rainbow)]",
}
