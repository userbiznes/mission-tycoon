import { BUILDINGS } from '../data/buildings'
import { PLOTS, type BuildingId } from '../data/layout'
import { rig } from '../scene/cameraRig'
import { juice } from '../scene/juice'
import { CAMERA_TILT } from '../scene/world'
import { sfx } from '../ui/sound'
import { useGame } from './game'
import { toMs } from './time'
import { useUi } from './ui'

/** Game actions: the verbs the UI calls. They touch the save, the camera and the juice together. */

/**
 * Fly the camera to a plot. `raise` is how far above the screen centre the
 * building should sit (0–0.4), so it stays visible above a bottom sheet.
 */
export function focusPlot(id: BuildingId, raise = 0, width?: number) {
  const plot = PLOTS[id]
  const w = width ?? plot.focusWidth
  const screenH = w / rig.aspect
  const dv = (raise * screenH) / Math.sin(CAMERA_TILT)
  rig.flyTo(plot.u, plot.v - dv, w)
}

export function tapBuilding(id: BuildingId) {
  const b = useGame.getState().buildings[id]
  sfx('pop')
  juice(id, 'wobble')
  focusPlot(id, 0.24)
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
