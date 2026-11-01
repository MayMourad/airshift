import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RotateCcw, Wind } from 'lucide-react'
import { Callout, Section, Segmented, Stat, StatusPill, hasWebGL, scrollToId, useInView, useReducedMotion } from './ui'
import { useApp } from '../state'
import {
  ASSUMPTIONS, BUDGETS, OUTDOOR_PRESETS, SOURCE_PRESETS, STATUS_META, ZONES, cleanerAch, co2SteadyState, fmt, hepaPlan, roomVolume,
  statusOf, steadyState, timeConstantHours, zoneConcentrations, type ZoneId,
} from '../lib/model'

const AirLabScene = lazy(() => import('./AirLabScene'))

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

const DEFAULTS = { outdoor: 40, ach: 2, source: 'light', occupants: 24, filterOn: false, unitZone: 'back' as ZoneId }

function useRelax(target: number, tauH: number, reduced: boolean) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    if (reduced) { cur.current = target; setV(target); return }
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      // the animation runs at 600× real time (1 s on screen = 10 simulated minutes)
      const k = 1 - Math.exp(-((dt * 600) / 3600) / tauH)
      cur.current += (target - cur.current) * k
      if (Math.abs(target - cur.current) < 0.02) { cur.current = target; setV(target); return }
      setV(cur.current)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, tauH, reduced])
  return v
}

function Slider({ id, label, value, min, max, step, unit, onChange, hint }: { id: string; label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <output htmlFor={id} className="mono text-sm text-teal">{value}{unit}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
    </div>
  )
}

