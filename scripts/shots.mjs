// Take portrait-phone screenshots of the running dev server.
// usage: node scripts/shots.mjs [--url http://localhost:5173/] [--out shots] [name:u:v:width[:lift]] ...
//        add --wait 2500 for longer settle time, --query "low=1" for URL flags, --eval "js" to run before the shot
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  if (i < 0) return def
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const url = opt('url', 'http://localhost:5173/')
const out = opt('out', 'shots')
const wait = Number(opt('wait', 1800))
const query = opt('query', '')
const evalJs = opt('eval', '')
const width = Number(opt('w', 390))
const height = Number(opt('h', 844))
const scale = Number(opt('scale', 2))
const shots = args.length ? args : ['home']

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
await page.goto(url + (query ? `?${query}` : ''), { waitUntil: 'networkidle' })
await page.waitForSelector('canvas')
await page.waitForTimeout(wait)
if (evalJs) {
  await page.evaluate(evalJs)
  await page.waitForTimeout(Number(opt('after', 1200)))
}

for (const spec of shots) {
  const [name, u, v, w, lift] = spec.split(':')
  if (u !== undefined) {
    await page.evaluate(
      ([u, v, w, lift]) => window.__rig.snap(Number(u), Number(v), Number(w), Number(lift || 0)),
      [u, v, w, lift],
    )
    await page.waitForTimeout(700)
  }
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log(`saved ${out}/${name}.png`)
}
const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let n = 0
      const t0 = performance.now()
      const tick = () => {
        n++
        if (performance.now() - t0 > 1000) resolve(n)
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }),
)
console.log(`fps≈${fps}`)
if (errors.length) console.log(errors.slice(0, 12).join('\n'))
await browser.close()
