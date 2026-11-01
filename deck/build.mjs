// Builds AIRSHIFT_YPL_Pitch_Deck.pptx (10 slides, 16:9, editable). Run: node build.mjs
import pptxgen from 'pptxgenjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUDGET_1500, MISSION, NOTES, PROBLEM_GLOBAL, PROBLEM_LOCAL } from './content.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const img = (n) => path.join(here, '..', 'screens', n)
const BG = path.join(here, 'assets', 'bg.png')

const C = { midnight: '071622', ocean: '0C2532', teal: '16D6BC', cyan: '57C8E8', mist: 'EAF7F6', ice: 'F7FBFD', slate: '8FA9B6', amber: 'F5BD67', coral: 'EF7479', soft: 'CFE3EA' }
const F = { display: 'Space Grotesk', body: 'Inter', mono: 'IBM Plex Mono' }

const pptx = new pptxgen()
pptx.layout = 'LAYOUT_WIDE' // 13.333 x 7.5 in
pptx.title = 'AIRSHIFT — YPL Changemaker Academy 2026 Vision to Action pitch deck'
pptx.author = 'May Ahmed Mourad'
pptx.company = 'ADNOC Schools Madinat Zayed (student project)'
pptx.subject = 'Vision to Action 2026'

const TOTAL = 10
const M = 0.6

function t(slide, text, x, y, w, h, o = {}) {
  slide.addText(text, { x, y, w, h, margin: 0, fontFace: F.body, fontSize: 12, color: C.soft, valign: 'top', ...o })
}
function card(slide, x, y, w, h, o = {}) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill ?? C.ocean, transparency: o.transparency ?? 12 }, line: { color: o.line ?? '27485A', width: o.lineWidth ?? 0.75 } })
}
function chip(slide, text, x, y, w, color = C.amber) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.28, rectRadius: 0.14, fill: { color, transparency: 88 }, line: { color, width: 0.75 } })
  t(slide, text, x, y, w, 0.28, { fontFace: F.mono, fontSize: 8.5, color, align: 'center', valign: 'middle', charSpacing: 1 })
}
function base(n, eyebrow, title, sources) {
  const s = pptx.addSlide()
  s.background = { path: BG }
  t(s, eyebrow.toUpperCase(), M, 0.42, 9, 0.3, { fontFace: F.mono, fontSize: 10.5, color: C.teal, charSpacing: 3 })
  t(s, title, M, 0.72, 12.1, 0.95, { fontFace: F.display, fontSize: 29, bold: true, color: C.ice, valign: 'top' })
  if (sources) t(s, sources, M, 6.86, 12.1, 0.3, { fontSize: 8, color: C.slate, valign: 'bottom' })
  t(s, 'AIRSHIFT  ·  YPL Changemaker Academy 2026  ·  May Ahmed Mourad', M, 7.2, 8, 0.2, { fontFace: F.mono, fontSize: 7.5, color: '5F7F8D' })
  t(s, `${String(n).padStart(2, '0')} / ${TOTAL}`, 11.2, 7.2, 1.53, 0.2, { fontFace: F.mono, fontSize: 7.5, color: C.slate, align: 'right' })
  s.addNotes(NOTES[n - 1])
  return s
}
const bullets = (items, o = {}) => items.map((x) => ({ text: x, options: { bullet: { indent: 11 }, breakLine: true, paraSpaceAfter: o.gap ?? 5 } }))

