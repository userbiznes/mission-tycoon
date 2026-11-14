import * as THREE from 'three'
import { Kit } from '../kit'
import { logoPlate } from '../logo'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * The buildings, second edition: each one is a single bold shape in its own
 * colour with one signature feature that says what it is for.
 *
 *   Mission Control   blue control tower with a glass crown and a job board
 *   Integration Bay   teal barrel hangar with a satellite in the doorway
 *   Comms Center      one enormous white dish
 *   Parts Market      orange dockside depot with a gear-and-wrench sign
 *   Science Lab       white observatory dome on a violet drum
 *   Engineering Lab   slate workshop with a saw-tooth roof and a turning gear
 *   Crew Quarters     log cabin with a green roof and a washing line
 *
 * Front door on +Z. Level 1 of the old buildings carries a few honest patches.
 */

const lvl = (o: ModelOptions) => (o.level as number) ?? 1

function pad(k: Kit, w: number, d: number, color = palette.concreteDark, top = palette.concreteLight, r = 1.2) {
  k.slab(w, d, 0.14, r, { color, top, bevel: 0.05 })
}

/** A mismatched repair panel: the mark of an old building. */
function patch(k: Kit, at: [number, number, number], w: number, h: number, rotY = 0) {
  k.box(w, h, 0.06, { color: palette.rust, top: palette.rustLight, at, rot: [0, rotY, 0.08], r: 0.025 })
}

/** Half-cylinder roof with its axis along Z, sitting on y = 0. */
function barrel(radius: number, length: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, length, 28, 1, false, 0, Math.PI)
  g.rotateZ(Math.PI / 2)
  g.rotateY(Math.PI / 2)
  return g
}

/** Triangular prism: a gable with its ridge along Z. `w` wide, `h` tall, `len` long. */
function gable(w: number, h: number, len: number): THREE.BufferGeometry {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(w / 2, 0)
  s.lineTo(0, h)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: len - 0.16, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 })
  g.translate(0, 0, -(len - 0.16) / 2)
  return g
}

function flag(k: Kit, x: number, z: number, h: number): THREE.Mesh {
  k.cyl(0.05, 0.07, h, { color: palette.metalDark, top: palette.metalLight, at: [x, h / 2 + 0.14, z], bevel: 0.02, seg: 8 })
  k.sphere(0.09, { color: palette.yellow, at: [x, h + 0.2, z], seg: 8 })
  k.box(0.95, 0.62, 0.04, { color: palette.creamShade, top: palette.white, at: [x + 0.52, h - 0.22, z], r: 0.02 })
  const logo = logoPlate(0.5)
  logo.position.set(x + 0.52, h - 0.22, z + 0.03)
  return logo
}

