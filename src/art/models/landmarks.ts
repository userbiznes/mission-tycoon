import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../kit'
import { logoPlate } from '../logo'
import { palette } from '../palette'
import { createModel, type ModelOptions, type ModelUserData } from '../registry'
import { barrel, cracks, dishBowl, door, faded, lampPost, mix, panelRoof, rustPatch, weed, whip, win, YAW } from './common'

/**
 * The lost spaceport's three landmarks. Each factory makes both versions of
 * its building: `level: 0` is the ruin the jungle took back (rust, vines,
 * things fallen over), `level: 1` the restored, working building.
 *
 * Fronts face +Z; the origin is the middle of the site, on the ground.
 */

const isRuin = (opts: ModelOptions) => Number(opts.level ?? 1) <= 0

// ------------------------------------------------------------------ shared pieces
/** A creeper: a wandering stem with clumps of leaves along it. */
function vine(kit: Kit, pts: V3[], rnd: () => number, o: { r?: number; leaf?: number } = {}): void {
  kit.pipe(pts, o.r ?? 0.05, { color: palette.leafDark, top: palette.leaf, radial: 5, seg: pts.length * 5, tension: 0.4 })
  const leaf = o.leaf ?? 0.2
  for (let i = 0; i < pts.length; i++) {
    for (let k = 0; k < 2; k++) {
      const a = pts[i]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const t = k * 0.5
      kit.blob(leaf * (0.75 + rnd() * 0.5), {
        color: palette.leafDark,
        top: rnd() < 0.5 ? palette.leaf : palette.leafLight,
        at: [a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * 0.14, a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * 0.1, a[2] + (b[2] - a[2]) * t + (rnd() - 0.5) * 0.14],
        scale: [1.2, 0.7, 1.1],
        detail: 1,
        shade: 0.18,
      })
    }
  }
}

/** A mat of ivy lying on a surface: flat leaf clumps scattered round a point. */
function ivy(kit: Kit, at: V3, n: number, spread: number, rnd: () => number, flatAxis: 'y' | 'z' | 'x' = 'y'): void {
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.3
    const r = Math.sqrt(rnd()) * spread
    const s = 0.16 + rnd() * 0.16
    const off: V3 = flatAxis === 'y' ? [Math.cos(a) * r, 0, Math.sin(a) * r] : flatAxis === 'z' ? [Math.cos(a) * r, Math.sin(a) * r, 0] : [0, Math.sin(a) * r, Math.cos(a) * r]
    const scale: V3 = flatAxis === 'y' ? [1.2, 0.45, 1.1] : flatAxis === 'z' ? [1.2, 1.1, 0.45] : [0.45, 1.1, 1.2]
    kit.blob(s, { color: palette.leafDark, top: rnd() < 0.5 ? palette.leaf : palette.leafLight, at: [at[0] + off[0], at[1] + off[1], at[2] + off[2]], scale, detail: 1, shade: 0.16 })
  }
}

/**
 * A square lattice mast standing on the origin: four legs, a ring of braces
 * every `step`, and a diagonal in every bay. `gone(bay, face)` leaves pieces out.
 */
function lattice(kit: Kit, h: number, w0: number, w1: number, colors: [string, string], o: { step?: number; leg?: number; brace?: number; gone?: (bay: number, face: number) => boolean } = {}): void {
  const step = o.step ?? 1
  const leg = o.leg ?? 0.14
  const brace = o.brace ?? 0.08
  const [c0, c1] = colors
  const corner = (y: number, i: number): V3 => {
    const w = (w0 + (w1 - w0) * (y / h)) / 2
    return [i === 0 || i === 3 ? -w : w, y, i < 2 ? -w : w]
  }
  for (let i = 0; i < 4; i++) kit.beam(corner(0, i), corner(h, i), leg, { color: c0, top: c1 })
  const bays = Math.round(h / step)
  for (let b = 0; b < bays; b++) {
    const y0 = (b / bays) * h
    const y1 = ((b + 1) / bays) * h
    for (let f = 0; f < 4; f++) {
      if (o.gone?.(b, f)) continue
      const i0 = f
      const i1 = (f + 1) % 4
      kit.beam(corner(y1, i0), corner(y1, i1), brace, { color: c0, top: c1 })
      kit.beam(corner(y0, (b + f) % 2 ? i0 : i1), corner(y1, (b + f) % 2 ? i1 : i0), brace, { color: c0, top: c1 })
    }
  }
}

/** A slab of old concrete, sunk and tipped a little. */
function brokenSlab(kit: Kit, at: V3, w: number, d: number, rnd: () => number, h = 0.18): void {
  kit.box(w, h, d, {
    color: mix(palette.concreteDark, palette.leafDark, 0.12),
    top: mix(palette.concrete, palette.leaf, 0.1),
    at: [at[0], at[1] + h / 2 - 0.03 + (rnd() - 0.5) * 0.05, at[2]],
    rot: [(rnd() - 0.5) * 0.09, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.09],
    r: 0.05,
    seg: 2,
  })
}

const mossy = (c: string, t = 0.18) => mix(c, palette.leafDark, t)

