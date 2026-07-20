import { Skeleton } from "@/components/ui/skeleton"

export function Loading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-[240px] rounded-[var(--radius-xl)]" />
      <Skeleton className="h-[120px] rounded-[var(--radius-lg)]" />
      <Skeleton className="h-[120px] rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-3 gap-[18px]">
        <Skeleton className="h-[280px] rounded-[var(--radius-lg)]" />
        <Skeleton className="h-[280px] rounded-[var(--radius-lg)]" />
        <Skeleton className="h-[280px] rounded-[var(--radius-lg)]" />
      </div>
    </div>
  )
}
