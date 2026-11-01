/**
 * AIRSHIFT — illustrative physical model and planning calculations.
 *
 * Every number the prototype derives for the Air Lab and the Intervention Studio comes from
 * the functions in this file. The assumptions are listed in ASSUMPTIONS and shown in the UI.
 * None of this is a validated prediction for a specific classroom: the pilot would replace
 * the assumptions with measured values.
 */

export const WHO_GUIDELINE = {
  /** WHO global air quality guidelines 2021, PM2.5, µg/m³ */
  annual: 5,
  daily: 15,
  /** WHO 24-hour interim target 3, used here only as an "elevated" display band */
  interimTarget3Daily: 37.5,
} as const

export type Status = 'within' | 'above' | 'elevated'

export interface StatusMeta {
  label: string
  short: string
  color: string
  symbol: string
  description: string
}

export const STATUS_META: Record<Status, StatusMeta> = {
  within: {
    label: 'At or below the WHO 24-hour reference',
    short: 'Within reference',
    color: '#16D6BC',
    symbol: '●',
    description: '≤ 15 µg/m³',
  },
  above: {
    label: 'Above the WHO 24-hour reference',
    short: 'Above reference',
    color: '#F5BD67',
    symbol: '▲',
    description: '15 – 37.5 µg/m³',
  },
  elevated: {
    label: 'Elevated (above WHO interim target 3)',
    short: 'Elevated',
    color: '#EF7479',
    symbol: '◆',
    description: '> 37.5 µg/m³',
  },
}

export function statusOf(pm25: number): Status {
  if (pm25 <= WHO_GUIDELINE.daily) return 'within'
  if (pm25 <= WHO_GUIDELINE.interimTarget3Daily) return 'above'
  return 'elevated'
}

/* ------------------------------------------------------------------ */
/* Room geometry and portable-air-cleaner sizing                       */
/* ------------------------------------------------------------------ */

export interface RoomProfile {
  length: number // m
  width: number // m
  height: number // m
}

export const DEFAULT_ROOM: RoomProfile = { length: 7, width: 6, height: 3 }

export const roomArea = (r: RoomProfile) => r.length * r.width
export const roomVolume = (r: RoomProfile) => r.length * r.width * r.height

const CFM_TO_M3H = 1.69901
const SQFT_TO_M2 = 0.092903
const EPA_CEILING_M = 8 * 0.3048

/**
 * EPA "Guide to Air Cleaners in the Home": minimum CADR of 65 cfm per 100 ft² for 8-ft ceilings
 * (e.g. 130 cfm for 200 ft²). Converted to m³/h per m²: ≈ 11.9. Scaled up linearly for taller ceilings.
 * The EPA table is written for homes; we apply the same rule of thumb to a classroom as a starting point.
 */
export const EPA_CADR_PER_M2 = (65 * CFM_TO_M3H) / (100 * SQFT_TO_M2)

export function recommendedCadr(r: RoomProfile): number {
  return EPA_CADR_PER_M2 * roomArea(r) * Math.max(1, r.height / EPA_CEILING_M)
}

/* ------------------------------------------------------------------ */
/* Single-zone mass balance                                            */
/* ------------------------------------------------------------------ */

export const ASSUMPTIONS = {
  penetration: 0.8, // fraction of outdoor PM2.5 that gets indoors through the envelope (plausible range ≈ 0.6–1.0)
  deposition: 0.2, // 1/h, PM2.5 loss to surfaces (plausible range ≈ 0.1–0.4)
  filterEfficiency: 0.7, // real-world fraction of rated CADR delivered (placement, mixing, loading, fan speed)
  filterEfficiencyRange: [0.5, 0.85] as const,
  achUncertainty: [0.6, 1.6] as const, // multiplier applied to the assumed ventilation rate
  co2Outdoor: 420, // ppm
  co2PerPersonLs: 0.0042, // L/s of CO2 exhaled by a seated student (approximate)
  referenceUnit: { cadrM3h: 350, priceUsd: 260, filterSetUsd: 75 }, // planning figures, not supplier quotations
  smallUnit: { cadrM3h: 250, priceUsd: 200, filterSetUsd: 55 },
} as const

export interface MassBalanceInput {
  volume: number // m³
  ach: number // air changes per hour (outdoor air supply)
  outdoor: number // µg/m³
  sourceUgPerH: number // indoor emission rate, µg/h
  cadrM3h: number // total rated CADR of air cleaners in the room
  penetration?: number
  deposition?: number
  filterEfficiency?: number
}

