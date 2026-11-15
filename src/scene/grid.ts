import { DOCK_SPOT, FOOTPRINT, START_SPOTS, type BuildingId } from '../data/layout'
import { REGIONS, REGION_IDS, type RegionId } from '../data/regions'
import { seeded } from '../art/kit'
import { isRelief, regionAt } from './relief'
import { PLATEAU_D, coastUv, uvToWorld, worldToUv } from './world'

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
  // the market is a fixed landmark on the quay, not on the grid
  if (id === 'partsMarket') return MARKET_WORLD
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
    const [cu, cv] = worldToUv((i + 0.5) * CELL, (j + 0.5) * CELL)
    v = coastUv(cu, cv) < PLATEAU_D - 0.5 && !isRelief(cu, cv)
    landCache.set(k, v)
  }
  return v
}

// ------------------------------------------------------------------ regions
/** Which lost region a cell belongs to; null on the old spaceport's side of the creek. */
export function regionOfCell(i: number, j: number): RegionId | null {
  const [u, v] = worldToUv((i + 0.5) * CELL, (j + 0.5) * CELL)
  return regionAt(u, v)
}

/** Ground each landmark stands on: half-extents along world x and z from its site. */
const SITE_HALF: Record<RegionId, [number, number]> = { tracking: [3.5, 3.5], annex: [4.3, 3.4], heavy: [5.6, 4.4] }
/** True for cells kept clear for the landmarks and the expedition signposts. */
function isReserved(i: number, j: number): boolean {
  const x = (i + 0.5) * CELL
  const z = (j + 0.5) * CELL
  return REGION_IDS.some((id) => {
    const r = REGIONS[id]
    const [sx, sz] = uvToWorld(r.site[0], r.site[1])
    const [px, pz] = uvToWorld(r.sign[0], r.sign[1])
    return (Math.abs(x - sx) < SITE_HALF[id][0] && Math.abs(z - sz) < SITE_HALF[id][1]) || Math.hypot(x - px, z - pz) < 1.3
  })
}

// ------------------------------------------------------------------ the dock and the start layout
/**
 * The dock is a quay built along the south shore, so it is laid out in its own
 * frame: local X runs along the shore (screen-right), local Z runs out to sea
 * (towards the camera). The Parts Market stands on it, facing the water.
 */
export const DOCK_CENTER: [number, number] = uvToWorld(DOCK_SPOT[0], DOCK_SPOT[1])
export const DOCK_YAW = Math.PI / 4
/** The plank deck: `x` is its centre along the shore, `w` × `d` its size. */
export const DECK = { x: 1.0, w: 13.8, d: 8.0 }
/**
 * The pier runs west (local −X, screen-left) from the deck's left edge, where
 * the bay is open and the whole of it shows in the home view. It ends in a
 * wider head where the crane stands; the cargo boat ties up across its end.
 */
export const PIER = { z: 2.0, w: 2.6, len: 6.0, headLen: 2.6, headW: 3.8 }
export const DECK_LEFT = DECK.x - DECK.w / 2
export const PIER_END = DECK_LEFT - PIER.len
/** Where the cargo boat lies when it is tied up (dock-local), bow towards the camera. */
export const BERTH: [number, number] = [PIER_END - 1.2, PIER.z + 0.1]
const DC = Math.SQRT1_2
/** Dock-local (x along shore, z out to sea) → world (x, z). */
export function dockWorld(lx: number, lz: number): [number, number] {
  return [DOCK_CENTER[0] + DC * lx + DC * lz, DOCK_CENTER[1] - DC * lx + DC * lz]
}
export function dockLocal(x: number, z: number): [number, number] {
  const dx = x - DOCK_CENTER[0]
  const dz = z - DOCK_CENTER[1]
  return [DC * dx - DC * dz, DC * dx + DC * dz]
}
/** On or right beside the quay or its pier: nothing else may stand or grow here. */
export function nearDock(x: number, z: number, margin = 1): boolean {
  const [lx, lz] = dockLocal(x, z)
  const onDeck = Math.abs(lx - DECK.x) < DECK.w / 2 + margin && lz > -DECK.d / 2 - margin - 1.6 && lz < DECK.d / 2 + margin
  const onPier = lx <= DECK_LEFT && lx > PIER_END - margin && Math.abs(lz - PIER.z) < PIER.headW / 2 + margin
  return onDeck || onPier
}
export function isDock(i: number, j: number): boolean {
  return nearDock((i + 0.5) * CELL, (j + 0.5) * CELL, 0.6)
}
/** The market's fixed spot on the deck: the middle of the hall's shop front. */
export const MARKET_LOCAL: [number, number] = [1.2, -0.9]
export const MARKET_WORLD: [number, number] = dockWorld(MARKET_LOCAL[0], MARKET_LOCAL[1])
/** Island-frame point that frames the whole harbour: market, pier and berth. */
export const HARBOUR_VIEW: [number, number] = [DOCK_SPOT[0] + 0.4, DOCK_SPOT[1] - 3.6]

