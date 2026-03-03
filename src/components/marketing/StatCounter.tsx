'use client'
import { useRef, useEffect, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

interface Props {
  end: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function StatCounter({ end, prefix = '', suffix = '', duration = 1500 }: Props) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!inView) return
    if (reduce) { setDisplay(end); return }
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [inView, end, duration, reduce])

  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>
}
