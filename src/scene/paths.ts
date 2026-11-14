import { PATH_W, PLOTS, SPINE, SPINE_W, type BuildingId } from '../data/layout'

/** Path network in island-frame coordinates: the road spine plus a branch to each plot's door. */
export interface PathSeg {
  a: [number, number]
  b: [number, number]
  w: number
}

function closestOnSeg(p: [number, number], a: [number, number], b: [number, number]): [number, number] {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1)))
  return [a[0] + abx * t, a[1] + aby * t]
}

export function closestOnSpine(p: [number, number]): [number, number] {
  let best: [number, number] = SPINE[0]
  let bd = Infinity
  for (let i = 0; i < SPINE.length - 1; i++) {
    const c = closestOnSeg(p, SPINE[i], SPINE[i + 1])
    const d = Math.hypot(c[0] - p[0], c[1] - p[1])
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

/** Door position of a plot in island frame. */
export function doorOf(id: BuildingId): [number, number] {
  const p = PLOTS[id]
  return [p.u + p.door[0], p.v + p.door[1]]
}

export const PATH_SEGS: PathSeg[] = (() => {
  const segs: PathSeg[] = []
  for (let i = 0; i < SPINE.length - 1; i++) segs.push({ a: SPINE[i], b: SPINE[i + 1], w: SPINE_W })
  for (const id of Object.keys(PLOTS) as BuildingId[]) {
    const door = doorOf(id)
    const plot = PLOTS[id]
    const join = closestOnSpine(door)
    // spine → door → a short stub towards the building
    segs.push({ a: join, b: door, w: PATH_W })
    const stub: [number, number] = [door[0] - plot.door[0] * 0.35, door[1] - plot.door[1] * 0.35]
    segs.push({ a: door, b: stub, w: PATH_W })
  }
  return segs
})()

/** Distance from a point to the nearest path edge (negative = on a path). */
export function pathDistance(u: number, v: number): number {
  let best = Infinity
  for (const s of PATH_SEGS) {
    const c = closestOnSeg([u, v], s.a, s.b)
    best = Math.min(best, Math.hypot(c[0] - u, c[1] - v) - s.w / 2)
  }
  return best
}

/** Distance to the nearest plot's clearance circle (negative = inside a plot). */
export function plotDistance(u: number, v: number): number {
  let best = Infinity
  for (const p of Object.values(PLOTS)) best = Math.min(best, Math.hypot(p.u - u, p.v - v) - p.radius)
  return best
}