/** Steady-state well-mixed concentration: (P·λv·Cout + S/V) / (λv + k + η·CADR/V) */
export function steadyState(i: MassBalanceInput): number {
  const P = i.penetration ?? ASSUMPTIONS.penetration
  const k = i.deposition ?? ASSUMPTIONS.deposition
  const eta = i.filterEfficiency ?? ASSUMPTIONS.filterEfficiency
  const a = (eta * i.cadrM3h) / i.volume
  return (P * i.ach * i.outdoor + i.sourceUgPerH / i.volume) / (i.ach + k + a)
}

/** First-order relaxation time constant in hours. */
export function timeConstantHours(i: MassBalanceInput): number {
  const k = i.deposition ?? ASSUMPTIONS.deposition
  const eta = i.filterEfficiency ?? ASSUMPTIONS.filterEfficiency
  return 1 / (i.ach + k + (eta * i.cadrM3h) / i.volume)
}

/** Equivalent extra air changes per hour supplied by the cleaner. */
export function cleanerAch(volume: number, cadrM3h: number, eta = ASSUMPTIONS.filterEfficiency) {
  return (eta * cadrM3h) / volume
}

/** Steady-state CO2 (ppm) for N seated occupants. Filtration does not change this value. */
export function co2SteadyState(volume: number, ach: number, occupants: number): number {
  const q = (ach * volume) / 3600 // m³/s of outdoor air
  if (q <= 0) return NaN
  const g = (occupants * ASSUMPTIONS.co2PerPersonLs) / 1000 // m³/s CO2
  return ASSUMPTIONS.co2Outdoor + (g / q) * 1e6
}

export type ZoneId = 'window' | 'door' | 'board' | 'back'

export interface ZoneMeta {
  id: ZoneId
  label: string
  note: string
  weight: number
}

/** Illustrative zone weights with mean 1.0. Not derived from CFD or measurement. */
export const ZONES: ZoneMeta[] = [
  { id: 'window', label: 'Window side', note: 'Closest to outdoor infiltration paths', weight: 1.16 },
  { id: 'door', label: 'Door side', note: 'Foot traffic and door openings', weight: 1.08 },
  { id: 'board', label: 'Board wall', note: 'Chalk or marker residue possible', weight: 1.0 },
  { id: 'back', label: 'Back of room', note: 'Furthest from entry and windows', weight: 0.76 },
]

/** Redistributes concentration across zones, keeping the mean equal to the mixed value. */
export function zoneConcentrations(mixed: number, unitZone: ZoneId | null): Record<ZoneId, number> {
  const raw = ZONES.map((z) => ({ id: z.id, w: z.weight * (unitZone === z.id ? 0.85 : 1) }))
  const mean = raw.reduce((s, z) => s + z.w, 0) / raw.length
  const out = {} as Record<ZoneId, number>
  raw.forEach((z) => (out[z.id] = (mixed * z.w) / mean))
  return out
}

export interface SourcePreset {
  id: string
  label: string
  ugPerH: number
  detail: string
}

export const SOURCE_PRESETS: SourcePreset[] = [
  { id: 'none', label: 'None', ugPerH: 0, detail: 'No indoor particle sources' },
  { id: 'light', label: 'Light', ugPerH: 800, detail: 'Normal walking, dry-erase use' },
  { id: 'moderate', label: 'Moderate', ugPerH: 2500, detail: 'Sweeping, dusty entry, chalk' },
  { id: 'heavy', label: 'Heavy', ugPerH: 6000, detail: 'Aerosol cleaning, heavy resuspension' },
]

export const OUTDOOR_PRESETS = [
  { id: 'clear', label: 'Clear', value: 12 },
  { id: 'hazy', label: 'Hazy', value: 40 },
  { id: 'dust', label: 'Dust event', value: 120 },
] as const

/* ------------------------------------------------------------------ */
/* Intervention Studio                                                  */
/* ------------------------------------------------------------------ */

export type BudgetTier = 500 | 1000 | 1500

export interface BudgetLine {
  id: string
  label: string
  amount: number
}

export interface BudgetScenario {
  total: BudgetTier
  scope: string
  monitors: number
  hepaUnits: number
  unitCadrM3h: number
  maxRooms: number
  lines: BudgetLine[]
  tradeoffs: string[]
}

