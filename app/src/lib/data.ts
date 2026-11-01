/**
 * AIRSHIFT — datasets, statistics and evidence calculations.
 *
 * The demonstration dataset is SYNTHETIC. It is generated here from the same illustrative
 * mass-balance model used in the Air Lab plus random noise. It exists to show how the
 * dashboards behave. It is not a measurement of any real room, and it does not show that
 * any intervention has worked.
 */
import { ASSUMPTIONS, statusOf, steadyState, type Status } from './model'

export interface Reading {
  t: number // epoch ms (local clock time of the room)
  room: string
  pm25: number // µg/m³
  outdoor?: number // µg/m³
  rh?: number // %
  co2?: number // ppm (separate metric)
}

export interface RoomMeta {
  id: string
  label: string
  role: string
}

export interface Dataset {
  source: 'synthetic' | 'import'
  label: string
  rooms: RoomMeta[]
  readings: Reading[]
  interventionAt: number | null
  treatedRoom: string | null
  comparisonRoom: string | null
  tMin: number
  tMax: number
  anchor: number
}

const HOUR = 3600_000
const DAY = 24 * HOUR

/* ----------------------------- RNG ----------------------------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rng: () => number) {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/* --------------------------- time helpers --------------------------- */

export const isSchoolHour = (t: number) => {
  const d = new Date(t)
  const dow = d.getDay()
  const h = d.getHours()
  return dow >= 1 && dow <= 5 && h >= 7 && h < 15
}

export const startOfDay = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function formatTime(ds: Dataset, t: number, withHour = true): string {
  const h = String(new Date(t).getHours()).padStart(2, '0')
  if (ds.source === 'synthetic') {
    const day = Math.round((startOfDay(t) - ds.anchor) / DAY) + 1
    return withHour ? `Demo day ${day} · ${h}:00` : `Demo day ${day}`
  }
  const d = new Date(t)
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  return withHour ? `${date} · ${h}:${String(d.getMinutes()).padStart(2, '0')}` : date
}

/* ------------------------- synthetic generator ------------------------- */

interface SynthRoom extends RoomMeta {
  volume: number
  achOcc: number
  achVac: number
  source: number
  occupants: number
  treated?: boolean
}

const SYNTH_ROOMS: SynthRoom[] = [
  { id: 'A', label: 'Classroom A', role: 'Pilot candidate', volume: 126, achOcc: 2.2, achVac: 0.5, source: 1500, occupants: 24, treated: true },
  { id: 'B', label: 'Classroom B', role: 'Comparison room', volume: 126, achOcc: 2.2, achVac: 0.5, source: 1500, occupants: 24 },
  { id: 'LAB', label: 'Science lab', role: 'Demo room', volume: 160, achOcc: 3.0, achVac: 0.8, source: 1200, occupants: 20 },
  { id: 'LIB', label: 'Library', role: 'Demo room', volume: 300, achOcc: 1.8, achVac: 0.5, source: 450, occupants: 12 },
  { id: 'ENT', label: 'Entrance corridor', role: 'High foot traffic', volume: 200, achOcc: 3.5, achVac: 1.5, source: 3600, occupants: 0 },
]

export const SYNTH_INTERVENTION_DAY = 15 // demo day on which the treated room's air cleaners start
export const SYNTH_DAYS = 29
export const SYNTH_TREATED_CADR = 700

