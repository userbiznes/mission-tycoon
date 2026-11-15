import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../kit'
import { palette } from '../palette'
import { cask, drum, lantern, pallet, stencilCrate } from './cargo'
import { mix } from './common'

/**
 * The dock: a plank deck on pilings with a pier running out to a wider head,
 * where the cargo crane stands and the delivery boat ties up.
 *
 * Everything is laid out in the dock's own frame: X runs along the shore
 * (screen-right), Z runs out to sea (towards the camera), y = 0 is the lawn.
 * The static timberwork is one merged model; the crane and the buoys are built
 * separately so the scene can animate them.
 */

export const DECK_TOP = 0.14
const SEABED = -3.3

export interface DockLayout {
  left: number
  right: number
  back: number
  front: number
  /** the pier leaves the deck's left edge and runs towards −X */
  pier: { z: number; w: number; len: number; headLen: number; headW: number }
}

export interface DockBuild {
  group: THREE.Group
  /** every piling that stands in the water (x, z, radius): foam rings go round these */
  posts: [number, number, number][]
  /** the crane's pivot on the pier head */
  crane: [number, number]
  /** where the crane sets a delivered crate down, and how high the pallet top is */
  drop: [number, number]
  dropY: number
  /** bollard the boat's bow line is made fast to */
  bollard: V3
}

const TONES = [
  palette.wood,
  palette.woodLight,
  palette.plankWarm,
  palette.plankWarm,
  mix(palette.wood, palette.woodDark, 0.4),
  mix(palette.woodLight, palette.sandLight, 0.18),
  mix(palette.wood, palette.rock, 0.2),
  palette.wood,
]

/**
 * Lay boards that run along Z across the strip x0…x1. Each column is cut into
 * boards of different lengths with staggered joints, every board gets its own
 * tone and sits a touch high, low or askew, and the ends at an open edge stick
 * out by different amounts.
 */
function boards(kit: Kit, rnd: () => number, x0: number, x1: number, z0: number, z1: number, o: { ragged0?: number; ragged1?: number; split?: boolean } = {}): void {
  const n = Math.max(1, Math.round((x1 - x0) / 0.5))
  const bw = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    const xc = x0 + bw * (i + 0.5)
    const a = z0 - rnd() * (o.ragged0 ?? 0)
    const b = z1 + rnd() * (o.ragged1 ?? 0)
    const cuts = [a]
    if (o.split !== false) {
      let z = a + 0.9 + rnd() * 2.4
      while (z < b - 0.9) {
        cuts.push(z)
        z += 1.6 + rnd() * 2.2
      }
    }
    cuts.push(b)
    for (let c = 0; c < cuts.length - 1; c++) {
      const len = cuts[c + 1] - cuts[c]
      const tone = TONES[Math.floor(rnd() * TONES.length)]
      kit.box(bw - 0.05, 0.1, len - 0.045, {
        color: mix(tone, palette.trunkDark, 0.5),
        top: tone,
        at: [xc, DECK_TOP - 0.05 + (rnd() - 0.5) * 0.03, (cuts[c] + cuts[c + 1]) / 2],
        rot: [(rnd() - 0.5) * 0.014, (rnd() - 0.5) * 0.026, (rnd() - 0.5) * 0.034],
        r: 0.03,
        shade: 0.03,
        seg: 1,
      })
    }
  }
}

/** A chunky round piling driven into the seabed, standing `h` above the deck, with a domed cap and rope wraps. */
function piling(kit: Kit, rnd: () => number, x: number, z: number, h: number, o: { wraps?: number; r?: number } = {}): void {
  const r = o.r ?? 0.22
  kit.at([x, DECK_TOP, z], [(rnd() - 0.5) * 0.07, rnd() * 6.3, (rnd() - 0.5) * 0.07], () => {
    kit.cyl(r * 0.95, r * 1.12, h - SEABED, { color: palette.trunkDark, top: palette.wood, at: [0, (h + SEABED) / 2, 0], bevel: 0.05, seg: 12 })
    kit.cyl(r * 1.14, r * 1.1, 0.14, { color: palette.plankWarm, top: palette.woodLight, at: [0, h + 0.02, 0], bevel: 0.06, seg: 12 })
    kit.sphere(r * 0.92, { color: palette.plankWarm, top: palette.woodLight, at: [0, h + 0.075, 0], scale: [1, 0.4, 1], seg: 10, shade: 0.06 })
    const wraps = o.wraps ?? 3
    for (let i = 0; i < wraps; i++) {
      kit.torus(r * 1.0, 0.046, { color: palette.rope, top: palette.ropeLight, at: [0, h - 0.24 - i * 0.082, 0], rot: [0, i * 1.3, 0], tube: 6, seg: 12, shade: 0.1 })
    }
  })
}