// ------------------------------------------------------------------ Mission Control
export function createMissionControl(opts: ModelOptions = {}): THREE.Object3D {
  const old = lvl(opts) <= 1
  const k = new Kit()
  pad(k, 4.9, 4.9)
  // stout base drum
  k.cyl(1.55, 1.72, 1.7, { color: palette.creamShade, top: palette.cream, at: [0, 0.99, 0], bevel: 0.12, seg: 28 })
  k.box(0.78, 1.05, 0.2, { color: palette.navyDark, top: palette.navy, at: [0, 0.68, 1.6], r: 0.09 })
  k.sphere(0.05, { color: palette.yellow, at: [0.22, 0.68, 1.72], seg: 6 })
  for (const a of [-0.95, 0.95]) {
    k.sphere(0.3, { color: palette.glassDark, top: palette.glass, at: [Math.sin(a) * 1.58, 1.2, Math.cos(a) * 1.58], scale: [1, 1, 1], mat: 'glass', seg: 12 })
  }
  k.cyl(1.62, 1.62, 0.24, { color: palette.blueDark, top: palette.blue, at: [0, 1.84, 0], bevel: 0.06, seg: 28 })
  // neck and the glass crown
  k.cyl(1.05, 1.3, 0.55, { color: palette.creamShade, top: palette.cream, at: [0, 2.2, 0], bevel: 0.05, seg: 24 })
  k.cyl(2.1, 1.45, 1.15, { color: palette.glassDeep, top: palette.glass, at: [0, 3.04, 0], bevel: 0.05, seg: 28, mat: 'glass' })
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3
    k.beam([Math.cos(a) * 1.5, 2.5, Math.sin(a) * 1.5], [Math.cos(a) * 2.12, 3.6, Math.sin(a) * 2.12], 0.1, { color: palette.white, round: true })
  }
  // blue cap
  k.lathe(
    [
      [1.7, 3.58],
      [2.02, 3.64],
      [1.96, 3.76],
      [1.3, 4.0],
      [0.5, 4.16],
      [0, 4.2],
    ],
    { color: palette.blueDark, top: palette.blue, seg: 28 },
  )
  k.cyl(0.05, 0.07, 1.2, { color: palette.metalDark, top: palette.metalLight, at: [-0.6, 4.62, -0.3], bevel: 0.02, seg: 8 })
  k.sphere(0.1, { color: palette.beaconRed, at: [-0.6, 5.26, -0.3], seg: 8, mat: 'glowSoft', shade: 0 })
  // the job board out front
  for (const x of [-2.05, -0.95]) k.cyl(0.07, 0.09, 1.5, { color: palette.trunkDark, top: palette.wood, at: [x, 0.89, 2.0], bevel: 0.02, seg: 8 })
  k.box(1.4, 0.95, 0.12, { color: palette.woodDark, top: palette.wood, at: [-1.5, 1.25, 2.0], r: 0.05 })
  k.box(1.2, 0.76, 0.05, { color: palette.dirt, top: palette.sand, at: [-1.5, 1.25, 2.07], r: 0.03 })
  const notes: [number, number, string][] = [
    [-0.34, 0.14, palette.white],
    [0.02, 0.16, palette.yellow],
    [0.36, 0.1, palette.pink],
    [-0.2, -0.18, palette.sky],
    [0.22, -0.2, palette.white],
  ]
  for (const [x, y, c] of notes) k.box(0.27, 0.24, 0.03, { color: c, at: [-1.5 + x, 1.25 + y, 2.11], rot: [0, 0, (x + y) * 0.5], r: 0.01, shade: 0.02 })
  if (old) {
    patch(k, [1.25, 1.1, 1.05], 0.6, 0.5, 0.85)
    patch(k, [-1.3, 0.6, -0.95], 0.5, 0.4, -2.2)
  }
  const logo = flag(k, 1.75, 1.85, 2.5)
  const g = k.build('missionControl')
  g.add(logo)
  // a little radar that never stops turning
  const rk = new Kit()
  rk.cyl(0.06, 0.08, 0.5, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.25, 0], bevel: 0.02, seg: 8 })
  rk.box(1.1, 0.34, 0.1, { color: palette.creamShade, top: palette.white, at: [0, 0.6, 0], r: 0.05 })
  const radar = rk.build('radar')
  radar.position.set(0.45, 4.08, 0.2)
  g.add(radar)
  ;(g.userData as ModelUserData).tick = (t) => {
    radar.rotation.y = t * 1.3
  }
  return g
}

