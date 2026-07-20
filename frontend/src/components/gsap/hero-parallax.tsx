import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function HeroParallax({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!ref.current) return
    const ctx = gsap.to(ref.current, {
      y: 40,
      opacity: 0.5,
      scale: 0.97,
      ease: "power1.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top top",
        end: "bottom top",
        scrub: 1.2,
      },
    })
    return () => ctx.kill()
  }, [])

  return <div ref={ref} className={className}>{children}</div>
}
