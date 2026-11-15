import { REGIONS, REGION_IDS, type RegionId } from '../data/regions'
import { seeded } from '../art/kit'
import { creekV, eastV, regionAt, ridgeU, terrainHeightUv } from './relief'
import { PLATEAU_D, coastUv, uvToWorld, vnoise } from './world'

/**
 * The forest that took the old spaceport back. Planted once, deterministically:
 * a dense dark wall along the borders, then woods that change character from
 * region to region, broken by clearings, ferns, fallen logs and mossy boulders.
 * Every plant knows when the clearing crew reaches it.
 */

export type PlantKind = 'round' | 'pine' | 'giant' | 'scrub' | 'dead' | 'fern' | 'log' | 'boulder'
export const PLANT_KINDS: PlantKind[] = ['round', 'pine', 'giant', 'scrub', 'dead', 'fern', 'log', 'boulder']

export interface Plant {
  kind: PlantKind
  region: RegionId
  x: number
  y: number
  z: number
  s: number
  rot: number
  /** share of the clearing (0–1) at which the crew reaches it; −1 = it stays for good */
  removeAt: number
  /** direction it falls (world x, z), away from where the crew came in */
  fx: number
  fz: number
  /** a felled tree leaves a stack of logs here */
  pile: boolean
}

/** Distance from the expedition signpost to the farthest plant, per region (sets the pace of the clearing). */
export const CLEAR_REACH: Record<RegionId, number> = { tracking: 1, annex: 1, heavy: 1 }

/** Ground each ruin stands on, kept free of trees: half-extents along world x and z from the site. */
const SITE_CLEAR: Record<RegionId, [number, number]> = { tracking: [3.2, 3.2], annex: [4.2, 3.3], heavy: [5.5, 4.2] }

let cache: Plant[] | null = null

export function plantForest(): Plant[] {
  if (cache) return cache
  const rnd = seeded(4242)
  const out: Plant[] = []
  const taken: [number, number, number][] = []
  const free = (u: number, v: number, r: number) => {
    for (const [tu, tv, tr] of taken) if (Math.hypot(u - tu, v - tv) < (r + tr) * 0.5) return false
    return true
  }
  const pick = <T>(list: [T, number][]): T => {
    let x = rnd() * list.reduce((n, [, w]) => n + w, 0)
    for (const [item, w] of list) {
      x -= w
      if (x <= 0) return item
    }
    return list[0][0]
  }
  const SPACE: Record<PlantKind, number> = { round: 1.5, pine: 1.3, giant: 1.9, scrub: 1.7, dead: 1.2, fern: 0.8, log: 2.0, boulder: 1.9 }
  const SCALE: Record<PlantKind, [number, number]> = { round: [0.95, 1.5], pine: [1.0, 1.6], giant: [0.95, 1.35], scrub: [0.95, 1.4], dead: [0.9, 1.3], fern: [0.8, 1.5], log: [0.8, 1.2], boulder: [0.6, 1.15] }

  let tries = 0
  while (out.length < 900 && tries++ < 26000) {
    const u = -30 + rnd() * 54
    const v = -8 + rnd() * 62
    const region = regionAt(u, v)
    if (!region) continue
    const d = coastUv(u, v)
    if (d > PLATEAU_D + 0.5) continue
    const def = REGIONS[region]
    const [wx, wz] = uvToWorld(u, v)
    const [cx, cz] = uvToWorld(def.site[0], def.site[1])
    if (Math.abs(wx - cx) < SITE_CLEAR[region][0] && Math.abs(wz - cz) < SITE_CLEAR[region][1]) continue
    const pastCreek = v - creekV(u)
    if (pastCreek < 1.35) continue

    const onRidge = Math.abs(u - ridgeU(v)) < 1.4 && region !== 'heavy'
    const pastEast = v - eastV(u)
    // the natural wall: just over the creek, and where the east woods begin
    const wall = pastCreek < 5.2 || (region === 'heavy' && pastEast < 3.6)
    // clearings open up where the noise runs high
    const open = vnoise(u * 0.17 + 5, v * 0.17 - 3) > 0.64 && !wall && !onRidge
    // the woods thin out a little towards the middle of each region
    if (!wall && !onRidge && !open && rnd() < 0.3) continue

    let kind: PlantKind
    if (onRidge) kind = pick([['boulder', 5], ['pine', 2], ['fern', 2]])
    else if (wall) {
      kind =
        region === 'heavy'
          ? pick([['scrub', 4], ['pine', 4], ['boulder', 1.4], ['log', 1.2], ['dead', 1], ['fern', 1.5]])
          : pick([['giant', 5], ['round', 2.4], ['fern', 2.2], ['boulder', 1.3], ['log', 1.3]])
    } else if (open) {
      if (rnd() < 0.45) continue
      kind = pick([['fern', 5], ['dead', 1.6], ['boulder', 1], ['log', 1.2]])
    } else if (region === 'tracking') kind = pick([['pine', 5.5], ['round', 3], ['fern', 1.4], ['dead', 0.5], ['log', 0.4]])
    else if (region === 'annex') kind = pick([['round', 5.5], ['giant', 1.6], ['pine', 0.8], ['fern', 2], ['log', 0.5]])
    else kind = pick([['scrub', 5], ['pine', 2.6], ['dead', 1], ['fern', 1], ['boulder', 0.5], ['log', 0.4]])

    const space = SPACE[kind] * (wall ? 0.72 : 1)
    if (!free(u, v, space)) continue
    taken.push([u, v, space])

    const x = wx
    const z = wz
    const [s0, s1] = SCALE[kind]
    const [sx, sz] = uvToWorld(def.sign[0], def.sign[1])
    const dist = Math.hypot(x - sx, z - sz)
    CLEAR_REACH[region] = Math.max(CLEAR_REACH[region], dist)
    // ridge rock and the trees right on the coast stay for good; everything else falls to the crew
    const keeps = (onRidge && kind === 'boulder') || d > PLATEAU_D - 0.9
    const tree = kind === 'round' || kind === 'pine' || kind === 'giant' || kind === 'scrub'
    out.push({
      kind,
      region,
      x,
      z,
      y: terrainHeightUv(u, v) - (kind === 'boulder' ? 0.08 : 0),
      s: (s0 + rnd() * (s1 - s0)) * (wall && tree ? 1.12 : 1),
      rot: rnd() * Math.PI * 2,
      removeAt: keeps ? -1 : dist,
      fx: (x - sx) / (dist || 1),
      fz: (z - sz) / (dist || 1),
      pile: tree && rnd() < 0.34,
    })
  }
  // turn distances into a schedule: the crew works outwards from the signpost
  for (const p of out) {
    if (p.removeAt < 0) continue
    p.removeAt = Math.min(0.93, 0.05 + 0.86 * (p.removeAt / CLEAR_REACH[p.region]) + (rnd() - 0.5) * 0.04)
  }
  cache = out
  return out
}

/** How many plants of each kind there are (instanced meshes are sized from this). */
export function plantCounts(plants: Plant[]): Record<PlantKind, number> {
  const n = Object.fromEntries(PLANT_KINDS.map((k) => [k, 0])) as Record<PlantKind, number>
  for (const p of plants) n[p.kind]++
  return n
}

export { REGION_IDS }