// ------------------------------------------------------------------ Integration Bay
export function createIntegrationBay(opts: ModelOptions = {}): THREE.Object3D {
  const old = lvl(opts) <= 1
  const k = new Kit()
  const R = 2.15
  const L = 3.7
  pad(k, 5.0, 5.0)
  // low walls and the big teal barrel roof
  k.box(R * 2, 0.9, L, { color: palette.creamShade, top: palette.cream, at: [0, 0.59, -0.3], r: 0.06 })
  k.add(barrel(R, L), { color: palette.tealDark, top: palette.teal, at: [0, 1.04, -0.3], shade: 0.2 })
  for (const z of [-L / 2 - 0.3 + 0.2, L / 2 - 0.3 - 0.2]) k.add(barrel(R + 0.07, 0.34), { color: palette.creamShade, top: palette.white, at: [0, 1.04, z], shade: 0.1 })
  // the doorway: dark inside, hazard-striped arch
  const zf = L / 2 - 0.3 + 0.02
  {
    const half = new THREE.CircleGeometry(1.62, 22, 0, Math.PI)
    k.add(half, { color: palette.soot, at: [0, 1.04, zf], shade: 0 })
    k.add(new THREE.PlaneGeometry(3.24, 0.92), { color: palette.soot, at: [0, 0.6, zf], shade: 0 })
  }
  const segs = 9
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI
    const a1 = ((i + 1) / segs) * Math.PI
    k.beam([Math.cos(a0) * 1.7, 1.04 + Math.sin(a0) * 1.7, zf + 0.05], [Math.cos(a1) * 1.7, 1.04 + Math.sin(a1) * 1.7, zf + 0.05], 0.17, {
      color: i % 2 ? palette.hazardDark : palette.hazard,
      shade: 0.05,
    })
  }
  for (const x of [-1.7, 1.7]) k.box(0.17, 0.95, 0.17, { color: palette.hazard, at: [x, 0.6, zf + 0.05], r: 0.04 })
  // the reason the building exists: a satellite on its stand, right in the doorway
  k.cyl(0.62, 0.72, 0.16, { color: palette.steel, top: palette.metal, at: [-0.2, 0.22, 2.05], bevel: 0.04, seg: 16, mat: 'metal' })
  k.cyl(0.08, 0.1, 0.4, { color: palette.metalDark, top: palette.metalLight, at: [-0.2, 0.48, 2.05], bevel: 0.02, seg: 8 })
  k.box(0.62, 1.05, 0.62, { color: palette.yellowDark, top: palette.yellow, at: [-0.2, 1.2, 2.05], r: 0.07, mat: 'metal' })
  for (const sx of [-1, 1]) k.box(0.78, 0.62, 0.06, { color: palette.navy, top: palette.blue, at: [-0.2 + sx * 0.74, 1.24, 2.05], r: 0.02, mat: 'glass' })
  k.sphere(0.13, { color: palette.glassDark, top: palette.glass, at: [-0.2, 1.3, 2.38], seg: 8, mat: 'glass' })
  // portholes, vents and a tool cart
  for (const z of [-1.3, -0.1]) for (const sx of [-1, 1]) k.sphere(0.24, { color: palette.glassDark, top: palette.glass, at: [sx * R, 0.72, z], scale: [0.35, 1, 1], mat: 'glass', seg: 10 })
  for (const z of [-1.1, 0.3]) {
    k.cyl(0.14, 0.16, 0.3, { color: palette.metalDark, top: palette.metalLight, at: [0, 3.26, z], bevel: 0.03, seg: 10 })
    k.cyl(0.28, 0.2, 0.14, { color: palette.metalDark, top: palette.metalLight, at: [0, 3.45, z], bevel: 0.04, seg: 12 })
  }
  k.box(0.9, 0.34, 0.6, { color: palette.yellowDark, top: palette.yellow, at: [1.9, 0.42, 2.0], r: 0.07 })
  k.box(0.5, 0.42, 0.42, { color: palette.woodDark, top: palette.wood, at: [1.9, 0.8, 2.0], r: 0.05 })
  for (const dx of [-0.3, 0.3]) k.torus(0.1, 0.05, { color: palette.rubber, at: [1.9 + dx, 0.24, 2.32], rot: [Math.PI / 2, 0, 0], tube: 6, seg: 10 })
  if (old) {
    k.box(1.0, 0.07, 0.8, { color: palette.rust, top: palette.rustLight, at: [-1.05, 2.72, -0.6], rot: [0, 0, 0.62], r: 0.03 })
    k.box(0.7, 0.07, 0.6, { color: palette.metal, top: palette.metalLight, at: [1.2, 2.56, 0.4], rot: [0, 0, -0.72], r: 0.03 })
  }
  const g = k.build('integrationBay')
  const logo = logoPlate(0.62)
  logo.position.set(0, 2.9, zf + 0.12)
  g.add(logo)
  return g
}