/** A rope hanging in a deep curve between two posts. */
function ropeRail(kit: Kit, a: [number, number], b: [number, number], ha: number, hb: number, sag = 0.34): void {
  const pts: V3[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    pts.push([a[0] + (b[0] - a[0]) * t, DECK_TOP + ha + (hb - ha) * t - 0.3 - sag * (1 - (2 * t - 1) ** 2), a[1] + (b[1] - a[1]) * t])
  }
  kit.pipe(pts, 0.05, { color: palette.rope, top: palette.ropeLight, radial: 6, seg: 14, tension: 0.5, shade: 0.1 })
}

/** A tall piling carrying a lantern on a curved iron arm; `yaw` is the way the arm points. */
function lanternPost(kit: Kit, rnd: () => number, x: number, z: number, yaw: number): void {
  piling(kit, rnd, x, z, 0.95, { wraps: 2 })
  kit.at([x, DECK_TOP + 0.95, z], [0, yaw, 0], () => {
    kit.cyl(0.07, 0.1, 1.5, { color: palette.woodDark, top: palette.wood, at: [0, 0.75, 0], bevel: 0.03, seg: 8 })
    kit.sphere(0.1, { color: palette.plankWarm, top: palette.woodLight, at: [0, 1.52, 0], seg: 8 })
    kit.pipe(
      [
        [0, 1.3, 0],
        [0.16, 1.5, 0],
        [0.36, 1.5, 0],
        [0.46, 1.4, 0],
      ],
      0.028,
      { color: palette.navyDark, top: palette.navy, radial: 5, seg: 10, tension: 0.5 },
    )
    kit.at([0.46, 1.4, 0], undefined, () => lantern(kit, 1.7))
  })
}

/** Red-and-white life ring standing in the XY plane, facing +Z. */
function lifeRing(kit: Kit, R = 0.3, r = 0.1): void {
  for (let i = 0; i < 8; i++) {
    kit.at([0, 0, 0], [0, 0, (i / 8) * Math.PI * 2], () =>
      kit.torus(R, r, { color: i % 2 ? palette.white : palette.red, rot: [-Math.PI / 2, 0, 0], arc: Math.PI / 4 + 0.03, tube: 8, seg: 4, shade: 0.04 }),
    )
  }
}

