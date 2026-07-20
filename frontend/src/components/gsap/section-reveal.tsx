import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!ref.current) return
    const ctx = gsap.from(ref.current, {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top bottom-=80",
        end: "top center",
        toggleActions: "play none none reverse",
      },
    })
    return () => ctx.kill()
  }, [])

  return <div ref={ref} className={className}>{children}</div>
}