// ------------------------------------------------------------------ Comms Center
export function createCommsCenter(opts: ModelOptions = {}): THREE.Object3D {
  const level = lvl(opts)
  const old = level <= 1
  const k = new Kit()
  pad(k, 4.7, 4.7)
  // pedestal
  k.cyl(1.0, 1.35, 1.1, { color: palette.concreteDark, top: palette.concreteLight, at: [-0.35, 0.69, -0.3], bevel: 0.1, seg: 24 })
  k.cyl(1.04, 1.04, 0.2, { color: palette.redDark, top: palette.red, at: [-0.35, 1.3, -0.3], bevel: 0.05, seg: 24 })
  // the operator's hut: red and white so you can't miss it
  k.box(1.3, 1.05, 1.1, { color: palette.creamShade, top: palette.white, at: [1.45, 0.66, 1.25], r: 0.1 })
  k.box(1.36, 0.3, 1.16, { color: palette.redDark, top: palette.red, at: [1.45, 0.42, 1.25], r: 0.08 })
  k.box(1.5, 0.14, 1.3, { color: palette.redDark, top: palette.red, at: [1.45, 1.26, 1.25], r: 0.06 })
  k.box(0.7, 0.42, 0.06, { color: palette.screenGlow, at: [1.45, 0.82, 1.81], r: 0.03, mat: 'glowSoft', shade: 0 })
  k.sphere(0.09, { color: palette.beaconGreen, at: [1.95, 1.42, 1.7], seg: 8, mat: 'glowSoft', shade: 0 })
  k.pipe(
    [
      [0.85, 0.3, 1.0],
      [0.4, 0.22, 0.6],
      [0.2, 0.3, 0.2],
    ],
    0.07,
    { color: palette.rubber, radial: 6 },
  )
  const g = k.build('commsCenter')

  // the dish: yaw (turns to follow satellites) → tilt
  const dk = new Kit()
  const size = level >= 2 ? 1.12 : 1
  dk.lathe(
    [
      [0, 0],
      [0.9, 0.1],
      [1.6, 0.4],
      [2.1, 0.84],
      [2.28, 1.06],
      [2.2, 1.1],
      [1.55, 0.54],
      [0.85, 0.24],
      [0, 0.12],
    ],
    { color: palette.creamShade, top: palette.white, mat: 'gloss', seg: 32, shade: 0.12 },
  )
  dk.torus(2.24, 0.09, { color: palette.redDark, top: palette.red, at: [0, 1.07, 0], seg: 32, tube: 8 })
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5
    dk.beam([Math.cos(a) * 1.7, 0.5, Math.sin(a) * 1.7], [0, 2.0, 0], 0.07, { color: palette.metalLight, round: true })
  }
  dk.cyl(0.16, 0.2, 0.34, { color: palette.steel, top: palette.metal, at: [0, 2.0, 0], bevel: 0.04, seg: 10, mat: 'metal' })
  dk.sphere(0.13, { color: palette.beaconRed, at: [0, 1.76, 0], seg: 8, mat: 'glowSoft', shade: 0 })
  dk.cyl(0.3, 0.4, 0.5, { color: palette.steel, top: palette.metal, at: [0, -0.2, 0], bevel: 0.06, seg: 12, mat: 'metal' })
  if (old) {
    dk.box(0.8, 0.05, 0.6, { color: palette.rust, top: palette.rustLight, at: [1.1, 0.42, 0.4], rot: [0.2, 0.4, 0.36], r: 0.02 })
    dk.box(0.5, 0.05, 0.5, { color: palette.metal, top: palette.metalLight, at: [-0.9, 0.34, -0.7], rot: [-0.25, 0.2, -0.3], r: 0.02 })
  }
  const bowl = dk.build('bowl')
  bowl.scale.setScalar(size)
  bowl.rotation.x = 0.82
  const dish = new THREE.Group()
  dish.name = 'dish'
  dish.add(bowl)
  dish.position.set(-0.35, 1.9, -0.3)
  g.add(dish)
  ;(g.userData as ModelUserData).tick = (t) => {
    dish.rotation.y = Math.sin(t * 0.18) * 0.7 + 0.3
    bowl.rotation.x = 0.82 + Math.sin(t * 0.25 + 1) * 0.06 + (old ? Math.sin(t * 3) * 0.004 : 0)
  }
  return g
}