export function startLayout(): Partial<Record<BuildingId, CellPos>> {
  const out: Partial<Record<BuildingId, CellPos>> = { partsMarket: worldToCell(MARKET_WORLD[0], MARKET_WORLD[1]) }
  for (const id of Object.keys(START_SPOTS) as BuildingId[]) {
    const [x, z] = uvToWorld(START_SPOTS[id][0], START_SPOTS[id][1])
    out[id] = cellForCenter(x, z, FOOTPRINT[id])
  }
  return out
}

let dockKeys: number[] | null = null
function dockCellKeys(): number[] {
  if (!dockKeys) {
    dockKeys = []
    const c = worldToCell(DOCK_CENTER[0], DOCK_CENTER[1])
    for (let i = c.i - 14; i <= c.i + 14; i++) for (let j = c.j - 14; j <= c.j + 14; j++) if (isDock(i, j)) dockKeys.push(key(i, j))
  }
  return dockKeys
}

let reservedKeys: number[] | null = null
function reservedCellKeys(): number[] {
  if (!reservedKeys) {
    reservedKeys = []
    for (let i = -60; i <= 60; i++) for (let j = -60; j <= 60; j++) if (isReserved(i, j)) reservedKeys.push(key(i, j))
  }
  return reservedKeys
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
  /** the lost region it stands in; null on the old spaceport */
  region: RegionId | null
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
    if (id === 'partsMarket') continue
    const at = start[id]!
    const n = FOOTPRINT[id]
    for (let i = at.i - 2; i < at.i + n + 2; i++) for (let j = at.j - 2; j < at.j + n + 2; j++) taken.add(key(i, j))
  }
  const kinds: ObstacleKind[] = ['thicket', 'thicket', 'thicket', 'boulder', 'rock', 'rock', 'stump', 'scrap', 'deadTree', 'deadTree']
  const out: Obstacle[] = []
  let tries = 0
  while (out.length < 84 && tries < 9000) {
    tries++
    const kind = kinds[Math.floor(rnd() * kinds.length)]
    const size = OBSTACLE_INFO[kind].size
    const i = Math.floor(-46 + rnd() * 92)
    const j = Math.floor(-46 + rnd() * 92)
    let ok = true
    for (let a = 0; a < size && ok; a++)
      for (let b = 0; b < size && ok; b++)
        if (!isLand(i + a, j + b) || taken.has(key(i + a, j + b)) || isReserved(i + a, j + b) || nearDock((i + a + 0.5) * CELL, (j + b + 0.5) * CELL, 3)) ok = false
    if (!ok) continue
    // a piece of overgrowth never straddles a border
    const region = regionOfCell(i, j)
    if (size > 1 && regionOfCell(i + size - 1, j + size - 1) !== region) continue
    // the starting land is only lightly overgrown; the land beyond the creek is wilder, but leaves room to build
    if (rnd() < (region === null ? 0.55 : 0.66)) continue
    for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) taken.add(key(i + a, j + b))
    out.push({ id: `${kind}${out.length}`, kind, i, j, size, rot: rnd() * Math.PI * 2, scale: 0.85 + rnd() * 0.35, region })
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
    if (id === ignore || id === 'partsMarket') continue
    const at = placed[id]!
    const n = FOOTPRINT[id]
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) occ.add(key(at.i + a, at.j + b))
  }
  for (const k of dockCellKeys()) occ.add(k)
  for (const k of reservedCellKeys()) occ.add(k)
  const gone = new Set(cleared)
  for (const o of allObstacles()) {
    if (gone.has(o.id)) continue
    for (let a = 0; a < o.size; a++) for (let b = 0; b < o.size; b++) occ.add(key(o.i + a, o.j + b))
  }
  return occ
}

/** Why a building can't go here, or null when the spot is free. */
export function placementProblem(id: BuildingId, at: CellPos, occ: Set<number>, open: (region: RegionId | null) => boolean = () => true): string | null {
  const n = FOOTPRINT[id]
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      if (!isLand(at.i + a, at.j + b)) return 'The ground is not flat enough here'
      if (!open(regionOfCell(at.i + a, at.j + b))) return 'That land is still wild. Reclaim it first'
      if (occ.has(key(at.i + a, at.j + b))) return 'Something is in the way'
    }
  return null
}

/** A free spot for a footprint near a starting cell (spiral search). */
export function nearestFree(id: BuildingId, from: CellPos, occ: Set<number>, open: (region: RegionId | null) => boolean = () => true): CellPos {
  for (let r = 0; r < 30; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const at = { i: from.i + di, j: from.j + dj }
        if (!placementProblem(id, at, occ, open)) return at
      }
  return from
}
