import * as THREE from 'three'
import { Kit, type V3 } from '../kit'
import { palette } from '../palette'
import type { RegionId } from '../../data/regions'
import { lantern, stencil } from './cargo'
import { mix } from './common'

/**
 * The wild side of the island: the trees, ferns, logs and boulders of the
 * forest that took the old spaceport back (as single merged geometries, for
 * instancing), and the things an expedition brings with it: the signpost, the
 * bulldozer, a footbridge and scaffolding.
 */

// ------------------------------------------------------------------ forest geometry (all one material, for instancing)
const dark = (c: string, t = 0.25) => mix(c, palette.pineDark, t)

/** A plain low-poly stick from a to b: the forest has hundreds of trees, so twigs stay cheap. */
function twig(k: Kit, a: V3, b: V3, r: number, color: string, top: string): void {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const g = new THREE.CylinderGeometry(r * 0.8, r, va.distanceTo(vb), 5, 1)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()))
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  k.add(g, { color, top })
}

/** Broadleaf tree, cheaper than the base's hero trees: the forest has hundreds. */
export function forestRound(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.13, 0.2, 1.0, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.5, 0], bevel: 0.04, seg: 6 })
  k.blob(0.82, { color: palette.leafDark, top: palette.leafLight, at: [0, 1.55, 0], scale: [1, 0.9, 1], detail: 1, shade: 0.24 })
  k.blob(0.55, { color: palette.leafDark, top: palette.leaf, at: [0.52, 1.15, 0.12], detail: 1, shade: 0.2 })
  k.blob(0.5, { color: palette.leafDark, top: palette.leaf, at: [-0.46, 1.22, -0.2], detail: 1, shade: 0.2 })
  return k.geometry()
}
export function forestPine(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.11, 0.16, 0.6, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.3, 0], bevel: 0.03, seg: 6 })
  for (const [r, h, y] of [
    [0.8, 0.95, 0.85],
    [0.62, 0.85, 1.42],
    [0.44, 0.8, 1.98],
  ]) {
    k.lathe(
      [
        [0, -h / 2],
        [r * 0.8, -h / 2],
        [r, -h / 2 + 0.1],
        [r * 0.34, h / 2 - 0.16],
        [0, h / 2],
      ],
      { color: palette.pineDark, top: palette.pine, at: [0, y, 0], seg: 8, shade: 0.22 },
    )
  }
  return k.geometry()
}
/** A jungle giant for the natural wall: thick trunk, a broad dark crown, creepers hanging from it. */
export function forestGiant(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.2, 0.34, 1.7, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.85, 0], bevel: 0.05, seg: 7 })
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4
    twig(k, [Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62], [Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16], 0.1, palette.trunkDark, palette.trunk)
  }
  k.blob(1.15, { color: dark(palette.leafDark, 0.4), top: palette.leaf, at: [0, 2.5, 0], scale: [1.1, 0.8, 1.1], detail: 1, shade: 0.26 })
  k.blob(0.8, { color: dark(palette.leafDark, 0.4), top: palette.leaf, at: [0.85, 2.0, 0.3], detail: 1, shade: 0.24 })
  k.blob(0.76, { color: dark(palette.leafDark, 0.4), top: palette.leaf, at: [-0.75, 2.1, -0.35], detail: 1, shade: 0.24 })
  k.blob(0.6, { color: palette.leafDark, top: palette.leafLight, at: [0.1, 3.2, 0.1], detail: 1, shade: 0.18 })
  // creepers
  for (const [x, z, l] of [
    [0.9, 0.5, 1.1],
    [-0.8, 0.2, 0.9],
    [0.2, -0.95, 1.2],
  ]) twig(k, [x, 1.9 - l, z], [x, 1.9, z], 0.04, palette.leafDark, palette.leaf)
  return k.geometry()
}
/** Flat-topped scrub tree of the dry east tip. */
export function forestScrub(): THREE.BufferGeometry {
  const k = new Kit()
  const olive = mix(palette.leaf, palette.grassDry, 0.55)
  const oliveDark = mix(palette.leafDark, palette.trunk, 0.3)
  k.cyl(0.09, 0.15, 1.3, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.65, 0], rot: [0, 0, 0.1], bevel: 0.03, seg: 6 })
  twig(k, [0.06, 1.1, 0], [0.5, 1.75, 0.1], 0.05, palette.trunkDark, palette.trunk)
  twig(k, [0.04, 1.0, 0], [-0.45, 1.7, -0.1], 0.05, palette.trunkDark, palette.trunk)
  k.blob(0.95, { color: oliveDark, top: olive, at: [0.05, 1.95, 0], scale: [1.25, 0.42, 1.15], detail: 1, shade: 0.2 })
  k.blob(0.55, { color: oliveDark, top: olive, at: [0.7, 1.75, 0.3], scale: [1.1, 0.45, 1], detail: 1, shade: 0.18 })
  return k.geometry()
}
/** A fern: fronds arching out of one crown. */
export function fern(): THREE.BufferGeometry {
  const k = new Kit()
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2
    k.at([0, 0.06, 0], [0, a, 0], () =>
      k.blob(0.34, { color: palette.leafDark, top: palette.leafLight, at: [0.3, 0.1, 0], rot: [0, 0, 0.42], scale: [1.3, 0.14, 0.46], detail: 0, shade: 0.14 }),
    )
  }
  return k.geometry()
}
/** A fallen trunk, half sunk and mossed over. Lies along X. */
export function fallenLog(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.24, 0.3, 2.3, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.2, 0], rot: [0, 0, Math.PI / 2], bevel: 0.05, seg: 8 })
  k.cyl(0.19, 0.19, 0.03, { color: palette.woodLight, at: [-1.16, 0.2, 0], rot: [0, 0, Math.PI / 2], bevel: 0.01, seg: 8, shade: 0 })
  k.beam([0.5, 0.3, 0], [0.9, 0.75, 0.25], 0.1, { color: palette.trunkDark, top: palette.trunk, round: true })
  k.blob(0.34, { color: palette.leafDark, top: palette.leafLight, at: [-0.3, 0.42, 0.05], scale: [1.7, 0.4, 0.9], detail: 1, shade: 0.12 })
  k.blob(0.24, { color: palette.leafDark, top: palette.leaf, at: [0.6, 0.4, -0.08], scale: [1.4, 0.45, 0.9], detail: 1, shade: 0.12 })
  return k.geometry()
}
/** A big boulder with a cap of moss. */
export function mossBoulder(): THREE.BufferGeometry {
  const k = new Kit()
  k.blob(0.95, { color: palette.rockDark, top: palette.rock, at: [0, 0.5, 0], scale: [1.15, 0.75, 1], detail: 1, shade: 0.22 })
  k.blob(0.55, { color: palette.rockDark, top: palette.rock, at: [0.85, 0.28, 0.4], scale: [1, 0.72, 1], detail: 1, shade: 0.22 })
  k.blob(0.5, { color: palette.leafDark, top: palette.leafLight, at: [-0.05, 1.02, 0], scale: [1.5, 0.36, 1.3], detail: 1, shade: 0.1 })
  k.blob(0.28, { color: palette.leafDark, top: palette.leaf, at: [0.8, 0.6, 0.4], scale: [1.4, 0.4, 1.2], detail: 1, shade: 0.1 })
  return k.geometry()
}
/** What a felled tree leaves behind: a tidy stack of logs. */
export function logPile(): THREE.BufferGeometry {
  const k = new Kit()
  const log = (x: number, y: number, r = 0.16) => {
    k.cyl(r, r, 1.1, { color: palette.trunkDark, top: palette.trunk, at: [x, y, 0], rot: [Math.PI / 2, 0, 0], bevel: 0.03, seg: 7 })
    for (const s of [-1, 1]) k.cyl(r * 0.8, r * 0.8, 0.02, { color: palette.woodLight, at: [x, y, s * 0.555], rot: [Math.PI / 2, 0, 0], bevel: 0.006, seg: 7, shade: 0 })
  }
  log(-0.18, 0.16)
  log(0.18, 0.16)
  log(0, 0.43)
  return k.geometry()
}
/** Reeds for the creek's edge. */
export function reeds(): THREE.BufferGeometry {
  const k = new Kit()
  for (const [x, z, h, l] of [
    [0, 0, 0.7, 0],
    [0.1, 0.06, 0.55, 0.3],
    [-0.09, 0.05, 0.6, -0.3],
    [0.03, -0.1, 0.5, 0.15],
    [-0.05, -0.06, 0.42, -0.2],
  ]) k.cone(0.045, h, { color: palette.leafDark, top: palette.grassLight, at: [x, h / 2 - 0.02, z], rot: [l * 0.3, 0, l], seg: 4, shade: 0.1 })
  k.capsule(0.035, 0.12, { color: palette.trunkDark, top: palette.trunk, at: [0.02, 0.66, 0], seg: 5 })
  return k.geometry()
}
/** A smooth stone in the stream. */
export function creekStone(): THREE.BufferGeometry {
  const k = new Kit()
  k.blob(0.3, { color: palette.rockDark, top: palette.rock, at: [0, 0.08, 0], scale: [1.3, 0.5, 1], detail: 1, shade: 0.16 })
  return k.geometry()
}

