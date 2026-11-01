import { finalize, startOfDay, type Dataset, type Reading, type RoomMeta } from './data'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_ROWS = 200_000

export const CSV_HEADER = ['timestamp', 'room_id', 'pm25_ugm3', 'outdoor_pm25_ugm3', 'rh_pct', 'co2_ppm', 'notes']

export const TEMPLATE_CSV =
  CSV_HEADER.join(',') +
  '\n' +
  [
    '# Lines starting with # are ignored. Replace the format hints below with your own readings.',
    '# Format: YYYY-MM-DDTHH:MM, short room code, PM2.5 in ug/m3, outdoor PM2.5 (optional), RH % (optional), CO2 ppm (optional), notes (optional)',
    '# Do not include names or anything that identifies students or staff.',
  ].join('\n') +
  '\n'

export const OBSERVATION_LOG_CSV =
  ['date', 'room_id', 'time_window', 'occupancy_count', 'windows_open', 'door_open_events', 'hvac_state', 'cleaning_activity', 'air_cleaner_on', 'fan_speed', 'outdoor_conditions', 'notes'].join(',') +
  '\n# Do not record names or any information that identifies students or staff.\n'

export interface ParseIssue {
  row: number
  message: string
  level: 'error' | 'warning'
}

export interface ParseResult {
  ok: boolean
  dataset: Dataset | null
  issues: ParseIssue[]
  rowsRead: number
  rowsAccepted: number
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === delim) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const PERSONAL = /(name|student|pupil|email|e-mail|phone|mobile|emirates.?id|passport|dob|birth)/i

export function parseCsv(text: string, label: string): ParseResult {
  const issues: ParseIssue[] = []
  const fail = (message: string, row = 0): ParseResult => {
    issues.push({ row, message, level: 'error' })
    return { ok: false, dataset: null, issues, rowsRead: 0, rowsAccepted: 0 }
  }
  const clean = text.replace(/^﻿/, '')
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.trim().startsWith('#'))
  if (lines.length < 2) return fail('The file needs a header row and at least one data row.')
  const delim = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ','
  const header = splitLine(lines[0], delim).map((h) => h.toLowerCase())
  const personal = header.filter((h) => PERSONAL.test(h))
  if (personal.length) return fail(`Column "${personal[0]}" looks like personal data. AIRSHIFT does not accept student-identifiable information. Remove it and try again.`, 1)
  const idx = (n: string) => header.indexOf(n)
  const iT = idx('timestamp')
  const iR = idx('room_id')
  const iP = idx('pm25_ugm3')
  const missing = [['timestamp', iT], ['room_id', iR], ['pm25_ugm3', iP]].filter(([, i]) => i === -1).map(([n]) => n)
  if (missing.length) return fail(`Missing required column(s): ${missing.join(', ')}. Expected: ${CSV_HEADER.join(', ')}.`, 1)
  const iO = idx('outdoor_pm25_ugm3')
  const iH = idx('rh_pct')
  const iC = idx('co2_ppm')

  const rows = lines.slice(1)
  if (rows.length > MAX_ROWS) return fail(`Too many rows (${rows.length}). The limit is ${MAX_ROWS}.`)

  const readings: Reading[] = []
  const seen = new Set<string>()
  let errors = 0
  const num = (s: string | undefined) => (s == null || s === '' ? undefined : Number(s))
  rows.forEach((line, k) => {
    const rowNo = k + 2
    const cells = splitLine(line, delim)
    const t = Date.parse(cells[iT])
    const room = cells[iR]
    const pm = Number(cells[iP])
    const bad = (m: string) => {
      errors++
      if (issues.length < 40) issues.push({ row: rowNo, message: m, level: 'error' })
    }
    if (!Number.isFinite(t)) return bad(`Unreadable timestamp "${cells[iT]}". Use ISO format such as 2026-11-10T08:00.`)
    if (!room || !/^[\w\-. ]{1,24}$/.test(room)) return bad(`room_id "${room ?? ''}" must be 1–24 letters, numbers, dashes or spaces.`)
    if (cells[iP] === '' || !Number.isFinite(pm)) return bad(`pm25_ugm3 "${cells[iP] ?? ''}" is not a number.`)
    if (pm < 0 || pm > 1000) return bad(`pm25_ugm3 ${pm} is outside the accepted range 0–1000 µg/m³.`)
    const o = iO >= 0 ? num(cells[iO]) : undefined
    const h = iH >= 0 ? num(cells[iH]) : undefined
    const c = iC >= 0 ? num(cells[iC]) : undefined
    if (o != null && (!Number.isFinite(o) || o < 0 || o > 1000)) return bad(`outdoor_pm25_ugm3 "${cells[iO]}" is invalid.`)
    if (h != null && (!Number.isFinite(h) || h < 0 || h > 100)) return bad(`rh_pct "${cells[iH]}" must be 0–100.`)
    if (c != null && (!Number.isFinite(c) || c < 250 || c > 10000)) return bad(`co2_ppm "${cells[iC]}" must be 250–10000.`)
    const key = `${room}|${t}`
    if (seen.has(key)) {
      if (issues.length < 40) issues.push({ row: rowNo, message: `Duplicate reading for ${room} at ${cells[iT]}; first one kept.`, level: 'warning' })
      return
    }
    seen.add(key)
    readings.push({ t, room, pm25: pm, outdoor: o, rh: h, co2: c })
  })

  if (!readings.length) {
    issues.push({ row: 0, message: 'No valid rows were found.', level: 'error' })
    return { ok: false, dataset: null, issues, rowsRead: rows.length, rowsAccepted: 0 }
  }
  if (errors > 0) {
    issues.push({ row: 0, message: `${errors} row(s) rejected. Fix them or import anyway with only the valid rows.`, level: 'warning' })
  }

  const roomIds = [...new Set(readings.map((r) => r.room))].sort()
  const rooms: RoomMeta[] = roomIds.map((id) => ({ id, label: id, role: 'Imported room' }))
  const dataset = finalize({
    source: 'import',
    label,
    rooms,
    readings,
    interventionAt: null,
    treatedRoom: roomIds[0] ?? null,
    comparisonRoom: roomIds.length > 1 ? roomIds[1] : null,
    anchor: startOfDay(Math.min(...readings.map((r) => r.t))),
  })
  return { ok: true, dataset, issues, rowsRead: rows.length, rowsAccepted: readings.length }
}

export function readingsToCsv(ds: Dataset): string {
  const tag = ds.source === 'synthetic' ? 'SIMULATED' : 'IMPORTED'
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (t: number) => {
    const d = new Date(t)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const lines = [[...CSV_HEADER, 'data_source'].join(',')]
  for (const r of [...ds.readings].sort((a, b) => a.t - b.t || a.room.localeCompare(b.room))) {
    lines.push([iso(r.t), r.room, r.pm25, r.outdoor ?? '', r.rh ?? '', r.co2 ?? '', '', tag].join(','))
  }
  return lines.join('\n') + '\n'
}

export function download(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
