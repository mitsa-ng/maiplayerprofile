import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileDown, Images, Moon, Sparkles, Sun, Trophy, User, Users } from "lucide-react"
import { Toaster, toast } from "sonner"
import { AssetField } from "@/components/AssetField"
import { CardPreview } from "@/components/CardPreview"
import { PartnerSlots } from "@/components/PartnerSlots"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, FieldError, Label, SectionTitle } from "@/components/ui/misc"
import { useCardPreview, type DebounceKind } from "@/hooks/useCardPreview"
import { useTheme } from "@/hooks/useTheme"
import { fetchFullCard, locToFormPath } from "@/lib/api"
import { cardFormSchema, EXAMPLE, type CardForm } from "@/lib/types"
import { RARITIES, RARITY_STYLE, cn } from "@/lib/utils"

const BLANK: CardForm = {
  nickname: "",
  title: "",
  titleRare: "Normal",
  icon: "",
  frame: "",
  plate: "",
  rating: 0,
  classRank: -1,
  courseRank: -1,
  partners: [],
}

export default function App() {
  const { theme, toggle } = useTheme()
  const [form, setForm] = useState<CardForm>(EXAMPLE)
  const [downloading, setDownloading] = useState(false)
  const preview = useCardPreview()
  const formRef = useRef(form)
  formRef.current = form

  // 前端先擋格式問題，後端只回報「ID 不存在」這種需要伺服器知識的錯誤
  const clientErrors = useMemo(() => {
    const parsed = cardFormSchema.safeParse(form)
    if (parsed.success) return {} as Record<string, string>
    const out: Record<string, string> = {}
    for (const issue of parsed.error.issues) out[issue.path.join(".")] = issue.message
    return out
  }, [form])

  // 後端 422 的 loc 映射成表單路徑，把錯誤釘到對應欄位
  const serverErrors = useMemo(() => {
    const out: Record<string, string> = {}
    for (const fe of preview.fieldErrors) {
      const path = locToFormPath(fe.loc)
      if (path) out[path] = fe.msg
    }
    return out
  }, [preview.fieldErrors])

  const errorFor = (path: string) => clientErrors[path] ?? serverErrors[path]

  const ready =
    Object.keys(clientErrors).length === 0 && !!form.icon && !!form.frame && !!form.plate

  const update = useCallback(
    (patch: Partial<CardForm>, kind: DebounceKind) => {
      setForm((prev) => {
        const next = { ...prev, ...patch }
        formRef.current = next
        const ok = cardFormSchema.safeParse(next).success
        if (ok && next.icon && next.frame && next.plate) preview.schedule(next, kind)
        return next
      })
    },
    [preview],
  )

  // 首次載入就渲染一次
  useEffect(() => {
    if (ready) preview.flush(formRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await fetchFullCard(formRef.current)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const safe = (formRef.current.nickname || "card").trim().replace(/[^\w一-龥-]/g, "") || "card"
      a.href = url
      a.download = `maimai-${safe}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error("下載失敗", { description: (err as Error).message })
    } finally {
      setDownloading(false)
    }
  }

  const altText = `${form.nickname || "玩家"} 的 maimai 名片預覽，稱號 ${form.title || "無"}（${form.titleRare}），Rating ${form.rating}`

  return (
    <>
      <div className="aurora" aria-hidden="true">
        <span /><span /><span />
      </div>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        跳到主要內容
      </a>

      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[100rem] items-center gap-3 px-4">
          <h1 className="hero-gradient text-lg font-extrabold tracking-tight">
            maimai 名片產生器
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              // 文字在窄螢幕被 hidden，沒有 aria-label 就完全沒有可及名稱
              aria-label="載入範例"
              onClick={() => {
                setForm(EXAMPLE)
                formRef.current = EXAMPLE
                preview.flush(EXAMPLE)
                toast.success("已載入範例資料")
              }}
            >
              <FileDown className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">載入範例</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === "dark" ? "切換至淺色主題" : "切換至深色主題"}
            >
              {theme === "dark" ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto grid max-w-[100rem] gap-5 px-4 py-5 xl:grid-cols-[minmax(26rem,30rem)_1fr]"
      >
        {/* 行動版預覽在最上方 sticky —— 不用 bottom sheet，
            因為軟鍵盤會把 fixed bottom 元素推上來蓋住輸入框 */}
        <div className="order-1 xl:order-2">
          <div className="xl:sticky xl:top-20">
            <CardPreview
              url={preview.url}
              status={preview.status}
              error={preview.error}
              renderMs={preview.renderMs}
              cached={preview.cached}
              altText={altText}
              downloading={downloading}
              onDownload={handleDownload}
              onRetry={() => preview.flush(formRef.current)}
              onLoadExample={() => {
                setForm(EXAMPLE)
                formRef.current = EXAMPLE
                preview.flush(EXAMPLE)
              }}
            />
          </div>
        </div>

        <div className="order-2 space-y-4 xl:order-1">
          <Card>
            <SectionTitle icon={User}>玩家資訊</SectionTitle>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nickname">玩家名稱</Label>
                <Input
                  id="nickname"
                  value={form.nickname}
                  maxLength={16}
                  onCompositionStart={() => preview.setComposing(true)}
                  onCompositionEnd={(e) => {
                    preview.setComposing(false)
                    update({ nickname: e.currentTarget.value }, "text")
                  }}
                  onChange={(e) => update({ nickname: e.target.value }, "text")}
                  onBlur={() => ready && preview.flush(formRef.current)}
                  aria-invalid={!!errorFor("nickname")}
                />
                <FieldError id="nickname-err">{errorFor("nickname")}</FieldError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">稱號</Label>
                <Input
                  id="title"
                  value={form.title}
                  maxLength={32}
                  onCompositionStart={() => preview.setComposing(true)}
                  onCompositionEnd={(e) => {
                    preview.setComposing(false)
                    update({ title: e.currentTarget.value }, "text")
                  }}
                  onChange={(e) => update({ title: e.target.value }, "text")}
                  onBlur={() => ready && preview.flush(formRef.current)}
                  aria-invalid={!!errorFor("title")}
                />
                <FieldError id="title-err">{errorFor("title")}</FieldError>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">稱號稀有度</legend>
                <div className="flex flex-wrap gap-1.5">
                  {RARITIES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => update({ titleRare: r }, "discrete")}
                      aria-pressed={form.titleRare === r}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition-transform",
                        // 色塊填滿 + 深墨字：原始素材色偏亮，當文字色會失敗。
                        // 未選中的不可用 opacity 淡化 —— 那會把已經算好的
                        // 對比度重新拉低（Normal/Bronze 實測會掉出 AA）。
                        // 改用 ring 與縮放區分選中狀態。
                        RARITY_STYLE[r],
                        "text-[var(--rarity-ink)]",
                        form.titleRare === r
                          ? "ring-2 ring-primary scale-[1.03]"
                          : "ring-1 ring-inset ring-black/15 hover:scale-[1.02]",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Trophy}>評級段位</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <NumField
                label="Rating"
                value={form.rating}
                min={0}
                max={99999}
                onChange={(v) => update({ rating: v }, "numeric")}
                error={errorFor("rating")}
              />
              <NumField
                label="友人對戰"
                value={form.classRank}
                min={-1}
                max={25}
                hint="-1 為不顯示"
                onChange={(v) => update({ classRank: v }, "numeric")}
                error={errorFor("classRank")}
              />
              <NumField
                label="段位認定"
                value={form.courseRank}
                min={-1}
                max={23}
                hint="-1 為不顯示"
                onChange={(v) => update({ courseRank: v }, "numeric")}
                error={errorFor("courseRank")}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Images}>素材</SectionTitle>
            <div className="space-y-3">
              <AssetField
                category="icon"
                value={form.icon}
                onChange={(v) => update({ icon: v }, "discrete")}
                error={errorFor("icon")}
              />
              <AssetField
                category="frame"
                value={form.frame}
                onChange={(v) => update({ frame: v }, "discrete")}
                error={errorFor("frame")}
              />
              <AssetField
                category="plate"
                value={form.plate}
                onChange={(v) => update({ plate: v }, "discrete")}
                error={errorFor("plate")}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Users}>旅行夥伴</SectionTitle>
            <PartnerSlots
              value={form.partners}
              onChange={(next) => update({ partners: next }, "discrete")}
              errors={form.partners.map((_, i) => errorFor(`partners.${i}.level`) ?? errorFor(`partners.${i}.charaId`))}
            />
          </Card>

          <div className="flex gap-2">
            <Button
              className="btn-neon flex-1 rounded-lg font-bold"
              size="lg"
              data-busy={preview.status === "loading" || preview.status === "stale"}
              onClick={() => preview.flush(formRef.current)}
              disabled={!ready}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              重新生成卡片
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setForm(BLANK)
                formRef.current = BLANK
              }}
            >
              清空
            </Button>
          </div>
        </div>
      </main>

      <Toaster position="bottom-right" richColors closeButton visibleToasts={3} />
    </>
  )
}

function NumField({
  label,
  value,
  min,
  max,
  hint,
  onChange,
  error,
}: {
  label: string
  value: number
  min: number
  max: number
  hint?: string
  onChange: (v: number) => void
  error?: string
}) {
  const id = `num-${label}`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={String(value)}
        inputMode="numeric"
        aria-invalid={!!error}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d-]/g, "")
          const n = raw === "" || raw === "-" ? min : Number(raw)
          onChange(Math.max(min, Math.min(max, n)))
        }}
        className="tabular-nums"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-[11px] text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  )
}
