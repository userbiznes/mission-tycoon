import { MATERIAL_BY_ID, REGIONS, REGION_IDS, type RegionId } from '../data/regions'
import { rig, screenToIsland } from '../scene/cameraRig'
import { juice } from '../scene/juice'
import { sfx } from '../ui/sound'
import { onTimer } from './actions'
import { useGame, type RegionRec } from './game'
import { toMs } from './time'
import { useUi } from './ui'

/**
 * Reclaiming the lost spaceport, one region at a time:
 * locked → available (level reached) → clearing (coins, crew, a timer) →
 * ruins (the old structure stands revealed) → restoring (coins, materials, a
 * timer) → active (the building works and its feature unlocks).
 */

/** How far a clearing or restoring timer has run, 0–1. */
export function regionProgress(rec: RegionRec, now = Date.now()): number {
  if (!rec.start || !rec.end) return rec.state === 'clearing' || rec.state === 'restoring' ? 0 : 1
  return Math.min(1, Math.max(0, (now - rec.start) / (rec.end - rec.start)))
}

function setRegion(id: RegionId, rec: RegionRec) {
  useGame.setState({ regions: { ...useGame.getState().regions, [id]: rec } })
}

/** What a restoration still lacks from the materials it needs. */
export function missingMaterials(id: RegionId, inventory: Record<string, number>): { id: string; name: string; need: number; have: number }[] {
  return REGIONS[id].materials
    .map((m) => ({ id: m.id, name: MATERIAL_BY_ID[m.id].name, need: m.qty, have: inventory[m.id] ?? 0 }))
    .filter((m) => m.have < m.need)
}

/** Regions unlock by agency level: flip them to "available" and let Rocco say so. */
export function syncRegionLevels(announce = true): void {
  const g = useGame.getState()
  for (const id of REGION_IDS) {
    if (g.regions[id].state !== 'locked' || g.level < REGIONS[id].needsLevel) continue
    setRegion(id, { state: 'available' })
    if (announce) setTimeout(() => useUi.getState().speak(REGIONS[id].rocco, 'proud', id), 1500)
  }
}

/** Pay the coins and send the crew in. Returns an error line or null. */
export function startClearing(id: RegionId): string | null {
  const g = useGame.getState()
  const def = REGIONS[id]
  const state = g.regions[id].state
  if (state === 'locked') return `Reach agency level ${def.needsLevel} first`
  if (state !== 'available') return null
  if (!g.spend(def.clearCost)) return 'Not enough coins'
  const now = Date.now()
  setRegion(id, { state: 'clearing', start: now, end: now + toMs(def.clearSeconds) })
  sfx('build')
  return null
}

/** Pay the coins, hand over the materials and start the restoration. Returns an error line or null. */
export function startRestoring(id: RegionId): string | null {
  const g = useGame.getState()
  const def = REGIONS[id]
  if (g.regions[id].state !== 'ruins') return null
  const missing = missingMaterials(id, g.inventory)
  if (missing.length) return `Still needed: ${missing.map((m) => `${m.need - m.have} × ${m.name}`).join(', ')}`
  if (!g.spend(def.restoreCost)) return 'Not enough coins'
  for (const m of def.materials) useGame.getState().removeParts(m.id, m.qty)
  const now = Date.now()
  setRegion(id, { state: 'restoring', start: now, end: now + toMs(def.restoreSeconds) })
  sfx('build')
  juice(`region:${id}`, 'wobble')
  return null
}

/** Fly the camera to a region, slid a little to the left so it shows beside the card. */
export function focusRegion(id: RegionId, left = 0.2): void {
  const [u, v, width] = REGIONS[id].view
  const shown = width * Math.max(1, rig.aspect / 2.05)
  const [du, dv] = screenToIsland(left * shown, 0)
  rig.flyTo(u + du, v + dv, width)
}

/** A little buzz on phones that have one. */
function haptic(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* no vibration motor: never mind */
  }
}

onTimer((e) => {
  if (e.kind !== 'tick') return
  const g = useGame.getState()
  for (const id of REGION_IDS) {
    const rec = g.regions[id]
    if (!rec.end || e.now < rec.end) continue
    const def = REGIONS[id]
    const ui = useUi.getState()
    if (rec.state === 'clearing') {
      setRegion(id, { state: 'ruins' })
      useGame.getState().addXp(3)
      sfx('success')
      ui.toast(`The way is clear: the ${def.name} stands revealed`, 'good')
    } else if (rec.state === 'restoring') {
      setRegion(id, { state: 'active' })
      useGame.getState().addXp(8)
      juice(`region:${id}`, 'pop')
      sfx('success')
      setTimeout(() => sfx('star'), 260)
      haptic([40, 50, 90])
      ui.celebrate(id)
      ui.toast(`${def.name} restored! ${def.reward}`, 'good')
      // let the confetti fly before Rocco has his say
      setTimeout(() => useUi.getState().speak(def.memory, 'proud', id), 2600)
    }
  }
})

// a region opens for exploring the moment the agency reaches its level
useGame.subscribe((s, prev) => {
  if (s.level !== prev.level || s.phase !== prev.phase) syncRegionLevels(s.phase === 'play')
})