// ------------------------------------------------------------------ expedition gear
/** What the board on each signpost shows: the thing waiting to be found. */
function boardIcon(kit: Kit, id: RegionId, s: number, color: string): void {
  const flat = { color, shade: 0 }
  if (id === 'tracking') return stencil(kit, 'dish', s, color)
  if (id === 'annex') {
    // a dome on its drum
    const dome = new THREE.Shape()
    dome.absarc(0, -s * 0.08, s * 0.4, 0, Math.PI, false)
    dome.closePath()
    kit.extrude(dome, 0.03, { ...flat, bevel: 0.006, bevelSeg: 1, curveSeg: 8 })
    kit.box(s * 0.9, s * 0.16, 0.024, { ...flat, at: [0, -s * 0.24, 0], r: 0.01, seg: 1 })
    return
  }
  // a rocket
  kit.capsule(s * 0.14, s * 0.42, { ...flat, at: [0, s * 0.04, 0], scale: [1, 1, 0.2], seg: 8 })
  for (const sx of [-1, 1]) kit.box(s * 0.16, s * 0.24, 0.024, { ...flat, at: [sx * s * 0.2, -s * 0.28, 0], rot: [0, 0, sx * 0.4], r: 0.01, seg: 1 })
}

/**
 * The expedition signpost: a chunky post, a painted board showing what lies
 * ahead, an arrow plank, a lantern and a pack left at its foot. The board
 * faces +Z; the arrow points to +X.
 */
