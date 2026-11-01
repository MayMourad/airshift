import { useMemo, useState } from 'react'
import { Callout, Section, Segmented } from './ui'
import { useApp } from '../state'
import {
  ASSUMPTIONS, BUDGETS, OBSERVATION_ITEMS, VENTILATION, budgetSum, evaluateOptions, fmt, recommendedCadr, roomArea, roomVolume,
  type BudgetTier, type Observations, type VentilationLevel,
} from '../lib/model'
import { computeEvidence } from '../lib/data'

const NO_OBS: Observations = { visibleDust: false, leakyEnvelope: false, hvacUnknown: false, aerosols: false, stuffy: false, dustyOutdoors: false }
const usd = (n: number) => `$${n.toLocaleString('en-US')}`

function NumberField({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-slate">{label}</span>
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v))) }} />
    </label>
  )
}

export default function Studio() {
  const { room, setRoom, budget, setBudget, roomsEquipped, setRoomsEquipped, ventilation, setVentilation, dataset, selectedRoom, interventionAt } = useApp()
  const [obs, setObs] = useState<Observations>(NO_OBS)
  const [baseline, setBaseline] = useState<string>('')

  const b = BUDGETS[budget]
  const rooms = Math.min(roomsEquipped, b.maxRooms) as 1 | 2
  const baselineMean = baseline.trim() === '' ? null : Math.max(0, Number(baseline))
  const result = useMemo(
    () => evaluateOptions({ room, budget, roomsEquipped: rooms, ventilation, observations: obs, baselineMean: baselineMean != null && Number.isFinite(baselineMean) ? baselineMean : null }),
    [room, budget, rooms, ventilation, obs, baselineMean],
  )
  const { hepa } = result
  const rec = recommendedCadr(room)
  const unitPrice = budget === 500 ? ASSUMPTIONS.smallUnit.priceUsd : ASSUMPTIONS.referenceUnit.priceUsd
  const extraUnits = Math.max(0, Math.ceil((rec - hepa.totalCadrPerRoom) / b.unitCadrM3h))
  const total = budgetSum(b)

  const useDemoBaseline = () => {
    const ev = computeEvidence(dataset, selectedRoom, interventionAt)
    if (ev?.before.summary.n) setBaseline(ev.before.summary.mean.toFixed(1))
  }

  const set = (k: keyof Observations) => (e: React.ChangeEvent<HTMLInputElement>) => setObs({ ...obs, [k]: e.target.checked })

  return (
    <Section
      id="studio"
      eyebrow="Module 4 · Intervention Studio"
      title="Choose the fix that fits the room and the budget."
      lead="Enter the room, the money, and what you have observed. The studio sizes portable HEPA filtration against an EPA rule of thumb, compares it with source control and a facilities review, and shows its working. It never claims a precise reduction."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,420px)_1fr]">
        <div className="panel flex flex-col gap-5 p-5">
          <fieldset className="grid grid-cols-3 gap-3">
            <legend className="mb-2 text-sm font-semibold">Classroom dimensions (m)</legend>
            <NumberField id="len" label="Length" value={room.length} min={3} max={15} step={0.5} onChange={(v) => setRoom({ ...room, length: v })} />
            <NumberField id="wid" label="Width" value={room.width} min={3} max={15} step={0.5} onChange={(v) => setRoom({ ...room, width: v })} />
            <NumberField id="hei" label="Height" value={room.height} min={2.2} max={6} step={0.1} onChange={(v) => setRoom({ ...room, height: v })} />
            <p className="col-span-3 mono text-xs text-slate">{fmt(roomArea(room), 1)} m² · {fmt(roomVolume(room), 0)} m³</p>
          </fieldset>

          <div>
            <p className="mb-2 text-sm font-semibold">Available budget</p>
            <Segmented<BudgetTier> label="Budget tier" value={budget} onChange={(v) => { setBudget(v); if (BUDGETS[v].maxRooms === 1) setRoomsEquipped(1) }} options={[{ value: 500, label: '$500' }, { value: 1000, label: '$1,000' }, { value: 1500, label: '$1,500' }]} />
            <p className="mt-2 text-xs leading-relaxed text-slate">{b.scope}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Rooms receiving air cleaners</p>
            <Segmented<1 | 2> label="Rooms receiving air cleaners" value={rooms} onChange={setRoomsEquipped} options={[{ value: 1, label: '1 room' }, { value: 2, label: '2 rooms', hint: b.maxRooms < 2 ? 'Not available at this budget' : undefined }]} />
            {b.maxRooms < 2 && <p className="mt-1 text-xs text-slate">This budget supports one treated room.</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Assumed ventilation</p>
            <Segmented<VentilationLevel> label="Assumed ventilation" value={ventilation} onChange={setVentilation} options={(Object.keys(VENTILATION) as VentilationLevel[]).map((k) => ({ value: k, label: VENTILATION[k].label, hint: VENTILATION[k].detail }))} />
            <p className="mt-1 text-xs text-slate">{VENTILATION[ventilation].detail} (≈ {VENTILATION[ventilation].ach} air changes/h). To be confirmed with facilities staff.</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Environmental observations</legend>
            <div className="flex flex-col gap-2">
              {OBSERVATION_ITEMS.map((o) => (
                <label key={o.key} className="flex items-start gap-3 rounded-lg p-2 text-sm leading-snug hover:bg-white/5">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[#16D6BC]" checked={obs[o.key]} onChange={set(o.key)} />
                  <span>{o.label}<span className="block text-xs text-slate">{o.hint}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="baseline" className="mb-1 block text-sm font-semibold">Measured baseline mean PM2.5 (optional)</label>
            <div className="flex gap-2">
              <input id="baseline" type="number" min={0} step={0.1} placeholder="µg/m³" value={baseline} onChange={(e) => setBaseline(e.target.value)} className="min-w-0 flex-1" />
              <button className="btn btn-ghost btn-sm" onClick={useDemoBaseline}>Use demo baseline</button>
            </div>
            <p className="mt-1 text-xs text-slate">Leave blank if you have not measured yet. AIRSHIFT does not presume that PM2.5 is elevated.</p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* HEPA sizing */}
          <div className="panel p-5">
            <h3 className="text-lg font-semibold">Portable HEPA sizing for this room</h3>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate"><span>Provided CADR ({hepa.unitsPerRoom} × {b.unitCadrM3h} m³/h)</span><span className="mono">{Math.round(hepa.totalCadrPerRoom)} / {Math.round(rec)} m³/h recommended</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-[#0a1d2a]" role="img" aria-label={`Coverage ${Math.round(hepa.coverage * 100)} percent of the recommended CADR`}>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, hepa.coverage * 100)}%`, background: hepa.coverage >= 1 ? '#16D6BC' : '#F5BD67' }} />
              </div>
              <p className="mt-2 text-sm"><strong className="mono" style={{ color: hepa.coverage >= 1 ? '#16D6BC' : '#F5BD67' }}>{Math.round(hepa.coverage * 100)}%</strong> of the EPA rule-of-thumb CADR. {hepa.cadrNote}</p>
              {extraUnits > 0 && <p className="mt-1 text-xs text-slate">Reaching full coverage would take about {extraUnits} more reference unit{extraUnits > 1 ? 's' : ''} (≈ {usd(extraUnits * unitPrice)}), which this tier does not include.</p>}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="text-[11px] uppercase tracking-wider text-slate">Modelled reduction range</p><p className="mono mt-1 text-xl text-teal">{hepa.rangePct[0]}–{hepa.rangePct[1]}%</p><p className="text-[11px] text-slate">central ≈ {hepa.centralPct}% · illustrative</p></div>
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="text-[11px] uppercase tracking-wider text-slate">Units for full coverage</p><p className="mono mt-1 text-xl">{hepa.neededUnits}</p><p className="text-[11px] text-slate">at {b.unitCadrM3h} m³/h each</p></div>
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="text-[11px] uppercase tracking-wider text-slate">Equipment per room</p><p className="mono mt-1 text-xl">{usd(hepa.unitsPerRoom * unitPrice)}</p><p className="text-[11px] text-slate">planning price {usd(unitPrice)}/unit</p></div>
            </div>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-slate hover:text-teal">Assumptions and uncertainty behind the range</summary>
              <p className="mt-2 leading-relaxed text-slate">Steady-state, single well-mixed zone. Range combines delivered-CADR share η = {ASSUMPTIONS.filterEfficiencyRange[0]}–{ASSUMPTIONS.filterEfficiencyRange[1]} with ventilation {ASSUMPTIONS.achUncertainty[0]}–{ASSUMPTIONS.achUncertainty[1]}× the assumed level, rounded to the nearest 5%. It applies equally to infiltrated and indoor-generated particles and ignores filter loading, door openings and uneven mixing. Real-world results can fall outside it. The Evidence Lab exists to measure the actual change.</p>
            </details>
          </div>

          {/* ranked options */}
          <div className="flex flex-col gap-4" aria-label="Intervention options ranked by fit">
            {result.options.map((o, i) => (
              <article key={o.id} className="panel p-5" style={{ borderColor: i === 0 ? 'rgba(22,214,188,.5)' : undefined }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="mono grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-sm text-teal" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
                    <h4 className="text-lg font-semibold">{o.title}</h4>
                  </div>
                  <div className="text-right">
                    <p className="mono text-sm">{o.costUsd[1] === 0 ? 'Facilities-owned' : `${usd(o.costUsd[0])}${o.costUsd[1] !== o.costUsd[0] ? `–${usd(o.costUsd[1])}` : ''}`}</p>
                    <p className="text-[11px] text-slate">fit score {o.score}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate">{o.costNote}</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div><p className="mb-1 text-[11px] uppercase tracking-wider text-slate">Why it ranks here</p><ul className="list-disc space-y-1 pl-4 text-sm text-[#cfe3ea]">{o.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>
                  <div><p className="mb-1 text-[11px] uppercase tracking-wider text-slate">Needs</p><ul className="list-disc space-y-1 pl-4 text-sm text-[#cfe3ea]">{o.requirements.map((r) => <li key={r}>{r}</li>)}</ul></div>
                  <div><p className="mb-1 text-[11px] uppercase tracking-wider text-slate">Maintenance</p><ul className="list-disc space-y-1 pl-4 text-sm text-[#cfe3ea]">{o.maintenance.map((r) => <li key={r}>{r}</li>)}</ul></div>
                </div>
                <p className="mt-3 text-sm"><strong className="text-ice">Expected effect:</strong> <span className="text-[#cfe3ea]">{o.effect}</span></p>
                <p className="mt-1 text-xs text-slate">{o.caution}</p>
              </article>
            ))}
          </div>
          <p className="text-xs text-slate">Ranking is a transparent rule-based score from the observations above, not machine learning, and it is not a recommendation to buy. Final choices follow a baseline review and approval by school leadership and facilities staff.</p>
          {result.notes.length > 0 && (
            <Callout tone="warn" title="Notes for this scenario"><ul className="list-disc space-y-1 pl-5">{result.notes.map((n) => <li key={n}>{n}</li>)}</ul></Callout>
          )}

          {/* budget table */}
          <div className="panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">Budget scenario · {usd(budget)}</h3>
              <span className="chip" style={{ color: '#F5BD67', borderColor: 'rgba(245,189,103,.4)' }}>Preliminary planning figures · not supplier quotations</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
              <table className="w-full text-sm">
                <caption className="sr-only">Budget lines for the {usd(budget)} scenario</caption>
                <tbody>
                  {b.lines.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--line)]">
                      <td className="py-2 pr-3">{l.label}</td>
                      <td className="mono py-2 text-right">{usd(l.amount)}</td>
                    </tr>
                  ))}
                  <tr><td className="py-2 font-semibold">Total</td><td className="mono py-2 text-right font-semibold text-teal">{usd(total)}</td></tr>
                </tbody>
              </table>
              <div>
                <div className="flex h-4 overflow-hidden rounded-full" role="img" aria-label="Budget proportions">
                  {b.lines.map((l, i) => <div key={l.id} title={`${l.label}: ${usd(l.amount)}`} style={{ width: `${(l.amount / total) * 100}%`, background: ['#16D6BC', '#57C8E8', '#3aa6bf', '#8FA9B6', '#5f7f8d', '#F5BD67', '#EF7479'][i % 7] }} />)}
                </div>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate">
                  {b.tradeoffs.map((t) => <li key={t}>{t}</li>)}
                  <li>{b.monitors} monitor{b.monitors > 1 ? 's' : ''} · {b.hepaUnits} air cleaner{b.hepaUnits > 1 ? 's' : ''} · equipment cost per treated room ≈ {usd((b.lines.find((l) => l.id === 'hepa')!.amount / rooms) + (b.lines.find((l) => l.id === 'monitor')!.amount / b.monitors))} (cleaner + one monitor, planning).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
