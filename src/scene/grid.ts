import { DOCK_SPOT, FOOTPRINT, START_SPOTS, ZONES, type BuildingId } from '../data/layout'
import { seeded } from '../art/kit'
import { PLATEAU_D, coastWorld, uvToWorld, worldToUv } from './world'

/**
 * The build grid. Cells are squares aligned with the world axes, so on screen
 * they form the familiar diamond pattern of a builder game. Buildings, the
 * overgrowth that has to be cleared, and the dirt roads all live on it.
 */

export const CELL = 1.5

export interface CellPos {
  i: number
  j: number
}

const key = (i: number, j: number) => (i + 256) * 512 + (j + 256)
export const cellKey = key

/** Centre of a square footprint whose corner cell is (i, j). */
export function footprintCenter(i: number, j: number, size: number): [number, number] {
  return [(i + size / 2) * CELL, (j + size / 2) * CELL]
}
export function buildingCenter(id: BuildingId, at: CellPos): [number, number] {
  return footprintCenter(at.i, at.j, FOOTPRINT[id])
}
export function worldToCell(x: number, z: number): CellPos {
  return { i: Math.floor(x / CELL), j: Math.floor(z / CELL) }
}
/** Corner cell that centres a footprint of `size` on a world point. */
export function cellForCenter(x: number, z: number, size: number): CellPos {
  return { i: Math.round(x / CELL - size / 2), j: Math.round(z / CELL - size / 2) }
}

const landCache = new Map<number, boolean>()
/** Flat, buildable plateau (not beach, bank or water). */
export function isLand(i: number, j: number): boolean {
  const k = key(i, j)
  let v = landCache.get(k)
  if (v === undefined) {
    v = coastWorld((i + 0.5) * CELL, (j + 0.5) * CELL) < PLATEAU_D - 0.5
    landCache.set(k, v)
  }
  return v
}

// ------------------------------------------------------------------ zones
/** Which zone a cell belongs to (0 = the starting land in the west). */
export function zoneOfCell(i: number, j: number): number {
  const v = worldToUv((i + 0.5) * CELL, (j + 0.5) * CELL)[1]
  let z = 0
  for (let n = 1; n < ZONES.length; n++) if (v >= ZONES[n].fromV) z = n
  return z
}

// ------------------------------------------------------------------ the dock and the start layout
/** The dock: a square deck of cells on the south shore with a jetty running out to sea. */
export const DOCK_SIZE = 8
export const DOCK: CellPos = cellForCenter(...uvToWorld(DOCK_SPOT[0], DOCK_SPOT[1]), DOCK_SIZE)
export const JETTY = { i: DOCK.i + DOCK_SIZE, j: DOCK.j + 4, len: 6, wide: 2 }
/** The market's fixed spot in the middle of the deck. */
export const MARKET_AT: CellPos = { i: DOCK.i + 2, j: DOCK.j + 1 }

const dockCells = new Set<number>()
for (let a = 0; a < DOCK_SIZE; a++) for (let b = 0; b < DOCK_SIZE; b++) dockCells.add(key(DOCK.i + a, DOCK.j + b))
export function isDock(i: number, j: number): boolean {
  return dockCells.has(key(i, j))
}

export function startLayout(): Partial<Record<BuildingId, CellPos>> {
  const out: Partial<Record<BuildingId, CellPos>> = { partsMarket: MARKET_AT }
  for (const id of Object.keys(START_SPOTS) as BuildingId[]) {
    const [x, z] = uvToWorld(START_SPOTS[id][0], START_SPOTS[id][1])
    out[id] = cellForCenter(x, z, FOOTPRINT[id])
  }
  return out
}

// ------------------------------------------------------------------ overgrowth
export type ObstacleKind = 'thicket' | 'boulder' | 'rock' | 'stump' | 'scrap' | 'deadTree'

export interface Obstacle {
  id: string
  kind: ObstacleKind
  i: number
  j: number
  /** side length in cells */
  size: number
  rot: number
  scale: number
  /** which part of the island it stands in */
  zone: number
}