/* 1 — Vision */
{
  const s = pptx.addSlide()
  s.background = { path: BG }
  s.addNotes(NOTES[0])
  s.addImage({ path: img('03-airlab-on-canvas.png'), x: 7.0, y: 1.45, w: 5.7, h: 4.24 })
  s.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: 1.45, w: 5.7, h: 4.24, rectRadius: 0.1, fill: { color: C.midnight, transparency: 100 }, line: { color: C.teal, width: 1.25 } })
  t(s, 'Screenshot of the working prototype · Air Lab · simulated demonstration data', 7.0, 5.78, 5.7, 0.3, { fontFace: F.mono, fontSize: 8, color: C.slate })
  t(s, 'YOUNG PLANET LEADERS  ·  VISION TO ACTION 2026', M, 0.6, 8, 0.3, { fontFace: F.mono, fontSize: 10.5, color: C.teal, charSpacing: 3 })
  t(s, 'AIRSHIFT', M, 1.15, 6.2, 1.1, { fontFace: F.display, fontSize: 60, bold: true, color: C.ice })
  t(s, [{ text: 'What if you could ', options: {} }, { text: 'see', options: { color: C.teal } }, { text: ' the air you breathe?', options: {} }], M, 2.45, 6.1, 1.6, { fontFace: F.display, fontSize: 32, bold: true, color: C.ice })
  t(s, 'Making the Invisible Visible. Turning Awareness into Action.', M, 4.2, 6.0, 0.8, { fontFace: F.body, fontSize: 15, color: C.soft })
  const stages = [['DETECT', C.teal], ['DECIDE', C.cyan], ['VERIFY', C.amber], ['REPLICATE', C.mist]]
  stages.forEach(([name, col], i) => {
    t(s, name, M + i * 1.5, 5.2, 1.4, 0.3, { fontFace: F.mono, fontSize: 10.5, bold: true, color: col, charSpacing: 2 })
    if (i < 3) t(s, '→', M + i * 1.5 + 1.2, 5.18, 0.3, 0.3, { fontFace: F.mono, fontSize: 11, color: C.slate })
  })
  t(s, 'May Ahmed Mourad  ·  Grade 12  ·  ADNOC Schools Madinat Zayed, Al Dhafra, UAE  ·  Solo participant', M, 6.55, 9, 0.3, { fontFace: F.body, fontSize: 11, color: C.soft })
  t(s, 'A proposed student-led pilot, subject to school approval. Prototype uses simulated demonstration data.', M, 6.88, 11, 0.25, { fontSize: 9, color: C.slate })
  t(s, `01 / ${TOTAL}`, 11.2, 7.2, 1.53, 0.2, { fontFace: F.mono, fontSize: 7.5, color: C.slate, align: 'right' })
}

/* 2 — Global problem */
{
  const s = base(2, 'The global problem', 'Almost everyone breathes air above WHO guideline limits.', 'Sources: WHO, Air pollution (who.int/health-topics/air-pollution); WHO Global air quality guidelines 2021. Global and outdoor figures; they are not measurements of any classroom.')
  t(s, 'PROBLEM STATEMENT  ·  PART 1 OF 2', M, 1.85, 6.2, 0.25, { fontFace: F.mono, fontSize: 9, color: C.amber, charSpacing: 2 })
  t(s, PROBLEM_GLOBAL, M, 2.2, 6.25, 3.9, { fontSize: 12.5, color: C.ice, lineSpacingMultiple: 1.18 })
  card(s, M, 5.95, 6.25, 0.7, { line: C.amber, fill: C.amber, transparency: 90 })
  t(s, 'Outdoor and global ≠ indoor and local. That gap is the problem AIRSHIFT starts with.', M + 0.2, 5.95, 5.9, 0.7, { fontSize: 11, color: C.amber, valign: 'middle', bold: true })
  const stats = [['99%', 'of the world’s population breathe air that exceeds WHO guideline limits', 'WHO'], ['~7 million', 'premature deaths a year associated with ambient and household air pollution combined', 'WHO'], ['5 µg/m³', 'WHO 2021 annual guideline for PM2.5. Particles are smaller than 2.5 micrometres', 'WHO AQG 2021']]
  stats.forEach(([big, cap, src], i) => {
    const y = 1.85 + i * 1.62
    card(s, 7.2, y, 5.5, 1.48)
    t(s, big, 7.45, y + 0.12, 2.5, 1.2, { fontFace: F.mono, fontSize: big.length > 5 ? 26 : 38, bold: false, color: C.teal, valign: 'middle' })
    t(s, cap, 9.85, y + 0.15, 2.7, 1.0, { fontSize: 11, color: C.soft, valign: 'middle' })
    t(s, src, 9.85, y + 1.12, 2.7, 0.25, { fontFace: F.mono, fontSize: 8, color: C.slate })
  })
}

