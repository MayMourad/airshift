import { useMemo, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileUp, RotateCcw, Upload } from 'lucide-react'
import { Callout, Section, Segmented, SimBadge, Stat, StatusPill, useReducedMotion } from './ui'
import { useApp } from '../state'
import { MAX_FILE_BYTES, TEMPLATE_CSV, download, parseCsv, type ParseResult } from '../lib/csv'
import { formatTime, isSchoolHour, roomSeries, roomWindowStats, startOfDay, summarize, type Dataset } from '../lib/data'
import { STATUS_META, WHO_GUIDELINE, fmt, type Status } from '../lib/model'

type WindowKey = 'latest' | 'week' | 'all'
const DAY = 86400000

// Illustrative floorplan: six slots. Not the floorplan of any real school.
const SLOTS = [
  { x: 20, y: 20, w: 220, h: 150 },
  { x: 250, y: 20, w: 220, h: 150 },
  { x: 480, y: 20, w: 260, h: 150 },
  { x: 20, y: 250, w: 250, h: 150 },
  { x: 280, y: 250, w: 220, h: 150 },
  { x: 510, y: 250, w: 230, h: 150 },
]

function windowRange(ds: Dataset, key: WindowKey): [number, number] {
  if (key === 'all') return [ds.tMin, ds.tMax + 1]
  const lastSchool = [...ds.readings].reverse().find((r) => isSchoolHour(r.t))?.t ?? ds.tMax
  const d0 = startOfDay(lastSchool)
  if (key === 'latest') return [d0, d0 + DAY]
  return [d0 - 6 * DAY, d0 + DAY]
}