export function buildSyntheticDataset(seed = 20261105): Dataset {
  const rng = mulberry32(seed)
  const anchor = new Date(2000, 0, 3, 0, 0, 0, 0).getTime() // a Monday; year 2000 marks the data as non-real
  const totalHours = SYNTH_DAYS * 24

  // Outdoor PM2.5: diurnal swing + slow weather + a dust episode on demo days 17–19 (after the intervention)
  const outdoor: number[] = []
  let walk = 0
  for (let h = 0; h < totalHours; h++) {
    const day = Math.floor(h / 24) + 1
    const hod = h % 24
    walk = walk * 0.985 + gauss(rng) * 0.9
    let base = 31 + 7 * Math.sin(((hod - 9) / 24) * 2 * Math.PI) + walk
    if (day >= 17 && day <= 19) base *= 1.7 + 0.25 * Math.sin(((h - 16 * 24) / 72) * Math.PI)
    if (day >= 3 && day <= 4) base *= 1.25
    outdoor.push(Math.max(4, base * (1 + gauss(rng) * 0.05)))
  }

  const readings: Reading[] = []
  for (const r of SYNTH_ROOMS) {
    let C = outdoor[0] * 0.5
    let co2 = ASSUMPTIONS.co2Outdoor + 20
    let dayFactor = 1
    for (let h = 0; h < totalHours; h++) {
      const t = anchor + h * HOUR
      const day = Math.floor(h / 24) + 1
      const hod = h % 24
      const occupied = isSchoolHour(t)
      const ach = occupied ? r.achOcc : r.achVac
      // cleaners run continuously once installed (from the start of the intervention day)
      const cadr = r.treated && day >= SYNTH_INTERVENTION_DAY ? SYNTH_TREATED_CADR : 0
      if (hod === 0) dayFactor = 0.75 + 0.5 * rng()
      const dailyFactor = dayFactor
      const cleaning = occupied && hod === 14 && r.source > 0 ? 3 : 1 // end-of-day cleaning pulse
      const S = occupied ? r.source * dailyFactor * cleaning : r.source * 0.1
      const input = { volume: r.volume, ach, outdoor: outdoor[h], sourceUgPerH: S, cadrM3h: cadr }
      const Css = steadyState(input)
      const lam = ach + ASSUMPTIONS.deposition + (ASSUMPTIONS.filterEfficiency * cadr) / r.volume
      C = Css + (C - Css) * Math.exp(-lam)
      const pm = Math.max(1, C * Math.exp(gauss(rng) * 0.07))

      const occ = occupied ? r.occupants : 0
      const q = (Math.max(ach, 0.1) * r.volume) / 3600
      const g = (occ * ASSUMPTIONS.co2PerPersonLs) / 1000
      const co2ss = ASSUMPTIONS.co2Outdoor + (g / q) * 1e6
      co2 = co2ss + (co2 - co2ss) * Math.exp(-Math.max(ach, 0.1))
      const rh = 46 + 11 * Math.sin(((hod - 4) / 24) * 2 * Math.PI) + gauss(rng) * 2 - (day >= 17 && day <= 19 ? 8 : 0)

      readings.push({
        t,
        room: r.id,
        pm25: Math.round(pm * 10) / 10,
        outdoor: Math.round(outdoor[h] * 10) / 10,
        rh: Math.round(rh * 10) / 10,
        co2: Math.round(co2 + gauss(rng) * 12),
      })
    }
  }

  return finalize({
    source: 'synthetic',
    label: 'Synthetic demonstration data',
    rooms: SYNTH_ROOMS.map(({ id, label, role }) => ({ id, label, role })),
    readings,
    interventionAt: anchor + (SYNTH_INTERVENTION_DAY - 1) * DAY,
    treatedRoom: 'A',
    comparisonRoom: 'B',
    anchor,
  })
}

export function finalize(d: Omit<Dataset, 'tMin' | 'tMax'>): Dataset {
  let tMin = Infinity
  let tMax = -Infinity
  for (const r of d.readings) {
    if (r.t < tMin) tMin = r.t
    if (r.t > tMax) tMax = r.t
  }
  return { ...d, tMin, tMax }
}

/* ----------------------------- statistics ----------------------------- */

export interface Summary {
  n: number
  mean: number
  median: number
  sd: number
  p95: number
  min: number
  max: number
  q1: number
  q3: number
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export const mean = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN)

export function summarize(values: number[]): Summary {
  const s = [...values].sort((a, b) => a - b)
  const m = mean(s)
  const sd = s.length > 1 ? Math.sqrt(s.reduce((a, x) => a + (x - m) ** 2, 0) / (s.length - 1)) : NaN
  return {
    n: s.length,
    mean: m,
    median: quantile(s, 0.5),
    sd,
    p95: quantile(s, 0.95),
    min: s[0] ?? NaN,
    max: s[s.length - 1] ?? NaN,
    q1: quantile(s, 0.25),
    q3: quantile(s, 0.75),
  }
}

export const pctChange = (before: number, after: number) => (before ? (after - before) / before : NaN)

export function roomSeries(ds: Dataset, room: string): Reading[] {
  return ds.readings.filter((r) => r.room === room).sort((a, b) => a.t - b.t)
}

export interface RoomWindowStats {
  room: string
  summary: Summary
  status: Status | null
  latest: Reading | null
  outdoorMean: number
  rhMean: number
  co2: Summary | null
}

export function roomWindowStats(ds: Dataset, room: string, from: number, to: number, schoolHoursOnly: boolean): RoomWindowStats {
  const rs = roomSeries(ds, room).filter((r) => r.t >= from && r.t < to && (!schoolHoursOnly || isSchoolHour(r.t)))
  const summary = summarize(rs.map((r) => r.pm25))
  const outd = rs.filter((r) => r.outdoor != null).map((r) => r.outdoor as number)
  const rh = rs.filter((r) => r.rh != null).map((r) => r.rh as number)
  const co2 = rs.filter((r) => r.co2 != null).map((r) => r.co2 as number)
  return {
    room,
    summary,
    status: summary.n ? statusOf(summary.mean) : null,
    latest: rs.length ? rs[rs.length - 1] : null,
    outdoorMean: mean(outd),
    rhMean: mean(rh),
    co2: co2.length ? summarize(co2) : null,
  }
}

