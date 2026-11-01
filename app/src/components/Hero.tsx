import { useEffect, useRef } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'
import { scrollToId, useReducedMotion } from './ui'

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
  hue: 0 | 1
}

function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let visible = true
    const pointer = { x: -9999, y: -9999, active: false }
    let parts: P[] = []

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(340, Math.max(90, Math.floor((w * h) / 5200)))
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.35) * 0.18,
        vy: (Math.random() - 0.5) * 0.1,
        r: Math.random() < 0.18 ? 2 + Math.random() * 1.8 : 0.7 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.7 ? 0 : 1,
      }))
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        if (!reduced) {
          p.x += p.vx + Math.sin(time / 2600 + p.phase) * 0.08
          p.y += p.vy + Math.cos(time / 3100 + p.phase) * 0.06
          if (p.x < -10) p.x = w + 10
          if (p.x > w + 10) p.x = -10
          if (p.y < -10) p.y = h + 10
          if (p.y > h + 10) p.y = -10
        }
        let boost = 0
        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d < 170) {
            boost = 1 - d / 170
            if (!reduced) {
              p.x += (dx / (d + 1)) * boost * 0.9
              p.y += (dy / (d + 1)) * boost * 0.9
            }
          }
        }
        const base = p.hue === 0 ? '22,214,188' : '87,200,232'
        const a = 0.22 + boost * 0.78
        const rad = p.r * (1 + boost * 1.4)
        if (boost > 0.15) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 5)
          g.addColorStop(0, `rgba(${base},${0.5 * boost})`)
          g.addColorStop(1, `rgba(${base},0)`)
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.x, p.y, rad * 5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = `rgba(${base},${a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
        ctx.fill()
      }
      if (pointer.active) {
        ctx.strokeStyle = 'rgba(87,200,232,0.35)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, 170, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const loop = (time: number) => {
      if (visible) draw(time)
      raf = requestAnimationFrame(loop)
    }

    resize()
    if (reduced) draw(0)
    else raf = requestAnimationFrame(loop)

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.active = pointer.y >= 0 && pointer.y <= r.height
      if (reduced) draw(0)
    }
    const onLeave = () => {
      pointer.active = false
      if (reduced) draw(0)
    }
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(canvas)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}

export default function Hero() {
  return (
    <header id="top" className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(1200px 700px at 72% 28%, rgba(22,214,188,0.16), transparent 60%), radial-gradient(900px 600px at 15% 85%, rgba(87,200,232,0.12), transparent 60%), linear-gradient(180deg,#071622 0%,#08202e 55%,#071622 100%)' }} />
      <div className="sci-grid absolute inset-0 -z-10" aria-hidden="true" />
      <ParticleField />

      <div className="relative mx-auto w-full max-w-[1280px] px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <p className="eyebrow mb-6 flex flex-wrap items-center gap-3">
          <span>AIRSHIFT</span>
          <span className="text-slate">Young Planet Leaders · Vision to Action 2026</span>
        </p>
        <h1 className="max-w-4xl text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl lg:text-[5.4rem]">
          What if you could <span className="text-teal">see</span> the air you breathe?
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#cfe3ea] sm:text-xl">
          <span className="font-display text-ice">Making the Invisible Visible. Turning Awareness into Action.</span>{' '}
          AIRSHIFT is a student-led clean-air initiative that helps a school <em className="not-italic text-cyan">detect</em> fine-particle pollution, <em className="not-italic text-cyan">decide</em> on an affordable fix,{' '}
          <em className="not-italic text-cyan">verify</em> whether it worked, and <em className="not-italic text-cyan">replicate</em> the method.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-primary" onClick={() => scrollToId('air-lab')}>
            Enter the Air Lab <ArrowRight size={18} aria-hidden />
          </button>
          <button className="btn btn-ghost" onClick={() => scrollToId('pilot')}>
            <MapPin size={18} aria-hidden /> See the proposed pilot
          </button>
        </div>

        <div className="mt-14 grid grid-cols-1 max-w-4xl gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="glass flex items-baseline gap-3 px-6 py-5">
            <span className="mono text-6xl font-medium text-teal sm:text-7xl" aria-label="99 percent">99%</span>
            <span className="max-w-[11rem] text-sm leading-snug text-slate">of the world's people breathe air above WHO guideline limits</span>
          </div>
          <p className="text-sm leading-relaxed text-slate">
            Source: World Health Organization, <a className="text-cyan underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan" href="https://www.who.int/health-topics/air-pollution" target="_blank" rel="noreferrer">Air pollution</a>. This is a <strong className="text-[#cfe3ea]">global outdoor exposure</strong> statistic. It does not describe the air inside any particular classroom. That is exactly why schools need to measure their own.
          </p>
        </div>

        <ul className="mt-10 flex flex-wrap gap-2 text-xs text-slate" aria-label="Prototype status">
          <li className="chip">Concept prototype</li>
          <li className="chip">Demo data is simulated</li>
          <li className="chip">Not a deployed system</li>
          <li className="chip">Pilot subject to school approval</li>
        </ul>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-slate/80">
          Particles are illustrative and not to scale. PM2.5 refers to particles smaller than 2.5 micrometres. Move your pointer to light up the field.
        </p>
      </div>
    </header>
  )
}
