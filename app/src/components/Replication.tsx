import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowRight, Check, Download, MapPin } from 'lucide-react'
import { Callout, Section, Segmented, scrollToId, useInView } from './ui'
import { useApp } from '../state'
import { OBSERVATION_LOG_CSV, TEMPLATE_CSV, download } from '../lib/csv'
import { BUDGETS, budgetSum, type BudgetTier } from '../lib/model'
import { GLOBE_POINTS } from '../lib/globePoints'

const Globe = lazy(() => import('./Globe'))

const STAGES = [
  { n: '01', name: 'Detect', color: '#16D6BC', does: 'Measure PM2.5 and record room conditions, sensor limitations and sampling times.', out: 'Documented baseline' },
  { n: '02', name: 'Decide', color: '#57C8E8', does: 'Compare feasible source-control and air-cleaning options with costs and maintenance needs.', out: 'Site-specific action plan' },
  { n: '03', name: 'Verify', color: '#F5BD67', does: 'Measure after implementation and compare reasonably matched conditions.', out: 'Transparent impact summary' },
  { n: '04', name: 'Replicate', color: '#EAF7F6', does: 'Publish a simple method, templates, budget variants and lessons learned.', out: 'School implementation toolkit' },
]

const WEEKS = [
  { id: 1, span: [1, 2], title: 'Weeks 1–2 · Approve & plan', deliverable: 'Approved site and protocol', tasks: ['Seek permission from school leadership and facilities staff', 'Select one or two rooms', 'Plan the measurement protocol and equipment requirements', 'Get supplier quotations to replace the planning figures'], dep: 'Nothing else can start without school approval.', risk: 'Approval is delayed or declined.', fix: 'Start the request immediately. Fallback: run a classroom-level demonstration with permission from one teacher, or monitor a space the school nominates.' },
  { id: 2, span: [3, 4], title: 'Weeks 3–4 · Detect', deliverable: 'Baseline and action choice', tasks: ['Collect baseline readings during school hours (target ≥ 10 school days)', 'Side-by-side check of the two monitors', 'Record observations: sources, windows, HVAC state', 'Review the baseline and choose an intervention'], dep: 'Needs the approved protocol and delivered monitors.', risk: 'Delivery delay, sensor faults, or a dust event dominating the window.', fix: 'Order early, keep a spare day in the schedule, and record the dust event rather than discarding it.' },
  { id: 3, span: [5, 6], title: 'Weeks 5–6 · Decide & implement', deliverable: 'Intervention dataset', tasks: ['Install the approved intervention (staff review of placement)', 'Log fan speed, run hours and cleaning routines', 'Collect follow-up readings with the same sensors and placement'], dep: 'Needs the baseline review and approval of equipment placement.', risk: 'The baseline is already within guideline levels, or the unit is switched off or moved.', fix: 'If the baseline does not justify an intervention, report that as a finding. Label the unit and keep an operating log.' },
  { id: 4, span: [7, 8], title: 'Weeks 7–8 · Verify & replicate', deliverable: 'Impact report and toolkit', tasks: ['Analyze matched windows and document uncertainty', 'Share student learning with the school community', 'Publish the toolkit, templates and budget variants'], dep: 'Needs complete follow-up data and an honest limitations section.', risk: 'Results are inconclusive or confounded.', fix: 'Publish them anyway with the caveats. Inconclusive evidence is still useful to the next school.' },
]

const CHECKLIST = [
  'Ask school leadership for permission to run a student-led pilot',
  'Brief facilities staff and agree on equipment placement',
  'Choose one or two rooms (a comparison room if budget allows)',
  'Confirm no student-identifiable data will be collected',
  'Get supplier quotations and compare with the planning budget',
  'Compare the two monitors side by side before installation',
  'Collect at least 10 school days of baseline data',
  'Record observations: sources, doors and windows, HVAC state',
  'Choose an intervention only after reviewing the baseline',
  'Collect matched follow-up readings with the same sensors',
  'Analyze with outdoor air and the comparison room',
  'Publish results, caveats and the toolkit',
]

