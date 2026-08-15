import { useState } from "react"
import { ChevronLeft, ChevronRight, ImageOff, Plus, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge, FieldError } from "@/components/ui/misc"
import { AssetPicker } from "./AssetPicker"
import { thumbUrl } from "@/lib/api"
import type { PartnerSlot } from "@/lib/types"
import { cn, pad6, starCount } from "@/lib/utils"

interface Props {
  value: PartnerSlot[]
  onChange: (next: PartnerSlot[]) => void
  errors?: (string | undefined)[]
}

const MAX = 5

/** 5 個獨立卡槽，取代兩條靠位置對齊的逗號字串。
 *
 *  槽 1 與槽 2-5 不等價：main.py:370 把 chara[0] 渲染成 309×309 主視覺，
 *  chara[1..4] 是 147×290 側卡。UI 必須反映這件事，逗號字串完全沒傳達。 */
export function PartnerSlots({ value, onChange, errors = [] }: Props) {
  const [pickerFor, setPickerFor] = useState<number | null>(null)

  const setSlot = (i: number, patch: Partial<PartnerSlot>) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  // 移除後往前補位，不留洞
  const removeSlot = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const makePrimary = (i: number) => {
    if (i === 0) return
    const next = [...value]
    const [item] = next.splice(i, 1)
    next.unshift(item)
    onChange(next)
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Badge>
          {value.length}/{MAX}
        </Badge>
        {value.length > 0 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.map((p) => ({ ...p, level: 9999 })))}
            >
              全部設為 9999
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
              清空
            </Button>
          </>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {value.map((p, i) => (
          <div
            key={`${p.charaId}-${i}`}
            className={cn(
              "group relative shrink-0 rounded-lg border bg-muted/20 p-2",
              i === 0 ? "w-[9.5rem]" : "w-28",
              errors[i] && "ring-2 ring-destructive",
            )}
          >
            {i === 0 && (
              <Badge className="mb-1 block text-center text-[10px]">主要夥伴</Badge>
            )}

            <button
              type="button"
              onClick={() => setPickerFor(i)}
              aria-label={`變更第 ${i + 1} 位夥伴，目前為 ${p.charaId}`}
              className="block w-full overflow-hidden rounded-md bg-muted/40"
            >
              <img
                src={thumbUrl("chara", p.charaId)}
                alt=""
                className={cn("w-full object-contain", i === 0 ? "h-28" : "h-20")}
              />
            </button>

            {/* 星級：門檻抄自 main.py:18，讓「9999」這個數字第一次有了意義 */}
            <div
              className="mt-1 flex justify-center gap-0.5"
              role="img"
              aria-label={`${starCount(p.level)} 星`}
            >
              {Array.from({ length: 6 }).map((_, s) => (
                <Star
                  key={s}
                  aria-hidden="true"
                  className={cn(
                    "size-2.5",
                    s < starCount(p.level)
                      ? "fill-[var(--rarity-gold)] text-[var(--rarity-gold)]"
                      : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>

            <p className="text-center text-[11px] tabular-nums text-muted-foreground">
              {p.charaId}
            </p>

            <Input
              value={String(p.level)}
              inputMode="numeric"
              maxLength={4}
              aria-label={`第 ${i + 1} 位夥伴的等級`}
              aria-invalid={!!errors[i]}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 4)
                setSlot(i, { level: raw === "" ? 0 : Number(raw) })
              }}
              className="mt-1 h-8 text-center text-xs tabular-nums"
            />

            {/* 拖曳不是唯一途徑：方向鈕在鍵盤與觸控上都能用 */}
            <div className="mt-1 flex justify-center gap-0.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`把第 ${i + 1} 位夥伴往前移`}
                className="rounded p-1 hover:bg-secondary disabled:opacity-30"
              >
                <ChevronLeft className="size-3" aria-hidden="true" />
              </button>
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  aria-label={`把第 ${i + 1} 位夥伴設為主要夥伴`}
                  className="rounded px-1 text-[10px] hover:bg-secondary"
                >
                  設為主要
                </button>
              )}
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                aria-label={`把第 ${i + 1} 位夥伴往後移`}
                className="rounded p-1 hover:bg-secondary disabled:opacity-30"
              >
                <ChevronRight className="size-3" aria-hidden="true" />
              </button>
            </div>

            {/* 觸控裝置沒有 hover，移除鈕必須永遠顯示 */}
            <button
              type="button"
              onClick={() => removeSlot(i)}
              aria-label={`移除第 ${i + 1} 位夥伴`}
              className="absolute right-1 top-1 rounded bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </div>
        ))}

        {value.length < MAX && (
          <button
            type="button"
            onClick={() => setPickerFor(value.length)}
            aria-label={`新增第 ${value.length + 1} 位旅行夥伴`}
            className="flex h-auto min-h-[11rem] w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Plus className="size-5" aria-hidden="true" />
            <span className="text-xs">新增夥伴</span>
          </button>
        )}

        {value.length === 0 && (
          <p className="self-center px-2 text-sm text-muted-foreground">
            尚未加入旅行夥伴。
          </p>
        )}
      </div>

      {errors.map((e, i) =>
        e ? (
          <FieldError key={i} id={`partner-err-${i}`}>
            第 {i + 1} 位夥伴：{e}
          </FieldError>
        ) : null,
      )}

      <AssetPicker
        category="chara"
        open={pickerFor !== null}
        onOpenChange={(o) => !o && setPickerFor(null)}
        value={pickerFor !== null ? value[pickerFor]?.charaId : undefined}
        onSelect={(id) => {
          if (pickerFor === null) return
          if (pickerFor < value.length) setSlot(pickerFor, { charaId: id })
          else onChange([...value, { charaId: pad6(id), level: 9999 }])
        }}
      />
    </div>
  )
}

export { ImageOff }
