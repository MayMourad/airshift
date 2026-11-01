import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { STATUS_META, type Status } from '../lib/model'

export function useReducedMotion() {
  const [r, setR] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false))
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = () => setR(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return r
}

export function useInView<T extends Element>(rootMargin = '200px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])
  return [ref, seen]
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className = '',
}: {
  id: string
  eyebrow: string
  title: string
  lead?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 ${className}`}>
      <div className="mb-10 max-w-3xl">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 id={`${id}-title`} className="text-3xl font-semibold leading-tight sm:text-5xl">
          {title}
        </h2>
        {lead && <p className="mt-4 text-base leading-relaxed text-slate sm:text-lg">{lead}</p>}
      </div>
      {children}
    </section>
  )
}

export function SimBadge({ children = 'Simulated demonstration data' }: { children?: ReactNode }) {
  return (
    <span className="chip" style={{ color: '#F5BD67', borderColor: 'rgba(245,189,103,.45)', background: 'rgba(245,189,103,.08)' }}>
      <span aria-hidden>◈</span>
      {children}
    </span>
  )
}

export function StatusPill({ status, value }: { status: Status; value?: number }) {
  const m = STATUS_META[status]
  return (
    <span className="chip" style={{ color: m.color, borderColor: `${m.color}66`, background: `${m.color}12` }} title={m.label}>
      <span aria-hidden>{m.symbol}</span>
      {m.short}
      {value != null && <span className="mono"> · {value.toFixed(1)}</span>}
    </span>
  )
}

export function Stat({ label, value, unit, tone, hint }: { label: string; value: ReactNode; unit?: string; tone?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[rgba(7,22,34,.55)] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate">{label}</p>
      <p className="mono mt-1 text-2xl font-medium" style={{ color: tone ?? '#F7FBFD' }}>
        {value}
        {unit && <span className="ml-1 text-xs text-slate">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-slate">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; hint?: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full border border-[var(--line)] bg-[rgba(7,22,34,.6)] p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={{ background: active ? '#16D6BC' : 'transparent', color: active ? '#04202a' : '#cfe3ea', minHeight: 36 }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warn'; title?: string; children: ReactNode }) {
  const c = tone === 'warn' ? '#F5BD67' : '#57C8E8'
  return (
    <div role="note" className="rounded-xl border p-4 text-sm leading-relaxed" style={{ borderColor: `${c}55`, background: `${c}10` }}>
      {title && (
        <p className="mb-1 font-semibold" style={{ color: c }}>
          {title}
        </p>
      )}
      <div className="text-[#d6e6ec]">{children}</div>
    </div>
  )
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}
