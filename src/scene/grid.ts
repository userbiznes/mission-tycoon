import { FOOTPRINT, GATE_SPOT, START_SPOTS, type BuildingId } from '../data/layout'
import { seeded } from '../art/kit'
import { PLATEAU_D, coastWorld, uvToWorld } from './world'

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

// ------------------------------------------------------------------ start layout
export const GATE: CellPos = worldToCell(...uvToWorld(GATE_SPOT[0], GATE_SPOT[1]))

export function startLayout(): Partial<Record<BuildingId, CellPos>> {
  const out: Partial<Record<BuildingId, CellPos>> = {}
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
  // keep the old buildings, their front yards and the gate clear
  for (const id of Object.keys(start) as BuildingId[]) {
    const at = start[id]!
    const n = FOOTPRINT[id]
    for (let i = at.i - 1; i < at.i + n + 1; i++) for (let j = at.j - 1; j < at.j + n + 2; j++) taken.add(key(i, j))
  }
  for (let i = GATE.i - 2; i <= GATE.i + 2; i++) for (let j = GATE.j - 2; j <= GATE.j + 2; j++) taken.add(key(i, j))
  // and keep the first dirt tracks (and their verges) open
  {
    const occ = new Set<number>()
    for (const id of Object.keys(start) as BuildingId[]) {
      const at = start[id]!
      const n = FOOTPRINT[id]
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) occ.add(key(at.i + a, at.j + b))
    }
    const roads = new Set<number>()
    for (const id of Object.keys(start) as BuildingId[]) {
      for (const c of findRoute(GATE, doorCell(id, start[id]!, occ), occ, roads)) {
        roads.add(key(c.i, c.j))
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) taken.add(key(c.i + a, c.j + b))
      }
    }
  }
  const kinds: ObstacleKind[] = ['thicket', 'thicket', 'thicket', 'boulder', 'rock', 'rock', 'stump', 'scrap', 'deadTree', 'deadTree']
  const out: Obstacle[] = []
  let tries = 0
  while (out.length < 120 && tries < 6000) {
    tries++
    const kind = kinds[Math.floor(rnd() * kinds.length)]
    const size = OBSTACLE_INFO[kind].size
    const i = Math.floor(-46 + rnd() * 92)
    const j = Math.floor(-46 + rnd() * 92)
    let ok = true
    for (let a = 0; a < size && ok; a++) for (let b = 0; b < size && ok; b++) if (!isLand(i + a, j + b) || taken.has(key(i + a, j + b))) ok = false
    if (!ok) continue
    for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) taken.add(key(i + a, j + b))
    out.push({ id: `${kind}${out.length}`, kind, i, j, size, rot: rnd() * Math.PI * 2, scale: 0.85 + rnd() * 0.35 })
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
  const gone = new Set(cleared)
  for (const o of allObstacles()) {
    if (gone.has(o.id)) continue
    for (let a = 0; a < o.size; a++) for (let b = 0; b < o.size; b++) occ.add(key(o.i + a, o.j + b))
  }
  return occ
}

/** Why a building can't go here, or null when the spot is free. */
export function placementProblem(id: BuildingId, at: CellPos, occ: Set<number>): string | null {
  const n = FOOTPRINT[id]
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      if (!isLand(at.i + a, at.j + b)) return 'Too close to the shore'
      if (occ.has(key(at.i + a, at.j + b))) return 'Something is in the way'
    }
  return null
}

/** A free spot for a footprint near a starting cell (spiral search). */
export function nearestFree(id: BuildingId, from: CellPos, occ: Set<number>): CellPos {
  for (let r = 0; r < 30; r++)
    for (let di = -r; di <= r; di++)
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const at = { i: from.i + di, j: from.j + dj }
        if (!placementProblem(id, at, occ)) return at
      }
  return from
}

// ------------------------------------------------------------------ roads
/** The cell in front of a building's door (its +Z side), or the nearest free cell around it. */
export function doorCell(id: BuildingId, at: CellPos, occ: Set<number>): CellPos {
  const n = FOOTPRINT[id]
  const free = (i: number, j: number) => isLand(i, j) && !occ.has(key(i, j))
  const front = { i: at.i + Math.floor(n / 2), j: at.j + n }
  if (free(front.i, front.j)) return front
  for (let k = 0; k < n; k++) {
    const options: CellPos[] = [
      { i: at.i + k, j: at.j + n },
      { i: at.i + n, j: at.j + k },
      { i: at.i - 1, j: at.j + k },
      { i: at.i + k, j: at.j - 1 },
    ]
    for (const o of options) if (free(o.i, o.j)) return o
  }
  return front
}

/** A* over the grid. Cells already carrying a road are cheaper, so routes share one network. */
export function findRoute(from: CellPos, to: CellPos, occ: Set<number>, roads: Set<number>): CellPos[] {
  const start = key(from.i, from.j)
  const goal = key(to.i, to.j)
  const open: { k: number; i: number; j: number; f: number }[] = [{ k: start, i: from.i, j: from.j, f: 0 }]
  const g = new Map<number, number>([[start, 0]])
  const prev = new Map<number, number>()
  const pos = new Map<number, CellPos>([[start, from]])
  let guard = 0
  while (open.length && guard++ < 20000) {
    let bi = 0
    for (let n = 1; n < open.length; n++) if (open[n].f < open[bi].f) bi = n
    const cur = open.splice(bi, 1)[0]
    if (cur.k === goal) {
      const path: CellPos[] = []
      let k: number | undefined = goal
      while (k !== undefined) {
        path.push(pos.get(k)!)
        k = prev.get(k)
      }
      return path.reverse()
    }
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const i = cur.i + di
      const j = cur.j + dj
      const k = key(i, j)
      if (k !== goal && (!isLand(i, j) || occ.has(k))) continue
      const cost = (g.get(cur.k) ?? 0) + (roads.has(k) ? 0.3 : 1)
      if (cost < (g.get(k) ?? Infinity)) {
        g.set(k, cost)
        prev.set(k, cur.k)
        pos.set(k, { i, j })
        open.push({ k, i, j, f: cost + (Math.abs(i - to.i) + Math.abs(j - to.j)) * 0.3 })
      }
    }
  }
  return [from, to]
}

export interface RoadNetwork {
  /** every cell that carries a dirt road */
  cells: CellPos[]
  /** the route from the gate to each building's door */
  routes: Partial<Record<BuildingId, CellPos[]>>
}

/** Dirt roads grow on their own: one track from the pier to every building's front door. */
export function roadNetwork(placed: Placed, cleared: string[]): RoadNetwork {
  const occ = occupancy(placed, cleared)
  const roads = new Set<number>()
  const cells: CellPos[] = []
  const routes: Partial<Record<BuildingId, CellPos[]>> = {}
  const ids = (Object.keys(placed) as BuildingId[]).sort((a, b) => (a === 'partsMarket' ? -1 : b === 'partsMarket' ? 1 : 0))
  for (const id of ids) {
    const route = findRoute(GATE, doorCell(id, placed[id]!, occ), occ, roads)
    routes[id] = route
    for (const c of route) {
      const k = key(c.i, c.j)
      if (!roads.has(k)) {
        roads.add(k)
        cells.push(c)
      }
    }
  }
  return { cells, routes }
}