export default function AirLab() {
  const { room, budget, roomsEquipped, ventilation } = useApp()
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>('150px')
  const [webgl] = useState(hasWebGL)

  const [outdoor, setOutdoor] = useState(DEFAULTS.outdoor)
  const [ach, setAch] = useState(DEFAULTS.ach)
  const [source, setSource] = useState(DEFAULTS.source)
  const [occupants, setOccupants] = useState(DEFAULTS.occupants)
  const [filterOn, setFilterOn] = useState(DEFAULTS.filterOn)
  const [unitZone, setUnitZone] = useState<ZoneId>(DEFAULTS.unitZone)
  const [zone, setZone] = useState<ZoneId>('window')

  const plan = useMemo(
    () => hepaPlan({ room, budget, roomsEquipped, ventilation, observations: { visibleDust: false, leakyEnvelope: false, hvacUnknown: false, aerosols: false, stuffy: false, dustyOutdoors: false }, baselineMean: null }),
    [room, budget, roomsEquipped, ventilation],
  )
  const V = roomVolume(room)
  const S = SOURCE_PRESETS.find((s) => s.id === source)!.ugPerH
  const cadr = filterOn ? plan.totalCadrPerRoom : 0

  const input = { volume: V, ach, outdoor, sourceUgPerH: S, cadrM3h: cadr }
  const withoutFilter = steadyState({ ...input, cadrM3h: 0 })
  const target = steadyState(input)
  const tau = timeConstantHours(input)
  const now = useRelax(target, tau, reduced)
  const reductionPct = withoutFilter > 0 ? (1 - target / withoutFilter) * 100 : 0
  const co2 = co2SteadyState(V, ach, occupants)

  const targetZones = zoneConcentrations(target, filterOn ? unitZone : null)
  const ratio = target > 0 ? now / target : 1
  const zoneNow = Object.fromEntries(ZONES.map((z) => [z.id, targetZones[z.id] * ratio])) as Record<ZoneId, number>
  const status = statusOf(now)

  const reset = () => {
    setOutdoor(DEFAULTS.outdoor); setAch(DEFAULTS.ach); setSource(DEFAULTS.source); setOccupants(DEFAULTS.occupants)
    setFilterOn(DEFAULTS.filterOn); setUnitZone(DEFAULTS.unitZone); setZone('window')
  }

  const fallback = (
    <div className="grid h-full place-items-center p-8 text-center text-sm text-slate" role="status">
      <div>
        <Wind className="mx-auto mb-3 text-teal" aria-hidden />
        <p className="font-medium text-ice">3D view unavailable on this device.</p>
        <p className="mt-1">The model and every control still work. Use the zone buttons and measurements below.</p>
      </div>
    </div>
  )

  return (
    <Section
      id="air-lab"
      eyebrow="Module 2 · Interactive Air Lab"
      title="Step inside a classroom and watch the air change."
      lead="Orbit the room, pick a zone, change the outdoor air, ventilation, indoor sources and occupancy, then switch a hypothetical portable HEPA intervention on. Every number is computed from a documented single-zone model."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-4">
          <div ref={wrapRef} className="glass relative aspect-[4/3] min-h-[340px] overflow-hidden lg:aspect-auto lg:h-[560px]" data-testid="airlab-canvas">
            {webgl ? (
              <SceneBoundary fallback={fallback}>
                <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate" role="status">Loading 3D classroom…</div>}>
                  <AirLabScene room={room} zoneConc={zoneNow} selectedZone={zone} onSelectZone={setZone} filterOn={filterOn} units={plan.unitsPerRoom} unitZone={unitZone} reduced={reduced} active={inView} sourceLevel={S / 6000} />
                </Suspense>
              </SceneBoundary>
            ) : fallback}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="chip bg-[rgba(7,22,34,.7)] text-[#F5BD67]" style={{ borderColor: 'rgba(245,189,103,.4)' }}>Conceptual visualization</span>
              <StatusPill status={status} value={now} />
            </div>
            <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-[rgba(7,22,34,.72)] px-3 py-2 text-[11px] leading-snug text-slate backdrop-blur">
              Drag to orbit · scroll to zoom · click a floor zone. Particle motion is illustrative only and is <strong className="text-ice">not computational fluid dynamics</strong>. Particle density follows the modelled concentration, not a simulation of real airflow.
            </p>
          </div>

          <div role="group" aria-label="Classroom zones" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ZONES.map((z) => {
              const c = zoneNow[z.id]
              const m = STATUS_META[statusOf(c)]
              const sel = zone === z.id
              return (
                <button key={z.id} onClick={() => setZone(z.id)} aria-pressed={sel} className="rounded-xl border p-3 text-left transition-colors" style={{ borderColor: sel ? m.color : 'var(--line)', background: sel ? `${m.color}14` : 'rgba(12,37,50,.6)' }}>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate">{z.label}</p>
                  <p className="mono mt-1 text-xl" style={{ color: m.color }}><span aria-hidden>{m.symbol}</span> {fmt(c)} <span className="text-xs text-slate">µg/m³</span></p>
                  <p className="mt-1 text-[11px] leading-snug text-slate">{m.short}</p>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate" aria-live="polite">
            Selected: <strong className="text-ice">{ZONES.find((z) => z.id === zone)!.label}</strong> — {ZONES.find((z) => z.id === zone)!.note}. Zone differences are illustrative weights (mean = 1), not measured or simulated.
          </p>
        </div>

        <div className="panel flex flex-col gap-5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Scenario controls</h3>
            <button className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={15} aria-hidden /> Reset</button>
          </div>
          <Slider id="out" label="Outdoor PM2.5" value={outdoor} min={5} max={150} step={1} unit=" µg/m³" onChange={setOutdoor} hint="Illustrative scenario value, not a forecast." />
          <div className="-mt-2 flex flex-wrap gap-2">
            {OUTDOOR_PRESETS.map((p) => (
              <button key={p.id} className="chip hover:border-teal hover:text-teal" onClick={() => setOutdoor(p.value)}>{p.label} · {p.value}</button>
            ))}
          </div>
          <Slider id="ach" label="Ventilation (outdoor air changes)" value={ach} min={0.5} max={6} step={0.1} unit=" /h" onChange={setAch} hint="Higher ventilation brings in more outdoor air — good for CO2, but it also lets in outdoor particles." />
          <div>
            <p className="mb-2 text-sm font-medium">Indoor particle sources</p>
            <Segmented label="Indoor particle sources" value={source} onChange={setSource} options={SOURCE_PRESETS.map((s) => ({ value: s.id, label: s.label, hint: s.detail }))} />
            <p className="mt-1.5 text-xs text-slate">{SOURCE_PRESETS.find((s) => s.id === source)!.detail}</p>
          </div>
          <Slider id="occ" label="Occupants (affects CO2 only)" value={occupants} min={0} max={35} step={1} unit="" onChange={setOccupants} />

          <div className="rounded-xl border border-[var(--line)] bg-[rgba(7,22,34,.5)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" id="filter-label">Hypothetical portable HEPA intervention</p>
                <p className="text-xs text-slate">{plan.unitsPerRoom} × {BUDGETS[budget].unitCadrM3h} m³/h per room (${budget} plan) = {plan.totalCadrPerRoom} m³/h rated</p>
              </div>
              <button role="switch" aria-checked={filterOn} aria-labelledby="filter-label" onClick={() => setFilterOn((v) => !v)} className="relative h-8 w-14 shrink-0 rounded-full border transition-colors" style={{ background: filterOn ? '#16D6BC' : '#12303f', borderColor: filterOn ? '#16D6BC' : 'var(--line)' }}>
                <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all" style={{ left: filterOn ? 'calc(100% - 1.6rem)' : '0.15rem' }} />
              </button>
            </div>
            <label className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-slate">Unit location</span>
              <select value={unitZone} onChange={(e) => setUnitZone(e.target.value as ZoneId)} aria-label="Unit location">
                {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </label>
            <p className="mt-2 text-xs text-slate">Unit count and CADR come from the budget you choose in <button className="underline decoration-teal/50 underline-offset-2 hover:text-teal" onClick={() => scrollToId('studio')}>Intervention Studio</button>.</p>
          </div>
        </div>
      </div>

      {/* measurements */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Supporting measurements">
        <Stat label="Modelled room mean · now" value={fmt(now)} unit="µg/m³" tone={STATUS_META[status].color} hint={`${STATUS_META[status].short} · relaxing toward steady state`} />
        <Stat label="Steady state (this scenario)" value={fmt(target)} unit="µg/m³" hint={`Without cleaner: ${fmt(withoutFilter)} µg/m³`} />
        <Stat label="Modelled change from cleaner" value={filterOn ? `−${fmt(reductionPct, 0)}` : '0'} unit="%" tone={filterOn ? '#16D6BC' : undefined} hint={filterOn ? `Equivalent to +${fmt(cleanerAch(V, cadr), 1)} air changes/h` : 'Cleaner is off'} />
        <Stat label="Time to settle (τ)" value={fmt(tau * 60, 0)} unit="min" hint="Animation runs at 600× real time" />
        <Stat label="CO2 · separate metric" value={Number.isFinite(co2) ? Math.round(co2) : '—'} unit="ppm" hint="Steady-state upper bound. HEPA filtration does not change CO2." />
        <Stat label="Outdoor → indoor ratio" value={fmt(target / outdoor, 2)} hint="Indoor ÷ outdoor, steady state" />
        <Stat label="Recommended CADR (EPA rule)" value={Math.round(plan.recommended)} unit="m³/h" hint={`Coverage with ${plan.unitsPerRoom} unit${plan.unitsPerRoom > 1 ? 's' : ''}: ${Math.round(plan.coverage * 100)}%`} />
        <Stat label="Room volume" value={fmt(V, 0)} unit="m³" hint={`${room.length} × ${room.width} × ${room.height} m`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Callout tone="warn" title="How to read this">
          PM2.5 values are <strong>modelled</strong> from a single well-mixed room. They illustrate how outdoor air, ventilation, indoor sources and filtration interact. They are not measurements, not predictions for any real classroom, and not a health-risk assessment. The pilot would replace these assumptions with measured data.
        </Callout>
        <details className="panel p-4 text-sm leading-relaxed text-[#cfe3ea]">
          <summary className="cursor-pointer font-semibold text-ice">Model and assumptions</summary>
          <p className="mono mt-3 rounded-lg bg-[#0a1d2a] p-3 text-xs text-cyan">C = (P·λᵥ·C_out + S/V) ÷ (λᵥ + k + η·CADR/V)</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate">
            <li>P = {ASSUMPTIONS.penetration} outdoor-particle penetration (plausible 0.6–1.0).</li>
            <li>k = {ASSUMPTIONS.deposition}/h deposition to surfaces (plausible 0.1–0.4).</li>
            <li>η = {ASSUMPTIONS.filterEfficiency} share of rated CADR delivered in practice (range {ASSUMPTIONS.filterEfficiencyRange[0]}–{ASSUMPTIONS.filterEfficiencyRange[1]}).</li>
            <li>S = indoor source rate (µg/h): none 0, light 800, moderate 2,500, heavy 6,000. Illustrative.</li>
            <li>Recommended CADR follows the EPA rule of thumb of 65 cfm per 100 ft² at 8-ft ceilings (≈ 11.9 m³/h per m²).</li>
            <li>CO2 uses 0.0042 L/s per seated student and 420 ppm outdoors; it is independent of PM2.5 and of filtration.</li>
            <li>Zone weights (window 1.16, door 1.08, board 1.00, back 0.76; mean 1) are illustrative, not CFD.</li>
          </ul>
        </details>
      </div>
    </Section>
  )
}