const PHASES = [
  { n: 'Phase 0', name: 'Pilot', status: 'Planned', detail: 'One or two classrooms in Al Dhafra, subject to school approval.', gate: 'Gate: a documented baseline and a verified or honestly inconclusive result.' },
  { n: 'Phase 1', name: 'Toolkit', status: 'Planned', detail: 'Publish the method, templates, budget variants and lessons learned for free.', gate: 'Gate: outside educators can follow it without help.' },
  { n: 'Phase 2', name: 'Peer schools', status: 'Hypothetical', detail: 'Support a few nearby schools to repeat the method with their own sensors.', gate: 'Gate: schools approve and fund their own equipment.' },
  { n: 'Phase 3', name: 'Open network', status: 'Hypothetical', detail: 'Share anonymized method results so schools can compare approaches.', gate: 'Gate: a privacy and data-quality policy that has been reviewed.' },
]

const TOOLKIT_MD = `# AIRSHIFT school toolkit (starter outline)

Status: starter outline from the AIRSHIFT prototype. Not yet field-tested. Planning figures are not supplier quotations.

## 1. Before you start
- Get permission from school leadership and facilities staff.
- Decide who owns the equipment, who maintains it, and where data is stored.
- Collect no names or student-identifiable information.

## 2. Detect
- Measure PM2.5 (µg/m³) at desk height, away from doors, windows and vents.
- Compare monitors side by side for a day before installing.
- Record at least 10 school days (Mon–Fri 07:00–15:00), plus an outdoor reference if possible.
- Fill the observation log: sources, doors/windows, HVAC state, cleaning.

## 3. Decide
- Size portable HEPA cleaners: EPA rule of thumb is about 65 cfm of CADR per 100 ft² (8-ft ceilings), roughly 11.9 m³/h per m².
- Prefer true HEPA cleaners that do not intentionally produce ozone.
- Consider source control first: walk-off mats, damp wiping, no aerosols while occupied.
- Ask facilities staff to review ventilation and filter maintenance.
- Treat CO2 as a separate ventilation indicator. HEPA cleaners do not remove CO2.

## 4. Verify
- Measure again for at least 10 school days with the same sensors and placement.
- Compare the same hours of day, outdoor air, humidity and a comparison room.
- Report raw and outdoor-adjusted change, with uncertainty and data-quality warnings.
- Do not claim health benefits from PM2.5 readings alone.

## 5. Replicate
- Publish the data (anonymous), the method, the cost and what went wrong.

## Sources
- WHO, Air pollution: https://www.who.int/health-topics/air-pollution
- CDC/NIOSH, Ventilation in Schools and Childcare Programs: https://www.cdc.gov/niosh/ventilation/guidelines/
- US EPA, Guide to Air Cleaners in the Home: https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home
`

const STORE = 'airshift.checklist.v1'
function loadChecks(): boolean[] {
  try {
    const raw = localStorage.getItem(STORE)
    if (raw) {
      const v = JSON.parse(raw)
      if (Array.isArray(v) && v.length === CHECKLIST.length) return v.map(Boolean)
    }
  } catch { /* storage unavailable */ }
  return CHECKLIST.map(() => false)
}

