import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.06)]",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-[rgba(255,255,255,0.1)] before:to-transparent before:animate-[shimmer_1.3s_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
