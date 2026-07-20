import { forwardRef } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-bold transition-all duration-180 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-60 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#00c46a] to-[#41f2a2] text-[#04130b] shadow-lg shadow-[rgba(0,196,106,0.18)] hover:shadow-xl hover:shadow-[rgba(0,196,106,0.24)] hover:-translate-y-0.5",
        secondary: "bg-[rgba(255,255,255,0.05)] text-[var(--color-muted-strong)] border border-[var(--color-line)] hover:bg-[rgba(255,255,255,0.1)] hover:-translate-y-0.5",
        ghost: "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)]",
        danger: "bg-transparent text-[var(--color-danger)] hover:bg-[rgba(255,77,77,0.1)] hover:-translate-y-0.5",
        outline: "bg-transparent border border-[var(--color-line)] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] hover:-translate-y-0.5",
        link: "bg-transparent text-[var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-3",
        sm: "h-9 px-3.5 py-2 text-xs",
        lg: "h-12 px-7 py-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