export default function Replication() {
  const { budget, setBudget } = useApp()
  const [checks, setChecks] = useState<boolean[]>(loadChecks)
  const [week, setWeek] = useState(1)
  const [focus, setFocus] = useState('pilot')
  const [globeRef, globeSeen] = useInView<HTMLDivElement>('300px')
  const [everSeen, setEverSeen] = useState(false)
  useEffect(() => { if (globeSeen) setEverSeen(true) }, [globeSeen])
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(checks)) } catch { /* ignore */ } }, [checks])

  const done = checks.filter(Boolean).length
  const w = WEEKS.find((x) => x.id === week)!
  const pt = GLOBE_POINTS.find((p) => p.id === focus)!

  return (
    <Section
      id="replicate"
      eyebrow="Module 6 · Global Replication"
      title="Detect. Decide. Verify. Replicate."
      lead="A small, honest pilot that other schools can repeat. The wider ambition only counts if the first result is documented with its caveats."
    >
      {/* pipeline */}
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-4" aria-label="The four stages">
        {STAGES.map((s, i) => (
          <li key={s.name} className="relative panel p-5">
            <p className="mono text-xs" style={{ color: s.color }}>{s.n}</p>
            <h3 className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>{s.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#cfe3ea]">{s.does}</p>
            <p className="mt-3 text-xs text-slate">Output: <strong className="text-ice">{s.out}</strong></p>
            {i < 3 && <ArrowRight aria-hidden className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-midnight p-1 text-slate md:block" size={26} />}
          </li>
        ))}
      </ol>

      {/* pilot */}
      <div id="pilot" className="mt-14 scroll-mt-20">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-2xl font-semibold sm:text-3xl">The proposed Al Dhafra pilot</h3>
          <span className="chip" style={{ color: '#F5BD67', borderColor: 'rgba(245,189,103,.45)' }}>Proposed · subject to school approval</span>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="panel p-5">
            <p className="text-sm leading-relaxed text-[#cfe3ea]">
              AIRSHIFT would begin with one or two classrooms at <strong>ADNOC Schools Madinat Zayed</strong>, led by a Grade 12 student as the sole YPL participant. School leadership and facilities staff would review placement and any infrastructure concern. The pilot starts with a baseline: it does not presume PM2.5 is elevated there.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate">Why Al Dhafra? Published monitoring work describes wind-blown desert dust as a major particulate source across Abu Dhabi emirate (Alhebsi et al., 2025), yet that is an outdoor, regional picture. Whether any classroom has elevated <em>indoor</em> PM2.5 is exactly what the baseline would find out.</p>
            <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ['Planned activity', 'Measure, review, intervene if justified, re-measure, publish.'],
                ['Proposed target', '≥ 10 school days of baseline and of follow-up per room, ≥ 90% complete.'],
                ['Hypothetical', 'Any reduction in PM2.5 shown in this prototype. Demo data only.'],
                ['Verified outcomes', 'None yet. No measurements have been collected.'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[var(--line)] p-3"><dt className="text-[11px] uppercase tracking-wider text-teal">{k}</dt><dd className="mt-1 text-[#cfe3ea]">{v}</dd></div>
              ))}
            </dl>
          </div>

          {/* eight weeks */}
          <div className="panel p-5">
            <h4 className="font-semibold">Eight-week plan after funding</h4>
            <div className="mt-3 grid grid-cols-8 gap-1" role="group" aria-label="Eight-week timeline">
              {Array.from({ length: 8 }, (_, i) => {
                const wk = i + 1
                const blk = WEEKS.find((x) => wk >= x.span[0] && wk <= x.span[1])!
                return (
                  <button key={wk} onClick={() => setWeek(blk.id)} aria-pressed={blk.id === week} aria-label={`Week ${wk}: ${blk.title}`} className="h-10 rounded-md text-xs mono transition-colors" style={{ background: blk.id === week ? '#16D6BC' : 'rgba(87,200,232,.15)', color: blk.id === week ? '#04202a' : '#cfe3ea', border: '1px solid var(--line)' }}>W{wk}</button>
                )
              })}
            </div>
            <div className="mt-4 text-sm" aria-live="polite">
              <p className="font-semibold text-teal">{w.title}</p>
              <p className="text-xs text-slate">Deliverable: <strong className="text-ice">{w.deliverable}</strong></p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#cfe3ea]">{w.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="mt-2 text-xs text-slate"><strong className="text-ice">Depends on:</strong> {w.dep}</p>
              <p className="mt-1 text-xs text-slate"><strong className="text-amber">Risk:</strong> {w.risk}</p>
              <p className="mt-1 text-xs text-slate"><strong className="text-teal">Mitigation:</strong> {w.fix}</p>
            </div>
          </div>
        </div>
      </div>

      {/* checklist + downloads */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-center justify-between"><h4 className="font-semibold">Implementation checklist</h4><span className="mono text-sm text-teal">{done}/{CHECKLIST.length}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0a1d2a]" role="progressbar" aria-valuemin={0} aria-valuemax={CHECKLIST.length} aria-valuenow={done} aria-label="Checklist progress"><div className="h-full bg-teal transition-[width]" style={{ width: `${(done / CHECKLIST.length) * 100}%` }} /></div>
          <ul className="mt-3 flex flex-col gap-1">
            {CHECKLIST.map((c, i) => (
              <li key={c}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm hover:bg-white/5">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[#16D6BC]" checked={checks[i]} onChange={() => setChecks(checks.map((v, j) => (j === i ? !v : v)))} />
                  <span style={{ textDecoration: checks[i] ? 'line-through' : 'none', color: checks[i] ? '#8FA9B6' : '#f7fbfd' }}>{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate">Ticks are saved only in this browser.</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="panel p-5">
            <h4 className="font-semibold">School replication toolkit</h4>
            <p className="mt-1 text-sm text-slate">Starter files any school can adapt. They contain no student data.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button className="btn btn-ghost justify-between" onClick={() => download('airshift-measurement-template.csv', TEMPLATE_CSV, 'text/csv;charset=utf-8')}>Measurement template (CSV) <Download size={16} aria-hidden /></button>
              <button className="btn btn-ghost justify-between" onClick={() => download('airshift-observation-log.csv', OBSERVATION_LOG_CSV, 'text/csv;charset=utf-8')}>Room observation log (CSV) <Download size={16} aria-hidden /></button>
              <button className="btn btn-ghost justify-between" onClick={() => download('airshift-toolkit-starter.md', TOOLKIT_MD, 'text/markdown;charset=utf-8')}>Toolkit starter outline (Markdown) <Download size={16} aria-hidden /></button>
            </div>
          </div>
          <div className="panel p-5">
            <h4 className="font-semibold">Budget options</h4>
            <div className="mt-3"><Segmented<BudgetTier> label="Budget option" value={budget} onChange={setBudget} options={[{ value: 500, label: '$500' }, { value: 1000, label: '$1,000' }, { value: 1500, label: '$1,500' }]} /></div>
            <p className="mt-3 text-sm text-[#cfe3ea]">{BUDGETS[budget].scope}</p>
            <p className="mt-1 text-xs text-slate">{BUDGETS[budget].monitors} monitor{BUDGETS[budget].monitors > 1 ? 's' : ''}, {BUDGETS[budget].hepaUnits} air cleaner{BUDGETS[budget].hepaUnits > 1 ? 's' : ''}, ${budgetSum(BUDGETS[budget])} total (planning figures). <button className="underline decoration-teal/50 underline-offset-2 hover:text-teal" onClick={() => scrollToId('studio')}>See line items</button></p>
          </div>
        </div>
      </div>

      {/* global model */}
      <div className="mt-14 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1fr]">
        <div ref={globeRef} className="glass p-4">
          {everSeen ? (
            <Suspense fallback={<div className="grid h-[320px] place-items-center text-sm text-slate" role="status">Loading globe…</div>}>
              <Globe focusId={focus} />
            </Suspense>
          ) : <div className="h-[320px]" />}
          <div className="mt-2 flex flex-wrap justify-center gap-2" role="group" aria-label="Globe locations">
            {GLOBE_POINTS.map((p) => (
              <button key={p.id} onClick={() => setFocus(p.id)} aria-pressed={focus === p.id} className="chip hover:border-teal" style={{ color: p.kind === 'pilot' ? '#16D6BC' : '#F5BD67', borderColor: focus === p.id ? '#F7FBFD' : undefined }}>
                {p.kind === 'pilot' ? <MapPin size={12} aria-hidden /> : '◌'} {p.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-slate" aria-live="polite"><strong className="text-ice">{pt.label}:</strong> {pt.note}</p>
        </div>
        <div>
          <h3 className="text-2xl font-semibold sm:text-3xl">From one classroom to a method others can copy.</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate">Dashed markers are illustrative regions where a school might one day adapt the toolkit. They are <strong className="text-amber">hypothetical</strong>: no sites, partners or deployments exist. Each phase opens only if the previous gate is met.</p>
          <ol className="mt-5 flex flex-col gap-3">
            {PHASES.map((p) => (
              <li key={p.n} className="panel flex gap-4 p-4">
                <span className="mono mt-0.5 text-xs text-teal">{p.n}</span>
                <div>
                  <p className="font-semibold">{p.name} <span className="chip ml-2" style={{ color: p.status === 'Planned' ? '#16D6BC' : '#F5BD67' }}>{p.status}</span></p>
                  <p className="mt-1 text-sm text-[#cfe3ea]">{p.detail}</p>
                  <p className="mt-1 text-xs text-slate">{p.gate}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-10">
        <Callout tone="warn" title="What we will and will not claim">
          <span className="inline-flex items-center gap-1"><Check size={14} aria-hidden /> Planned activities, proposed targets and hypothetical scenarios are labeled as such.</span> No deployments, partnerships, approvals, measurements or health outcomes are claimed. Results from the pilot, whatever they show, will be reported with their limitations.
        </Callout>
      </div>
    </Section>
  )
}