export default function SchoolMap() {
  const { dataset: ds, selectedRoom, setSelectedRoom, setDataset, resetDataset } = useApp()
  const reduced = useReducedMotion()
  const [win, setWin] = useState<WindowKey>('latest')
  const [schoolOnly, setSchoolOnly] = useState(true)
  const [showOutdoor, setShowOutdoor] = useState(true)
  const [pending, setPending] = useState<{ name: string; result: ParseResult } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [from, to] = useMemo(() => windowRange(ds, win), [ds, win])
  const stats = useMemo(() => Object.fromEntries(ds.rooms.map((r) => [r.id, roomWindowStats(ds, r.id, from, to, schoolOnly)])), [ds, from, to, schoolOnly])
  const sel = stats[selectedRoom] ?? Object.values(stats)[0]
  const selMeta = ds.rooms.find((r) => r.id === selectedRoom) ?? ds.rooms[0]

  const series = useMemo(() => {
    if (!selMeta) return []
    return roomSeries(ds, selMeta.id)
      .filter((r) => r.t >= from && r.t < to)
      .map((r) => ({ t: r.t, pm: r.pm25, out: r.outdoor ?? null, school: isSchoolHour(r.t) }))
  }, [ds, selMeta, from, to])

  const dailyTable = useMemo(() => {
    if (!selMeta) return []
    const m = new Map<number, number[]>()
    for (const r of roomSeries(ds, selMeta.id)) {
      if (r.t < from || r.t >= to || (schoolOnly && !isSchoolHour(r.t))) continue
      const k = startOfDay(r.t)
      m.set(k, [...(m.get(k) ?? []), r.pm25])
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k, s: summarize(v) }))
  }, [ds, selMeta, from, to, schoolOnly])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      if (f.size > MAX_FILE_BYTES) {
        setPending({ name: f.name, result: { ok: false, dataset: null, issues: [{ row: 0, level: 'error', message: `File is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.` }], rowsRead: 0, rowsAccepted: 0 } })
        return
      }
      const text = await f.text()
      setPending({ name: f.name, result: parseCsv(text, `Imported CSV · ${f.name}`) })
    } catch {
      setPending({ name: f.name, result: { ok: false, dataset: null, issues: [{ row: 0, level: 'error', message: 'The file could not be read.' }], rowsRead: 0, rowsAccepted: 0 } })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const accept = () => {
    if (pending?.result.dataset) {
      setDataset(pending.result.dataset)
      setPending(null)
    }
  }

  const stat = (id: string): { mean: number; status: Status | null; n: number } => {
    const s = stats[id]
    return { mean: s?.summary.mean ?? NaN, status: s?.status ?? null, n: s?.summary.n ?? 0 }
  }

  const label = ds.source === 'synthetic' ? 'Synthetic demonstration data' : 'Imported from your CSV (local to this browser)'

  return (
    <Section
      id="air-map"
      eyebrow="Module 3 · School Air Map"
      title="Every room, one honest picture."
      lead="Select a room on the illustrative floorplan to see PM2.5 in µg/m³, its history, and the conditions around it. Until real measurements exist, everything here is labeled synthetic."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SimBadge>{ds.source === 'synthetic' ? 'Simulated demonstration data' : 'Your imported data'}</SimBadge>
        <Segmented label="Time window" value={win} onChange={setWin} options={[{ value: 'latest', label: 'Latest school day' }, { value: 'week', label: 'Last 7 days' }, { value: 'all', label: 'Full dataset' }]} />
        <label className="flex items-center gap-2 text-sm text-slate">
          <input type="checkbox" checked={schoolOnly} onChange={(e) => setSchoolOnly(e.target.checked)} /> School hours only (Mon–Fri 07:00–15:00)
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="panel p-4">
          <svg viewBox="0 0 760 420" role="group" aria-label="Illustrative school floorplan. Select a room." className="w-full">
            <defs>
              <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(87,200,232,.08)" /></pattern>
            </defs>
            <rect width="760" height="420" fill="url(#g)" rx="12" />
            <rect x="20" y="180" width="720" height="60" rx="8" fill="rgba(143,169,182,.07)" stroke="rgba(143,169,182,.25)" strokeDasharray="4 4" />
            <text x="380" y="215" textAnchor="middle" fill="#8FA9B6" fontSize="14" fontFamily="IBM Plex Mono">CORRIDOR</text>
            {SLOTS.map((s, i) => {
              const room = ds.rooms[i]
              if (!room) {
                return (
                  <g key={i}>
                    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="12" fill="rgba(12,37,50,.4)" stroke="rgba(143,169,182,.3)" strokeDasharray="6 6" />
                    <text x={s.x + s.w / 2} y={s.y + s.h / 2 - 4} textAnchor="middle" fill="#8FA9B6" fontSize="16">No room data</text>
                    <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 16} textAnchor="middle" fill="#8FA9B6" fontSize="13">Import a CSV to fill this slot</text>
                  </g>
                )
              }
              const st = stat(room.id)
              const m = st.status ? STATUS_META[st.status] : null
              const active = room.id === selectedRoom
              return (
                <g
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${room.label}: ${st.n ? `${fmt(st.mean)} micrograms per cubic metre, ${m?.short}` : 'no data in this window'}`}
                  onClick={() => setSelectedRoom(room.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRoom(room.id) } }}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="12" fill={m ? `${m.color}${active ? '33' : '1c'}` : 'rgba(12,37,50,.6)'} stroke={active ? '#F7FBFD' : m?.color ?? '#8FA9B6'} strokeWidth={active ? 2.5 : 1.2} />
                  <text x={s.x + 14} y={s.y + 30} fill="#F7FBFD" fontSize="19" fontWeight="600" fontFamily="Space Grotesk Variable, sans-serif">{room.label}</text>
                  <text x={s.x + 14} y={s.y + 52} fill="#8FA9B6" fontSize="13.5">{room.role}</text>
                  <text x={s.x + 14} y={s.y + s.h - 44} fill={m?.color ?? '#8FA9B6'} fontSize="40" fontFamily="IBM Plex Mono, monospace">{st.n ? fmt(st.mean) : '—'}</text>
                  <text x={s.x + 14} y={s.y + s.h - 20} fill="#8FA9B6" fontSize="13" fontFamily="IBM Plex Mono, monospace">{st.n ? `µg/m³ · ${m?.symbol} ${m?.short}` : 'no readings'}</text>
                </g>
              )
            })}
          </svg>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate" aria-label="Legend">
            {(Object.keys(STATUS_META) as Status[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span style={{ color: STATUS_META[k].color }} aria-hidden>{STATUS_META[k].symbol}</span>{STATUS_META[k].short} <span className="mono">({STATUS_META[k].description})</span></span>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate">Illustrative layout, not the floorplan of any real school. Bands use the WHO 24-hour PM2.5 guideline (15 µg/m³) and interim target 3 (37.5 µg/m³) as <em>reference</em> levels. WHO guidelines address ambient air; they are used here only as a familiar yardstick for indoor readings.</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-semibold">{selMeta?.label ?? 'No room'}</h3>
                <p className="text-xs text-slate">{selMeta?.role}</p>
              </div>
              {sel?.status && <StatusPill status={sel.status} value={sel.summary.mean} />}
            </div>
            {sel && sel.summary.n > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Mean PM2.5" value={fmt(sel.summary.mean)} unit="µg/m³" tone={sel.status ? STATUS_META[sel.status].color : undefined} />
                <Stat label="95th percentile" value={fmt(sel.summary.p95)} unit="µg/m³" />
                <Stat label="Maximum" value={fmt(sel.summary.max)} unit="µg/m³" />
                <Stat label="Outdoor mean" value={fmt(sel.outdoorMean)} unit="µg/m³" hint="Same hours" />
                <Stat label="Relative humidity" value={fmt(sel.rhMean, 0)} unit="%" hint="Affects optical sensors" />
                <Stat label="Readings" value={sel.summary.n} hint={win === 'latest' ? 'Latest school day' : win === 'week' ? 'Last 7 days' : 'Full dataset'} />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-slate" role="status">No readings for this room in the selected window.</div>
            )}
            {sel?.co2 && (
              <p className="mt-3 text-xs leading-relaxed text-slate"><strong className="text-ice">CO2 (separate metric):</strong> mean <span className="mono">{fmt(sel.co2.mean, 0)}</span> ppm, 95th percentile <span className="mono">{fmt(sel.co2.p95, 0)}</span> ppm. CO2 reflects ventilation and occupancy. It is not a proxy for PM2.5, and portable HEPA filtration does not remove it.</p>
            )}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
              <span><strong className="text-ice">Source:</strong> {label}</span>
              {sel?.latest && <span><strong className="text-ice">Latest reading:</strong> <span className="mono">{formatTime(ds, sel.latest.t)}</span></span>}
              <span><strong className="text-ice">Window:</strong> <span className="mono">{formatTime(ds, from, false)} → {formatTime(ds, to - 1, false)}</span></span>
            </p>
          </div>
        </div>
      </div>

      <div className="panel mt-5 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">PM2.5 history · {selMeta?.label}</h3>
          <label className="flex items-center gap-2 text-sm text-slate"><input type="checkbox" checked={showOutdoor} onChange={(e) => setShowOutdoor(e.target.checked)} /> Show outdoor reference</label>
        </div>
        {series.length ? (
          <div className="h-[300px] w-full" role="img" aria-label={`Line chart of hourly PM2.5 for ${selMeta?.label} with the WHO 24-hour reference of 15 micrograms per cubic metre`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(143,169,182,.12)" vertical={false} />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(t) => (to - from <= 2 * DAY ? `${String(new Date(t as number).getHours()).padStart(2, '0')}:00` : formatTime(ds, t as number, false).replace('Demo day ', 'D'))} minTickGap={36} stroke="rgba(143,169,182,.4)" />
                <YAxis stroke="rgba(143,169,182,.4)" width={42} unit="" label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: '#8FA9B6', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0C2532', border: '1px solid rgba(143,169,182,.3)', borderRadius: 12, color: '#F7FBFD', fontFamily: 'IBM Plex Mono', fontSize: 12 }} labelFormatter={(t) => formatTime(ds, t as number)} formatter={(v, n) => [`${Number(v).toFixed(1)} µg/m³`, n === 'pm' ? 'Indoor PM2.5' : 'Outdoor PM2.5']} />
                <ReferenceLine y={WHO_GUIDELINE.daily} stroke="#F5BD67" strokeDasharray="5 4" label={{ value: 'WHO 24-h reference 15', fill: '#F5BD67', fontSize: 10, position: 'insideTopRight' }} />
                {ds.interventionAt != null && ds.interventionAt >= from && ds.interventionAt <= to && <ReferenceLine x={ds.interventionAt} stroke="#16D6BC" label={{ value: 'intervention start', fill: '#16D6BC', fontSize: 10, position: 'insideTopLeft' }} />}
                {showOutdoor && <Line type="monotone" dataKey="out" stroke="#8FA9B6" strokeWidth={1.2} dot={false} strokeDasharray="3 3" isAnimationActive={false} connectNulls />}
                <Line type="monotone" dataKey="pm" stroke="#57C8E8" strokeWidth={1.8} dot={false} isAnimationActive={!reduced} animationDuration={700} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="grid h-40 place-items-center text-sm text-slate" role="status">No data to chart in this window.</div>}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-slate hover:text-teal">View as a table</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--line)]">
            <table className="mono w-full text-xs">
              <caption className="sr-only">Daily PM2.5 summary for {selMeta?.label}</caption>
              <thead className="sticky top-0 bg-[#0a1d2a] text-left text-slate"><tr><th className="p-2">Day</th><th>n</th><th>Mean</th><th>P95</th><th>Max</th></tr></thead>
              <tbody>{dailyTable.map((d) => (<tr key={d.k} className="border-t border-[var(--line)]"><td className="p-2">{formatTime(ds, d.k, false)}</td><td>{d.s.n}</td><td>{fmt(d.s.mean)}</td><td>{fmt(d.s.p95)}</td><td>{fmt(d.s.max)}</td></tr>))}</tbody>
            </table>
          </div>
        </details>
      </div>

      {/* import */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><FileUp size={18} className="text-teal" aria-hidden /> Bring your own readings</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate">Import a CSV from a logger you own. It is read and validated entirely in your browser and is never uploaded. There is no live sensor connection in this prototype.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={15} aria-hidden /> Choose CSV file</button>
            <button className="btn btn-ghost btn-sm" onClick={() => download('airshift-measurement-template.csv', TEMPLATE_CSV, 'text/csv;charset=utf-8')}>Download template</button>
            {ds.source === 'import' && <button className="btn btn-ghost btn-sm" onClick={resetDataset}><RotateCcw size={15} aria-hidden /> Back to demo data</button>}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Choose a CSV file" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <p className="mt-3 text-xs text-slate">Required columns: <span className="mono">timestamp, room_id, pm25_ugm3</span>. Optional: <span className="mono">outdoor_pm25_ugm3, rh_pct, co2_ppm, notes</span>. Files containing name-like columns are rejected: no student-identifiable information is accepted.</p>
        </div>
        <div className="panel p-5" aria-live="polite">
          <h3 className="text-lg font-semibold">Import check</h3>
          {!pending ? (
            <p className="mt-2 text-sm text-slate">No file selected yet. Choose a CSV to see validation results here.</p>
          ) : (
            <div className="mt-2 text-sm">
              <p className="mono text-xs text-slate">{pending.name}</p>
              <p className="mt-1" style={{ color: pending.result.ok ? '#16D6BC' : '#EF7479' }}>
                {pending.result.ok ? `Valid: ${pending.result.rowsAccepted} of ${pending.result.rowsRead} rows accepted` : 'Not importable'}
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                {pending.result.issues.map((i, k) => (
                  <li key={k} style={{ color: i.level === 'error' ? '#EF7479' : '#F5BD67' }}>{i.row ? `Row ${i.row}: ` : ''}{i.message}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary btn-sm" disabled={!pending.result.ok} onClick={accept}>Use this data</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPending(null)}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4"><Callout title="Honest limits">Low-cost optical sensors can read high or low in humid air or with unusual dust. Room-to-room differences in this demo are synthetic. In the pilot, devices would be compared side by side before use, and any bias noted next to the numbers.</Callout></div>
    </Section>
  )
}