/* ----------------------------- evidence ----------------------------- */

export interface Warning {
  level: 'warn' | 'info'
  title: string
  detail: string
}

export interface PhaseStats {
  label: string
  from: number
  to: number
  summary: Summary
  dailyMeans: { day: number; label: string; value: number }[]
  schoolDays: number
  completeness: number
  outdoorMean: number
  rhMean: number
  co2Mean: number
  ioRatio: number
  hourProfile: { hour: number; value: number }[]
}

export interface EvidenceResult {
  room: string
  before: PhaseStats
  after: PhaseStats
  pct: number
  pctCi: [number, number]
  ratioPct: number
  comparison: null | { room: string; ratioPct: number; rawPct: number; adjustedVsComparisonPct: number }
  warnings: Warning[]
  ready: boolean
}

function phase(ds: Dataset, room: string, label: string, from: number, to: number): PhaseStats {
  const all = roomSeries(ds, room).filter((r) => r.t >= from && r.t < to)
  const school = all.filter((r) => isSchoolHour(r.t))
  const byDay = new Map<number, number[]>()
  for (const r of school) {
    const k = startOfDay(r.t)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(r.pm25)
  }
  const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]).filter(([, v]) => v.length >= 4)
  let weekdays = 0
  for (let t = startOfDay(from); t < to; t += DAY) {
    const d = new Date(t).getDay()
    if (d >= 1 && d <= 5) weekdays++
  }
  const paired = school.filter((r) => r.outdoor != null)
  const io = paired.length ? mean(paired.map((r) => r.pm25)) / mean(paired.map((r) => r.outdoor as number)) : NaN
  const profile: { hour: number; value: number }[] = []
  for (let h = 7; h < 15; h++) {
    const v = school.filter((r) => new Date(r.t).getHours() === h).map((r) => r.pm25)
    profile.push({ hour: h, value: mean(v) })
  }
  return {
    label,
    from,
    to,
    summary: summarize(school.map((r) => r.pm25)),
    dailyMeans: days.map(([k, v], i) => ({ day: i + 1, label: formatTime(ds, k, false), value: mean(v) })),
    schoolDays: days.length,
    completeness: weekdays ? school.length / (weekdays * 8) : 0,
    outdoorMean: mean(paired.map((r) => r.outdoor as number)),
    rhMean: mean(school.filter((r) => r.rh != null).map((r) => r.rh as number)),
    co2Mean: mean(school.filter((r) => r.co2 != null).map((r) => r.co2 as number)),
    ioRatio: io,
    hourProfile: profile,
  }
}

function bootstrapPct(before: number[], after: number[], seed = 11, iters = 2000): [number, number] {
  if (before.length < 3 || after.length < 3) return [NaN, NaN]
  const rng = mulberry32(seed)
  const res: number[] = []
  for (let i = 0; i < iters; i++) {
    const b = mean(Array.from({ length: before.length }, () => before[Math.floor(rng() * before.length)]))
    const a = mean(Array.from({ length: after.length }, () => after[Math.floor(rng() * after.length)]))
    res.push(pctChange(b, a))
  }
  res.sort((x, y) => x - y)
  return [quantile(res, 0.025), quantile(res, 0.975)]
}

function longestRun(vals: number[]) {
  let best = 1
  let cur = 1
  for (let i = 1; i < vals.length; i++) {
    cur = vals[i] === vals[i - 1] ? cur + 1 : 1
    if (cur > best) best = cur
  }
  return vals.length ? best : 0
}

export const WINDOW_DAYS = 14

