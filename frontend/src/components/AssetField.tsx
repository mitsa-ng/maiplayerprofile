import { useId, useState } from "react"
import { ImageOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError, Label } from "@/components/ui/misc"
import { AssetPicker } from "./AssetPicker"
import { thumbUrl } from "@/lib/api"
import { CATEGORY_ASPECT, CATEGORY_LABEL, type Category } from "@/lib/types"
import { cn, pad6 } from "@/lib/utils"

interface Props {
  category: Extract<Category, "icon" | "frame" | "plate">
  value: string
  onChange: (id: string) => void
  error?: string
}

/** 表單裡的一列素材欄位。
 *  縮圖本身是 button（不是裝飾圖）→ 點一下開選擇器，這就是 7 步變 2 步的入口。
 *  ID 輸入框保留：既有使用者習慣從 Discord/wiki 貼 ID，不能斷了這條路。 */
export function AssetField({ category, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState(false)
  const inputId = useId()
  const errId = `${inputId}-err`
  const label = CATEGORY_LABEL[category]
  const aspect = CATEGORY_ASPECT[category]

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`變更${label}，目前為 ${pad6(value || 0)}`}
          className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-input bg-muted/40 transition-transform duration-150 hover:scale-[1.04]"
        >
          {broken || !value ? (
            <ImageOff className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <img
              src={thumbUrl(category, value)}
              alt=""
              onError={() => setBroken(true)}
              className={cn("max-h-full max-w-full object-contain")}
              style={{ aspectRatio: String(aspect) }}
            />
          )}
        </button>

        <Input
          id={inputId}
          value={value}
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => {
            setBroken(false)
            onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
          }}
          onBlur={(e) => e.target.value && onChange(pad6(e.target.value))}
          className="tabular-nums"
        />

        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          選擇
        </Button>
      </div>
      <FieldError id={errId}>{error}</FieldError>

      <AssetPicker
        category={category}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onSelect={(id) => {
          setBroken(false)
          onChange(id)
        }}
      />
    </div>
  )
}