export function buildDock(l: DockLayout): DockBuild {
  const kit = new Kit()
  const rnd = seeded(77)
  const L = l.left
  const R = l.right
  const B = l.back
  const F = l.front
  const P = l.pier
  const pEnd = L - P.len
  const headX = pEnd + P.headLen
  const pz0 = P.z - P.w / 2
  const pz1 = P.z + P.w / 2
  const hz0 = P.z - P.headW / 2
  const hz1 = P.z + P.headW / 2
  const posts: [number, number, number][] = []
  const post = (x: number, z: number, h: number, wraps = 3) => {
    piling(kit, rnd, x, z, h, { wraps })
    posts.push([x, z, 0.24])
  }

  // ---------------------------------------------------------------- timber frame and planking
  const frame = (x0: number, x1: number, z0: number, z1: number) => {
    kit.box(x1 - x0 - 0.14, 0.26, z1 - z0 - 0.14, { color: palette.trunkDark, top: palette.woodDark, at: [(x0 + x1) / 2, DECK_TOP - 0.21, (z0 + z1) / 2], r: 0.06, seg: 1 })
    // a rim beam under the board ends on the seaward edges
    kit.box(x1 - x0 - 0.04, 0.2, 0.16, { color: palette.trunkDark, top: mix(palette.woodDark, palette.wood, 0.4), at: [(x0 + x1) / 2, DECK_TOP - 0.2, z1 - 0.1], r: 0.05, seg: 1 })
  }
  frame(L, R, B, F)
  frame(headX - 0.1, L + 0.2, pz0, pz1)
  frame(pEnd, headX, hz0, hz1)
  boards(kit, rnd, L, R, B, F, { ragged0: 0.1, ragged1: 0.16 })
  boards(kit, rnd, headX, L, pz0, pz1, { ragged0: 0.12, ragged1: 0.16, split: false })
  boards(kit, rnd, pEnd, headX, hz0, hz1, { ragged0: 0.1, ragged1: 0.16 })
  // cross joists showing under the long edges
  for (let x = L + 0.9; x < R; x += 2.3) kit.box(0.2, 0.2, 0.3, { color: palette.trunkDark, top: palette.woodDark, at: [x, DECK_TOP - 0.3, F + 0.02], r: 0.05, seg: 1 })

  // broad stone steps down to the lawn behind each side stall
  for (const sx of [L + 2.2, R - 1.9]) {
    for (let i = 0; i < 2; i++) kit.box(2.4 - i * 0.5, 0.16, 0.7, { color: palette.rockDark, top: palette.rock, at: [sx, DECK_TOP - 0.15 - i * 0.12, B - 0.3 - i * 0.6], r: 0.07, seg: 2 })
  }

  // ---------------------------------------------------------------- posts and sagging rope rails
  const H = 0.9
  // front edge, with a gap for the ladder
  const front: number[] = []
  for (let x = L; x <= R + 0.01; x += (R - L) / 6) front.push(x)
  // (the two corner posts are lantern posts, added below)
  front.forEach((x, i) => {
    if (i > 0 && i < front.length - 1) post(x, F + 0.1, H + (rnd() - 0.5) * 0.16)
  })
  const gap = 3
  front.forEach((x, i) => {
    if (i > 0 && i !== gap) ropeRail(kit, [front[i - 1], F + 0.1], [x, F + 0.1], H, H)
  })
  // ladder down to the water in the gap
  const lx = (front[gap - 1] + front[gap]) / 2
  for (const sx of [-0.3, 0.3]) kit.beam([lx + sx, DECK_TOP + 0.5, F + 0.14], [lx + sx, -1.9, F + 0.14], 0.09, { color: palette.woodDark, top: palette.wood })
  for (let y = DECK_TOP - 0.22; y > -1.7; y -= 0.3) kit.beam([lx - 0.3, y, F + 0.14], [lx + 0.3, y, F + 0.14], 0.07, { color: palette.wood, top: palette.woodLight, round: true })
  // right edge
  const right: number[] = [F + 0.1, 1.3, -1.4, B + 0.3]
  right.slice(1).forEach((z) => post(R + 0.08, z, H + (rnd() - 0.5) * 0.16))
  for (let i = 1; i < right.length; i++) ropeRail(kit, [R + 0.08, right[i - 1]], [R + 0.08, right[i]], H, H)
  // left edge behind the pier
  // (the back corner post is a lantern post, added below)
  const left: number[] = [pz0 - 0.2, -1.7, B + 0.3]
  left.slice(0, 2).forEach((z) => post(L - 0.08, z, H + (rnd() - 0.5) * 0.16))
  for (let i = 1; i < left.length; i++) ropeRail(kit, [L - 0.08, left[i - 1]], [L - 0.08, left[i]], H, H)
  // the pier: a pair of posts halfway, tall ones where the head begins, low bollards round the head so cargo can swing over
  const mid = (L + headX) / 2
  for (const z of [pz0 - 0.1, pz1 + 0.1]) post(mid, z, H)
  post(headX + 0.1, hz1 + 0.08, H)
  post(headX + 0.1, hz0 - 0.08, H)
  ropeRail(kit, [L - 0.08, pz0 - 0.2], [mid, pz0 - 0.1], H, H)
  ropeRail(kit, [mid, pz0 - 0.1], [headX + 0.1, hz0 - 0.08], H, H)
  ropeRail(kit, [L - 0.08, F + 0.1], [mid, pz1 + 0.1], H, H)
  ropeRail(kit, [mid, pz1 + 0.1], [headX + 0.1, hz1 + 0.08], H, H)
  post(pEnd - 0.06, hz0 - 0.06, 0.42, 2)
  post(pEnd - 0.06, hz1 + 0.06, 0.42, 2)
  // mooring bollards on the end of the head
  const bollard: V3 = [pEnd + 0.3, DECK_TOP, hz1 - 0.55]
  for (const z of [hz0 + 0.55, hz1 - 0.55]) {
    kit.cyl(0.13, 0.18, 0.34, { color: palette.steel, top: palette.metal, at: [pEnd + 0.3, DECK_TOP + 0.17, z], bevel: 0.05, seg: 10, mat: 'metal' })
    kit.cyl(0.2, 0.2, 0.09, { color: palette.steel, top: palette.metalLight, at: [pEnd + 0.3, DECK_TOP + 0.36, z], bevel: 0.04, seg: 10, mat: 'metal' })
  }

  // ---------------------------------------------------------------- lanterns, life ring, floats
  lanternPost(kit, rnd, L - 0.08, F + 0.1, 0.9)
  lanternPost(kit, rnd, R + 0.08, F + 0.1, Math.PI - 0.9)
  lanternPost(kit, rnd, L - 0.08, B + 0.3, 0.6)
  posts.push([L - 0.08, F + 0.1, 0.24], [R + 0.08, F + 0.1, 0.24])
  // life ring on a board, on the post beside the ladder
  kit.at([front[gap], DECK_TOP + 0.52, F + 0.36], [0.12, 0, 0], () => {
    kit.box(0.2, 0.6, 0.06, { color: palette.woodDark, top: palette.wood, at: [0, 0, -0.07], r: 0.02, seg: 1 })
    lifeRing(kit, 0.27, 0.095)
  })
  // net floats strung on the pier's mid post
  const floats = [palette.orange, palette.teal, palette.yellow]
  floats.forEach((c, i) => {
    const fx = mid - 0.16 + i * 0.16
    kit.beam([mid, DECK_TOP + 0.6, pz1 + 0.3], [fx, DECK_TOP + 0.28 - i * 0.05, pz1 + 0.4], 0.022, { color: palette.rope, round: true, shade: 0 })
    kit.sphere(0.12, { color: c, top: mix(c, palette.white, 0.3), at: [fx, DECK_TOP + 0.2 - i * 0.05, pz1 + 0.42], seg: 10, mat: 'gloss' })
  })

  // ---------------------------------------------------------------- cargo, in tidy clusters
  // front-right corner: a square stack of crates with two drums in line
  const cx = R - 1.25
  const cz = F - 1.15
  stencilCrate(kit, [cx, DECK_TOP, cz], 0.78, 0, 'bolt', palette.orangeDark)
  stencilCrate(kit, [cx - 0.9, DECK_TOP, cz], 0.78, 0, 'dish', palette.blueDark)
  stencilCrate(kit, [cx - 0.45, DECK_TOP + 0.78, cz], 0.66, 0, 'sat', palette.tealDark)
  drum(kit, [cx - 0.1, DECK_TOP, cz - 0.95], palette.tealDark, palette.teal)
  drum(kit, [cx - 0.68, DECK_TOP, cz - 0.95], palette.yellowDark, palette.yellow)
  // back-left corner: three casks in a tight triangle
  cask(kit, [L + 0.75, DECK_TOP, B + 0.75], 1.25)
  cask(kit, [L + 1.42, DECK_TOP, B + 0.75], 1.25)
  cask(kit, [L + 1.08, DECK_TOP, B + 1.35], 1.25, palette.rustDark)
  // back-right corner: a pair of drums and a crate
  drum(kit, [R - 0.7, DECK_TOP, B + 0.7], palette.redDark, palette.red)
  drum(kit, [R - 1.28, DECK_TOP, B + 0.7], palette.blueDark, palette.blue)
  stencilCrate(kit, [R - 0.85, DECK_TOP, B + 1.5], 0.66, 0, 'panel', palette.blueDark)
  // a coil of rope by the pier
  for (let i = 0; i < 3; i++) kit.torus(0.36 - i * 0.03, 0.07, { color: palette.rope, top: palette.ropeLight, at: [L + 0.8, DECK_TOP + 0.07 + i * 0.12, F - 0.75], tube: 6, seg: 16 })

  // the pier head: the crane's plinth, a pallet where deliveries are set down, and the crates still waiting to go up
  // (the pallet lies where the pier meets its head, so the jib rests along the pier, seen side-on)
  const crane: [number, number] = [pEnd + 0.8, hz0 + 0.9]
  const drop: [number, number] = [headX + 0.72, pz0 + 0.72]
  kit.cyl(0.62, 0.7, 0.26, { color: palette.steel, top: palette.metal, at: [crane[0], DECK_TOP + 0.13, crane[1]], bevel: 0.07, seg: 16, mat: 'metal' })
  pallet(kit, [drop[0], DECK_TOP, drop[1]], 1.0)
  stencilCrate(kit, [headX - 0.5, DECK_TOP, hz1 - 0.62], 0.66, 0, 'panel', palette.blueDark)
  stencilCrate(kit, [headX - 1.22, DECK_TOP, hz1 - 0.62], 0.66, 0, 'dish', palette.tealDark)
  stencilCrate(kit, [headX - 0.86, DECK_TOP + 0.66, hz1 - 0.62], 0.54, 0, 'bolt', palette.orangeDark)

  return { group: kit.build('dock'), posts, crane, drop, dropY: DECK_TOP + 0.11, bollard }
}