export const BUDGETS: Record<BudgetTier, BudgetScenario> = {
  1500: {
    total: 1500,
    scope: 'Full pilot: two classrooms monitored, filtration in one or two rooms.',
    monitors: 2,
    hepaUnits: 2,
    unitCadrM3h: 350,
    maxRooms: 2,
    lines: [
      { id: 'monitor', label: 'Two particulate-monitoring devices', amount: 360 },
      { id: 'hepa', label: 'Appropriate portable HEPA filtration', amount: 520 },
      { id: 'filters', label: 'Replacement filters and maintenance', amount: 150 },
      { id: 'data', label: 'Data-logging and technical supplies', amount: 110 },
      { id: 'compare', label: 'Comparative measurement supplies', amount: 100 },
      { id: 'edu', label: 'Educational materials and outreach', amount: 90 },
      { id: 'contingency', label: 'Contingency', amount: 170 },
    ],
    tradeoffs: ['Two monitors allow a simultaneous comparison room.', 'Two cleaners can cover one room fully or two rooms partially.'],
  },
  1000: {
    total: 1000,
    scope: 'Focused pilot: one treated room plus one comparison room, lower-cost monitors.',
    monitors: 2,
    hepaUnits: 2,
    unitCadrM3h: 350,
    maxRooms: 1,
    lines: [
      { id: 'monitor', label: 'Two lower-cost particulate monitors', amount: 300 },
      { id: 'hepa', label: 'Appropriate portable HEPA filtration', amount: 520 },
      { id: 'filters', label: 'Replacement filters and maintenance', amount: 60 },
      { id: 'data', label: 'Data-logging and technical supplies', amount: 40 },
      { id: 'compare', label: 'Comparative measurement supplies', amount: 30 },
      { id: 'edu', label: 'Educational materials and outreach', amount: 20 },
      { id: 'contingency', label: 'Contingency', amount: 30 },
    ],
    tradeoffs: ['Treated room keeps full recommended coverage.', 'Thin contingency and a lighter outreach budget.'],
  },
  500: {
    total: 500,
    scope: 'Single-room demonstration: one monitor, one smaller air cleaner.',
    monitors: 1,
    hepaUnits: 1,
    unitCadrM3h: 250,
    maxRooms: 1,
    lines: [
      { id: 'monitor', label: 'One particulate-monitoring device', amount: 150 },
      { id: 'hepa', label: 'One smaller portable HEPA unit', amount: 200 },
      { id: 'filters', label: 'Replacement filters and maintenance', amount: 40 },
      { id: 'data', label: 'Data-logging and technical supplies', amount: 30 },
      { id: 'compare', label: 'Comparative measurement supplies', amount: 30 },
      { id: 'edu', label: 'Educational materials and outreach', amount: 20 },
      { id: 'contingency', label: 'Contingency', amount: 30 },
    ],
    tradeoffs: [
      'One monitor means no simultaneous comparison room; indoor and outdoor readings must be alternated.',
      'A single smaller unit will usually cover less than the recommended CADR in a full classroom.',
    ],
  },
}

export const budgetSum = (b: BudgetScenario) => b.lines.reduce((s, l) => s + l.amount, 0)

export type VentilationLevel = 'low' | 'moderate' | 'high'
export const VENTILATION: Record<VentilationLevel, { label: string; ach: number; detail: string }> = {
  low: { label: 'Low', ach: 1, detail: 'Mostly closed room, minimal outdoor air' },
  moderate: { label: 'Moderate', ach: 2, detail: 'Typical mechanical ventilation' },
  high: { label: 'High', ach: 4, detail: 'Strong outdoor-air supply or open windows' },
}

export interface Observations {
  visibleDust: boolean
  leakyEnvelope: boolean
  hvacUnknown: boolean
  aerosols: boolean
  stuffy: boolean
  dustyOutdoors: boolean
}

export const OBSERVATION_ITEMS: { key: keyof Observations; label: string; hint: string }[] = [
  { key: 'visibleDust', label: 'Visible dust on surfaces, or sand tracked in at entrances', hint: 'Source control and entry management' },
  { key: 'aerosols', label: 'Cleaning sprays, aerosols or chalk are used in the room', hint: 'Indoor particle sources' },
  { key: 'leakyEnvelope', label: 'Gaps around doors or windows, or doors are often propped open', hint: 'Outdoor dust infiltration' },
  { key: 'dustyOutdoors', label: 'Dusty outdoor episodes are frequent at the site', hint: 'Higher outdoor load' },
  { key: 'hvacUnknown', label: 'HVAC filter condition or maintenance history is unknown', hint: 'Facilities review needed' },
  { key: 'stuffy', label: 'The room often feels stuffy or crowded', hint: 'Possible high CO2 (a ventilation signal, not PM2.5)' },
]