/* 3 — Local challenge */
{
  const s = base(3, 'The local challenge', 'The gap: no school can see its own air.', 'Sources: Alhebsi et al. 2025, ISPRS Archives XLVIII-4/W17 (doi 10.5194/isprs-archives-XLVIII-4-W17-2025-13-2026); IQAir UAE 2025 (national, outdoor, private provider).')
  t(s, 'PROBLEM STATEMENT  ·  PART 2 OF 2', M, 1.85, 6.2, 0.25, { fontFace: F.mono, fontSize: 9, color: C.amber, charSpacing: 2 })
  t(s, PROBLEM_LOCAL, M, 2.2, 6.25, 3.9, { fontSize: 12.5, color: C.ice, lineSpacingMultiple: 1.18 })
  t(s, '207 words across both parts (target: about 200)', M, 6.3, 6.2, 0.3, { fontFace: F.mono, fontSize: 8.5, color: C.slate })
  card(s, 7.2, 1.85, 5.5, 2.75)
  t(s, 'WHAT WE KNOW  ·  OUTDOOR, REGIONAL', 7.45, 2.0, 5.0, 0.25, { fontFace: F.mono, fontSize: 9, color: C.cyan, charSpacing: 2 })
  t(s, bullets(['Desert dust is a major natural particulate source in Abu Dhabi emirate (peer-reviewed monitoring study).', 'UAE annual outdoor PM2.5 in 2025: 36.4 µg/m³, 7.3× the WHO annual guideline (IQAir). National, not local.', 'In that study PM2.5 was generally under half of PM10, pointing to coarse natural dust rather than fine particles.'], { gap: 6 }), 7.45, 2.35, 5.0, 2.2, { fontSize: 11, color: C.soft })
  card(s, 7.2, 4.8, 5.5, 1.85, { line: C.amber, fill: C.amber, transparency: 92 })
  t(s, 'WHAT NOBODY KNOWS YET', 7.45, 4.95, 5.0, 0.25, { fontFace: F.mono, fontSize: 9, color: C.amber, charSpacing: 2 })
  t(s, 'Indoor PM2.5 in Madinat Zayed classrooms', 7.45, 5.28, 5.0, 0.6, { fontFace: F.display, fontSize: 19, bold: true, color: C.ice })
  t(s, 'Not measured. No baseline exists. The pilot measures first, and acts only if the data justifies it.', 7.45, 5.95, 5.0, 0.6, { fontSize: 11, color: C.soft })
}