// ------------------------------------------------------------------ the crane
export interface CraneBuild {
  /** stands on the plinth; add at the crane's pivot, y = DECK_TOP */
  root: THREE.Group
  /** turret and jib: turn this about Y (0 = jib along +Z) */
  arm: THREE.Group
  /** hangs from the jib tip; scale.y is its length */
  cable: THREE.Group
  /** hook block, at the end of the cable */
  hook: THREE.Group
  /** the crate in the sling, shown while a load is carried */
  load: THREE.Group
  /** horizontal distance from the pivot to the hook */
  reach: number
  /** height of the jib tip above the root */
  tipY: number
  /** size of the carried crate */
  crate: number
}

/** A stubby yellow harbour crane: a turret with a cab, a counterweight and a ladder jib that reaches `reach` out. */
export function buildCrane(reach: number): CraneBuild {
  const tipY = 3.75
  const crate = 0.6
  const root = new THREE.Group()
  root.name = 'crane'
  const k = new Kit()
  // slew ring and turret
  k.cyl(0.5, 0.54, 0.16, { color: palette.rubber, top: palette.steel, at: [0, 0.33, 0], bevel: 0.04, seg: 16 })
  k.box(1.02, 0.84, 1.22, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.83, -0.1], r: 0.16 })
  k.box(1.12, 0.12, 1.32, { color: palette.orangeDark, top: palette.orange, at: [0, 1.29, -0.1], r: 0.055, seg: 2 })
  // cab glass: front and both sides
  k.box(0.64, 0.38, 0.06, { color: palette.glassDark, top: palette.glass, at: [0, 0.94, 0.5], r: 0.04, mat: 'glass', seg: 1 })
  for (const sx of [-1, 1]) k.box(0.06, 0.38, 0.5, { color: palette.glassDark, top: palette.glass, at: [sx * 0.5, 0.94, 0.16], r: 0.04, mat: 'glass', seg: 1 })
  // hazard band round the foot, and the counterweight
  k.box(1.06, 0.12, 1.26, { color: palette.hazardDark, at: [0, 0.5, -0.1], r: 0.05, shade: 0, seg: 1 })
  k.box(0.86, 0.62, 0.5, { color: palette.rubber, top: palette.steel, at: [0, 0.82, -0.9], r: 0.12 })
  // jib: two chunky rails with rungs between, from the turret to the tip
  const foot: V3 = [0, 1.3, 0.36]
  const tip: V3 = [0, tipY, reach]
  for (const sx of [-1, 1]) k.beam([sx * 0.2, foot[1], foot[2]], [sx * 0.11, tip[1], tip[2]], 0.16, { color: palette.yellowDark, top: palette.yellow })
  for (let i = 1; i < 7; i++) {
    const t = i / 7
    const y = foot[1] + (tip[1] - foot[1]) * t
    const z = foot[2] + (tip[2] - foot[2]) * t
    const w = 0.2 - 0.09 * t
    k.beam([-w, y, z], [w, y, z], 0.1, { color: i % 2 ? palette.hazardDark : palette.yellow, round: true, shade: 0.04 })
  }
  // pulley at the tip, mast and backstays
  k.cyl(0.17, 0.17, 0.16, { color: palette.steel, top: palette.metalLight, at: tip, rot: [0, 0, Math.PI / 2], bevel: 0.04, seg: 12, mat: 'metal' })
  k.beam([0, 1.3, -0.36], [0, 2.5, -0.52], 0.14, { color: palette.yellowDark, top: palette.yellow })
  k.beam([0, 2.5, -0.52], tip, 0.04, { color: palette.steel, round: true, shade: 0 })
  k.beam([0, 2.5, -0.52], [0, 1.2, -1.08], 0.04, { color: palette.steel, round: true, shade: 0 })
  // beacon on the cab roof
  k.cyl(0.07, 0.08, 0.08, { color: palette.steel, at: [0.32, 1.38, 0.32], bevel: 0.02, seg: 8 })
  k.sphere(0.09, { color: palette.beaconRed, top: palette.lampWarm, at: [0.32, 1.46, 0.32], seg: 8, mat: 'glowSoft', shade: 0 })
  const arm = k.build('crane-arm')
  root.add(arm)

  const kc = new Kit()
  kc.cyl(0.024, 0.024, 1, { color: palette.steel, at: [0, -0.5, 0], bevel: 0.005, seg: 6, shade: 0 })
  const cable = kc.build('crane-cable')
  cable.position.set(tip[0], tip[1] - 0.12, tip[2])
  arm.add(cable)

  const kh = new Kit()
  kh.box(0.26, 0.2, 0.18, { color: palette.yellowDark, top: palette.yellow, at: [0, -0.1, 0], r: 0.055, seg: 2 })
  kh.at([0, -0.27, 0], [0, 0, Math.PI], () => kh.torus(0.08, 0.034, { color: palette.steel, top: palette.metalLight, rot: [-Math.PI / 2, 0, 0], arc: Math.PI * 1.4, tube: 6, seg: 10, mat: 'metal' }))
  const hook = kh.build('crane-hook')
  hook.position.set(tip[0], tip[1] - 1, tip[2])
  arm.add(hook)

  const kl = new Kit()
  const top = -0.34 - 0.3
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kl.beam([0, -0.3, 0], [sx * crate * 0.42, top, sz * crate * 0.42], 0.028, { color: palette.rope, round: true, shade: 0 })
  stencilCrate(kl, [0, top - crate, 0], crate, 0.3, 'sat', palette.tealDark)
  const load = kl.build('crane-load')
  load.visible = false
  hook.add(load)

  return { root, arm, cable, hook, load, reach, tipY: tip[1] - 0.12, crate }
}