// ------------------------------------------------------------------ 1. the tracking station
/** The old dish as the jungle left it: a wedge of panels gone, the feed hanging, built opening along +Y. */
function ruinedDish(kit: Kit, R: number, depth: number, rnd: () => number): void {
  const phi0 = 0.5
  const phiLen = Math.PI * 1.6
  const n = 10
  const inner: THREE.Vector2[] = []
  const outer: THREE.Vector2[] = []
  for (let i = 0; i <= n; i++) {
    const r = Math.max(0.0001, (i / n) * R)
    const y = depth * (r / R) ** 2
    inner.push(new THREE.Vector2(r, y + 0.02))
    outer.push(new THREE.Vector2(r, y - 0.11))
  }
  kit.add(new THREE.LatheGeometry(inner.slice().reverse(), 26, phi0, phiLen), { color: palette.rust, top: mix(palette.rustLight, palette.cream, 0.35), shade: 0.1 })
  kit.add(new THREE.LatheGeometry(outer, 26, phi0, phiLen), { color: palette.rustDark, top: palette.rust, shade: 0.12 })
  const on = (r: number, phi: number, lift = 0): V3 => [Math.sin(phi) * r, depth * (r / R) ** 2 + lift, Math.cos(phi) * r]
  // rim, in short lengths round what is left of the bowl
  const m = 22
  for (let k = 0; k < m; k++) {
    const a = phi0 + (phiLen * k) / m
    const b = phi0 + (phiLen * (k + 1)) / m
    kit.beam(on(R, a, -0.03), on(R, b, -0.03), 0.2, { color: palette.rustDark, top: palette.rustLight, round: true })
  }
  // ragged edges where the panels tore away, and the ribs behind
  for (const a of [phi0, phi0 + phiLen]) {
    for (let i = 1; i <= 4; i++) kit.beam(on((R * (i - 1)) / 4, a, -0.04), on((R * i) / 4, a, -0.04), 0.13, { color: palette.rustDark, top: palette.rust, round: true })
  }
  for (let i = 0; i < 9; i++) {
    const a = phi0 + (phiLen * (i + 0.5)) / 9
    kit.beam([Math.sin(a) * 0.5, -0.2, Math.cos(a) * 0.5], on(R * 0.93, a, -0.2), 0.12, { color: palette.rustDark, top: palette.rust })
  }
  kit.cyl(0.62, 0.8, 0.55, { color: palette.rustDark, top: palette.rust, at: [0, -0.34, 0], bevel: 0.08, seg: 14 })
  // dark holes where single panels have gone, and seams
  for (const [r, a, w] of [
    [R * 0.55, 1.4, 0.8],
    [R * 0.78, 3.3, 0.7],
    [R * 0.4, 4.4, 0.6],
  ]) {
    const slope = Math.atan((2 * depth * r) / (R * R))
    kit.at(on(r, a, 0.03), [0, a, 0], () => kit.box(w, 0.03, w * 0.8, { color: palette.soot, top: palette.navyDark, rot: [-slope, 0.3, 0], r: 0.012, shade: 0, seg: 1 }))
  }
  // the feed: two struts still up, one snapped, the horn hanging by its cable
  const focus = R * 0.72
  kit.beam(on(R * 0.84, 1.3), [0.1, focus, 0.05], 0.09, { color: palette.rustDark, top: palette.rust, round: true })
  kit.beam(on(R * 0.84, 3.6), [-0.05, focus, -0.1], 0.09, { color: palette.rustDark, top: palette.rust, round: true })
  kit.beam(on(R * 0.84, 5.2), on(R * 0.5, 5.0, 0.9), 0.09, { color: palette.rustDark, top: palette.rust, round: true })
  kit.cyl(0.2, 0.28, 0.5, { color: palette.rustDark, top: palette.rust, at: [0.05, focus - 0.1, 0], rot: [0.5, 0, 0.4], bevel: 0.06, seg: 10 })
  void rnd
}

