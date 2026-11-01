// Captures real screenshots of the running prototype for the pitch deck.
// Usage: node scripts/capture.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const base = process.argv[2] ?? 'http://localhost:4173'
const out = path.resolve(process.argv[3] ?? '../screens')
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
const shot = async (name, locator) => {
  await locator.screenshot({ path: path.join(out, `${name}.png`) })
  console.log('saved', name)
}
const goto = async (id) => {
  await page.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant', block: 'start' }), id)
  await page.waitForTimeout(1200)
}

// hero (viewport shot)
await page.mouse.move(900, 380)
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(out, '01-hero.png') })
console.log('saved 01-hero')
await page.addStyleTag({ content: 'nav[aria-label="Primary"]{display:none!important}' })

// air lab: baseline then with filter
await goto('air-lab')
await page.getByRole('button', { name: /Window side/ }).click()
await page.waitForTimeout(2500)
await shot('02-airlab-off', page.locator('#air-lab'))
await shot('02-airlab-off-canvas', page.locator('[data-testid="airlab-canvas"]'))
await page.getByRole('switch', { name: /Hypothetical portable HEPA/ }).click()
await page.waitForTimeout(4000)
await shot('03-airlab-on', page.locator('#air-lab'))
await shot('03-airlab-on-canvas', page.locator('[data-testid="airlab-canvas"]'))

await goto('air-map')
await page.waitForTimeout(800)
await shot('04-map', page.locator('#air-map'))

await goto('studio')
await page.waitForTimeout(800)
await shot('05-studio', page.locator('#studio'))

await goto('evidence')
await page.waitForTimeout(1500)
await shot('06-evidence', page.locator('#evidence'))

await goto('replicate')
await page.waitForTimeout(2500)
await shot('07-replicate', page.locator('#replicate'))
await page.evaluate(() => window.scrollTo(0, document.getElementById('replicate').offsetTop + 1500))
await page.waitForTimeout(2000)
await page.evaluate(() => document.querySelector('#replicate canvas').scrollIntoView({ behavior: 'instant', block: 'center' }))
await page.waitForTimeout(1500)
await shot('07-globe', page.locator('#replicate .glass').first())

// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
const mp = await m.newPage()
await mp.goto(base, { waitUntil: 'networkidle' })
await mp.waitForTimeout(1500)
await mp.screenshot({ path: path.join(out, '08-mobile-hero.png') })
await mp.evaluate(() => document.getElementById('air-map').scrollIntoView({ behavior: 'instant' }))
await mp.waitForTimeout(800)
await mp.screenshot({ path: path.join(out, '09-mobile-map.png') })
await browser.close()