export function buildSignpost(id: RegionId): THREE.Group {
  const k = new Kit()
  k.cyl(0.3, 0.36, 0.2, { color: palette.rockDark, top: palette.rock, at: [0, 0.1, 0], bevel: 0.06, seg: 10 })
  k.cyl(0.14, 0.18, 2.5, { color: palette.trunkDark, top: palette.woodLight, at: [0, 1.25, 0], bevel: 0.04, seg: 8 })
  k.sphere(0.17, { color: palette.plankWarm, top: palette.woodLight, at: [0, 2.52, 0], scale: [1, 0.6, 1], seg: 8 })
  for (let i = 0; i < 3; i++) k.torus(0.17, 0.035, { color: palette.rope, top: palette.ropeLight, at: [0, 0.62 + i * 0.07, 0], tube: 5, seg: 10 })
  // the board
  k.box(1.5, 0.95, 0.12, { color: palette.woodDark, top: palette.woodLight, at: [0, 1.95, 0.1], rot: [0, 0, -0.03], r: 0.06 })
  k.box(1.28, 0.74, 0.05, { color: palette.creamShade, top: palette.cream, at: [0, 1.95, 0.165], rot: [0, 0, -0.03], r: 0.035, shade: 0.03, seg: 1 })
  k.at([0, 1.95, 0.2], [0, 0, -0.03], () => boardIcon(k, id, 0.62, palette.navy))
  for (const [x, y] of [
    [-0.66, 2.34],
    [0.66, 2.3],
    [-0.66, 1.58],
    [0.66, 1.54],
  ]) k.sphere(0.035, { color: palette.metalLight, at: [x, y, 0.17], seg: 6, mat: 'metal' })
  // an arrow plank pointing the way in
  const arrow = new THREE.Shape()
  arrow.moveTo(-0.55, -0.15)
  arrow.lineTo(0.3, -0.15)
  arrow.lineTo(0.3, -0.27)
  arrow.lineTo(0.62, 0)
  arrow.lineTo(0.3, 0.27)
  arrow.lineTo(0.3, 0.15)
  arrow.lineTo(-0.55, 0.15)
  arrow.closePath()
  k.at([0.22, 1.2, 0.1], [0, 0, 0.06], () => k.extrude(arrow, 0.1, { color: palette.yellowDark, top: palette.yellow, bevel: 0.025, bevelSeg: 2, curveSeg: 2 }))
  // lantern on a little arm
  k.pipe(
    [
      [0, 2.4, 0],
      [-0.2, 2.62, 0],
      [-0.46, 2.62, 0],
      [-0.56, 2.5, 0],
    ],
    0.028,
    { color: palette.navyDark, top: palette.navy, radial: 5, seg: 10, tension: 0.5 },
  )
  k.at([-0.56, 2.5, 0], undefined, () => lantern(k, 1.5))
  // a pack and a rolled map at the foot
  k.box(0.42, 0.5, 0.3, { color: palette.tealDark, top: palette.teal, at: [0.5, 0.25, 0.3], rot: [0, -0.4, 0.06], r: 0.1 })
  k.box(0.44, 0.12, 0.32, { color: palette.orangeDark, top: palette.orange, at: [0.5, 0.52, 0.3], rot: [0, -0.4, 0.06], r: 0.05 })
  k.cyl(0.06, 0.06, 0.5, { color: palette.creamShade, top: palette.white, at: [0.42, 0.62, 0.3], rot: [0, -0.4, Math.PI / 2], bevel: 0.02, seg: 8 })
  const g = k.build('signpost')
  return g
}

