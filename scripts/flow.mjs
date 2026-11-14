// End-to-end smoke test: fly the first mission with the autopilot and screenshot each stage.
// usage: node scripts/flow.mjs [--url http://localhost:5173/] [--out shots]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d)
const url = opt('url', 'http://localhost:5173/')
const out = opt('out', 'shots')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
const shot = async (name) => {
  await page.screenshot({ path: `${out}/flow-${name}.png` })
  console.log(`saved ${out}/flow-${name}.png`)
}
const tap = async (text, timeout = 15000) => {
  const el = page.getByRole('button', { name: text }).first()
  await el.waitFor({ timeout })
  await el.click()
}

await page.goto(`${url}?fresh=1&fast=1`, { waitUntil: 'networkidle' })
await page.waitForSelector('canvas')
await page.waitForTimeout(1500)
await page.evaluate(() => {
  const g = window.__game
  g.getState().setPlayer({ name: 'Maya', agency: 'Pelican Launch Club' })
  g.getState().begin()
  g.setState({
    phase: 'play',
    tourStep: -1,
    tipsSeen: ['shadow', 'bottleneck', 'overweight', 'testrun'],
    draft: {
      contractId: 'firstLight',
      design: { busId: 'bus3u', parts: ['deployPanels', 'batterySmall', 'radioUhf', 'cpuBasic', 'magnetorquers', 'camWide'] },
      orbitId: 'leo',
      rocketId: 'rideshare',
      stationIds: ['home'],
    },
  })
  window.__rig.stopCinematic(0)
  window.__rig.locked = false
  window.__ui.getState().setScreen('builder')
})
await page.waitForTimeout(800)
await tap(/Test run/)
await page.waitForTimeout(900)
await shot('1-testrun')
await tap(/To the pad/)
await page.waitForTimeout(500)
await tap(/NO-GO/)
await tap(/Launch anyway/)
await page.waitForTimeout(1200)
await tap(/Autopilot/)
await page.waitForTimeout(2600)
await shot('2-hold')
await page.waitForTimeout(3300)
await shot('3-ascent')
await page.waitForTimeout(4200)
await shot('4-coast')
// operations: answer every decision card with the left choice
await page.waitForSelector('.ops', { timeout: 20000 })
await page.waitForTimeout(1500)
await shot('5-ops')
for (let i = 0; i < 4; i++) {
  const card = page.locator('.event-card .side').first()
  try {
    await card.waitFor({ timeout: 9000 })
    if (i === 0) await shot('6-event')
    await card.click()
  } catch {
    break
  }
}
await tap(/debrief/, 30000)
await page.waitForTimeout(1800)
await shot('7-debrief')
await page.locator('.debrief .flow-body').evaluate((el) => el.scrollTo(0, el.scrollHeight))
await page.waitForTimeout(300)
await shot('8-debrief-bottom')
await tap(/Back to base/)
await page.waitForTimeout(2500)
await shot('9-base')
const state = await page.evaluate(() => {
  const s = window.__game.getState()
  return { coins: s.coins, xp: s.xp, level: s.level, stars: s.bestStars, sats: s.satellites.length }
})
console.log('state', JSON.stringify(state))
if (errors.length) console.log('ERRORS\n' + errors.slice(0, 10).join('\n'))
await browser.close()
