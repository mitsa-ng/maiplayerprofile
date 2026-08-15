import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
))
Label.displayName = "Label"

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card text-card-foreground p-4 sm:p-5",
        "shadow-[var(--shadow-card)] transition-shadow duration-200",
        "hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
      {...props}
    />
  )
}

export function SectionTitle({
  icon: Icon,
  children,
  aside,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <h2 className="mb-4 flex items-center gap-2 border-b pb-2 text-sm font-bold">
      <Icon className="size-4 text-muted-foreground" aria-hidden={true} />
      <span>{children}</span>
      {aside ? <span className="ml-auto font-normal">{aside}</span> : null}
    </h2>
  )
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
}

export function Badge({
  className,
  variant = "secondary",
  ...props
}: React.ComponentProps<"span"> & { variant?: "secondary" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "secondary"
          ? "bg-secondary text-secondary-foreground"
          : "border border-input",
        className,
      )}
      {...props}
    />
  )
}

/** 錯誤訊息：同時有文字與顏色（不只靠顏色，WCAG 1.4.1） */
export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1 text-xs text-destructive">
      {children}
    </p>
  )
}
