import { BUILDINGS } from '../data/buildings'
import { PLOTS, type BuildingId } from '../data/layout'
import { rig, screenToIsland } from '../scene/cameraRig'
import { juice } from '../scene/juice'
import { CAMERA_TILT } from '../scene/world'
import { sfx } from '../ui/sound'
import { useGame } from './game'
import { toMs } from './time'
import { useUi } from './ui'

/** Game actions: the verbs the UI calls. They touch the save, the camera and the juice together. */

/**
 * Fly the camera to a plot. `left` slides the building towards the left of the
 * screen (0–0.3 of the view width) so it stays visible beside the side drawer;
 * `up` lifts it a little above centre (to clear Rocco's bubble).
 */
export function focusPlot(id: BuildingId, left = 0, width?: number, up = 0) {
  const plot = PLOTS[id]
  const w = width ?? plot.focusWidth
  // `w` is the view width up to 2.05:1; wider windows simply see more to the sides
  const shown = w * Math.max(1, rig.aspect / 2.05)
  const [du, dv] = screenToIsland(left * shown, (-up * (shown / rig.aspect)) / Math.sin(CAMERA_TILT))
  rig.flyTo(plot.u + du, plot.v + dv, w)
}

export function tapBuilding(id: BuildingId) {
  const b = useGame.getState().buildings[id]
  sfx('pop')
  juice(id, 'wobble')
  focusPlot(id, 0.22)
  if (b.level === 0 && !b.buildEnd) useUi.getState().open({ kind: 'build', id })
  else useUi.getState().open({ kind: 'building', id })
}

/** Start building on an empty plot, or upgrading a building. Returns an error string or null. */
export function startConstruction(id: BuildingId): string | null {
  const game = useGame.getState()
  const b = game.buildings[id]
  const def = BUILDINGS[id]
  if (b.buildEnd) return 'Already under construction'
  let cost: number
  let seconds: number
  let needs: number
  const toLevel = b.level + 1
  if (b.level === 0) {
    cost = def.buildCost
    seconds = def.buildSeconds
    needs = def.needsLevel
  } else {
    const up = def.upgrades.find((u) => u.level === toLevel)
    if (!up) return 'Fully upgraded'
    cost = up.cost
    seconds = up.seconds
    needs = up.needsLevel
  }
  if (game.level < needs) return `Reach level ${needs} first`
  if (!game.spend(cost)) return 'Not enough coins'
  const now = Date.now()
  game.patch((s) => ({
    buildings: { ...s.buildings, [id]: { ...s.buildings[id], buildStart: now, buildEnd: now + toMs(seconds), buildTo: toLevel } },
  }))
  sfx('build')
  juice(id, 'wobble')
  return null
}

/** Called a few times a second: finishes any timers that have run out. */
export function processTimers(now = Date.now()) {
  const game = useGame.getState()
  // construction and upgrades
  for (const id of Object.keys(game.buildings) as BuildingId[]) {
    const b = game.buildings[id]
    if (b.buildEnd && now >= b.buildEnd) {
      const first = b.level === 0
      game.patch((s) => ({ buildings: { ...s.buildings, [id]: { level: b.buildTo ?? b.level + 1 } } }))
      juice(id, 'pop')
      sfx('success')
      useUi.getState().toast(first ? `${BUILDINGS[id].name} is ready!` : `${BUILDINGS[id].name} upgraded!`, 'good')
      useGame.getState().addXp(first ? 2 : 1)
      timerHooks.forEach((h) => h({ kind: 'built', id, first }))
    }
  }
  timerHooks.forEach((h) => h({ kind: 'tick', now }))
}

export type TimerEvent = { kind: 'built'; id: BuildingId; first: boolean } | { kind: 'tick'; now: number }
const timerHooks = new Set<(e: TimerEvent) => void>()
/** Other systems (market deliveries, lab, satellite passes) plug their timers in here. */
export function onTimer(hook: (e: TimerEvent) => void): () => void {
  timerHooks.add(hook)
  return () => timerHooks.delete(hook)
}

// ------------------------------------------------------------------ market
import { STOCK_MARKUP } from '../data/economy'
import { PART_BY_ID } from '../data/parts'

export function stockPrice(partId: string): number {
  return Math.round(PART_BY_ID[partId].cost * STOCK_MARKUP)
}

/** Market level speeds up deliveries. */
function deliverySeconds(partId: string): number {
  const lvl = useGame.getState().buildings.partsMarket.level
  const speed = lvl >= 3 ? 0.5 : lvl === 2 ? 0.7 : 1
  return PART_BY_ID[partId].deliverySec * speed
}

/** Buy from stock: instant, 30% dearer. */
export function buyNow(partId: string): boolean {
  const game = useGame.getState()
  if (!game.spend(stockPrice(partId))) {
    sfx('error')
    useUi.getState().toast('Not enough coins', 'bad')
    return false
  }
  game.addParts(partId, 1)
  sfx('buy')
  juice('partsMarket', 'wobble')
  return true
}

/** Order: cheaper, but a truck has to bring it. */
export function orderPart(partId: string, seconds?: number): boolean {
  const game = useGame.getState()
  if (!game.spend(PART_BY_ID[partId].cost)) {
    sfx('error')
    useUi.getState().toast('Not enough coins', 'bad')
    return false
  }
  const now = Date.now()
  const id = `d${now}${Math.floor(Math.random() * 1000)}`
  game.patch((s) => ({
    deliveries: [...s.deliveries, { id, partId, qty: 1, start: now, end: now + toMs(seconds ?? deliverySeconds(partId)) }],
  }))
  sfx('buy')
  return true
}

/** Make an ordered delivery arrive within `ms` (the tour uses this so nobody waits). */
export function rushDeliveries(ms = 4500) {
  const now = Date.now()
  useGame.getState().patch((s) => ({
    deliveries: s.deliveries.map((d) => (d.end - now > ms ? { ...d, start: Math.min(d.start, now - 1), end: now + ms } : d)),
  }))
}

onTimer((e) => {
  if (e.kind !== 'tick') return
  const game = useGame.getState()
  const due = game.deliveries.filter((d) => e.now >= d.end)
  if (!due.length) return
  game.patch((s) => ({ deliveries: s.deliveries.filter((d) => e.now < d.end) }))
  for (const d of due) {
    useGame.getState().addParts(d.partId, d.qty)
    useUi.getState().toast(`Delivered: ${PART_BY_ID[d.partId].name}`, 'good')
  }
  sfx('success')
  juice('partsMarket', 'wobble')
  deliveryHooks.forEach((h) => h())
})
const deliveryHooks = new Set<() => void>()
export function onDelivery(hook: () => void): () => void {
  deliveryHooks.add(hook)
  return () => deliveryHooks.delete(hook)
}