/** Height of the bottom of the carried crate below the hook's origin. */
export const LOAD_DROP = 0.34 + 0.3 + 0.6

/** The crate the crane leaves on the pallet. Bottom on the origin. */
export function buildLandedCrate(size = 0.6): THREE.Group {
  const k = new Kit()
  stencilCrate(k, [0, 0, 0], size, 0.3, 'sat', palette.tealDark)
  return k.build('landed-crate')
}

// ------------------------------------------------------------------ buoys
/** A floating channel marker: striped float, short mast, a little lamp. Origin on the waterline. */
export function buildBuoy(color: string, colorDark: string, lit = true): THREE.Group {
  const k = new Kit()
  k.lathe(
    [
      [0, -0.34],
      [0.22, -0.3],
      [0.34, -0.12],
      [0.36, 0.02],
      [0.3, 0.14],
      [0, 0.16],
    ],
    { color: colorDark, top: color, seg: 14, mat: 'gloss' },
  )
  k.cyl(0.3, 0.33, 0.12, { color: palette.creamShade, top: palette.white, at: [0, 0.13, 0], bevel: 0.04, seg: 14, mat: 'gloss' })
  k.lathe(
    [
      [0, 0.18],
      [0.27, 0.18],
      [0.2, 0.36],
      [0.09, 0.62],
      [0, 0.64],
    ],
    { color: colorDark, top: color, seg: 14, mat: 'gloss' },
  )
  k.cyl(0.035, 0.045, 0.4, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.82, 0], bevel: 0.01, seg: 6, mat: 'metal' })
  k.sphere(0.085, { color: lit ? palette.lampWarm : palette.cream, top: lit ? palette.lampHot : palette.white, at: [0, 1.06, 0], seg: 8, mat: lit ? 'glowSoft' : 'gloss', shade: 0 })
  return k.build('buoy')
}

/** A plain round mooring float. Origin on the waterline. */
export function buildFloat(color: string, colorDark: string): THREE.Group {
  const k = new Kit()
  k.sphere(0.3, { color: colorDark, top: color, at: [0, 0.06, 0], seg: 12, mat: 'gloss' })
  k.torus(0.3, 0.035, { color: palette.white, at: [0, 0.1, 0], tube: 5, seg: 14 })
  k.torus(0.06, 0.02, { color: palette.steel, at: [0, 0.37, 0], rot: [Math.PI / 2, 0, 0], tube: 5, seg: 8, mat: 'metal' })
  return k.build('float')
}
