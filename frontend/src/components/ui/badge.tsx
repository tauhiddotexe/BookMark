import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
        secondary: "bg-[rgba(255,255,255,0.06)] text-[var(--color-muted-strong)]",
        outline: "border border-[var(--color-line)] text-[var(--color-muted-strong)]",
        danger: "bg-[rgba(255,77,77,0.12)] text-[var(--color-danger)]",
        gold: "bg-[rgba(246,199,108,0.12)] text-[var(--color-gold)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
