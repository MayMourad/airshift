// End-to-end smoke tests. Usage: node scripts/e2e.mjs [baseUrl]
// Requires Microsoft Edge (or change the channel) and a running `npm run preview`.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = process.argv[2] ?? 'http://localhost:4173'
const results = []
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  - ' + info : ''}`)
}

const browser = await chromium.launch({ channel: 'msedge', args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(base, { waitUntil: 'networkidle' })
check('hero headline', await page.locator('h1').innerText().then((t) => /see\s+the air you breathe/i.test(t)))
check('WHO 99% statistic shown with source link', await page.locator('a[href="https://www.who.int/health-topics/air-pollution"]').first().isVisible())

// navigation
await page.getByRole('button', { name: 'Enter the Air Lab' }).click()
await page.waitForTimeout(900)
check('CTA scrolls to Air Lab', await page.evaluate(() => document.getElementById('air-lab').getBoundingClientRect().top < 200))
for (const [label, id] of [['Air Map', 'air-map'], ['Interventions', 'studio'], ['Evidence', 'evidence'], ['Replicate', 'replicate'], ['Sources', 'sources']]) {
  await page.locator('nav').getByRole('button', { name: label, exact: true }).first().click()
  await page.waitForTimeout(800)
  check(`nav -> ${label}`, await page.evaluate((i) => Math.abs(document.getElementById(i).getBoundingClientRect().top) < 260, id))
}
await page.getByRole('button', { name: 'AIRSHIFT, back to top' }).click()
await page.waitForTimeout(800)
await page.getByRole('button', { name: 'See the proposed pilot' }).click()
const pilotOk = await page.waitForFunction(() => { const t = document.getElementById('pilot').getBoundingClientRect().top; return t > -50 && t < 250 }, null, { timeout: 6000 }).then(() => true).catch(() => false)
check('secondary CTA -> pilot', pilotOk)

// Air Lab
await page.locator('#air-lab').scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
check('3D canvas mounted', (await page.locator('[data-testid="airlab-canvas"] canvas').count()) > 0)
const appears = (loc, ms = 4000) => loc.first().waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false)
const stat = async (label) => (await page.locator(`#air-lab p:text-is("${label}") + p`).first().innerText()).replace(/\s+/g, ' ')
const steadyBefore = await stat('Steady state (this scenario)')
await page.getByRole('switch', { name: /Hypothetical portable HEPA/ }).click()
await page.waitForTimeout(500)
const steadyAfter = await stat('Steady state (this scenario)')
check('filter toggle changes steady-state PM2.5', steadyBefore !== steadyAfter, `${steadyBefore} -> ${steadyAfter}`)
const co2a = await stat('CO2 · separate metric')
await page.getByRole('switch', { name: /Hypothetical portable HEPA/ }).click()
const co2b = await stat('CO2 · separate metric')
check('CO2 unchanged by filtration', co2a === co2b, co2a)
await page.getByRole('button', { name: /Door side/ }).click()
check('zone selection works', (await page.locator('#air-lab button[aria-pressed="true"]', { hasText: 'Door side' }).count()) === 1)
await page.getByRole('button', { name: 'Dust event · 120' }).click()
const dust = await stat('Steady state (this scenario)')
check('dust-event preset raises concentration', parseFloat(dust) > parseFloat(steadyBefore), dust)
await page.getByRole('button', { name: /Reset/ }).first().click()
check('reset restores defaults', (await stat('Steady state (this scenario)')) === steadyBefore)
await page.locator('[data-testid="airlab-canvas"]').screenshot({ path: path.join(os.tmpdir(), 'airlab.png') })

// Map
await page.locator('#air-map').scrollIntoViewIfNeeded()
await page.getByRole('button', { name: /Entrance corridor/ }).click()
check('room selection updates panel', await page.locator('#air-map h3', { hasText: 'Entrance corridor' }).first().isVisible())
await page.getByRole('radio', { name: 'Full dataset' }).click()
await page.waitForTimeout(500)
check('map shows synthetic label', await page.locator('#air-map').getByText('Simulated demonstration data').first().isVisible())
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'airshift-'))
const bad = path.join(tmp, 'bad.csv')
fs.writeFileSync(bad, 'timestamp,room_id,pm25_ugm3,student_name\n2026-11-10T08:00,R1,12,Sam\n')
await page.setInputFiles('input[type=file]', bad)
check('CSV with personal-data column rejected', await appears(page.getByText(/looks like personal data/)))
const badNum = path.join(tmp, 'badnum.csv')
fs.writeFileSync(badNum, 'timestamp,room_id,pm25_ugm3\nnotadate,R1,12\n2026-11-10T09:00,R1,abc\n2026-11-10T10:00,R1,1500\n')
await page.setInputFiles('input[type=file]', badNum)
check('CSV with invalid rows reports errors', await appears(page.getByText('Not importable')))
let rows = 'timestamp,room_id,pm25_ugm3,outdoor_pm25_ugm3,rh_pct,co2_ppm\n'
const pad = (n) => String(n).padStart(2, '0')
for (let d = 0; d < 28; d++) {
  for (let h = 7; h < 15; h++) {
    const dt = new Date(2026, 10, 2 + d, h)
    if (dt.getDay() === 0 || dt.getDay() === 6) continue
    const post = d >= 14
    const ts = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(h)}:00`
    rows += `${ts},R1,${post ? 12 + (h % 3) : 30 + (h % 4)},40,45,800\n${ts},R2,${28 + (h % 5)},40,45,800\n`
  }
}
const good = path.join(tmp, 'good.csv')
fs.writeFileSync(good, rows)
await page.setInputFiles('input[type=file]', good)
check('valid CSV accepted', await appears(page.getByText(/Valid: \d+ of \d+ rows accepted/)))
await page.getByRole('button', { name: 'Use this data' }).click()
await page.waitForTimeout(500)
check('imported data labelled as user data', await page.locator('#air-map').getByText('Your imported data').first().isVisible())

// Evidence with imported data
await page.locator('#evidence').scrollIntoViewIfNeeded()
check('evidence empty state until date chosen', await page.getByText('Choose the intervention start date').isVisible())
await page.locator('#evidence input[type=date]').fill('2026-11-16')
await page.waitForTimeout(600)
check('evidence computes after date chosen', await page.getByText('Raw change in mean').isVisible())
await page.locator('#air-map').scrollIntoViewIfNeeded()
await page.getByRole('button', { name: /Back to demo data/ }).click()
await page.waitForTimeout(500)

// Studio
await page.locator('#studio').scrollIntoViewIfNeeded()
const cov = async () => (await page.locator('#studio').getByText(/of the EPA rule-of-thumb CADR/).first().innerText()).replace(/\s+/g, ' ')
const covA = await cov()
await page.locator('#studio').getByRole('radio', { name: '$500' }).click()
const covB = await cov()
check('budget selector changes HEPA coverage', covA !== covB, `${covA.slice(0, 30)} -> ${covB.slice(0, 30)}`)
check('$500 budget table totals $500', await page.locator('#studio table').last().innerText().then((t) => /Total\s*\$500/.test(t.replace(/\s+/g, ' '))))
await page.locator('#studio').getByRole('radio', { name: '$1,500' }).click()
await page.locator('#studio input[type=checkbox]').first().check()
check('observation affects ranking', await page.locator('#studio article').first().innerText().then((t) => /source/i.test(t)))
await page.locator('#studio #baseline').fill('9')
check('low baseline triggers "may not be warranted" note', await page.getByText(/may not be warranted/).isVisible())
await page.locator('#studio #len').fill('9')
await page.locator('#studio #wid').fill('8')
check('bigger room needs more CADR (coverage drops)', (await cov()) !== covA)
await page.locator('#studio #len').fill('7')
await page.locator('#studio #wid').fill('6')

// Evidence (demo)
await page.locator('#evidence').scrollIntoViewIfNeeded()
await page.waitForTimeout(700)
check('evidence shows simulated badge', await page.locator('#evidence').getByText(/Simulated measurements/).isVisible())
check('evidence warns about outdoor confounding', await page.getByText('Outdoor conditions differ between windows').isVisible())
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Sample report/ }).click()])
check('sample report download named SIMULATED', /SIMULATED/.test(dl.suggestedFilename()), dl.suggestedFilename())
const rpath = path.join(tmp, 'report.html')
await dl.saveAs(rpath)
check('report contains simulated banner', fs.readFileSync(rpath, 'utf8').includes('SIMULATED SAMPLE REPORT'))
const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Data \(CSV\)/ }).click()])
check('data CSV download', /SIMULATED/.test(dl2.suggestedFilename()))

// Replication
await page.locator('#replicate').scrollIntoViewIfNeeded()
await page.waitForTimeout(1200)
check('globe canvas renders', (await page.locator('#replicate canvas').count()) > 0)
await page.getByRole('button', { name: /South Asia/ }).click()
check('globe point note labels hypothetical', await page.getByText(/Hypothetical: no partners/).isVisible())
await page.locator('#replicate input[type=checkbox]').first().check()
check('checklist progress updates', await page.getByText('1/12').isVisible())
await page.getByRole('button', { name: /Week 5: Weeks 5/ }).click()
check('timeline week selection', await page.getByText('Intervention dataset').first().isVisible())
const [dl3] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Measurement template/ }).click()])
check('template download', dl3.suggestedFilename() === 'airshift-measurement-template.csv')

// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
const mp = await m.newPage()
await mp.goto(base, { waitUntil: 'networkidle' })
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
check('mobile: no horizontal overflow', overflow <= 1, `overflow=${overflow}px`)
await mp.getByRole('button', { name: 'Open menu' }).click()
check('mobile menu opens', await mp.locator('#mobile-nav').isVisible())
await mp.locator('#mobile-nav').getByRole('button', { name: 'Evidence' }).click()
const navOk = await mp.waitForFunction(() => { const t = document.getElementById('evidence').getBoundingClientRect().top; return t > -50 && t < 300 }, null, { timeout: 8000 }).then(() => true).catch(() => false)
check('mobile menu navigates', navOk)
for (const id of ['air-lab', 'air-map', 'studio', 'evidence', 'replicate', 'sources']) {
  await mp.evaluate((i) => document.getElementById(i).scrollIntoView(), id)
  await mp.waitForTimeout(300)
  const o = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`mobile overflow @${id}`, o <= 1, `${o}px`)
}

// reduced motion
const r = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
const rp = await r.newPage()
const rerr = []
rp.on('pageerror', (e) => rerr.push(e.message))
await rp.goto(base, { waitUntil: 'networkidle' })
await rp.locator('#air-lab').scrollIntoViewIfNeeded()
await rp.waitForTimeout(1000)
check('reduced motion: page works without errors', rerr.length === 0 && (await rp.locator('[data-testid="airlab-canvas"] canvas').count()) > 0, rerr.join(';'))

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
const failed = results.filter((x) => !x.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
