import * as THREE from 'three'

/**
 * World geometry helpers: the island frame, the coastline signed-distance
 * function, and ground heights. Pure math, shared by terrain, water, props
 * and the camera.
 *
 * Level design is done in an island frame (u, v) so the base fills a landscape
 * screen, while buildings stay axis-aligned in world space and show two faces
 * to the camera.
 */

export const CAMERA_YAW = THREE.MathUtils.degToRad(38)
export const CAMERA_TILT = THREE.MathUtils.degToRad(44)
export const CAMERA_FOV = 30

/** Unit vector on the ground pointing screen-right. */
export const RIGHT = new THREE.Vector2(Math.cos(CAMERA_YAW), -Math.sin(CAMERA_YAW))
/** Unit vector on the ground pointing screen-up (away from the camera). */
export const FWD = new THREE.Vector2(-Math.sin(CAMERA_YAW), -Math.cos(CAMERA_YAW))

/** Ground level of the plateau where buildings stand. */
export const GROUND_Y = 0
export const WATER_Y = -1.32

/**
 * Island frame axes in world space. The game is landscape: the island's long
 * axis (v, with the launch pad at +v) runs screen-right, and its short axis (u)
 * runs towards the camera. Level design stays in (u, v); only this basis knows
 * how the island sits on screen.
 */
export const ISLAND_U = new THREE.Vector2(-FWD.x, -FWD.y)
export const ISLAND_V = new THREE.Vector2(RIGHT.x, RIGHT.y)

/** Island frame (u, v) → world (x, z). */
export function uvToWorld(u: number, v: number): [number, number] {
  return [ISLAND_U.x * u + ISLAND_V.x * v, ISLAND_U.y * u + ISLAND_V.y * v]
}
export function uvToVec3(u: number, v: number, y = 0): THREE.Vector3 {
  const [x, z] = uvToWorld(u, v)
  return new THREE.Vector3(x, y, z)
}
/** World (x, z) → island frame (u, v). */
export function worldToUv(x: number, z: number): [number, number] {
  return [ISLAND_U.x * x + ISLAND_U.y * z, ISLAND_V.x * x + ISLAND_V.y * z]
}

// ---------- noise ----------
function hash2(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 100000) / 100000
}
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
export function fbm(x: number, y: number, octaves = 3): number {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, y * f)
    f *= 2.03
    amp *= 0.5
  }
  return sum / (1 - Math.pow(0.5, octaves))
}

// ---------- coastline ----------
function sdRoundBox(px: number, py: number, hx: number, hy: number, r: number): number {
  const qx = Math.abs(px) - hx + r
  const qy = Math.abs(py) - hy + r
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r
}
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/** Width of sand between the waterline and the grassy bank. */
export const BEACH_W = 1.9
/** Width of the grassy bank that climbs to the plateau. */
export const BANK_W = 1.5
/** Anything with coast distance below this is flat, buildable plateau. */
export const PLATEAU_D = -(BEACH_W + BANK_W)

/**
 * Signed distance to the waterline in island-frame coordinates.
 * Negative on land, positive at sea.
 */
export function coastUv(u: number, v: number): number {
  // main body of the headland
  let d = sdRoundBox(u, v + 2.5, 12.0, 25.0, 8.5)
  // launch pad promontory
  const pad = Math.hypot(u - 2.6, v - 19.6) - 9.6
  d = smin(d, pad, 5)
  // a small bay on the west side for a proper beach
  const bay = Math.hypot(u + 16.2, v - 12.4) - 5.4
  d = -smin(-d, bay, 3)
  // organic wobble
  d += 0.75 * Math.sin(u * 0.33 + 1.3) * Math.cos(v * 0.24 - 0.4)
  d += 0.45 * Math.sin(v * 0.61 + u * 0.37 + 2.1)
  d += (fbm(u * 0.22 + 7.1, v * 0.22 - 3.4, 2) - 0.5) * 1.3
  return d
}
export function coastWorld(x: number, z: number): number {
  const [u, v] = worldToUv(x, z)
  return coastUv(u, v)
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Terrain height from coast distance. */
export function heightFromCoast(d: number): number {
  if (d <= PLATEAU_D) return GROUND_Y
  const beachTop = WATER_Y + 0.34
  if (d <= -BEACH_W) {
    // grassy bank
    const t = smoothstep(PLATEAU_D, -BEACH_W, d)
    return GROUND_Y + (beachTop - GROUND_Y) * t
  }
  if (d <= 0) {
    // beach
    const t = (d + BEACH_W) / BEACH_W
    return beachTop + (WATER_Y - 0.04 - beachTop) * t * t * 0.6 + (WATER_Y - 0.04 - beachTop) * t * 0.4
  }
  // seabed
  return WATER_Y - 0.04 - Math.min(2.2, d * 0.32)
}

export function groundHeightUv(u: number, v: number): number {
  return heightFromCoast(coastUv(u, v))
}
export function groundHeightWorld(x: number, z: number): number {
  return heightFromCoast(coastWorld(x, z))
}

/** Region (in island frame) baked into the coast-distance texture for the water shader. */
export const SDF_REGION = { u0: -48, v0: -62, w: 96, h: 124 }