/* 4 — Mission */
{
  const s = base(4, 'Our mission', 'See it. Fix it. Prove it. Share it.', 'Objectives are proposed targets for the pilot, not results.')
  card(s, M, 1.85, 12.1, 1.95, { fill: C.ocean, transparency: 5, line: C.teal, lineWidth: 1 })
  t(s, MISSION, M + 0.3, 1.85, 11.5, 1.95, { fontFace: F.display, fontSize: 17.5, color: C.ice, valign: 'middle', lineSpacingMultiple: 1.15 })
  const obj = [['01', 'Baseline', 'Document PM2.5 in one or two classrooms with dates, windows and sensor caveats.'], ['02', 'Test', 'Try one affordable, evidence-based intervention and verify its effect transparently.'], ['03', 'Share', 'Publish a toolkit another school can understand and reuse.']]
  obj.forEach(([n, h, d], i) => {
    const x = M + i * 4.07
    card(s, x, 3.98, 3.96, 1.2)
    t(s, n, x + 0.2, 4.1, 0.6, 0.35, { fontFace: F.mono, fontSize: 12, color: C.teal })
    t(s, h, x + 0.7, 4.07, 3.0, 0.35, { fontFace: F.display, fontSize: 15, bold: true, color: C.ice })
    t(s, d, x + 0.2, 4.5, 3.6, 0.65, { fontSize: 10.5, color: C.soft })
  })
  t(s, 'THEORY OF CHANGE', M, 5.36, 4, 0.25, { fontFace: F.mono, fontSize: 9, color: C.amber, charSpacing: 2 })
  const toc = [['Students measure', 'affordable monitors, matched windows'], ['Options compared', 'costs, maintenance, limits'], ['Effect verified', 'with outdoor air and a comparison room'], ['School decides', 'with evidence, not guesses'], ['Others replicate', 'free toolkit and templates']]
  toc.forEach(([a, b], i) => {
    const x = M + i * 2.46
    s.addShape(pptx.ShapeType.chevron, { x, y: 5.68, w: 2.4, h: 0.95, fill: { color: i % 2 ? C.ocean : '0F3042' }, line: { color: C.teal, width: 0.75 } })
    t(s, [{ text: a, options: { bold: true, color: C.ice, breakLine: true, fontFace: F.display, fontSize: 11 } }, { text: b, options: { fontSize: 8.5, color: C.slate } }], x + 0.62, 5.68, 1.45, 0.95, { valign: 'middle' })
  })
}

/* 5 — Solution */
{
  const s = base(5, 'The AIRSHIFT solution', 'Detect → Decide → Verify → Replicate', 'Intervention guidance: US EPA, Guide to Air Cleaners in the Home; US CDC/NIOSH, Ventilation in Schools and Childcare Programs.')
  const st = [
    ['01', 'DETECT', C.teal, 'Measure PM2.5 and record room conditions, sensor limitations and sampling times.', 'Documented baseline'],
    ['02', 'DECIDE', C.cyan, 'Compare source control, portable HEPA filtration and a facilities review, with costs and maintenance.', 'Site-specific action plan'],
    ['03', 'VERIFY', C.amber, 'Measure again under matched conditions. Report change with outdoor air and uncertainty.', 'Transparent impact summary'],
    ['04', 'REPLICATE', C.mist, 'Publish the method, templates, budget variants and lessons learned.', 'School implementation toolkit'],
  ]
  st.forEach(([n, name, col, act, out], i) => {
    const x = M + i * 3.07
    card(s, x, 1.85, 2.95, 3.95)
    s.addShape(pptx.ShapeType.rect, { x: x + 0.25, y: 2.05, w: 0.5, h: 0.05, fill: { color: col }, line: { color: col, width: 0 } })
    t(s, n, x + 0.25, 2.2, 1, 0.3, { fontFace: F.mono, fontSize: 11, color: col })
    t(s, name, x + 0.25, 2.5, 2.5, 0.5, { fontFace: F.display, fontSize: 22, bold: true, color: col })
    t(s, act, x + 0.25, 3.15, 2.5, 1.5, { fontSize: 11.5, color: C.soft, lineSpacingMultiple: 1.15 })
    s.addShape(pptx.ShapeType.line, { x: x + 0.25, y: 4.7, w: 2.45, h: 0, line: { color: '27485A', width: 0.75 } })
    t(s, 'OUTPUT', x + 0.25, 4.82, 2, 0.2, { fontFace: F.mono, fontSize: 8, color: C.slate, charSpacing: 2 })
    t(s, out, x + 0.25, 5.05, 2.5, 0.6, { fontFace: F.display, fontSize: 12.5, bold: true, color: C.ice })
  })
  const labels = [['OBSERVED', 'measured values with dates and windows', C.teal], ['ESTIMATED', 'modelled ranges with stated assumptions', C.cyan], ['HYPOTHETICAL', 'illustrative scenarios, never results', C.amber]]
  labels.forEach(([a, b, col], i) => {
    const x = M + i * 4.07
    card(s, x, 6.0, 3.96, 0.7, { fill: col, transparency: 92, line: col })
    t(s, [{ text: a + '  ', options: { fontFace: F.mono, bold: true, color: col, fontSize: 9.5 } }, { text: b, options: { color: C.soft, fontSize: 10 } }], x + 0.2, 6.0, 3.6, 0.7, { valign: 'middle' })
  })
}

