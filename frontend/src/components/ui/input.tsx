import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] transition-all duration-180 ease-out",
        "focus-visible:outline-none focus-visible:border-[rgba(0,196,106,0.45)] focus-visible:shadow-[0_0_0_4px_rgba(0,196,106,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