export type OptionId = 'hepa' | 'source' | 'facilities'

export interface OptionEvaluation {
  id: OptionId
  title: string
  score: number
  reasons: string[]
  costUsd: [number, number]
  costNote: string
  requirements: string[]
  maintenance: string[]
  effect: string
  caution: string
}

export interface StudioInput {
  room: RoomProfile
  budget: BudgetTier
  roomsEquipped: 1 | 2
  ventilation: VentilationLevel
  observations: Observations
  baselineMean: number | null
}

export interface HepaPlan {
  unitsPerRoom: number
  totalCadrPerRoom: number
  recommended: number
  coverage: number
  rangePct: [number, number]
  centralPct: number
  neededUnits: number
  cadrNote: string
}

const roundTo5 = (x: number) => Math.round(x / 5) * 5

export function hepaPlan(input: StudioInput): HepaPlan {
  const b = BUDGETS[input.budget]
  const rooms = Math.min(input.roomsEquipped, b.maxRooms)
  const unitsPerRoom = Math.floor(b.hepaUnits / rooms)
  const total = unitsPerRoom * b.unitCadrM3h
  const rec = recommendedCadr(input.room)
  const V = roomVolume(input.room)
  const ach = VENTILATION[input.ventilation].ach
  const reduction = (eta: number, achMult: number) => {
    const a = (eta * total) / V
    return a / (ach * achMult + ASSUMPTIONS.deposition + a)
  }
  const [etaLo, etaHi] = ASSUMPTIONS.filterEfficiencyRange
  const [mLo, mHi] = ASSUMPTIONS.achUncertainty
  const lo = reduction(etaLo, mHi)
  const hi = reduction(etaHi, mLo)
  const mid = reduction(ASSUMPTIONS.filterEfficiency, 1)
  const needed = Math.ceil(rec / b.unitCadrM3h)
  return {
    unitsPerRoom,
    totalCadrPerRoom: total,
    recommended: rec,
    coverage: total / rec,
    rangePct: [roundTo5(lo * 100), roundTo5(hi * 100)],
    centralPct: roundTo5(mid * 100),
    neededUnits: needed,
    cadrNote:
      total >= rec
        ? 'Meets the EPA rule-of-thumb minimum CADR for this room.'
        : `Provides ${Math.round((total / rec) * 100)}% of the EPA rule-of-thumb minimum CADR; expect a smaller effect.`,
  }
}