/* 6 — Prototype */
{
  const s = base(6, 'Interactive prototype', 'A working decision tool, not a mockup.', 'Screenshots are from the built application. All readings shown are synthetic demonstration data. Particle animation is conceptual, not computational fluid dynamics.')
  const shots = [['c-airlab.png', 'AIR LAB · 3D classroom + scenario controls'], ['c-map.png', 'SCHOOL AIR MAP · rooms + time series'], ['c-studio.png', 'INTERVENTION STUDIO · sizing + options'], ['c-evidence.png', 'EVIDENCE LAB · before/after + warnings']]
  shots.forEach(([f, cap], i) => {
    const x = M + (i % 2) * 4.45
    const y = 1.75 + Math.floor(i / 2) * 2.55
    s.addImage({ path: img(f), x, y, w: 4.3, h: 2.42 })
    s.addShape(pptx.ShapeType.rect, { x, y, w: 4.3, h: 2.42, fill: { color: C.midnight, transparency: 100 }, line: { color: '27485A', width: 0.75 } })
    s.addShape(pptx.ShapeType.rect, { x, y: y + 2.16, w: 4.3, h: 0.26, fill: { color: C.midnight, transparency: 15 }, line: { color: C.midnight, width: 0 } })
    t(s, cap, x + 0.1, y + 2.16, 4.1, 0.26, { fontFace: F.mono, fontSize: 8, color: C.teal, valign: 'middle', charSpacing: 1 })
  })
  card(s, 9.6, 1.75, 3.13, 4.97)
  t(s, 'SIX MODULES', 9.8, 1.9, 2.8, 0.25, { fontFace: F.mono, fontSize: 9, color: C.teal, charSpacing: 2 })
  t(s, bullets(['Cinematic landing page', 'Air Lab (3D)', 'School Air Map + CSV import', 'Intervention Studio ($500 / $1,000 / $1,500)', 'Evidence Lab + report export', 'Global Replication + toolkit'], { gap: 3 }), 9.8, 2.2, 2.8, 2.0, { fontSize: 10, color: C.soft })
  t(s, 'BUILT WITH', 9.8, 4.2, 2.8, 0.25, { fontFace: F.mono, fontSize: 9, color: C.teal, charSpacing: 2 })
  t(s, 'React, TypeScript, Vite, Three.js, Recharts. Offline, no API keys. Keyboard accessible, reduced-motion aware, responsive.', 9.8, 4.47, 2.8, 0.95, { fontSize: 9.5, color: C.soft })
  card(s, 9.8, 5.6, 2.75, 0.95, { line: C.amber, fill: C.amber, transparency: 90 })
  t(s, [{ text: 'LIVE DEMO', options: { fontFace: F.mono, fontSize: 8.5, color: C.amber, bold: true, breakLine: true } }, { text: 'maymourad.github.io/airshift', options: { fontFace: F.mono, fontSize: 8.5, color: C.ice } }], 9.92, 5.6, 2.55, 0.95, { valign: 'middle' })
}

