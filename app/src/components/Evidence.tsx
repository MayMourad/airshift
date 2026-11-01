import { useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Download, Info } from 'lucide-react'
import { Callout, Section, Segmented, SimBadge, Stat, useReducedMotion } from './ui'
import { useApp } from '../state'
import { computeEvidence, formatTime, startOfDay } from '../lib/data'
import { BUDGETS, WHO_GUIDELINE, fmt } from '../lib/model'
import { download, readingsToCsv } from '../lib/csv'
import { buildReportHtml } from '../lib/report'

const pct = (n: number, d = 0) => (Number.isFinite(n) ? `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n * 100).toFixed(d)}%` : '—')
const tip = { background: '#0C2532', border: '1px solid rgba(143,169,182,.3)', borderRadius: 12, color: '#F7FBFD', fontFamily: 'IBM Plex Mono', fontSize: 12 }

function toDateInput(t: number) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Evidence() {
  const { dataset: ds, selectedRoom, setSelectedRoom, interventionAt, setInterventionAt, budget } = useApp()
  const reduced = useReducedMotion()
  const ev = useMemo(() => computeEvidence(ds, selectedRoom, interventionAt), [ds, selectedRoom, interventionAt])
  const meta = ds.rooms.find((r) => r.id === selectedRoom) ?? ds.rooms[0]
  const b = BUDGETS[budget]

  const daily = useMemo(() => {
    if (!ev) return []
    const n = Math.max(ev.before.dailyMeans.length, ev.after.dailyMeans.length)
    return Array.from({ length: n }, (_, i) => ({ day: i + 1, before: ev.before.dailyMeans[i]?.value ?? null, after: ev.after.dailyMeans[i]?.value ?? null }))
  }, [ev])
  const hours = useMemo(() => (ev ? ev.before.hourProfile.map((h, i) => ({ hour: `${String(h.hour).padStart(2, '0')}:00`, before: h.value, after: ev.after.hourProfile[i]?.value })) : []), [ev])

  const exportReport = () => {
    if (!ev || !meta) return
    const html = buildReportHtml(ds, ev, meta.label, budget)
    download(ds.source === 'synthetic' ? 'airshift-SIMULATED-sample-report.html' : 'airshift-evidence-report.html', html, 'text/html;charset=utf-8')
  }

  const warnCount = ev?.warnings.filter((w) => w.level === 'warn').length ?? 0

  return (
    <Section
      id="evidence"
      eyebrow="Module 5 · Evidence Lab"
      title="Did it work? Compare matched windows, and say how sure we are."
      lead="Before-and-after PM2.5 for the same room, the same hours of the school day, with outdoor air and a comparison room alongside. The honest answer is often “partly, and here is why”."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SimBadge>{ds.source === 'synthetic' ? 'Simulated measurements: not real data' : 'Your imported data'}</SimBadge>
        <Segmented label="Room" value={selectedRoom} onChange={setSelectedRoom} options={ds.rooms.slice(0, 6).map((r) => ({ value: r.id, label: r.label }))} />
        {ds.source === 'import' && (
          <label className="flex items-center gap-2 text-sm text-slate">Intervention date
            <input type="date" value={interventionAt != null ? toDateInput(interventionAt) : ''} onChange={(e) => setInterventionAt(e.target.value ? new Date(`${e.target.value}T00:00:00`).getTime() : null)} min={toDateInput(ds.tMin)} max={toDateInput(ds.tMax)} />
          </label>
        )}
      </div>

      {!ev ? (
        <div className="panel grid place-items-center gap-2 p-10 text-center" role="status">
          <Info className="text-cyan" aria-hidden />
          <p className="font-semibold">Choose the intervention start date to compare before and after.</p>
          <p className="max-w-md text-sm text-slate">Imported data has no intervention date yet. Pick the day the air cleaner started using the field above. That day is excluded as a transition day.</p>
        </div>
      ) : !ev.ready ? (
        <div className="panel grid place-items-center gap-2 p-10 text-center" role="status">
          <AlertTriangle className="text-amber" aria-hidden />
          <p className="font-semibold">Not enough school-hour readings on both sides of that date.</p>
          <p className="max-w-md text-sm text-slate">Each window needs readings between 07:00 and 15:00 on weekdays. Try another room or date, or add more data.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Before · mean" value={fmt(ev.before.summary.mean)} unit="µg/m³" hint={`${ev.before.schoolDays} school days · n=${ev.before.summary.n}`} />
            <Stat label="After · mean" value={fmt(ev.after.summary.mean)} unit="µg/m³" hint={`${ev.after.schoolDays} school days · n=${ev.after.summary.n}`} />
            <Stat label="Raw change in mean" value={pct(ev.pct)} tone={ev.pct < 0 ? '#16D6BC' : '#EF7479'} hint={Number.isFinite(ev.pctCi[0]) ? `95% interval ${pct(ev.pctCi[0])} to ${pct(ev.pctCi[1])} (daily-mean resampling)` : 'Too few days for an interval'} />
            <Stat label="Outdoor-adjusted (indoor ÷ outdoor)" value={pct(ev.ratioPct)} tone={ev.ratioPct < 0 ? '#16D6BC' : '#EF7479'} hint={`ratio ${fmt(ev.before.ioRatio, 2)} → ${fmt(ev.after.ioRatio, 2)}`} />
            <Stat label="vs comparison room" value={ev.comparison ? pct(ev.comparison.adjustedVsComparisonPct) : '—'} hint={ev.comparison ? `${ev.comparison.room}'s ratio changed ${pct(ev.comparison.ratioPct)}` : 'No comparison room in data'} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="panel p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Daily school-hour means</h3>
              <p className="mb-2 text-xs text-slate">X axis: school day 1…n of each window, overlaid. Dashed line: WHO 24-hour reference.</p>
              <div className="h-[280px]" role="img" aria-label="Daily mean PM2.5 for before and after windows overlaid by school day">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <LineChart data={daily} margin={{ top: 8, right: 28, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(143,169,182,.12)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(143,169,182,.4)" />
                    <YAxis stroke="rgba(143,169,182,.4)" width={40} />
                    <Tooltip contentStyle={tip} formatter={(v) => `${Number(v).toFixed(1)} µg/m³`} labelFormatter={(d) => `School day ${d}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={WHO_GUIDELINE.daily} stroke="#F5BD67" strokeDasharray="5 4" />
                    <Line name="Before" dataKey="before" stroke="#8FA9B6" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!reduced} connectNulls />
                    <Line name="After" dataKey="after" stroke="#16D6BC" strokeWidth={2.4} dot={{ r: 3 }} isAnimationActive={!reduced} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Average school-day profile</h3>
              <p className="mb-2 text-xs text-slate">Mean PM2.5 by hour of the school day (07:00–14:59).</p>
              <div className="h-[280px]" role="img" aria-label="Mean PM2.5 by hour of the school day, before and after">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <LineChart data={hours} margin={{ top: 8, right: 28, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(143,169,182,.12)" vertical={false} />
                    <XAxis dataKey="hour" stroke="rgba(143,169,182,.4)" />
                    <YAxis stroke="rgba(143,169,182,.4)" width={40} />
                    <Tooltip contentStyle={tip} formatter={(v) => `${Number(v).toFixed(1)} µg/m³`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line name="Before" dataKey="before" stroke="#8FA9B6" strokeWidth={2} dot={false} isAnimationActive={!reduced} />
                    <Line name="After" dataKey="after" stroke="#57C8E8" strokeWidth={2.4} dot={false} isAnimationActive={!reduced} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="panel overflow-x-auto p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Summary statistics · {meta?.label}</h3>
              <table className="mono mt-3 w-full min-w-[460px] text-sm">
                <caption className="sr-only">PM2.5 summary statistics before and after, µg/m³, school hours</caption>
                <thead><tr className="text-left text-xs text-slate"><th className="py-2">µg/m³</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
                <tbody>
                  {([
                    ['Mean', ev.before.summary.mean, ev.after.summary.mean],
                    ['Median', ev.before.summary.median, ev.after.summary.median],
                    ['Std. deviation', ev.before.summary.sd, ev.after.summary.sd],
                    ['25th pct', ev.before.summary.q1, ev.after.summary.q1],
                    ['75th pct', ev.before.summary.q3, ev.after.summary.q3],
                    ['95th pct', ev.before.summary.p95, ev.after.summary.p95],
                    ['Maximum', ev.before.summary.max, ev.after.summary.max],
                  ] as [string, number, number][]).map(([l, a, c]) => (
                    <tr key={l} className="border-t border-[var(--line)]"><td className="py-2 text-slate">{l}</td><td>{fmt(a)}</td><td>{fmt(c)}</td><td style={{ color: c < a ? '#16D6BC' : '#EF7479' }}>{pct((c - a) / a)}</td></tr>
                  ))}
                  <tr className="border-t border-[var(--line)]"><td className="py-2 text-slate">Outdoor mean</td><td>{fmt(ev.before.outdoorMean)}</td><td>{fmt(ev.after.outdoorMean)}</td><td>{pct((ev.after.outdoorMean - ev.before.outdoorMean) / ev.before.outdoorMean)}</td></tr>
                  <tr className="border-t border-[var(--line)]"><td className="py-2 text-slate">Indoor ÷ outdoor</td><td>{fmt(ev.before.ioRatio, 2)}</td><td>{fmt(ev.after.ioRatio, 2)}</td><td>{pct(ev.ratioPct)}</td></tr>
                  <tr className="border-t border-[var(--line)]"><td className="py-2 text-slate">Humidity (%)</td><td>{fmt(ev.before.rhMean, 0)}</td><td>{fmt(ev.after.rhMean, 0)}</td><td>—</td></tr>
                  <tr className="border-t border-[var(--line)]"><td className="py-2 text-slate">CO2 (ppm, separate)</td><td>{fmt(ev.before.co2Mean, 0)}</td><td>{fmt(ev.after.co2Mean, 0)}</td><td>—</td></tr>
                </tbody>
              </table>
              <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-slate sm:grid-cols-2">
                {[ev.before, ev.after].map((p) => (
                  <p key={p.label}><strong className="text-ice">{p.label} window:</strong> <span className="mono">{formatTime(ds, p.from, false)} → {formatTime(ds, p.to - 1, false)}</span><br />{p.schoolDays} school days · {(p.completeness * 100).toFixed(0)}% complete</p>
                ))}
                <p className="sm:col-span-2">The intervention day ({interventionAt != null ? formatTime(ds, startOfDay(interventionAt), false) : '—'}) is excluded as a transition day. Windows are up to 14 days each, school hours only.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="panel p-4 sm:p-5" aria-live="polite">
                <h3 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={18} className="text-amber" aria-hidden /> Data-quality &amp; confounding <span className="mono text-sm text-slate">({warnCount} warning{warnCount === 1 ? '' : 's'})</span></h3>
                <ul className="mt-3 flex max-h-[460px] flex-col gap-2 overflow-auto pr-1">
                  {ev.warnings.map((w, i) => (
                    <li key={i} className="rounded-lg border p-3 text-sm" style={{ borderColor: w.level === 'warn' ? 'rgba(245,189,103,.5)' : 'var(--line)', background: w.level === 'warn' ? 'rgba(245,189,103,.07)' : 'rgba(7,22,34,.4)' }}>
                      <p className="font-semibold" style={{ color: w.level === 'warn' ? '#F5BD67' : '#cfe3ea' }}><span aria-hidden>{w.level === 'warn' ? '▲ ' : 'ⓘ '}</span>{w.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate">{w.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="panel p-5">
              <h3 className="text-lg font-semibold">Implementation cost</h3>
              <p className="mt-1 text-sm text-slate">Preliminary planning figures for the ${b.total} scenario (change it in Interventions). Not supplier quotations.</p>
              <ul className="mt-3 text-sm">
                {b.lines.map((l) => (<li key={l.id} className="flex justify-between border-b border-[var(--line)] py-1.5"><span>{l.label}</span><span className="mono">${l.amount}</span></li>))}
              </ul>
            </div>
            <div className="panel flex flex-col gap-3 p-5">
              <h3 className="text-lg font-semibold">Export</h3>
              <p className="text-sm text-slate">{ds.source === 'synthetic' ? 'Downloads are clearly marked SIMULATED.' : 'Built from your imported file.'} The report is a self-contained HTML page you can print or save as PDF.</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm" onClick={exportReport}><Download size={15} aria-hidden /> {ds.source === 'synthetic' ? 'Sample report (HTML)' : 'Evidence report (HTML)'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => download(ds.source === 'synthetic' ? 'airshift-SIMULATED-demo-data.csv' : 'airshift-dataset.csv', readingsToCsv(ds), 'text/csv;charset=utf-8')}><Download size={15} aria-hidden /> Data (CSV)</button>
              </div>
              <Callout title="What this can and cannot show">
                A lower PM2.5 reading after an intervention is <em>consistent with</em> it working, not proof. Weather, humidity, occupancy, ventilation and cleaning routines also change. Lower PM2.5 does not by itself demonstrate improved health, and AIRSHIFT makes no health claims. Low-cost sensors have unknown absolute bias.
              </Callout>
            </div>
          </div>
        </>
      )}
    </Section>
  )
}
