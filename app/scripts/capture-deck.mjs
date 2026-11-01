// Captures 16:9 viewport screenshots of the running prototype for the pitch deck.
// Usage: node scripts/capture-deck.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const base = process.argv[2] ?? 'http://localhost:4173'
const out = path.resolve(process.argv[3] ?? '../screens')
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
await page.mouse.move(1150, 300)
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(out, 'd-hero.png') })

await page.addStyleTag({ content: 'nav[aria-label="Primary"]{display:none!important} html{scroll-behavior:auto!important}' })
const at = async (id, dy = 0) => {
  await page.evaluate(([i, d]) => window.scrollTo(0, document.getElementById(i).getBoundingClientRect().top + window.scrollY + d), [id, dy])
  await page.waitForTimeout(1200)
}

await at('air-lab', 200)
await page.getByRole('button', { name: /Window side/ }).click()
await page.getByRole('switch', { name: /Hypothetical portable HEPA/ }).click()
await page.waitForTimeout(3500)
await page.screenshot({ path: path.join(out, 'd-airlab-on.png') })
await page.getByRole('switch', { name: /Hypothetical portable HEPA/ }).click()
await page.waitForTimeout(3500)
await page.screenshot({ path: path.join(out, 'd-airlab-off.png') })

await at('air-map', 230)
await page.getByRole('radio', { name: 'Full dataset' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(out, 'd-map.png') })
await at('air-map', 700)
await page.screenshot({ path: path.join(out, 'd-map-chart.png') })

await at('studio', 230)
await page.screenshot({ path: path.join(out, 'd-studio.png') })

await at('evidence', 330)
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(out, 'd-evidence.png') })
await at('evidence', 700)
await page.screenshot({ path: path.join(out, 'd-evidence2.png') })

// 16:9 crops (1216x684 CSS px), aligned so the first content block starts 12px from the top
const crop = (name) => page.screenshot({ path: path.join(out, name), clip: { x: 192, y: 0, width: 1216, height: 684 } })
const align = async (sel) => {
  await page.evaluate((q) => { const t = document.querySelector(q).getBoundingClientRect().top; window.scrollBy(0, t - 12) }, sel)
  await page.waitForTimeout(600)
}
await at('air-lab', 200)
await page.getByRole('switch', { name: /Hypothetical portable HEPA/ }).click()
await page.waitForTimeout(3500)
await align('[data-testid="airlab-canvas"]')
await crop('c-airlab.png')
await at('air-map', 230)
await align('#air-map svg')
await crop('c-map.png')
await at('studio', 230)
await align('#studio .panel')
await crop('c-studio.png')
await at('evidence', 330)
await page.waitForTimeout(800)
await align('#evidence .grid')
await crop('c-evidence.png')

await at('replicate', 1500)
await page.waitForTimeout(1500)
await page.evaluate(() => document.querySelector('#replicate canvas')?.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(1500)
await page.screenshot({ path: path.join(out, 'd-globe.png') })
await at('pilot', -40)
await page.screenshot({ path: path.join(out, 'd-pilot.png') })
await browser.close()
console.log('done')