/* 7 — Project structure */
{
  const s = base(7, 'Project structure', 'One student lead. A school community. Eight weeks.', 'Stakeholders listed are people who would need to be asked; none has agreed yet. No student-identifiable data is collected.')
  const cols = [
    ['MAIN GOALS', C.teal, ['Establish a documented PM2.5 baseline for one or two classrooms', 'Choose and test one affordable intervention, only if the baseline justifies it', 'Verify the effect transparently, with limits', 'Publish a reusable school toolkit']],
    ['KEY ACTIVITIES', C.cyan, ['Request school permission and agree the protocol', 'Measure school-hour PM2.5 with matched windows', 'Record sources, ventilation and cleaning routines', 'Implement the approved intervention with staff review', 'Analyze, report and share with the community']],
    ['ROLES & RESOURCES', C.amber, ['Lead (solo): research, tool, measurement, analysis, education, reporting, outreach', 'School staff: review placement and infrastructure concerns', 'Equipment from the grant (see funding)', 'About 8 weeks of student time outside class', 'Free open-source software']],
  ]
  cols.forEach(([h, col, items], i) => {
    const x = M + i * 4.07
    card(s, x, 1.85, 3.96, 3.95)
    t(s, h, x + 0.25, 2.0, 3.5, 0.25, { fontFace: F.mono, fontSize: 9.5, color: col, charSpacing: 2 })
    t(s, bullets(items, { gap: 7 }), x + 0.25, 2.4, 3.5, 3.3, { fontSize: 11, color: C.soft, lineSpacingMultiple: 1.1 })
  })
  t(s, 'POTENTIAL STAKEHOLDERS  ·  TO BE ASKED, NONE CONFIRMED', M, 6.0, 8, 0.25, { fontFace: F.mono, fontSize: 9, color: C.amber, charSpacing: 2 })
  ;['School leadership', 'Facilities & HVAC staff', 'Teachers of the rooms', 'Cleaning staff', 'Student peers (outreach)'].forEach((x, i) => chip(s, x.toUpperCase(), M + [0, 2.2, 4.85, 7.3, 9.1][i], 6.32, [2.0, 2.5, 2.3, 1.7, 2.8][i], C.cyan))
}

/* 8 — Roadmap */
{
  const s = base(8, 'Implementation roadmap', 'Eight weeks from funding to published toolkit.', 'Planned activities and proposed targets. Dates start when funding is confirmed. Planning prices will be replaced by supplier quotations before any purchase.')
  const x0 = 3.2
  const wW = 1.19
  for (let w = 0; w < 8; w++) t(s, `W${w + 1}`, x0 + w * wW, 1.85, wW, 0.28, { fontFace: F.mono, fontSize: 9, color: C.slate, align: 'center' })
  const rows = [['Approve & plan', 0, 2, C.teal, 'Approved site and protocol'], ['Detect: baseline', 2, 2, C.cyan, 'Baseline and action choice'], ['Decide & implement', 4, 2, C.amber, 'Intervention dataset'], ['Verify & replicate', 6, 2, C.mist, 'Impact report and toolkit']]
  rows.forEach(([name, st, len, col, del], i) => {
    const y = 2.18 + i * 0.52
    t(s, name, M, y, 2.5, 0.42, { fontFace: F.display, fontSize: 11.5, bold: true, color: C.ice, valign: 'middle' })
    s.addShape(pptx.ShapeType.roundRect, { x: x0 + st * wW + 0.03, y, w: len * wW - 0.06, h: 0.42, rectRadius: 0.08, fill: { color: col, transparency: 15 }, line: { color: col, width: 0 } })
    t(s, del, x0 + st * wW + 0.03, y, len * wW - 0.06, 0.42, { fontSize: 9, bold: true, color: '04202A', align: 'center', valign: 'middle' })
  })
  t(s, 'Dependencies:  school approval  →  baseline review  →  intervention (only if justified)  →  matched follow-up  →  report', M, 4.3, 12.1, 0.3, { fontFace: F.mono, fontSize: 9, color: C.cyan })
  const hdr = (x) => ({ text: x, options: { bold: true, color: C.teal, fontFace: F.mono, fontSize: 9, fill: { color: '0A1D2A' } } })
  const cell = (x, o = {}) => ({ text: x, options: { color: C.soft, fontSize: 9.5, fontFace: F.body, fill: { color: C.ocean }, ...o } })
  s.addTable(
    [
      [hdr('CHALLENGE'), hdr('MITIGATION')],
      [cell('School approval is delayed or declined', { bold: true, color: C.ice }), cell('Ask in week 1; fall back to one teacher-approved classroom or a space the school nominates.')],
      [cell('Sensors fail or a dust event dominates a window', { bold: true, color: C.ice }), cell('Two monitors, side-by-side check, spare days in schedule. Record the event rather than discarding it.')],
      [cell('Baseline is already within guideline levels', { bold: true, color: C.ice }), cell('Report it as a finding. Do not buy equipment that is not justified; use funds for outreach and toolkit.')],
      [cell('Results are inconclusive or confounded', { bold: true, color: C.ice }), cell('Publish with caveats; use outdoor air, humidity and a comparison room. Inconclusive evidence still helps the next school.')],
    ],
    { x: M, y: 4.7, w: 12.1, colW: [4.1, 8.0], border: { type: 'solid', color: '27485A', pt: 0.5 }, rowH: 0.36, margin: [0.04, 0.12, 0.04, 0.12], valign: 'middle' },
  )
}

