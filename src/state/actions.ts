import { BUILDINGS } from '../data/buildings'
import { FOCUS_WIDTH, ZONES, type BuildingId } from '../data/layout'
import { OBSTACLE_INFO, allObstacles, buildingCenter } from '../scene/grid'
import { rig, screenToIsland } from '../scene/cameraRig'
import { juice } from '../scene/juice'
import { CAMERA_TILT, worldToUv } from '../scene/world'
import { sfx } from '../ui/sound'
import { useGame } from './game'
import { toMs } from './time'
import { useUi } from './ui'

/** Game actions: the verbs the UI calls. They touch the save, the camera and the juice together. */

/** World position of a building's centre, or null if it isn't on the map yet. */
export function buildingWorld(id: BuildingId): [number, number] | null {
  const at = useGame.getState().placed[id]
  return at ? buildingCenter(id, at) : null
}

/**
 * Fly the camera to a building. `left` slides it towards the left of the
 * screen (0–0.3 of the view width) so it stays visible beside the side drawer;
 * `up` lifts it a little above centre (to clear Rocco's bubble).
 */
export function focusBuilding(id: BuildingId, left = 0, width?: number, up = 0) {
  const pos = buildingWorld(id)
  if (!pos) return
  const w = width ?? FOCUS_WIDTH[id]
  // `w` is the view width up to 2.05:1; wider windows simply see more to the sides
  const shown = w * Math.max(1, rig.aspect / 2.05)
  const [u, v] = worldToUv(pos[0], pos[1])
  const [du, dv] = screenToIsland(left * shown, (-up * (shown / rig.aspect)) / Math.sin(CAMERA_TILT))
  rig.flyTo(u + du, v + dv, w)
}

export function tapBuilding(id: BuildingId) {
  sfx('pop')
  juice(id, 'wobble')
  focusBuilding(id, 0.22)
  useUi.getState().open({ kind: 'building', id })
}

/** Clear a piece of overgrowth for coins. Returns an error line or null. */
export function clearObstacle(obstacleId: string): string | null {
  const g = useGame.getState()
  const o = allObstacles().find((x) => x.id === obstacleId)
  if (!o || g.cleared.includes(obstacleId)) return null
  if (o.zone >= g.zones) return 'That land is still fenced off'
  const info = OBSTACLE_INFO[o.kind]
  if (!g.spend(info.cost)) return 'Not enough coins'
  useGame.setState({ cleared: [...useGame.getState().cleared, obstacleId] })
  if (info.xp) useGame.getState().addXp(info.xp)
  sfx('build')
  return null
}

/** Open the next zone of the island. Returns an error line or null. */
export function unlockZone(): string | null {
  const g = useGame.getState()
  const def = ZONES[g.zones]
  if (!def) return null
  if (g.level < def.needsLevel) return `Reach agency level ${def.needsLevel} first`
  if (!g.spend(def.cost)) return 'Not enough coins'
  useGame.setState({ zones: g.zones + 1 })
  useGame.getState().addXp(3)
  sfx('success')
  useUi.getState().toast(`${def.name} is open! Clear it and build.`, 'good')
  return null
}

/** Start upgrading a building. Returns an error string or null. (New buildings go through placement.) */
export function startConstruction(id: BuildingId): string | null {
  const game = useGame.getState()
  const b = game.buildings[id]
  const def = BUILDINGS[id]
  if (b.buildEnd) return 'Already under construction'
  const up = def.upgrades.find((u) => u.level === b.level + 1)
  if (!up) return 'Fully upgraded'
  if (game.level < up.needsLevel) return `Reach level ${up.needsLevel} first`
  if (!game.spend(up.cost)) return 'Not enough coins'
  const now = Date.now()
  game.patch((s) => ({
    buildings: { ...s.buildings, [id]: { ...s.buildings[id], buildStart: now, buildEnd: now + toMs(up.seconds), buildTo: up.level } },
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