/** A little yellow bulldozer, blade forward on +Z. `userData.tracks` are the two tread belts. */
export function buildDozer(): THREE.Group {
  const k = new Kit()
  for (const s of [-1, 1]) {
    k.box(0.3, 0.36, 1.3, { color: palette.rubber, top: palette.steel, at: [s * 0.46, 0.2, 0], r: 0.16 })
    for (let i = 0; i < 4; i++) k.cyl(0.11, 0.11, 0.06, { color: palette.metalDark, top: palette.metalLight, at: [s * 0.62, 0.2, -0.42 + i * 0.28], rot: [0, 0, Math.PI / 2], bevel: 0.02, seg: 8 })
  }
  k.box(0.74, 0.4, 1.1, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.5, 0.02], r: 0.1 })
  k.box(0.6, 0.5, 0.56, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.9, -0.2], r: 0.1 })
  k.box(0.5, 0.26, 0.05, { color: palette.glassDark, top: palette.glass, at: [0, 0.96, 0.08], r: 0.03, mat: 'glass', seg: 1 })
  for (const s of [-1, 1]) k.box(0.05, 0.26, 0.36, { color: palette.glassDark, top: palette.glass, at: [s * 0.3, 0.96, -0.2], r: 0.03, mat: 'glass', seg: 1 })
  k.box(0.7, 0.07, 0.66, { color: palette.orangeDark, top: palette.orange, at: [0, 1.18, -0.2], r: 0.03, seg: 2 })
  k.cyl(0.04, 0.05, 0.4, { color: palette.steel, top: palette.metal, at: [0.22, 0.86, 0.38], bevel: 0.012, seg: 6 })
  k.sphere(0.07, { color: palette.beaconRed, top: palette.lampWarm, at: [0, 1.27, -0.2], seg: 8, mat: 'glowSoft', shade: 0 })
  // blade on its arms
  for (const s of [-1, 1]) k.beam([s * 0.5, 0.36, 0.4], [s * 0.52, 0.26, 0.86], 0.09, { color: palette.steel, top: palette.metal })
  k.box(1.5, 0.52, 0.12, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.3, 0.92], rot: [0.16, 0, 0], r: 0.05, mat: 'metal' })
  k.box(1.5, 0.08, 0.16, { color: palette.steel, at: [0, 0.07, 0.99], r: 0.03, seg: 1 })
  return k.build('dozer')
}