export function createTrackingStation(opts: ModelOptions = {}): THREE.Object3D {
  const ruin = isRuin(opts)
  const rnd = seeded(301)
  const kit = new Kit()
  const group = new THREE.Group()
  group.name = 'trackingStation'
  const R = 3.3
  const hubY = 3.0

  // pad
  if (ruin) {
    kit.slab(6.0, 6.0, 0.16, 2.8, { color: mossy(palette.concreteDark), top: mossy(palette.concrete, 0.12), bevel: 0.05 })
    cracks(kit, rnd, 9, 2.5, 0.17)
    for (let i = 0; i < 7; i++) {
      const a = rnd() * 6.3
      weed(kit, [Math.cos(a) * (1.4 + rnd() * 1.2), 0.15, Math.sin(a) * (1.4 + rnd() * 1.2)], rnd, 1.1)
    }
    ivy(kit, [-2.0, 0.17, 1.2], 9, 0.9, rnd)
    ivy(kit, [1.8, 0.17, -1.9], 7, 0.8, rnd)
  } else {
    kit.slab(6.2, 6.2, 0.16, 2.9, { color: palette.concreteDark, top: palette.concrete, bevel: 0.05 })
    kit.slab(5.7, 5.7, 0.03, 2.7, { color: palette.concrete, top: palette.concreteLight, at: [0, 0.155, 0], bevel: 0.01, shade: 0.02 })
    kit.torus(2.1, 0.07, { color: palette.teal, at: [0, 0.18, 0], tube: 5, seg: 36, shade: 0 })
  }

  // pedestal and yoke
  const ped: [string, string] = ruin ? [mossy(palette.concreteDark, 0.2), mossy(faded(palette.cream, 0.3), 0.1)] : [palette.creamShade, palette.white]
  kit.at([0, 0.14, 0], ruin ? [0.03, 0, -0.04] : undefined, () => {
    kit.lathe(
      [
        [0, 0],
        [1.2, 0],
        [1.26, 0.14],
        [1.0, 0.5],
        [0.82, 2.25],
        [0.95, 2.42],
        [0, 2.48],
      ],
      { color: ped[0], top: ped[1], seg: 18 },
    )
    kit.torus(0.92, 0.07, { color: ruin ? palette.rustDark : palette.teal, at: [0, 1.5, 0], tube: 6, seg: 20 })
    if (ruin) {
      kit.at([0, 1.2, 0.93], undefined, () => rustPatch(kit, 0.5, 0.9, { dark: true }))
      kit.at([-0.86, 0.9, 0.2], [0, -1.3, 0], () => rustPatch(kit, 0.4, 0.7))
    } else {
      kit.at([0, 0, 1.02], undefined, () => door(kit, 0.5, 0.86, palette.tealDark, palette.teal, { porthole: true }))
    }
    const steel: [string, string] = ruin ? [palette.rustDark, palette.rust] : [palette.metalDark, palette.metalLight]
    for (const s of [-1, 1]) kit.beam([s * 0.6, 2.3, 0], [s * 0.86, hubY - 0.1, 0], 0.26, { color: steel[0], top: steel[1] })
  })

  if (ruin) {
    // the dish, slumped on its mount and facing the old base
    const e = new THREE.Euler(0, 1.15, 0.92)
    kit.at([0, hubY, 0], [0, 1.15, 0.92], () => ruinedDish(kit, R, 0.85, rnd))
    const world = (p: V3): V3 => {
      const v = new THREE.Vector3(...p).applyEuler(e)
      return [v.x, v.y + hubY, v.z]
    }
    const rim = (phi: number, r = R): V3 => world([Math.sin(phi) * r, 0.85 * (r / R) ** 2, Math.cos(phi) * r])
    // creepers: up from the ground over the low rim, and trailing down from the high one
    for (const phi of [1.0, 1.75, 2.5]) {
      const top = rim(phi)
      const mid = rim(phi, R * 0.6)
      vine(kit, [[top[0] * 1.08, 0.1, top[2] * 1.08], [top[0] * 1.04, top[1] * 0.5, top[2] * 1.04], top, mid], rnd, { leaf: 0.24 })
    }
    for (const phi of [3.4, 4.1, 4.7, 5.3]) {
      const top = rim(phi)
      const len = 1.2 + rnd() * 1.3
      vine(kit, [rim(phi, R * 0.8), top, [top[0] + (rnd() - 0.5) * 0.3, top[1] - len * 0.5, top[2] + (rnd() - 0.5) * 0.3], [top[0] + (rnd() - 0.5) * 0.4, top[1] - len, top[2] + (rnd() - 0.5) * 0.4]], rnd, { leaf: 0.22 })
    }
    // panels that fell off, lying on the pad
    for (const [x, z, r] of [
      [-2.2, 2.0, 0.4],
      [-1.3, 2.7, -0.7],
      [1.9, 2.2, 1.3],
    ]) {
      kit.box(1.1, 0.07, 0.9, { color: palette.rustDark, top: palette.rustLight, at: [x, 0.24, z], rot: [0.12, r, 0.08], r: 0.03, mat: 'metal', seg: 1 })
    }
    // what is left of the control hut: three walls, no roof, a rafter or two
    kit.at([2.35, 0.14, -1.5], [0, -0.5, 0], () => {
      const wall: [string, string] = [mossy(faded(palette.creamShade, 0.3), 0.14), faded(palette.cream, 0.25)]
      kit.box(1.7, 1.0, 0.16, { color: wall[0], top: wall[1], at: [0, 0.5, -0.6], r: 0.05, seg: 2 })
      kit.box(0.16, 1.15, 1.3, { color: wall[0], top: wall[1], at: [-0.78, 0.57, 0], r: 0.05, seg: 2 })
      kit.box(0.16, 0.7, 1.3, { color: wall[0], top: wall[1], at: [0.78, 0.35, 0], rot: [0, 0, -0.06], r: 0.05, seg: 2 })
      kit.beam([-0.8, 1.15, 0.5], [0.5, 0.75, 0.45], 0.1, { color: palette.trunkDark, top: palette.wood })
      kit.beam([-0.8, 1.12, -0.1], [0.75, 0.3, -0.05], 0.1, { color: palette.trunkDark, top: palette.wood })
      kit.box(0.5, 0.5, 0.4, { color: palette.rustDark, top: palette.rust, at: [0.1, 0.25, -0.2], rot: [0, 0.3, 0.1], r: 0.05 })
      ivy(kit, [-0.2, 1.0, -0.52], 8, 0.7, rnd, 'z')
    })
    barrel(kit, [-2.4, 0.14, -1.2], palette.rustDark, palette.rust, 1.5)
  } else {
    // the restored dish turns on its mount (built in its own kit so it can move)
    const dk = new Kit()
    dishBowl(dk, R + 0.1, 0.9, { inner: [palette.creamShade, palette.white], outer: [palette.metalDark, palette.metal], rim: palette.red, feed: palette.red, struts: 3 })
    dk.sphere(0.12, { color: palette.beaconRed, top: palette.lampWarm, at: [0, (R + 0.1) * 0.95 + 0.12, 0], seg: 8, mat: 'glow', shade: 0 })
    const dish = dk.build('trackingDish')
    const mount = new THREE.Group()
    mount.position.set(0, hubY + 0.14, 0)
    dish.rotation.set(0, 0, 0.62)
    mount.add(dish)
    group.add(mount)
    // control hut, lamp, equipment
    kit.at([2.45, 0.14, -1.45], [0, -0.5, 0], () => {
      kit.box(1.8, 1.15, 1.3, { color: palette.creamShade, top: palette.white, at: [0, 0.575, 0], r: 0.09 })
      kit.at([0, 1.15, 0], undefined, () => panelRoof(kit, 1.8, 0.5, 1.3, palette.tealDark, palette.roofTeal, { thick: 0.16, overhang: 0.2, overhangZ: 0.16, rows: 2 }))
      kit.at([-0.4, 0, 0.65], undefined, () => door(kit, 0.44, 0.8, palette.tealDark, palette.teal))
      kit.at([0.42, 0.66, 0.65], undefined, () => win(kit, 0.5, 0.42, { glow: palette.lampWarm, cross: true }))
      kit.at([0.9, 0.66, 0], [0, YAW.right, 0], () => win(kit, 0.5, 0.42, { glow: palette.screenGlow }))
      kit.at([0.5, 1.5, -0.3], undefined, () => whip(kit, 1.1, palette.red))
    })
    kit.at([-2.3, 0.14, 1.7], undefined, () => lampPost(kit, 1.4, { lit: true }))
    // a rack of receivers with little lights
    kit.box(0.7, 0.9, 0.5, { color: palette.metalDark, top: palette.metalLight, at: [-2.3, 0.6, -1.3], rot: [0, 0.5, 0], r: 0.06 })
    for (let i = 0; i < 3; i++) kit.sphere(0.04, { color: [palette.beaconGreen, palette.lampWarm, palette.screenGlow][i], at: [-2.12 + i * 0.1, 0.75 + i * 0.01, -1.0 - i * 0.05], seg: 6, mat: 'glowSoft', shade: 0 })
    const data = group.userData as ModelUserData
    data.tick = (t) => {
      // a slow sweep across the sky, with a little nod
      mount.rotation.y = 0.6 + Math.sin(t * 0.22) * 0.9
      dish.rotation.z = 0.62 + Math.sin(t * 0.31 + 1) * 0.12
    }
  }

  const built = kit.build('trackingStation')
  group.add(built)
  if (!ruin) {
    const logo = logoPlate(0.5)
    logo.position.set(0, 1.75, 1.0)
    group.add(logo)
  }
  return group
}