export function computeEvidence(ds: Dataset, room: string, interventionAt: number | null): EvidenceResult | null {
  if (interventionAt == null) return null
  const d0 = startOfDay(interventionAt)
  const bFrom = Math.max(ds.tMin, d0 - WINDOW_DAYS * DAY)
  const aFrom = d0 + DAY // the intervention day itself is excluded as a transition (washout) day
  const aTo = Math.min(ds.tMax + HOUR, aFrom + WINDOW_DAYS * DAY)
  const before = phase(ds, room, 'Before', bFrom, d0)
  const after = phase(ds, room, 'After', aFrom, aTo)
  const ready = before.summary.n > 0 && after.summary.n > 0
  const pct = pctChange(before.summary.mean, after.summary.mean)
  const pctCi = bootstrapPct(before.dailyMeans.map((d) => d.value), after.dailyMeans.map((d) => d.value))
  const ratioPct = pctChange(before.ioRatio, after.ioRatio)

  let comparison: EvidenceResult['comparison'] = null
  const cmp = ds.comparisonRoom && ds.comparisonRoom !== room ? ds.comparisonRoom : null
  if (cmp) {
    const cb = phase(ds, cmp, 'Before', bFrom, d0)
    const ca = phase(ds, cmp, 'After', aFrom, aTo)
    if (cb.summary.n && ca.summary.n) {
      const cr = pctChange(cb.ioRatio, ca.ioRatio)
      comparison = {
        room: cmp,
        ratioPct: cr,
        rawPct: pctChange(cb.summary.mean, ca.summary.mean),
        adjustedVsComparisonPct: Number.isFinite(ratioPct) && Number.isFinite(cr) ? (1 + ratioPct) / (1 + cr) - 1 : NaN,
      }
    }
  }

  const warnings: Warning[] = []
  if (ds.source === 'synthetic') {
    warnings.push({ level: 'info', title: 'Simulated data', detail: 'These readings are generated for demonstration. They do not describe any real room and are not evidence that an intervention works.' })
  }
  for (const p of [before, after]) {
    if (p.summary.n === 0) {
      warnings.push({ level: 'warn', title: `${p.label}: no school-hour readings`, detail: 'Nothing falls inside this window for the selected room.' })
      continue
    }
    if (p.completeness < 0.9) warnings.push({ level: 'warn', title: `${p.label}: incomplete coverage`, detail: `Only ${(p.completeness * 100).toFixed(0)}% of expected school-hour readings are present (target ≥ 90%).` })
    if (p.schoolDays < 5) warnings.push({ level: 'warn', title: `${p.label}: short window`, detail: `${p.schoolDays} school days with usable data. Aim for at least 5, ideally 10.` })
    if (Number.isFinite(p.rhMean) && p.rhMean >= 70) warnings.push({ level: 'warn', title: `${p.label}: high humidity`, detail: `Mean RH ${p.rhMean.toFixed(0)}%. Optical low-cost sensors can over-read in humid air.` })
  }
  if (ready) {
    if (Number.isFinite(before.outdoorMean) && Number.isFinite(after.outdoorMean)) {
      const oc = pctChange(before.outdoorMean, after.outdoorMean)
      if (Math.abs(oc) > 0.25) warnings.push({ level: 'warn', title: 'Outdoor conditions differ between windows', detail: `Outdoor PM2.5 changed by ${(oc * 100).toFixed(0)}%. Raw indoor change is confounded; use the indoor/outdoor ratio and the comparison room.` })
    } else {
      warnings.push({ level: 'warn', title: 'No outdoor reference', detail: 'Without outdoor PM2.5 for the same hours, changes in weather cannot be separated from the intervention.' })
    }
    if (Number.isFinite(before.rhMean) && Number.isFinite(after.rhMean) && Math.abs(before.rhMean - after.rhMean) > 15) {
      warnings.push({ level: 'warn', title: 'Humidity differs between windows', detail: `Mean RH shifted by ${Math.abs(after.rhMean - before.rhMean).toFixed(0)} percentage points, which can affect sensor readings.` })
    }
    if (Number.isFinite(before.co2Mean) && Number.isFinite(after.co2Mean) && Math.abs(pctChange(before.co2Mean, after.co2Mean)) > 0.2) {
      warnings.push({ level: 'warn', title: 'Occupancy or ventilation differs', detail: 'CO2 differs by more than 20% between windows, suggesting different occupancy or ventilation. CO2 is a separate metric and is unaffected by HEPA filtration.' })
    }
    if (comparison && Number.isFinite(comparison.ratioPct) && Math.abs(comparison.ratioPct) > 0.15) {
      warnings.push({ level: 'warn', title: 'Comparison room also changed', detail: `The untreated room's indoor/outdoor ratio moved ${(comparison.ratioPct * 100).toFixed(0)}%, so not all of the treated room's change can be attributed to the intervention.` })
    }
  }
  const room_series = roomSeries(ds, room)
  if (longestRun(room_series.map((r) => r.pm25)) >= 12) warnings.push({ level: 'warn', title: 'Possible stuck sensor', detail: 'Twelve or more consecutive identical values were found. Check the device.' })
  if (room_series.some((r) => r.pm25 > 500)) warnings.push({ level: 'warn', title: 'Very high readings', detail: 'Values above 500 µg/m³ exceed the usual range of low-cost sensors and may be unreliable.' })
  warnings.push({ level: 'info', title: 'Sensor accuracy not verified', detail: 'Low-cost PM sensors are not collocated against a reference monitor here, so absolute values carry unknown bias. Relative before/after comparisons on the same device are more reliable than absolute levels.' })
  warnings.push({ level: 'info', title: 'PM2.5 is not a health outcome', detail: 'A lower PM2.5 reading does not by itself demonstrate better health. AIRSHIFT makes no medical or health-risk claims.' })

  return { room, before, after, pct, pctCi, ratioPct, comparison, warnings, ready }
}