/* 9 — Funding & impact */
{
  const s = base(9, 'Funding and impact', '$1,500 buys a complete, honest pilot.', 'Preliminary planning figures, not supplier quotations; to be checked against local quotes, room size and school approvals before purchase. Indicators are proposed targets, not results.')
  card(s, M, 1.85, 6.0, 4.85)
  t(s, 'FULL REQUEST · $1,500', M + 0.25, 2.0, 5, 0.25, { fontFace: F.mono, fontSize: 9.5, color: C.teal, charSpacing: 2 })
  let bx = M + 0.25
  BUDGET_1500.forEach(([, amt, col]) => {
    const w = (amt / 1500) * 5.5
    s.addShape(pptx.ShapeType.rect, { x: bx, y: 2.38, w, h: 0.32, fill: { color: col }, line: { color: C.ocean, width: 0.75 } })
    bx += w
  })
  BUDGET_1500.forEach(([label, amt, col], i) => {
    const y = 2.92 + i * 0.5
    s.addShape(pptx.ShapeType.rect, { x: M + 0.25, y: y + 0.08, w: 0.16, h: 0.16, fill: { color: col }, line: { color: col, width: 0 } })
    t(s, label, M + 0.55, y, 3.9, 0.32, { fontSize: 11.5, color: C.soft, valign: 'middle' })
    t(s, `$${amt}`, M + 4.4, y, 1.35, 0.32, { fontFace: F.mono, fontSize: 12, color: C.ice, align: 'right', valign: 'middle' })
  })
  s.addShape(pptx.ShapeType.line, { x: M + 0.25, y: 6.27, w: 5.5, h: 0, line: { color: '27485A', width: 0.75 } })
  t(s, 'Total', M + 0.55, 6.32, 3, 0.35, { fontFace: F.display, fontSize: 13, bold: true, color: C.ice, valign: 'middle' })
  t(s, '$1,500', M + 4.4, 6.32, 1.35, 0.35, { fontFace: F.mono, fontSize: 14, bold: true, color: C.teal, align: 'right', valign: 'middle' })

  const tiers = [['$1,000', C.cyan, 'Focused pilot', 'One treated and one comparison room. Two lower-cost monitors, two air cleaners. Thin contingency, lighter outreach.'], ['$500', C.amber, 'Single-room demo', 'One monitor, one smaller air cleaner. No simultaneous comparison; coverage of recommended airflow is partial.']]
  tiers.forEach(([amt, col, h, d], i) => {
    const x = 6.85 + i * 3.0
    card(s, x, 1.85, 2.88, 2.05)
    t(s, amt, x + 0.2, 1.97, 2.5, 0.5, { fontFace: F.mono, fontSize: 22, color: col })
    t(s, h, x + 0.2, 2.5, 2.5, 0.3, { fontFace: F.display, fontSize: 12.5, bold: true, color: C.ice })
    t(s, d, x + 0.2, 2.85, 2.5, 1.0, { fontSize: 10.5, color: C.soft })
  })
  card(s, 6.85, 4.05, 5.88, 2.65)
  t(s, 'PROPOSED SUCCESS INDICATORS (TARGETS)', 7.05, 4.17, 5.5, 0.25, { fontFace: F.mono, fontSize: 8.5, color: C.teal, charSpacing: 1.5 })
  t(s, bullets(['≥ 10 school days of baseline and of follow-up per room, ≥ 90% complete', 'PM2.5 summaries in µg/m³ with dates, windows and sensor caveats', 'Equipment run-hours, maintenance and cost per classroom recorded', 'Toolkit read-through by ≥ 3 outside educators or student groups'], { gap: 2 }), 7.05, 4.45, 5.55, 1.2, { fontSize: 10.5, color: C.soft })
  t(s, 'EVALUATION PROTOCOL', 7.05, 5.55, 5.5, 0.25, { fontFace: F.mono, fontSize: 8.5, color: C.amber, charSpacing: 1.5 })
  t(s, 'Same sensors, placement and school hours · outdoor air alongside · comparison room · transition day excluded · uncertainty and data-quality warnings reported · no health claims.', 7.05, 5.85, 5.55, 0.8, { fontSize: 10.5, color: C.soft })
}