// ------------------------------------------------------------------ 2. the science annex
export function createScienceAnnex(opts: ModelOptions = {}): THREE.Object3D {
  const ruin = isRuin(opts)
  const rnd = seeded(302)
  const kit = new Kit()
  const group = new THREE.Group()
  group.name = 'scienceAnnex'
  const DX = -1.2
  const DR = 2.1
  const DH = 2.0
  const baseY = 0.7

  // plinth
  if (ruin) {
    kit.slab(7.4, 5.6, 0.16, 1.4, { color: mossy(palette.concreteDark), top: mossy(palette.concrete, 0.12), bevel: 0.05 })
    cracks(kit, rnd, 9, 2.6, 0.17)
    for (let i = 0; i < 6; i++) weed(kit, [(rnd() - 0.5) * 6.4, 0.15, 2.0 + rnd() * 0.6], rnd, 1.1)
  } else {
    kit.slab(7.6, 5.8, 0.16, 1.4, { color: palette.concreteDark, top: palette.concrete, bevel: 0.05 })
    kit.slab(7.1, 5.3, 0.03, 1.2, { color: palette.concrete, top: palette.concreteLight, at: [0, 0.155, 0], bevel: 0.01, shade: 0.02 })
  }

  // the dome's drum wall
  const drum: [string, string] = ruin ? [mossy(faded(palette.creamShade, 0.3), 0.16), faded(palette.cream, 0.3)] : [palette.creamShade, palette.white]
  kit.lathe(
    [
      [DR - 0.28, 0.16],
      [DR + 0.12, 0.16],
      [DR + 0.14, 0.3],
      [DR + 0.06, baseY],
      [DR - 0.2, baseY + 0.03],
      [DR - 0.28, baseY - 0.1],
    ],
    { color: drum[0], top: drum[1], at: [DX, 0, 0], seg: 28 },
  )
  kit.torus(DR + 0.07, 0.07, { color: ruin ? palette.rustDark : palette.purple, at: [DX, baseY - 0.04, 0], tube: 6, seg: 28 })

  // ribs: meridians from the drum to the crown
  const N = 10
  const rib = (phi: number, th: number): V3 => [DX + Math.sin(phi) * DR * Math.cos(th), baseY + DH * Math.sin(th), Math.cos(phi) * DR * Math.cos(th)]
  const ribColor: [string, string] = ruin ? [palette.rustDark, palette.rust] : [palette.metalLight, palette.white]
  /** how much of each rib still stands (1 = whole) */
  const stands = ruin ? [1, 1, 1, 1, 0.5, 0, 0, 0.42, 1, 1] : new Array(N).fill(1)
  for (let i = 0; i < N; i++) {
    const phi = (i / N) * Math.PI * 2
    const upTo = stands[i] * (Math.PI / 2)
    if (upTo <= 0) continue
    const pts: V3[] = []
    for (let k = 0; k <= 5; k++) pts.push(rib(phi, (upTo * k) / 5))
    if (stands[i] < 1) pts[5] = [pts[5][0] + (rnd() - 0.5) * 0.3, pts[5][1] - 0.12, pts[5][2] + (rnd() - 0.5) * 0.3]
    kit.pipe(pts, 0.065, { color: ribColor[0], top: ribColor[1], radial: 6, seg: 12, tension: 0.4 })
  }
  // rings of latitude between the ribs that stand
  for (const th of [0.5, 1.0]) {
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N
      if (stands[i] * (Math.PI / 2) < th || stands[j] * (Math.PI / 2) < th) continue
      kit.beam(rib((i / N) * Math.PI * 2, th), rib((j / N) * Math.PI * 2, th), 0.07, { color: ribColor[0], top: ribColor[1], round: true })
    }
  }
  kit.sphere(0.16, { color: ribColor[0], top: ribColor[1], at: [DX, baseY + DH, 0], seg: 8 })
  if (ruin) {
    // the crown hangs on by the back ribs only; the fallen ribs lie in the long grass
    kit.beam([DX + 0.9, 0.3, 2.3], [DX + 2.3, 0.26, 1.2], 0.12, { color: palette.rustDark, top: palette.rust, round: true })
    kit.beam([DX + 0.2, 0.34, 2.6], [DX + 1.5, 0.9, 1.5], 0.12, { color: palette.rustDark, top: palette.rust, round: true })
  }

  // glass: every pane when restored, a scatter of survivors in the ruin
  const pane = (i: number, k: number) => {
    const phi = ((i + 0.5) / N) * Math.PI * 2
    const t0 = [0, 0.5, 1.0][k]
    const t1 = [0.5, 1.0, 1.5][k]
    const tm = (t0 + t1) / 2
    const w = 2 * DR * Math.cos(tm) * Math.sin(Math.PI / N) - 0.09
    const h = DH * (Math.sin(t1) - Math.sin(t0)) * 1.12 - 0.05
    kit.at([DX, baseY, 0], [0, phi, 0], () =>
      kit.box(w, Math.max(0.2, h), 0.035, {
        color: ruin ? palette.glassDeep : palette.glassDark,
        top: palette.glass,
        at: [0, DH * Math.sin(tm) * 0.99, DR * Math.cos(tm) * 0.985],
        rot: [-Math.atan2(DR * Math.sin(tm), DH * Math.cos(tm)), 0, 0],
        r: 0.012,
        mat: 'glass',
        seg: 1,
      }),
    )
  }
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) {
      if (!ruin) pane(i, k)
      else if ([8, 9, 0, 1, 2].includes(i) && !(i === 2 && k > 0) && !(i === 8 && k === 2) && !(i === 0 && k === 1)) pane(i, k)
    }
  }

  if (ruin) {
    // the jungle is inside: a tree through the open side, shards and an overturned bench on the floor
    kit.cyl(0.14, 0.22, 2.3, { color: palette.trunkDark, top: palette.trunk, at: [DX + 0.5, 1.3, 0.5], rot: [0.12, 0, -0.18], bevel: 0.04, seg: 8 })
    kit.blob(1.0, { color: palette.leafDark, top: palette.leafLight, at: [DX + 0.85, 2.9, 0.75], scale: [1.1, 0.85, 1], detail: 1, shade: 0.22 })
    kit.blob(0.7, { color: palette.leafDark, top: palette.leaf, at: [DX + 1.55, 2.4, 1.2], detail: 1, shade: 0.2 })
    kit.blob(0.6, { color: palette.leafDark, top: palette.leaf, at: [DX + 0.2, 2.5, 1.3], detail: 1, shade: 0.2 })
    kit.box(1.1, 0.5, 0.5, { color: palette.metalDark, top: palette.rust, at: [DX - 0.5, 0.42, -0.3], rot: [0.3, 0.5, 1.2], r: 0.05 })
    for (let i = 0; i < 6; i++) {
      kit.box(0.34, 0.03, 0.26, { color: palette.glassDark, top: palette.glass, at: [DX + 0.6 + rnd() * 1.6, 0.2, 1.4 + rnd() * 1.2], rot: [rnd() * 0.3, rnd() * 3, rnd() * 0.3], r: 0.008, mat: 'glass', seg: 1 })
    }
    vine(kit, [[DX - 1.9, 0.2, 1.4], [DX - 1.75, 1.0, 1.2], [DX - 1.3, 1.9, 0.9], [DX - 0.6, 2.5, 0.5]], rnd, { leaf: 0.22 })
    vine(kit, [[DX + 0.2, 0.2, -2.3], [DX + 0.15, 1.1, -1.95], [DX + 0.1, 2.0, -1.35], [DX, 2.6, -0.5]], rnd, { leaf: 0.2 })
    ivy(kit, [DX - 0.6, baseY, 2.05], 8, 0.7, rnd)
  } else {
    // lights on inside, and an instrument under the glass
    kit.sphere(0.5, { color: palette.lampWarm, top: palette.lampHot, at: [DX, baseY + 0.3, 0], scale: [1.6, 0.5, 1.6], seg: 12, mat: 'glowSoft', shade: 0.05 })
    kit.cyl(0.16, 0.2, 1.3, { color: palette.creamShade, top: palette.white, at: [DX + 0.2, baseY + 0.9, 0.1], rot: [0.5, 0, -0.4], bevel: 0.04, seg: 10 })
    kit.cyl(0.34, 0.4, 0.5, { color: palette.purpleDark, top: palette.purple, at: [DX, baseY + 0.26, 0], bevel: 0.06, seg: 12 })
    kit.at([DX, 0.16, DR + 0.1], undefined, () => door(kit, 0.5, 0.56, palette.purpleDark, palette.purple))
  }

  // the annex wing
  const wx = 2.15
  const wz = -0.7
  const ww = 2.5
  const wh = 1.5
  const wd = 2.0
  if (ruin) {
    const wall: [string, string] = [mossy(faded(palette.creamShade, 0.35), 0.16), faded(palette.cream, 0.3)]
    kit.box(ww, wh, wd, { color: wall[0], top: wall[1], at: [wx, 0.16 + wh / 2, wz], r: 0.09 })
    // half the roof has fallen in: one slab still up, one tipped inside, bare rafters
    kit.box(ww * 0.56, 0.16, wd + 0.3, { color: palette.roofGrey, top: mossy(palette.metalLight, 0.15), at: [wx - 0.6, 0.16 + wh + 0.12, wz], rot: [0, 0, 0.05], r: 0.06 })
    kit.box(ww * 0.5, 0.14, wd * 0.8, { color: palette.roofGrey, top: palette.metal, at: [wx + 0.7, 0.16 + wh - 0.25, wz + 0.1], rot: [0.1, 0.1, -0.5], r: 0.05 })
    for (const dz of [-0.6, 0.1, 0.8]) kit.beam([wx + 0.1, 0.16 + wh + 0.05, wz + dz], [wx + ww / 2, 0.16 + wh + 0.02, wz + dz], 0.09, { color: palette.trunkDark, top: palette.wood })
    kit.at([wx - 0.5, 0.86, wz + wd / 2], undefined, () => win(kit, 0.55, 0.5, { frame: faded(palette.cream, 0.3), boarded: true }))
    kit.at([wx + 0.55, 0.86, wz + wd / 2], undefined, () => win(kit, 0.55, 0.5, { frame: faded(palette.cream, 0.3), glass: [palette.navyDark, palette.navy] }))
    kit.at([wx + 0.2, 1.3, wz + wd / 2 + 0.02], undefined, () => rustPatch(kit, 0.5, 0.8, { dark: true }))
    ivy(kit, [wx - 0.9, 1.0, wz + wd / 2 + 0.05], 10, 0.75, rnd, 'z')
    ivy(kit, [wx + ww / 2 + 0.05, 0.9, wz + 0.2], 8, 0.7, rnd, 'x')
    vine(kit, [[wx - 1.3, 0.2, wz + wd / 2 + 0.1], [wx - 1.25, 1.0, wz + wd / 2 + 0.08], [wx - 1.0, 1.75, wz + 0.6], [wx - 0.5, 1.9, wz]], rnd)
  } else {
    kit.box(ww, wh, wd, { color: palette.creamShade, top: palette.white, at: [wx, 0.16 + wh / 2, wz], r: 0.09 })
    kit.box(ww + 0.4, 0.16, wd + 0.4, { color: palette.purpleDark, top: palette.purple, at: [wx, 0.16 + wh + 0.06, wz], r: 0.07 })
    kit.at([wx - 0.55, 0.9, wz + wd / 2], undefined, () => win(kit, 0.6, 0.52, { glow: palette.lampWarm, cross: true }))
    kit.at([wx + 0.55, 0.9, wz + wd / 2], undefined, () => win(kit, 0.6, 0.52, { glow: palette.screenGlow, cross: true }))
    kit.at([wx + ww / 2, 0.9, wz], [0, YAW.right, 0], () => win(kit, 0.9, 0.52, { glow: palette.lampWarm, bars: 2 }))
    // solar panels on the roof
    for (const dx of [-0.6, 0.5]) kit.box(0.9, 0.05, 1.2, { color: palette.navy, top: palette.blue, at: [wx + dx, 0.16 + wh + 0.3, wz], rot: [0.3, 0, 0], r: 0.02, mat: 'gloss', seg: 1 })
  }

  // the radio mast
  const mx = 2.9
  const mz = 1.75
  if (ruin) {
    kit.cyl(0.6, 0.7, 0.3, { color: mossy(palette.concreteDark), top: mossy(palette.concrete, 0.1), at: [mx, 0.3, mz], bevel: 0.06, seg: 12 })
    kit.at([mx, 0.4, mz], [0.05, 0.4, -0.13], () => {
      lattice(kit, 4.6, 0.86, 0.5, [palette.rustDark, palette.rust], { step: 0.92, leg: 0.11, brace: 0.065, gone: (b, f) => (b === 2 && f === 1) || (b === 4 && f !== 0) })
      // the top third has buckled over and hangs
      kit.at([0, 4.6, 0], [0, 0, -1.9], () => lattice(kit, 2.0, 0.5, 0.3, [palette.rustDark, palette.rustLight], { step: 0.66, leg: 0.09, brace: 0.055, gone: (b, f) => b === 1 && f === 2 }))
      vine(kit, [[0.5, 0, 0.4], [0.42, 1.2, 0.32], [0.1, 2.5, 0.3], [-0.2, 3.6, 0.2]], rnd, { leaf: 0.2 })
    })
    // a guy wire still taut, one lying slack
    kit.beam([mx - 0.3, 4.2, mz], [mx - 2.6, 0.2, mz + 0.9], 0.03, { color: palette.steel, round: true, shade: 0 })
    kit.pipe([[mx + 0.4, 2.6, mz], [mx + 1.2, 0.5, mz + 0.4], [mx + 2.0, 0.2, mz + 0.9]], 0.03, { color: palette.steel, radial: 4, shade: 0 })
  } else {
    kit.cyl(0.6, 0.7, 0.3, { color: palette.concreteDark, top: palette.concrete, at: [mx, 0.3, mz], bevel: 0.06, seg: 12 })
    kit.at([mx, 0.4, mz], [0, 0.4, 0], () => {
      lattice(kit, 6.4, 0.86, 0.3, [palette.redDark, palette.red], { step: 0.8, leg: 0.11, brace: 0.065 })
      // white bands
      for (const y of [2.0, 4.2]) kit.box(0.72 - y * 0.08, 0.5, 0.72 - y * 0.08, { color: palette.creamShade, top: palette.white, at: [0, y, 0], r: 0.04, seg: 1 })
      kit.cyl(0.03, 0.04, 0.9, { color: palette.metalLight, at: [0, 6.85, 0], bevel: 0.01, seg: 6, mat: 'metal' })
      kit.at([0.3, 5.2, 0], [0, 0, -1.0], () => dishBowl(kit, 0.5, 0.16, { rim: palette.purple, feed: palette.purple, struts: 3 }))
    })
    for (const [x, z] of [
      [-2.4, 0.9],
      [2.0, 1.0],
      [0.9, -1.9],
    ]) kit.beam([mx, 5.6, mz], [mx + x, 0.2, mz + z], 0.025, { color: palette.steel, round: true, shade: 0 })
  }

  const built = kit.build('scienceAnnex')
  group.add(built)
  if (!ruin) {
    // the beacon at the mast head blinks
    const bk = new Kit()
    bk.sphere(0.13, { color: palette.beaconRed, top: palette.lampWarm, seg: 8, mat: 'glow', shade: 0 })
    const beacon = bk.build('beacon')
    beacon.position.set(mx, 0.4 + 7.35, mz)
    group.add(beacon)
    const logo = logoPlate(0.56)
    logo.position.set(wx, 0.16 + wh - 0.36, wz + wd / 2 + 0.03)
    group.add(logo)
    ;(group.userData as ModelUserData).tick = (t) => {
      beacon.visible = t % 1.6 < 0.9
    }
  }
  return group
}

