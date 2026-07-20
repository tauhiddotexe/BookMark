import { useRef, useEffect, type ReactNode } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function StickyMonthHeader({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!pinRef.current) return
    const ctx = ScrollTrigger.create({
      trigger: ref.current,
      start: "top top+=60",
      pin: pinRef.current,
      pinSpacing: false,
      end: () => ref.current ? `bottom top+=60` : "bottom top",
    })
    return () => ctx.kill()
  }, [])

  return (
    <div ref={ref} className="relative">
      <div ref={pinRef} className={className}>{children}</div>
    </div>
  )
}