/* 10 — Global vision */
{
  const s = base(10, 'Global vision and closing', 'From one classroom to a method others can copy.', 'Globe markers other than Al Dhafra are hypothetical regions for illustration only. No partners, sites or deployments exist outside the proposed pilot.')
  s.addImage({ path: img('07-globe.png'), x: M, y: 1.75, w: 4.3, h: 5.04 })
  s.addShape(pptx.ShapeType.rect, { x: M, y: 1.75, w: 4.3, h: 5.04, fill: { color: C.midnight, transparency: 100 }, line: { color: '27485A', width: 0.75 } })
  const steps = [['PUBLISH', 'Method, templates and budget variants, free to use.', C.teal], ['TEST', 'Can outside educators follow it without help?', C.cyan], ['SUPPORT', 'Peer schools repeat it with their own approved equipment.', C.amber]]
  steps.forEach(([h, d, col], i) => {
    const y = 1.85 + i * 0.95
    card(s, 5.3, y, 7.43, 0.85)
    t(s, h, 5.5, y, 1.5, 0.85, { fontFace: F.mono, fontSize: 10, bold: true, color: col, valign: 'middle', charSpacing: 2 })
    t(s, d, 7.0, y, 5.6, 0.85, { fontSize: 11.5, color: C.soft, valign: 'middle' })
  })
  card(s, 5.3, 4.8, 7.43, 1.05, { fill: C.teal, transparency: 88, line: C.teal, lineWidth: 1 })
  t(s, [{ text: 'THE ASK  ', options: { fontFace: F.mono, fontSize: 9.5, bold: true, color: C.teal, breakLine: true } }, { text: 'The $1,500 first-place award funds the full pilot. $1,000 or $500 funds a smaller, equally honest version.', options: { fontSize: 12, color: C.ice } }], 5.55, 4.8, 7.0, 1.05, { valign: 'middle' })
  t(s, 'You can’t fix what you can’t see.', 5.3, 6.0, 7.43, 0.5, { fontFace: F.display, fontSize: 24, bold: true, color: C.ice })
  t(s, 'AIRSHIFT makes the air visible, measures whether the fix worked, and shares it.', 5.3, 6.45, 7.43, 0.3, { fontSize: 11, color: C.teal })
}

await pptx.writeFile({ fileName: path.join(here, 'AIRSHIFT_YPL_Pitch_Deck.pptx') })
console.log('wrote AIRSHIFT_YPL_Pitch_Deck.pptx')