export function evaluateOptions(input: StudioInput): { options: OptionEvaluation[]; hepa: HepaPlan; notes: string[] } {
  const o = input.observations
  const hepa = hepaPlan(input)
  const b = BUDGETS[input.budget]
  const notes: string[] = []

  let a = 2
  let s = 1
  let f = 1
  const ra: string[] = ['Targets particles regardless of where they come from.']
  const rs: string[] = ['Reduces particle generation or entry at the source, usually the lowest-cost lever.']
  const rf: string[] = ['A facilities-owned fix can serve the whole building if it is suitable.']

  if (o.dustyOutdoors) { a += 3; f += 1; ra.push('Frequent outdoor dust: filtering recirculated air helps without opening the room to more outdoor particles.'); rf.push('Upgrade filter grade only if the fan can still deliver design airflow.') }
  if (o.visibleDust) { s += 3; a += 1; rs.push('Visible dust or tracked-in sand points to entry and resuspension sources.') }
  if (o.aerosols) { s += 3; rs.push('Aerosols and chalk are controllable indoor sources.') }
  if (o.leakyEnvelope) { f += 2; a += 1; rf.push('Door and window gaps should be reviewed by facilities staff.'); ra.push('A cleaner offsets some infiltrated particles while seals are reviewed.') }
  if (o.hvacUnknown) { f += 3; rf.push('Unknown HVAC filter condition: a maintenance check is the first step.') }
  if (o.stuffy) {
    f += 2
    rf.push('Stuffiness may indicate high CO2. Ventilation addresses CO2; portable HEPA cleaners do not remove it.')
    notes.push('CO2 is a separate ventilation indicator. A HEPA cleaner will not lower it.')
  }
  if (input.ventilation === 'high' && o.dustyOutdoors) {
    f -= 1
    notes.push('With dusty outdoor air, adding more outdoor ventilation can raise indoor PM2.5 even as it lowers CO2. Balance both.')
  }
  if (input.baselineMean != null) {
    if (input.baselineMean <= WHO_GUIDELINE.daily) {
      a -= 2
      notes.push(`Your baseline (${input.baselineMean.toFixed(1)} µg/m³) is at or below the WHO 24-hour reference of 15 µg/m³. An intervention may not be warranted; consider continued monitoring.`)
    } else if (input.baselineMean > WHO_GUIDELINE.interimTarget3Daily) {
      a += 1
      notes.push(`Your baseline (${input.baselineMean.toFixed(1)} µg/m³) is above WHO interim target 3 for 24-hour means. Interventions are more clearly justified, subject to data-quality review.`)
    }
  } else {
    notes.push('No baseline entered. AIRSHIFT does not presume elevated PM2.5: enter a measured baseline to refine these rankings.')
  }

  const unitPrice = input.budget === 500 ? ASSUMPTIONS.smallUnit.priceUsd : ASSUMPTIONS.referenceUnit.priceUsd
  const filterSet = input.budget === 500 ? ASSUMPTIONS.smallUnit.filterSetUsd : ASSUMPTIONS.referenceUnit.filterSetUsd
  const hepaCost = hepa.unitsPerRoom * unitPrice

  const options: OptionEvaluation[] = [
    {
      id: 'hepa',
      title: 'Portable HEPA filtration',
      score: a,
      reasons: ra,
      costUsd: [hepaCost, hepaCost + hepa.unitsPerRoom * filterSet],
      costNote: `${hepa.unitsPerRoom} × reference unit (CADR ${b.unitCadrM3h} m³/h) per room; second figure includes one replacement filter set. Planning figures, not supplier quotations.`,
      requirements: [
        'School permission and a safe, unobstructed placement with a nearby power outlet',
        'True HEPA filter with an independently rated CADR; no ozone-emitting technology',
        'Qualified school staff review of placement and electrical safety',
        'Noise check at the intended fan speed',
      ],
      maintenance: ['Replace filters on the manufacturer schedule; dusty sites may need earlier replacement', 'Log fan speed and run hours so the verification phase knows the real operating conditions'],
      effect:
        hepa.rangePct[1] <= 0
          ? 'No modelled reduction.'
          : `Modelled steady-state reduction of roughly ${hepa.rangePct[0]}–${hepa.rangePct[1]}% under the assumptions listed (central ≈ ${hepa.centralPct}%).`,
      caution: 'A modelled range, not a prediction for your room. Measurement in the pilot decides.',
    },
    {
      id: 'source',
      title: 'Pollution-source reduction',
      score: s,
      reasons: rs,
      costUsd: [30, 120],
      costNote: 'Walk-off mats, damp-dusting supplies, door-management signage. Planning range.',
      requirements: [
        'Agreement from cleaning and facilities staff on routines',
        'Replace dry sweeping with damp wiping; avoid aerosol products during occupancy',
        'Entry management: mats, closed doors where safe',
      ],
      maintenance: ['Mats need regular cleaning', 'Routines must be repeated; effect fades if they lapse'],
      effect: 'Not quantified here. Effect depends on which sources dominate; measure before and after.',
      caution: 'Cheap and often effective, but unproven for a given room until measured.',
    },
    {
      id: 'facilities',
      title: 'Facilities-reviewed ventilation & filtration',
      score: f,
      reasons: rf,
      costUsd: [0, 0],
      costNote: 'Normally owned by school facilities, not purchased from the grant. Cost depends on the system.',
      requirements: [
        'Facilities staff or an HVAC professional assesses the system',
        'Filters sized and installed to manufacturer instructions',
        'Higher-grade filters only if airflow is not significantly reduced (CDC/NIOSH guidance)',
      ],
      maintenance: ['Scheduled filter changes', 'Periodic inspection of outdoor-air and exhaust settings'],
      effect: 'Not quantified here. Depends on the existing system and outdoor air quality.',
      caution: 'AIRSHIFT does not recommend changes to building systems; this is a request for expert review.',
    },
  ]

  options.sort((x, y) => y.score - x.score)
  return { options, hepa, notes }
}

export const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '—')
