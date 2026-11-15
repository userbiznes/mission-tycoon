import type { RegionId } from '../data/regions'
import { PLATEAU_D, coastUv, heightFromCoast, vnoise, worldToUv } from './world'

/**
 * The lie of the land beyond the old spaceport: where the three lost regions
 * are, the natural borders between them (a creek, a rocky ridge, a change in
 * the trees) and the relief those borders are made of. Pure math, in the
 * island frame (u towards the camera, v along the island).
 */

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// ------------------------------------------------------------------ borders
/** The creek: it wanders from the north shore to the south, and everything east of it is wild. */
export function creekV(u: number): number {
  return -2.6 + 1.9 * Math.sin(u * 0.2 + 1.9) + 0.9 * Math.sin(u * 0.47 + 0.6)
}
/** The rocky ridge between the tracking station's hill country (north of it) and the annex woods. */
export function ridgeU(v: number): number {
  return 2.6 + 1.6 * Math.sin(v * 0.28 + 0.8) + 0.8 * Math.sin(v * 0.67 + 2.4)
}
/** Where the broadleaf woods give way to the dry pine scrub of the east tip. */
export function eastV(u: number): number {
  return 23 + 2.0 * Math.sin(u * 0.19 + 2.0) + 1.0 * Math.sin(u * 0.45 + 0.3)
}

/** Which lost region a point belongs to; null on the old spaceport's side of the creek. */
export function regionAt(u: number, v: number): RegionId | null {
  if (v < creekV(u)) return null
  if (v > eastV(u)) return 'heavy'
  return u < ridgeU(v) ? 'tracking' : 'annex'
}
export function regionAtWorld(x: number, z: number): RegionId | null {
  const [u, v] = worldToUv(x, z)
  return regionAt(u, v)
}

/** Soft membership of each region (tracking, annex, heavy), for tinting: fades in across the borders. */
export function regionWeights(u: number, v: number): [number, number, number] {
  const past = smoothstep(-0.4, 1.8, v - creekV(u))
  const east = smoothstep(-1.2, 1.2, v - eastV(u))
  const north = smoothstep(-1.2, 1.2, ridgeU(v) - u)
  return [past * (1 - east) * north, past * (1 - east) * (1 - north), past * east]
}

// ------------------------------------------------------------------ relief
/** The tracking station's hill: a flat top for the dish, gentle shoulders. */
export const HILL = { u: -3.2, v: 3.6, h: 2.1, top: 3.0, base: 5.5 }

export function hillHeight(u: number, v: number): number {
  const d = Math.hypot(u - HILL.u, v - HILL.v) + (vnoise(u * 0.5 + 3, v * 0.5 - 7) - 0.5) * 0.9
  return HILL.h * (1 - smoothstep(HILL.top, HILL.base, d))
}
/** A low spine of rock along the ridge, fading out before it reaches the creek and the east woods. */
export function spineHeight(u: number, v: number): number {
  const along = smoothstep(creekV(u) + 1.5, creekV(u) + 4.5, v) * (1 - smoothstep(eastV(u) - 4, eastV(u) - 1.5, v))
  const off = (u - ridgeU(v)) / 1.25
  return 0.62 * along * Math.exp(-off * off) * (0.7 + 0.6 * vnoise(v * 0.8, u * 0.8 + 11))
}
/** How far below the meadow the creek bed lies at this point (0 away from it). */
export function creekDepth(u: number, v: number): number {
  return 0.46 * (1 - smoothstep(0.3, 1.25, Math.abs(v - creekV(u))))
}

/** Height added to the plain meadow by hills and ridges (not counting the creek). */
export function rise(u: number, v: number): number {
  return hillHeight(u, v) + spineHeight(u, v)
}

/** Ground height anywhere on the island, relief included. */
export function terrainHeightUv(u: number, v: number): number {
  const d = coastUv(u, v)
  const base = heightFromCoast(d)
  if (d > 0) return base
  // hills only rise from the flat plateau; the creek runs all the way down to the sea
  const inland = smoothstep(PLATEAU_D + 1.6, PLATEAU_D - 1.2, d)
  return base + rise(u, v) * inland - creekDepth(u, v) * smoothstep(0, -1.2, d)
}
export function terrainHeightWorld(x: number, z: number): number {
  const [u, v] = worldToUv(x, z)
  return terrainHeightUv(u, v)
}

/** True where the ground is not flat meadow: hill slopes, the ridge, the creek bed. Nothing is built there. */
export function isRelief(u: number, v: number): boolean {
  return rise(u, v) > 0.07 || Math.abs(v - creekV(u)) < 1.55
}
