import { landOpen } from './regionGate'
import { create } from 'zustand'
import { BUILDINGS } from '../data/buildings'
import { FOOTPRINT, type BuildingId } from '../data/layout'
import { rig } from '../scene/cameraRig'
import { cellForCenter, nearestFree, occupancy, placementProblem, type CellPos } from '../scene/grid'
import { juice } from '../scene/juice'
import { sfx } from '../ui/sound'
import { useGame } from './game'
import { toMs } from './time'
import { useUi } from './ui'

/**
 * Placement mode: a building is "in hand" and follows the finger over the
 * build grid until it is confirmed or cancelled. Used both for new buildings
 * and for moving existing ones.
 */
interface PlacementState {
  id: BuildingId | null
  at: CellPos
  isNew: boolean
  /** 0 = door down-left, 1 = door down-right */
  facing: number
  problem: string | null
  rotate: () => void
  begin: (id: BuildingId, isNew: boolean) => void
  moveTo: (at: CellPos) => void
  cancel: () => void
  /** returns an error line, or null when the building is down */
  confirm: () => string | null
}

function check(id: BuildingId, at: CellPos): string | null {
  const g = useGame.getState()
  return placementProblem(id, at, occupancy(g.placed, g.cleared, id), landOpen)
}

export const usePlacement = create<PlacementState>((set, get) => ({
  id: null,
  at: { i: 0, j: 0 },
  isNew: false,
  facing: 0,
  problem: null,
  rotate: () => {
    sfx('snap')
    set({ facing: get().facing ? 0 : 1 })
  },
  begin: (id, isNew) => {
    const g = useGame.getState()
    if (id === 'partsMarket') {
      sfx('error')
      useUi.getState().toast('The market stays on the dock, where the boats come in')
      return
    }
    let at = g.placed[id]
    if (!at || isNew) {
      // start where the player is looking, on the nearest free ground
      const t = rig.targetWorld()
      at = nearestFree(id, cellForCenter(t.x, t.z, FOOTPRINT[id]), occupancy(g.placed, g.cleared, id), landOpen)
    }
    useUi.getState().close()
    sfx('pop')
    set({ id, isNew, at, facing: isNew ? 0 : (g.facing[id] ?? 0), problem: check(id, at) })
  },
  moveTo: (at) => {
    const { id, at: old } = get()
    if (!id || (old.i === at.i && old.j === at.j)) return
    set({ at, problem: check(id, at) })
  },
  cancel: () => {
    if (get().id) sfx('close')
    set({ id: null })
  },
  confirm: () => {
    const { id, at, isNew, facing } = get()
    if (!id) return null
    const problem = check(id, at)
    if (problem) return problem
    const g = useGame.getState()
    if (isNew) {
      const def = BUILDINGS[id]
      if (g.level < def.needsLevel) return `Reach agency level ${def.needsLevel} first`
      if (!g.spend(def.buildCost)) return 'Not enough coins'
      const now = Date.now()
      useGame.setState({
        placed: { ...useGame.getState().placed, [id]: at },
        facing: { ...useGame.getState().facing, [id]: facing },
        buildings: { ...useGame.getState().buildings, [id]: { level: 0, buildStart: now, buildEnd: now + toMs(def.buildSeconds), buildTo: 1 } },
      })
      sfx('build')
    } else {
      useGame.setState({ placed: { ...g.placed, [id]: at }, facing: { ...g.facing, [id]: facing } })
      sfx('snap')
    }
    set({ id: null })
    juice(id, 'pop')
    return null
  },
}))