export const OBSTACLE_INFO: Record<ObstacleKind, { name: string; size: number; cost: number; xp: number }> = {
  thicket: { name: 'Overgrown thicket', size: 2, cost: 30, xp: 1 },
  boulder: { name: 'Boulder', size: 2, cost: 45, xp: 1 },
  rock: { name: 'Rock', size: 1, cost: 15, xp: 0 },
  stump: { name: 'Old stump', size: 1, cost: 15, xp: 0 },
  scrap: { name: 'Rusty scrap pile', size: 2, cost: 35, xp: 1 },
  deadTree: { name: 'Dead tree', size: 1, cost: 20, xp: 0 },
}

let obstacleCache: Obstacle[] | null = null
/** The overgrowth an abandoned spaceport starts with. Deterministic, so only cleared ids are saved. */
export function allObstacles(): Obstacle[] {
  if (obstacleCache) return obstacleCache
  const rnd = seeded(2026)
  const taken = new Set<number>()
  const start = startLayout()
  // keep the old buildings, a little yard around each, and the dock clear
  for (const id of Object.keys(start) as BuildingId[]) {
    const at = start[id]!
    const n = FOOTPRINT[id]
    for (let i = at.i - 2; i < at.i + n + 2; i++) for (let j = at.j - 2; j < at.j + n + 2; j++) taken.add(key(i, j))
  }
  for (let i = DOCK.i - 2; i < DOCK.i + DOCK_SIZE + 2; i++) for (let j = DOCK.j - 2; j < DOCK.j + DOCK_SIZE + 2; j++) taken.add(key(i, j))
  const kinds: ObstacleKind[] = ['thicket', 'thicket', 'thicket', 'boulder', 'rock', 'rock', 'stump', 'scrap', 'deadTree', 'deadTree']
  const out: Obstacle[] = []
  let tries = 0
  while (out.length < 150 && tries < 9000) {
    tries++
    const kind = kinds[Math.floor(rnd() * kinds.length)]
    const size = OBSTACLE_INFO[kind].size
    const i = Math.floor(-46 + rnd() * 92)
    const j = Math.floor(-46 + rnd() * 92)
    let ok = true
    for (let a = 0; a < size && ok; a++) for (let b = 0; b < size && ok; b++) if (!isLand(i + a, j + b) || taken.has(key(i + a, j + b))) ok = false
    if (!ok) continue
    // the starting land is only lightly overgrown; the fenced-off east is wild
    if (zoneOfCell(i, j) === 0 && rnd() < 0.55) continue
    for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) taken.add(key(i + a, j + b))
    out.push({ id: `${kind}${out.length}`, kind, i, j, size, rot: rnd() * Math.PI * 2, scale: 0.85 + rnd() * 0.35, zone: zoneOfCell(i, j) })
  }
  obstacleCache = out
  return out
}

// ------------------------------------------------------------------ occupancy and placement
export type Placed = Partial<Record<BuildingId, CellPos>>

/** Cells taken by buildings and by overgrowth that hasn't been cleared. */
export function occupancy(placed: Placed, cleared: string[], ignore?: BuildingId): Set<number> {
  const occ = new Set<number>()
  for (const id of Object.keys(placed) as BuildingId[]) {
    if (id === ignore) continue
    const at = placed[id]!
    const n = FOOTPRINT[id]
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) occ.add(key(at.i + a, at.j + b))
  }
  for (const k of dockCells) occ.add(k)
  const gone = new Set(cleared)
  for (const o of allObstacles()) {
    if (gone.has(o.id)) continue
    for (let a = 0; a < o.size; a++) for (let b = 0; b < o.size; b++) occ.add(key(o.i + a, o.j + b))
  }
  return occ
}

/** Why a building can't go here, or null when the spot is free. */
export function placementProblem(id: BuildingId, at: CellPos, occ: Set<number>, zones = ZONES.length): string | null {
  const n = FOOTPRINT[id]
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      if (!isLand(at.i + a, at.j + b)) return 'Too close to the shore'
      if (zoneOfCell(at.i + a, at.j + b) >= zones) return 'That land is still fenced off'
      if (occ.has(key(at.i + a, at.j + b))) return 'Something is in the way'
    }
  return null
}

/** A free spot for a footprint near a starting cell (spiral search). */
export function nearestFree(id: BuildingId, from: CellPos, occ: Set<number>, zones = ZONES.length): CellPos {
  for (let r = 0; r < 30; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const at = { i: from.i + di, j: from.j + dj }
        if (!placementProblem(id, at, occ, zones)) return at
      }
  return from
}
