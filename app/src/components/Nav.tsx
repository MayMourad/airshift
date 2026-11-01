import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { scrollToId } from './ui'

const LINKS = [
  { id: 'air-lab', label: 'Air Lab' },
  { id: 'air-map', label: 'Air Map' },
  { id: 'studio', label: 'Interventions' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'replicate', label: 'Replicate' },
  { id: 'sources', label: 'Sources' },
]

export default function Nav() {
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (vis) setActive(vis.target.id)
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.1, 0.5] },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  const go = (id: string) => {
    setOpen(false)
    scrollToId(id)
  }

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 top-0 z-50 transition-colors" style={{ background: solid || open ? 'rgba(7,22,34,.82)' : 'transparent', backdropFilter: solid || open ? 'blur(14px)' : 'none', borderBottom: solid ? '1px solid var(--line)' : '1px solid transparent' }}>
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => { setOpen(false); scrollToId('top') }} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight" aria-label="AIRSHIFT, back to top">
          <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" strokeWidth="5" strokeLinecap="round"><path d="M10 22c9-7 15 7 24 0s12-4 20 0" stroke="#16D6BC" /><path d="M10 34c9-7 15 7 24 0s12-4 20 0" stroke="#57C8E8" /><path d="M10 46c9-7 15 7 24 0s12-4 20 0" stroke="#8FA9B6" opacity=".6" /></g></svg>
          AIRSHIFT
        </button>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <button onClick={() => go(l.id)} aria-current={active === l.id ? 'true' : undefined} className="rounded-full px-3.5 py-2 text-sm transition-colors hover:text-teal" style={{ color: active === l.id ? '#16D6BC' : '#cfe3ea', background: active === l.id ? 'rgba(22,214,188,.1)' : 'transparent' }}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <button className="btn btn-ghost btn-sm lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={18} /> : <Menu size={18} />} Menu
        </button>
      </div>
      {open && (
        <ul id="mobile-nav" className="mx-4 mb-4 grid gap-1 rounded-2xl border border-[var(--line)] bg-[rgba(12,37,50,.95)] p-2 lg:hidden">
          {LINKS.map((l) => (
            <li key={l.id}>
              <button onClick={() => go(l.id)} className="w-full rounded-xl px-4 py-3 text-left text-base hover:bg-white/5" style={{ color: active === l.id ? '#16D6BC' : '#f7fbfd' }}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