// ------------------------------------------------------------------ Parts Market
export function createPartsMarket(_opts: ModelOptions = {}): THREE.Object3D {
  const k = new Kit()
  // the storehouse behind, cream with an orange false front
  k.box(4.3, 2.0, 2.5, { color: palette.creamShade, top: palette.cream, at: [0, 1.0, -0.55], r: 0.1 })
  k.box(4.5, 0.2, 2.7, { color: palette.orangeDark, top: palette.orange, at: [0, 2.06, -0.55], r: 0.08 })
  k.box(4.7, 2.75, 0.32, { color: palette.orangeDark, top: palette.orange, at: [0, 1.38, 0.82], r: 0.12 })
  // the sign: a gear and a wrench on a cream disc, big enough to read from orbit
  k.cyl(1.12, 1.12, 0.26, { color: palette.orangeDark, top: palette.orange, at: [0, 3.0, 0.82], rot: [Math.PI / 2, 0, 0], bevel: 0.08, seg: 28 })
  k.cyl(0.92, 0.92, 0.1, { color: palette.creamShade, top: palette.white, at: [0, 3.0, 0.96], rot: [Math.PI / 2, 0, 0], bevel: 0.03, seg: 28, shade: 0.04 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    k.box(0.2, 0.24, 0.1, { color: palette.navy, at: [-0.16 + Math.cos(a) * 0.46, 3.0 + Math.sin(a) * 0.46, 1.03], rot: [0, 0, a + Math.PI / 2], r: 0.03, shade: 0 })
  }
  k.cyl(0.4, 0.4, 0.1, { color: palette.navy, at: [-0.16, 3.0, 1.03], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 18, shade: 0 })
  k.cyl(0.16, 0.16, 0.12, { color: palette.white, at: [-0.16, 3.0, 1.05], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 12, shade: 0 })
  k.beam([0.18, 2.55, 1.05], [0.62, 3.4, 1.05], 0.14, { color: palette.red, round: true, shade: 0 })
  k.torus(0.15, 0.065, { color: palette.red, at: [0.66, 3.5, 1.05], rot: [-Math.PI / 2, 0, 0.9], arc: Math.PI * 1.5, tube: 6, seg: 12, shade: 0 })
  // the shopfront: shelves of parts behind a counter
  k.box(3.5, 1.3, 0.1, { color: palette.soot, at: [0, 0.96, 0.99], r: 0.03, shade: 0 })
  const goods = [palette.blue, palette.yellow, palette.red, palette.teal, palette.purple, palette.green, palette.orange, palette.pink]
  for (let row = 0; row < 2; row++) {
    k.box(3.3, 0.06, 0.2, { color: palette.woodDark, top: palette.wood, at: [0, 0.78 + row * 0.5, 1.06], r: 0.02 })
    for (let i = 0; i < 7; i++) {
      const w = 0.3 + ((i * 7 + row * 3) % 3) * 0.05
      k.box(w, 0.3 + ((i + row) % 2) * 0.06, 0.16, { color: goods[(i + row * 3) % goods.length], at: [-1.38 + i * 0.46, 0.97 + row * 0.5, 1.08], r: 0.04, shade: 0.08 })
    }
  }
  k.box(3.7, 0.56, 0.6, { color: palette.woodDark, top: palette.woodLight, at: [0, 0.28, 1.42], r: 0.07 })
  k.box(3.8, 0.08, 0.7, { color: palette.wood, top: palette.woodLight, at: [0, 0.58, 1.42], r: 0.03 })
  // on the counter: a tiny dish, a battery and a camera
  k.lathe(
    [
      [0, 0],
      [0.16, 0.05],
      [0.22, 0.14],
      [0.2, 0.15],
      [0, 0.04],
    ],
    { color: palette.creamShade, top: palette.white, at: [-1.2, 0.72, 1.45], rot: [0.5, 0, 0], seg: 14 },
  )
  k.box(0.26, 0.2, 0.2, { color: palette.orangeDark, top: palette.orange, at: [-0.3, 0.72, 1.45], r: 0.04 })
  k.box(0.3, 0.2, 0.2, { color: palette.rubber, top: palette.steel, at: [0.7, 0.72, 1.45], r: 0.04 })
  k.sphere(0.07, { color: palette.glassDark, top: palette.glass, at: [0.7, 0.72, 1.56], seg: 8, mat: 'glass' })
  // a broad striped awning
  const stripes = 9
  for (let i = 0; i < stripes; i++) {
    k.box(4.5 / stripes + 0.01, 0.09, 1.5, {
      color: i % 2 ? palette.white : palette.yellowDark,
      top: i % 2 ? palette.white : palette.yellow,
      at: [-2.25 + (i + 0.5) * (4.5 / stripes), 1.9, 1.68],
      rot: [0.26, 0, 0],
      r: 0.03,
      shade: 0.05,
    })
    k.sphere(0.13, { color: i % 2 ? palette.white : palette.yellow, at: [-2.25 + (i + 0.5) * (4.5 / stripes), 1.66, 2.4], scale: [1.2, 0.8, 0.5], seg: 8, shade: 0.03 })
  }
  for (const x of [-2.15, 2.15]) k.cyl(0.06, 0.07, 1.7, { color: palette.woodDark, top: palette.wood, at: [x, 0.85, 2.32], bevel: 0.02, seg: 8 })
  // stock stacked by the side
  for (const [x, y, z, s, c] of [
    [-2.75, 0.4, 0.2, 0.8, palette.wood],
    [-2.7, 1.1, 0.25, 0.6, palette.woodLight],
    [-2.8, 0.3, -0.7, 0.6, palette.wood],
  ] as const) {
    k.box(s, s, s, { color: palette.woodDark, top: c, at: [x, y, z], rot: [0, 0.2, 0], r: 0.05 })
  }
  k.cyl(0.3, 0.3, 0.74, { color: palette.blueDark, top: palette.blue, at: [2.75, 0.37, 0.1], bevel: 0.06, seg: 12 })
  k.cyl(0.3, 0.3, 0.74, { color: palette.tealDark, top: palette.teal, at: [2.85, 0.37, -0.65], bevel: 0.06, seg: 12 })
  return k.build('partsMarket')
}

// ------------------------------------------------------------------ Science Lab
export function createScienceLab(_opts: ModelOptions = {}): THREE.Object3D {
  const k = new Kit()
  pad(k, 4.3, 4.3)
  // violet drum, white dome
  k.cyl(1.5, 1.6, 1.5, { color: palette.purpleDark, top: palette.purple, at: [-0.35, 0.89, -0.3], bevel: 0.1, seg: 28 })
  k.cyl(1.56, 1.56, 0.22, { color: palette.creamShade, top: palette.white, at: [-0.35, 1.66, -0.3], bevel: 0.06, seg: 28 })
  const dome: [number, number][] = []
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2)
    dome.push([Math.cos(a) * 1.5, 1.74 + Math.sin(a) * 1.5])
  }
  k.lathe(dome, { color: palette.creamShade, top: palette.white, at: [-0.35, 0, -0.3], seg: 28, mat: 'gloss', shade: 0.12 })
  // the slit and the telescope poking out of it
  k.box(0.6, 0.1, 1.7, { color: palette.soot, at: [-0.35, 2.82, 0.42], rot: [0.84, 0, 0], r: 0.04, shade: 0 })
  k.cyl(0.3, 0.26, 1.5, { color: palette.tealDark, top: palette.teal, at: [-0.35, 3.05, 0.66], rot: [0.84, 0, 0], bevel: 0.05, seg: 14 })
  k.torus(0.3, 0.06, { color: palette.yellowDark, top: palette.yellow, at: [-0.35, 3.54, 1.2], rot: [0.84, 0, 0], tube: 8, seg: 14 })
  k.sphere(0.24, { color: palette.glassDark, top: palette.glass, at: [-0.35, 3.52, 1.18], scale: [1, 1, 0.5], rot: [0.84 - Math.PI / 2, 0, 0], mat: 'glass', seg: 10 })
  k.box(0.6, 0.95, 0.16, { color: palette.tealDark, top: palette.teal, at: [-0.35, 0.62, 1.25], r: 0.08 })
  // annex with the big map screen
  k.box(1.5, 1.2, 1.5, { color: palette.creamShade, top: palette.cream, at: [1.35, 0.74, 0.7], r: 0.1 })
  k.box(1.64, 0.14, 1.64, { color: palette.purpleDark, top: palette.purple, at: [1.35, 1.4, 0.7], r: 0.06 })
  k.box(1.1, 0.7, 0.08, { color: palette.navyDark, at: [1.35, 0.8, 1.46], r: 0.04, shade: 0 })
  const tiles = [palette.green, palette.leafLight, palette.blue, palette.sand, palette.green, palette.blue]
  tiles.forEach((c, i) => k.box(0.3, 0.26, 0.04, { color: c, at: [1.02 + (i % 3) * 0.33, 0.94 - Math.floor(i / 3) * 0.29, 1.51], r: 0.02, mat: 'glowSoft', shade: 0 }))
  return k.build('scienceLab')
}