/** A plank footbridge of `len` across the creek, spanning along X with a gentle arch. */
export function buildFootbridge(len: number): THREE.Group {
  const k = new Kit()
  const n = Math.round(len / 0.3)
  const arch = (t: number) => 0.24 * (1 - (2 * t - 1) ** 2)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    k.box(len / n - 0.03, 0.08, 1.3, { color: palette.wood, top: i % 3 ? palette.woodLight : palette.plankWarm, at: [-len / 2 + t * len, arch(t), 0], rot: [0, 0, 0.5 * (1 - 2 * t) * 0.45], r: 0.025, shade: 0.04, seg: 1 })
  }
  for (const s of [-1, 1]) {
    // beams under the deck and a rope rail on posts
    k.pipe([0, 0.25, 0.5, 0.75, 1].map((t) => [-len / 2 + t * len, arch(t) - 0.1, s * 0.5] as V3), 0.08, { color: palette.trunkDark, top: palette.woodDark, radial: 6, tension: 0.5 })
    for (const t of [0.04, 0.5, 0.96]) k.cyl(0.07, 0.08, 0.8, { color: palette.trunkDark, top: palette.woodLight, at: [-len / 2 + t * len, arch(t) + 0.38, s * 0.62], bevel: 0.03, seg: 7 })
    k.pipe([0.04, 0.27, 0.5, 0.73, 0.96].map((t, i) => [-len / 2 + t * len, arch(t) + 0.7 - (i % 2 ? 0.14 : 0), s * 0.62] as V3), 0.035, { color: palette.rope, top: palette.ropeLight, radial: 5, tension: 0.5 })
  }
  return k.build('footbridge')
}

/** Scaffolding round a box of w × h × d: poles, plank decks, a ladder and a tarp. Centre-bottom on the origin. */
export function buildScaffold(w: number, h: number, d: number): THREE.Group {
  const k = new Kit()
  const xs = [-w / 2, 0, w / 2]
  const zs = [-d / 2, d / 2]
  const levels = Math.max(2, Math.round(h / 1.7))
  for (const x of xs) for (const z of zs) k.cyl(0.055, 0.055, h + 0.4, { color: palette.metalDark, top: palette.metalLight, at: [x, (h + 0.4) / 2, z], bevel: 0.015, seg: 6, mat: 'metal' })
  for (let l = 1; l <= levels; l++) {
    const y = (l / levels) * h
    for (const z of zs) {
      k.beam([-w / 2, y, z], [w / 2, y, z], 0.07, { color: palette.metalDark, top: palette.metalLight, round: true })
      k.box(w + 0.2, 0.07, 0.5, { color: palette.wood, top: palette.woodLight, at: [0, y - 0.1, z], r: 0.02, seg: 1 })
      k.beam([-w / 2, y - (h / levels) * 0.95, z], [0, y, z], 0.05, { color: palette.metalDark, top: palette.metalLight, round: true })
    }
    for (const x of [-w / 2, w / 2]) k.beam([x, y, -d / 2], [x, y, d / 2], 0.07, { color: palette.metalDark, top: palette.metalLight, round: true })
  }
  // ladder up the front
  for (const s of [-0.16, 0.16]) k.beam([w / 4 + s, 0, d / 2 + 0.3], [w / 4 + s, h, d / 2 + 0.06], 0.045, { color: palette.yellowDark, top: palette.yellow, round: true })
  for (let y = 0.3; y < h; y += 0.32) k.beam([w / 4 - 0.16, y, d / 2 + 0.3 - (y / h) * 0.24], [w / 4 + 0.16, y, d / 2 + 0.3 - (y / h) * 0.24], 0.035, { color: palette.yellow, round: true })
  // a tarp over one bay and hazard tape at the foot
  k.box(w / 2, h * 0.36, 0.04, { color: palette.tealDark, top: palette.teal, at: [-w / 4, h * 0.62, d / 2 + 0.02], rot: [0.04, 0, 0], r: 0.02, seg: 1 })
  for (let i = 0; i < 8; i++) k.box(w / 8, 0.12, 0.03, { color: i % 2 ? palette.hazardDark : palette.hazard, at: [-w / 2 + (i + 0.5) * (w / 8), 0.5, d / 2 + 0.04], r: 0.01, shade: 0, seg: 1 })
  return k.build('scaffold')
}