// ------------------------------------------------------------------ 3. the heavy launch complex
export function createHeavyLaunch(opts: ModelOptions = {}): THREE.Object3D {
  const ruin = isRuin(opts)
  const rnd = seeded(303)
  const kit = new Kit()
  const group = new THREE.Group()
  group.name = 'heavyLaunch'
  const TH = 9.4
  const tower: [string, string] = ruin ? [palette.rustDark, palette.rust] : [palette.redDark, palette.red]

  // apron
  if (ruin) {
    // the old apron has heaved into slabs, with weeds in every joint
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) brokenSlab(kit, [-3.3 + i * 3.3, 0, -2.5 + j * 2.5], 3.15, 2.38, rnd)
    cracks(kit, rnd, 14, 4.2, 0.2, (x, z) => Math.abs(z) < 3.4 && Math.abs(x) < 4.6)
    for (let i = 0; i < 12; i++) weed(kit, [-4.6 + rnd() * 9.2, 0.16, -3.5 + rnd() * 7], rnd, 1.2)
    ivy(kit, [-3.9, 0.2, 2.9], 10, 1.0, rnd)
    ivy(kit, [4.1, 0.2, -3.0], 9, 0.9, rnd)
    ivy(kit, [-0.2, 0.2, -3.2], 9, 1.0, rnd)
    ivy(kit, [1.4, 0.2, 3.0], 8, 0.9, rnd)
    // bushes in the joints, and two young trees that have split the concrete
    for (const [x, z, s] of [
      [-3.4, 1.1, 0.5],
      [-4.4, -0.6, 0.42],
      [0.9, 1.9, 0.46],
      [3.2, 0.4, 0.5],
      [-1.9, -3.3, 0.4],
      [4.5, 3.2, 0.44],
    ]) {
      kit.blob(s, { color: palette.leafDark, top: palette.leafLight, at: [x, 0.2 + s * 0.6, z], scale: [1.15, 0.8, 1], detail: 1, shade: 0.2 })
      kit.blob(s * 0.7, { color: palette.leafDark, top: palette.leaf, at: [x + s * 0.8, 0.2 + s * 0.4, z + s * 0.3], detail: 1, shade: 0.2 })
    }
    for (const [x, z, h] of [
      [-3.3, -1.6, 2.6],
      [0.2, 3.1, 2.1],
    ]) {
      kit.cyl(0.1, 0.16, h, { color: palette.trunkDark, top: palette.trunk, at: [x, h / 2 + 0.1, z], rot: [0.06, 0, -0.08], bevel: 0.03, seg: 7 })
      kit.blob(0.85, { color: palette.leafDark, top: palette.leafLight, at: [x + 0.1, h + 0.5, z], scale: [1.1, 0.85, 1], detail: 1, shade: 0.22 })
      kit.blob(0.55, { color: palette.leafDark, top: palette.leaf, at: [x + 0.6, h + 0.1, z + 0.2], detail: 1, shade: 0.2 })
    }
  } else {
    kit.slab(10.2, 7.8, 0.2, 1.0, { color: palette.concreteDark, top: palette.concrete, bevel: 0.06 })
    kit.slab(9.7, 7.3, 0.03, 0.85, { color: palette.concrete, top: palette.concreteLight, at: [0, 0.195, 0], bevel: 0.01, shade: 0.02 })
    // hazard edging
    for (let i = 0; i < 14; i++) kit.box(0.5, 0.025, 0.16, { color: i % 2 ? palette.hazardDark : palette.hazard, at: [-3.25 + i * 0.5, 0.225, 3.45], r: 0.008, shade: 0, seg: 1 })
  }

  // flame trench: two walls and a scorched floor running out to the front
  const tx = -1.4
  const wallC: [string, string] = ruin ? [mossy(palette.concreteDark, 0.15), mossy(palette.concrete, 0.1)] : [palette.concreteDark, palette.concreteLight]
  kit.box(1.5, 0.05, 4.2, { color: palette.soot, top: mix(palette.soot, palette.rustDark, 0.3), at: [tx, 0.23, 1.6], r: 0.02, shade: 0.02, seg: 1 })
  for (const s of [-1, 1]) {
    if (ruin) {
      kit.box(0.4, 0.7, 2.2, { color: wallC[0], top: wallC[1], at: [tx + s * 0.95, 0.5, 0.6], rot: [0, 0, s * 0.05], r: 0.07, seg: 2 })
      // the outer half of each wall has cracked off and slumped
      kit.box(0.4, 0.62, 1.7, { color: wallC[0], top: wallC[1], at: [tx + s * 1.05, 0.4, 2.7], rot: [0.06, s * 0.14, s * 0.22], r: 0.07, seg: 2 })
    } else {
      kit.box(0.4, 0.75, 4.2, { color: wallC[0], top: wallC[1], at: [tx + s * 0.95, 0.55, 1.6], r: 0.07, seg: 2 })
      for (let i = 0; i < 5; i++) kit.box(0.42, 0.14, 0.42, { color: i % 2 ? palette.hazardDark : palette.hazard, at: [tx + s * 0.95, 0.9, 0.1 + i * 0.84], r: 0.03, shade: 0.02, seg: 1 })
    }
  }
  if (ruin) {
    for (const [x, z, s] of [
      [tx - 0.2, 2.2, 0.34],
      [tx + 0.3, 3.1, 0.26],
      [tx - 0.4, 3.5, 0.2],
    ]) kit.blob(s, { color: wallC[0], top: wallC[1], at: [x, 0.3, z], scale: [1.2, 0.7, 1], detail: 1 })
    // a long crack down the middle of the trench
    for (let i = 0; i < 6; i++) kit.box(0.5, 0.02, 0.07, { color: palette.ink, at: [tx + Math.sin(i * 1.7) * 0.2, 0.262, 0.2 + i * 0.6], rot: [0, 1.2 + Math.sin(i) * 0.5, 0], r: 0.01, shade: 0, seg: 1 })
  }

  // launch mount over the head of the trench
  const mountC: [string, string] = ruin ? [palette.rustDark, palette.rust] : [palette.metalDark, palette.metalLight]
  kit.at([tx, 0.2, -0.9], ruin ? [0, 0.2, 0.04] : undefined, () => {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      kit.box(0.36, 1.0, 0.36, { color: mountC[0], top: mountC[1], at: [Math.cos(a) * 1.05, 0.5, Math.sin(a) * 1.05], r: 0.07, seg: 2 })
    }
    kit.cyl(1.35, 1.4, 0.3, { color: mountC[0], top: mountC[1], at: [0, 1.1, 0], bevel: 0.08, seg: 8 })
    kit.cyl(0.7, 0.7, 0.34, { color: palette.soot, at: [0, 1.11, 0], bevel: 0.03, seg: 14, shade: 0 })
    if (!ruin) for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      kit.box(0.24, 0.5, 0.3, { color: palette.yellowDark, top: palette.yellow, at: [Math.cos(a) * 0.98, 1.45, Math.sin(a) * 0.98], rot: [0, -a, 0], r: 0.05, seg: 2 })
    }
  })

  // the service tower
  const bx = 1.9
  const bz = -1.3
  kit.box(2.3, 0.4, 2.3, { color: wallC[0], top: wallC[1], at: [bx, 0.36, bz], r: 0.08, seg: 2 })
  if (ruin) {
    // tipped over: it lies up the slope of its own wreckage, the top clear of the trees
    kit.at([bx + 0.5, 0.5, bz + 0.2], [0, -0.55, -0.98], () => {
      lattice(kit, TH, 1.5, 1.1, tower, { step: 1.04, leg: 0.17, brace: 0.095, gone: (b, f) => (b === 3 && f === 2) || (b === 6 && f === 0) || (b === 7 && f === 3) })
      // work platforms and a swing arm still hanging on
      for (const y of [2.6, 5.2, 7.8]) kit.box(1.5, 0.08, 1.5, { color: palette.rustDark, top: palette.rustLight, at: [0, y, 0], r: 0.03, mat: 'metal', seg: 1 })
      kit.beam([-0.6, 6.4, 0.5], [-2.0, 6.0, 0.9], 0.2, { color: palette.rustDark, top: palette.rust })
      kit.cyl(0.05, 0.07, 1.6, { color: palette.rustDark, top: palette.rust, at: [0, TH + 0.8, 0], bevel: 0.015, seg: 6 })
      vine(kit, [[0.7, 0.4, 0.7], [0.75, 2.0, 0.6], [0.4, 3.8, 0.75], [0.7, 5.4, 0.5]], rnd, { leaf: 0.24 })
      vine(kit, [[-0.7, 3.0, -0.6], [-0.6, 4.6, -0.7], [-0.75, 6.2, -0.4]], rnd, { leaf: 0.22 })
    })
    // the wreckage it rests on: a stub of the old tower base and a mound of rubble
    kit.at([bx, 0.5, bz], [0, 0.3, 0], () => lattice(kit, 1.5, 1.6, 1.5, tower, { step: 0.75, leg: 0.17, brace: 0.095, gone: (b, f) => b === 1 && f < 2 }))
    for (const [x, z, s] of [
      [bx + 2.6, bz - 1.0, 0.7],
      [bx + 3.3, bz - 1.5, 0.55],
      [bx + 2.9, bz - 0.2, 0.45],
      [bx + 3.9, bz - 0.9, 0.4],
    ]) kit.blob(s, { color: wallC[0], top: wallC[1], at: [x, 0.3 + s * 0.4, z], scale: [1.2, 0.75, 1], detail: 1 })
  } else {
    kit.at([bx, 0.5, bz], undefined, () => {
      lattice(kit, TH, 1.6, 1.15, tower, { step: 1.04, leg: 0.17, brace: 0.095 })
      for (const y of [2.6, 5.2, 7.8]) {
        kit.box(1.7, 0.09, 1.7, { color: palette.metalDark, top: palette.metalLight, at: [0, y, 0], r: 0.03, mat: 'metal', seg: 1 })
        kit.box(1.3, 0.5, 1.3, { color: palette.creamShade, top: palette.white, at: [0, y + 0.3, 0], r: 0.05, seg: 1 })
      }
      // crew arm and umbilical towards the rocket
      kit.beam([-0.6, 6.3, 0.3], [-2.6, 6.3, 0.4], 0.24, { color: palette.yellowDark, top: palette.yellow })
      kit.beam([-0.6, 3.9, 0.3], [-2.4, 3.9, 0.4], 0.16, { color: palette.metalDark, top: palette.metalLight })
      // lightning mast
      kit.cyl(0.05, 0.08, 2.2, { color: palette.metalDark, top: palette.metalLight, at: [0, TH + 1.1, 0], bevel: 0.015, seg: 6, mat: 'metal' })
      kit.box(1.3, 0.14, 1.3, { color: palette.redDark, top: palette.red, at: [0, TH + 0.05, 0], r: 0.05, seg: 1 })
    })
  }

  // fuel sphere on its stand
  const fx = 3.6
  const fz = 2.2
  kit.at([fx, 0.2, fz], ruin ? [0.1, 0, 0.16] : undefined, () => {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5
      kit.beam([Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9], [Math.cos(a) * 0.6, 1.1, Math.sin(a) * 0.6], 0.14, { color: mountC[0], top: mountC[1] })
    }
    kit.sphere(1.05, { color: ruin ? palette.rustDark : palette.creamShade, top: ruin ? mix(palette.rustLight, palette.cream, 0.3) : palette.white, at: [0, 1.75, 0], seg: 18, mat: ruin ? 'matte' : 'gloss' })
    kit.torus(1.05, 0.06, { color: ruin ? palette.rust : palette.orange, at: [0, 1.75, 0], tube: 6, seg: 22 })
    if (ruin) ivy(kit, [-0.5, 2.5, 0.6], 8, 0.6, rnd)
  })
  if (ruin) {
    barrel(kit, [-4.2, 0.18, -2.6], palette.rustDark, palette.rust, 1.6)
    barrel(kit, [-3.5, 0.18, -3.0], palette.rustDark, palette.rustLight, 1.6)
    vine(kit, [[fx - 1.1, 0.2, fz + 0.4], [fx - 0.9, 1.2, fz + 0.5], [fx - 0.5, 2.3, fz + 0.5], [fx, 2.9, fz + 0.2]], rnd, { leaf: 0.22 })
  } else {
    // pipe from the fuel farm to the mount, floodlights, a blockhouse
    kit.pipe([[fx - 1.0, 0.5, fz], [fx - 2.4, 0.4, fz - 0.4], [tx + 1.6, 0.4, 0.2], [tx + 1.1, 0.9, -0.5]], 0.09, { color: palette.orangeDark, top: palette.orange, radial: 6, tension: 0.3 })
    for (const [x, z] of [
      [-4.5, 3.2],
      [4.6, -3.3],
    ]) {
      kit.cyl(0.07, 0.1, 3.4, { color: palette.metalDark, top: palette.metalLight, at: [x, 1.9, z], bevel: 0.02, seg: 8, mat: 'metal' })
      kit.box(0.7, 0.36, 0.2, { color: palette.navyDark, top: palette.navy, at: [x, 3.7, z], rot: [0, x > 0 ? 2.4 : -0.7, 0], r: 0.05, seg: 1 })
      kit.box(0.56, 0.24, 0.06, { color: palette.lampWarm, top: palette.lampHot, at: [x + (x > 0 ? -0.08 : 0.08), 3.7, z + (x > 0 ? 0.08 : -0.08)], rot: [0, x > 0 ? 2.4 : -0.7, 0], r: 0.02, mat: 'glowSoft', shade: 0, seg: 1 })
    }
    kit.at([-3.8, 0.2, -2.6], [0, 0.4, 0], () => {
      kit.box(1.9, 1.0, 1.4, { color: palette.creamShade, top: palette.white, at: [0, 0.5, 0], r: 0.1 })
      kit.box(2.1, 0.16, 1.6, { color: palette.redDark, top: palette.red, at: [0, 1.06, 0], r: 0.06 })
      kit.at([0.3, 0.6, 0.7], undefined, () => win(kit, 0.9, 0.34, { glow: palette.screenGlow, bars: 2 }))
      kit.at([-0.6, 0, 0.7], undefined, () => door(kit, 0.4, 0.74, palette.redDark, palette.red))
    })
  }

  const built = kit.build('heavyLaunch')
  group.add(built)
  if (!ruin) {
    // a Medium rocket stands on the mount
    const rocket = createModel('rocket', { kind: 'medium', patched: false })
    rocket.position.set(tx, 1.62, -0.9)
    group.add(rocket)
    const bk = new Kit()
    bk.sphere(0.14, { color: palette.beaconRed, top: palette.lampWarm, seg: 8, mat: 'glow', shade: 0 })
    const beacon = bk.build('beacon')
    beacon.position.set(bx, 0.5 + TH + 2.3, bz)
    group.add(beacon)
    const data = group.userData as ModelUserData
    data.tick = (t, dt) => {
      beacon.visible = t % 1.4 < 0.8
      ;(rocket.userData as ModelUserData).tick?.(t, dt)
    }
    data.dispose = () => {
      ;(rocket.userData as ModelUserData).dispose?.()
    }
  }
  return group
}