// ------------------------------------------------------------------ Engineering Lab
export function createEngineeringLab(_opts: ModelOptions = {}): THREE.Object3D {
  const k = new Kit()
  pad(k, 4.3, 4.3)
  k.box(3.6, 1.8, 2.7, { color: palette.metalDark, top: palette.metal, at: [0, 1.04, -0.3], r: 0.1 })
  // saw-tooth roof: three yellow teeth with glass on the steep side
  for (let i = 0; i < 3; i++) {
    const x = -1.2 + i * 1.2
    const s = new THREE.Shape()
    s.moveTo(-0.6, 0)
    s.lineTo(0.6, 0)
    s.lineTo(-0.6, 0.8)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 })
    g.translate(0, 0, -1.3)
    k.add(g, { color: palette.yellowDark, top: palette.yellow, at: [x, 1.94, -0.3], shade: 0.14 })
    k.box(0.06, 0.52, 2.2, { color: palette.glassDark, top: palette.glass, at: [x - 0.63, 2.28, -0.3], r: 0.02, mat: 'glass' })
  }
  // roller door with hazard feet, and a chimney
  k.box(1.3, 1.25, 0.1, { color: palette.navyDark, top: palette.navy, at: [0.95, 0.77, 1.06], r: 0.05 })
  for (let i = 0; i < 4; i++) k.box(1.2, 0.04, 0.12, { color: palette.steel, at: [0.95, 0.4 + i * 0.28, 1.08], r: 0.01, shade: 0 })
  k.cyl(0.24, 0.3, 1.5, { color: palette.orangeDark, top: palette.orange, at: [1.3, 2.7, -1.1], bevel: 0.05, seg: 14 })
  k.cyl(0.32, 0.32, 0.16, { color: palette.soot, at: [1.3, 3.46, -1.1], bevel: 0.04, seg: 14 })
  k.blob(0.3, { color: palette.smoke, at: [1.42, 3.9, -1.1], shade: 0.03 })
  k.blob(0.22, { color: palette.smoke, at: [1.62, 4.25, -1.0], shade: 0.03 })
  // an anvil-ish test stand outside
  k.box(0.9, 0.3, 0.6, { color: palette.steel, top: palette.metal, at: [-1.6, 0.3, 1.85], r: 0.06, mat: 'metal' })
  k.box(0.5, 0.5, 0.5, { color: palette.yellowDark, top: palette.yellow, at: [-1.6, 0.7, 1.85], r: 0.06, mat: 'metal' })
  const g = k.build('engineeringLab')
  // the big gear on the front wall turns slowly
  const gk = new Kit()
  gk.cyl(0.72, 0.72, 0.2, { color: palette.orangeDark, top: palette.orange, bevel: 0.05, seg: 24 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    gk.box(0.36, 0.2, 0.34, { color: palette.orangeDark, top: palette.orange, at: [Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82], rot: [0, -a, 0], r: 0.05 })
  }
  gk.cyl(0.3, 0.3, 0.26, { color: palette.navyDark, top: palette.navy, bevel: 0.04, seg: 16 })
  const gear = gk.build('gear')
  const hub = new THREE.Group()
  hub.add(gear)
  hub.rotation.x = Math.PI / 2
  hub.position.set(-0.85, 1.25, 1.14)
  g.add(hub)
  ;(g.userData as ModelUserData).tick = (t) => {
    gear.rotation.y = t * 0.6
  }
  return g
}

// ------------------------------------------------------------------ Crew Quarters
export function createCrewQuarters(_opts: ModelOptions = {}): THREE.Object3D {
  const k = new Kit()
  // plank porch instead of concrete: this one is a home
  k.slab(4.3, 4.3, 0.14, 0.9, { color: palette.woodDark, top: palette.wood, bevel: 0.05 })
  k.box(3.2, 1.5, 2.5, { color: palette.wood, top: palette.woodLight, at: [0, 0.89, -0.4], r: 0.1 })
  for (let i = 0; i < 3; i++) {
    k.box(3.24, 0.05, 0.04, { color: palette.woodDark, at: [0, 0.5 + i * 0.4, 0.86], r: 0.01, shade: 0 })
    k.box(0.04, 0.05, 2.54, { color: palette.woodDark, at: [1.61, 0.5 + i * 0.4, -0.4], r: 0.01, shade: 0 })
  }
  // steep green roof with the ridge running left to right
  {
    const g = gable(3.3, 1.5, 3.9)
    g.rotateY(Math.PI / 2)
    k.add(g, { color: palette.roofGreenDark, top: palette.roofGreen, at: [0, 1.6, -0.4], shade: 0.16 })
  }
  // stone chimney and a curl of smoke
  k.box(0.56, 1.5, 0.56, { color: palette.rockDark, top: palette.rock, at: [1.05, 2.4, -0.8], r: 0.08 })
  k.box(0.68, 0.14, 0.68, { color: palette.rockDark, top: palette.rock, at: [1.05, 3.2, -0.8], r: 0.04 })
  k.blob(0.26, { color: palette.smoke, at: [1.15, 3.6, -0.8], shade: 0.03 })
  k.blob(0.2, { color: palette.smoke, at: [1.35, 3.95, -0.7], shade: 0.03 })
  // red door, warm windows
  k.box(0.66, 1.05, 0.12, { color: palette.redDark, top: palette.red, at: [-0.5, 0.67, 0.88], r: 0.07 })
  k.sphere(0.05, { color: palette.yellow, at: [-0.3, 0.67, 0.96], seg: 6 })
  k.box(0.74, 0.6, 0.1, { color: palette.white, at: [0.72, 0.98, 0.87], r: 0.05 })
  k.box(0.58, 0.44, 0.1, { color: palette.lampWarm, top: palette.lampHot, at: [0.72, 0.98, 0.9], r: 0.03, mat: 'glowSoft', shade: 0 })
  k.box(0.62, 0.05, 0.12, { color: palette.white, at: [0.72, 0.98, 0.92], r: 0.01, shade: 0 })
  k.box(0.05, 0.46, 0.12, { color: palette.white, at: [0.72, 0.98, 0.92], r: 0.01, shade: 0 })
  // a bench and a washing line: people live here
  k.box(1.0, 0.1, 0.36, { color: palette.woodDark, top: palette.woodLight, at: [0.75, 0.42, 1.5], r: 0.03 })
  for (const x of [0.38, 1.12]) k.box(0.1, 0.28, 0.3, { color: palette.woodDark, at: [x, 0.28, 1.5], r: 0.02 })
  k.cyl(0.06, 0.08, 1.7, { color: palette.trunkDark, top: palette.wood, at: [-1.9, 0.99, 1.7], bevel: 0.02, seg: 8 })
  k.beam([-1.9, 1.75, 1.7], [-1.55, 1.5, 0.86], 0.03, { color: palette.rubber, round: true })
  const wash: [number, string][] = [
    [0.25, palette.blue],
    [0.5, palette.white],
    [0.75, palette.yellow],
  ]
  for (const [t, c] of wash) k.box(0.3, 0.34, 0.04, { color: c, at: [-1.9 + 0.35 * t, 1.56 - 0.25 * t, 1.7 - 0.84 * t], rot: [0, 0.4, 0], r: 0.02, shade: 0.04 })
  return k.build('crewQuarters')
}
