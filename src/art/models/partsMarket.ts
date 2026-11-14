import * as THREE from 'three'
import { Kit, seeded } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { awning, barrel, crate, dishBowl, faded, foundation, mix, patchPlate, readOpts, stringLights, weed, whip } from './common'

/**
 * Parts Market: an open-air market of six stalls with striped awnings, one per
 * parts category (Power, Comms, Instruments, Computers, Pointing, Propulsion).
 * The stalls wrap the back and one side so the camera looks into the yard.
 *
 * `userData.anchors.truckStop` marks where the delivery truck parks;
 * `userData.anchors.stall_<category>` mark each stall for effects.
 * Level 1: faded, patched awnings on leaning posts, bare dirt yard.
 * Level 2+: bright awnings, paved yard, string lights. Level 3: a clock post and more stock.
 * Entrance on +Z. Footprint about 5.0 × 5.0.
 */

type Goods = (kit: Kit, old: boolean) => void

const power: Goods = (kit) => {
  // a solar panel propped up, and a row of batteries
  kit.at([-0.28, 0.2, -0.04], [-0.5, 0.2, 0], () => {
    kit.box(0.5, 0.36, 0.035, { color: palette.navyDark, top: palette.blueDark, r: 0.015, mat: 'gloss' })
    kit.box(0.5, 0.012, 0.04, { color: palette.metalLight, r: 0.004, shade: 0 })
    for (const x of [-0.125, 0.125]) kit.box(0.012, 0.36, 0.04, { color: palette.metalLight, at: [x, 0, 0], r: 0.004, shade: 0 })
  })
  for (const [x, z] of [
    [0.16, 0.06],
    [0.34, 0.1],
    [0.5, 0.02],
  ]) {
    kit.cyl(0.065, 0.065, 0.2, { color: palette.green, top: palette.leafLight, at: [x, 0.1, z], bevel: 0.02, seg: 10 })
    kit.cyl(0.03, 0.03, 0.05, { color: palette.yellow, at: [x, 0.215, z], bevel: 0.01, seg: 8 })
  }
}
const comms: Goods = (kit) => {
  kit.at([-0.28, 0, 0], [0, 0.5, 0], () => {
    kit.cyl(0.03, 0.04, 0.18, { color: palette.metalDark, at: [0, 0.09, 0], bevel: 0.01, seg: 8 })
    kit.at([0, 0.2, 0], [0.75, 0, 0], () => dishBowl(kit, 0.2, 0.065, { rim: palette.blue, feed: palette.blue, struts: 3 }))
  })
  kit.box(0.26, 0.16, 0.18, { color: palette.metalDark, top: palette.metalLight, at: [0.2, 0.08, 0.02], r: 0.03 })
  kit.sphere(0.022, { color: palette.beaconGreen, at: [0.12, 0.11, 0.115], seg: 6, mat: 'glowSoft', shade: 0 })
  kit.at([0.3, 0.16, 0], undefined, () => whip(kit, 0.36, palette.red))
  kit.at([0.48, 0, 0.05], undefined, () => whip(kit, 0.3, palette.yellow, 0.2))
}
const instruments: Goods = (kit) => {
  // a camera and a little telescope
  kit.box(0.26, 0.19, 0.19, { color: palette.navyDark, top: palette.navy, at: [-0.28, 0.095, 0], r: 0.04 })
  kit.cyl(0.075, 0.075, 0.12, { color: palette.steel, top: palette.metalLight, at: [-0.28, 0.1, 0.14], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 12 })
  kit.cyl(0.055, 0.055, 0.03, { color: palette.glassDark, top: palette.glass, at: [-0.28, 0.1, 0.205], rot: [Math.PI / 2, 0, 0], bevel: 0.008, seg: 10, mat: 'glass' })
  kit.box(0.08, 0.04, 0.06, { color: palette.red, at: [-0.34, 0.2, 0], r: 0.015 })
  kit.at([0.28, 0, 0], [0, -0.4, 0], () => {
    for (const a of [0, 2.1, 4.2]) kit.beam([0, 0.2, 0], [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12], 0.025, { color: palette.woodDark, round: true })
    kit.cyl(0.055, 0.07, 0.4, { color: palette.creamShade, top: palette.white, at: [0, 0.27, 0.02], rot: [1.0, 0, 0], bevel: 0.015, seg: 10 })
    kit.cyl(0.075, 0.075, 0.05, { color: palette.purple, at: [0, 0.38, 0.19], rot: [1.0, 0, 0], bevel: 0.015, seg: 10 })
  })
}
const computers: Goods = (kit) => {
  for (const [x, c] of [
    [-0.3, palette.screenGlow],
    [0.05, palette.beaconGreen],
  ] as const) {
    kit.box(0.28, 0.21, 0.07, { color: palette.creamShade, top: palette.white, at: [x, 0.17, -0.04], rot: [-0.12, 0, 0], r: 0.03 })
    kit.box(0.22, 0.15, 0.03, { color: c, at: [x, 0.175, 0.0], rot: [-0.12, 0, 0], r: 0.015, mat: 'glowSoft', shade: 0.2 })
    kit.box(0.08, 0.07, 0.07, { color: palette.creamShade, at: [x, 0.035, -0.04], r: 0.02 })
    kit.box(0.24, 0.025, 0.09, { color: palette.metalLight, at: [x, 0.012, 0.13], r: 0.01 })
  }
  kit.box(0.2, 0.26, 0.24, { color: palette.metalDark, top: palette.metalLight, at: [0.42, 0.13, 0], r: 0.03 })
  for (let i = 0; i < 3; i++) kit.sphere(0.018, { color: palette.lampWarm, at: [0.37 + i * 0.05, 0.2, 0.125], seg: 6, mat: 'glowSoft', shade: 0 })
}
const pointing: Goods = (kit) => {
  // reaction wheels (one upright, one flat) and magnetorquer rods
  kit.torus(0.14, 0.04, { color: palette.steel, top: palette.metalLight, at: [-0.3, 0.19, 0], rot: [Math.PI / 2, 0.4, 0], tube: 8, seg: 16, mat: 'metal' })
  kit.cyl(0.11, 0.11, 0.035, { color: palette.orangeDark, top: palette.orange, at: [-0.3, 0.19, 0], rot: [Math.PI / 2, 0, -0.4], bevel: 0.01, seg: 14 })
  kit.box(0.16, 0.05, 0.12, { color: palette.steel, at: [-0.3, 0.025, 0], r: 0.015 })
  kit.torus(0.11, 0.035, { color: palette.steel, top: palette.metalLight, at: [0.08, 0.04, 0.06], tube: 8, seg: 14, mat: 'metal' })
  kit.cyl(0.09, 0.09, 0.03, { color: palette.yellowDark, top: palette.yellow, at: [0.08, 0.04, 0.06], bevel: 0.01, seg: 12 })
  for (const [x, r] of [
    [0.34, 0.2],
    [0.46, -0.15],
  ]) {
    kit.cyl(0.03, 0.03, 0.36, { color: palette.rust, top: palette.rustLight, at: [x, 0.03, 0.02], rot: [Math.PI / 2, 0, r], bevel: 0.012, seg: 8, mat: 'metal' })
  }
}

interface StallSpec {
  key: string
  color: string
  goods: Goods
  x: number
  z: number
  yaw: number
}

function stall(kit: Kit, spec: StallSpec, old: boolean, quirk: number): void {
  const c = old ? faded(spec.color, 0.38) : spec.color
  const white = old ? palette.creamShade : palette.white
  const lean = old && quirk === 1 ? 0.07 : 0
  // posts
  for (const sx of [-1, 1]) {
    kit.beam([sx * 0.66, 0, -0.46], [sx * 0.66 + lean, 1.62, -0.46], 0.09, { color: palette.woodDark, top: palette.wood })
    kit.beam([sx * 0.66, 0, 0.52], [sx * 0.66 + lean, 1.2, 0.52], 0.08, { color: palette.woodDark, top: palette.wood })
  }
  // counter with a cloth skirt
  kit.box(1.3, 0.5, 0.56, { color: palette.woodDark, top: palette.wood, at: [0, 0.25, 0.2], r: 0.05 })
  kit.box(1.42, 0.07, 0.68, { color: palette.wood, top: palette.woodLight, at: [0, 0.53, 0.2], r: 0.03, shade: 0.05 })
  kit.box(1.3, 0.3, 0.035, { color: c, at: [0, 0.32, 0.485], r: 0.015, shade: 0.1 })
  for (let i = 0; i < 5; i++) {
    kit.cyl(0.13, 0.13, 0.03, { color: i % 2 ? white : c, at: [-0.52 + i * 0.26, 0.17, 0.487], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8], bevel: 0.01, seg: 10, shade: 0.03 })
  }
  // back board with a shelf of spare stock
  kit.box(1.34, 1.0, 0.06, { color: palette.woodDark, top: palette.wood, at: [0, 0.62, -0.46], r: 0.025 })
  kit.box(1.3, 0.05, 0.26, { color: palette.wood, top: palette.woodLight, at: [0, 1.0, -0.33], r: 0.02 })
  for (const [x, s, col] of [
    [-0.42, 0.2, c],
    [-0.12, 0.16, palette.creamShade],
    [0.2, 0.22, palette.metal],
    [0.47, 0.15, c],
  ] as const) {
    kit.box(s, s, s * 0.9, { color: col, at: [x, 1.03 + s / 2, -0.33], r: s * 0.15 })
  }
  // awning (the old ones sag and carry a patch)
  kit.at([lean, 1.64, -0.52], undefined, () => awning(kit, 1.58, 1.22, c, white, { tilt: old && quirk === 2 ? 0.46 : 0.38, stripes: 6 }))
  if (old && quirk === 0) {
    kit.at([0.32, 1.47, 0.02], [0.38, 0, 0], () => kit.at([0, 0, 0], [-Math.PI / 2, 0, 0.25], () => patchPlate(kit, 0.42, 0.36, palette.woodDark, palette.wood)))
  }
  // goods on the counter
  kit.at([0, 0.565, 0.2], undefined, () => spec.goods(kit, old))
}

export function createPartsMarket(opts: ModelOptions = {}): THREE.Object3D {
  const { level } = readOpts(opts)
  const old = level <= 1
  const rnd = seeded(51)
  const kit = new Kit()
  const F = 0.12

  // the yard: packed dirt when old, pavers once upgraded
  foundation(kit, 5.0, 5.0, { r: 1.1, h: F, color: old ? [palette.dirtDark, palette.dirt] : [palette.pathEdge, palette.path] })
  if (old) {
    for (const [x, z, s] of [
      [-0.6, 0.5, 0.9],
      [0.5, -0.3, 0.7],
      [-1.2, -0.6, 0.6],
      [0.1, 1.5, 0.8],
    ] as const) {
      kit.cyl(s, s, 0.012, { color: mix(palette.dirt, palette.sand, 0.35), at: [x, F + 0.027 + s * 0.006, z], scale: [1.2, 1, 0.8], bevel: 0.004, shade: 0, seg: 14 })
    }
    weed(kit, [-2.0, F, -0.2], rnd)
    weed(kit, [-1.9, F, 1.9], rnd, 1.2)
    weed(kit, [0.5, F, 2.1], rnd)
    weed(kit, [-0.9, F, 0.2], rnd, 0.9)
  } else {
    // a ring of pavers in the middle of the yard
    for (let ring = 0; ring < 3; ring++) {
      const n = ring === 0 ? 1 : ring * 7
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.3
        const r = ring * 0.42
        kit.cyl(0.17, 0.17, 0.03, {
          color: (i + ring) % 2 ? palette.concrete : palette.sandLight,
          at: [-0.55 + Math.cos(a) * r, F + 0.03, 0.55 + Math.sin(a) * r],
          bevel: 0.012,
          seg: 10,
          shade: 0.02,
        })
      }
    }
  }

  // ------------------------------------------------------------ the stalls
  const stalls: StallSpec[] = [
    { key: 'power', color: palette.yellow, goods: power, x: -1.62, z: -1.62, yaw: 0 },
    { key: 'comms', color: palette.blue, goods: comms, x: -0.08, z: -1.62, yaw: 0 },
    { key: 'instrument', color: palette.purple, goods: instruments, x: 1.42, z: -1.42, yaw: -Math.PI / 4 },
    { key: 'computer', color: palette.teal, goods: computers, x: 1.66, z: 0.12, yaw: -Math.PI / 2 },
    { key: 'pointing', color: palette.orange, goods: pointing, x: 1.66, z: 1.6, yaw: -Math.PI / 2 },
  ]
  stalls.forEach((s, i) => kit.at([s.x, F, s.z], [0, s.yaw, 0], () => stall(kit, s, old, i % 3)))

  // propulsion: a hand cart with an engine bell and a fuel sphere under a parasol
  const cx = -1.45
  const cz = 1.25
  kit.at([cx, F, cz], [0, 0.55, 0], () => {
    kit.box(1.0, 0.1, 0.62, { color: palette.woodDark, top: palette.wood, at: [0, 0.34, 0], r: 0.035 })
    for (const sz of [-1, 1]) {
      kit.cyl(0.22, 0.22, 0.07, { color: palette.woodDark, top: palette.wood, at: [0.18, 0.22, sz * 0.36], rot: [Math.PI / 2, 0, 0], bevel: 0.025, seg: 16 })
      kit.cyl(0.06, 0.06, 0.09, { color: palette.steel, at: [0.18, 0.22, sz * 0.36], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 8 })
    }
    kit.beam([-0.42, 0.3, 0.22], [-0.42, 0.02, 0.22], 0.06, { color: palette.woodDark })
    kit.beam([-0.5, 0.36, -0.24], [-0.95, 0.5, -0.24], 0.05, { color: palette.woodDark, round: true })
    kit.beam([-0.5, 0.36, 0.24], [-0.95, 0.5, 0.24], 0.05, { color: palette.woodDark, round: true })
    // engine bell
    kit.lathe(
      [
        [0.0, 0.0],
        [0.2, 0.0],
        [0.22, 0.03],
        [0.15, 0.2],
        [0.09, 0.32],
        [0.11, 0.36],
        [0, 0.37],
      ],
      { color: palette.soot, top: palette.metalLight, at: [-0.2, 0.39, 0.04], seg: 16, mat: 'metal' },
    )
    // fuel sphere
    kit.sphere(0.2, { color: old ? faded(palette.orangeDark, 0.3) : palette.orangeDark, top: old ? faded(palette.orange, 0.2) : palette.orange, at: [0.26, 0.59, -0.04], seg: 14, mat: 'gloss' })
    kit.torus(0.2, 0.025, { color: palette.white, at: [0.26, 0.59, -0.04], tube: 6, seg: 14 })
    // parasol
    const red = old ? faded(palette.red, 0.38) : palette.red
    kit.beam([0.05, 0.38, -0.2], [0.05, 1.75, -0.2], 0.05, { color: palette.woodDark, round: true })
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2
      const g = new THREE.ConeGeometry(0.82, 0.34, 3, 1, false, a0, Math.PI / 4)
      kit.add(g, { color: i % 2 ? (old ? palette.creamShade : palette.white) : red, at: [0.05, 1.72, -0.2], shade: 0.1 })
    }
    kit.sphere(0.06, { color: palette.yellow, at: [0.05, 1.93, -0.2], seg: 8 })
  })

  // ------------------------------------------------------------ entrance sign: a big gear on a post
  kit.at([0.55, F, 2.15], [0, -0.75, 0], () => {
    kit.cyl(0.14, 0.17, 0.12, { color: palette.concreteDark, top: palette.concrete, at: [0, 0.06, 0], bevel: 0.03, seg: 10 })
    kit.beam([0, 0.1, 0], [0, 2.05, 0], 0.1, { color: palette.woodDark, top: palette.wood })
    kit.beam([0, 1.95, 0], [0.75, 1.95, 0], 0.08, { color: palette.woodDark, top: palette.wood })
    for (const x of [0.2, 0.62]) kit.beam([x, 1.92, 0], [x, 1.74, 0], 0.025, { color: palette.steel, round: true })
    kit.box(0.74, 0.62, 0.07, { color: palette.woodDark, top: palette.woodLight, at: [0.41, 1.42, 0], rot: [0, 0, old ? 0.07 : 0], r: 0.05 })
    for (const side of [-1, 1]) {
      // gear icon on both faces
      const z = side * 0.045
      kit.torus(0.16, 0.05, { color: old ? palette.rust : palette.metalDark, top: old ? palette.rustLight : palette.metalLight, at: [0.41, 1.42, z], rot: [Math.PI / 2, 0, 0], tube: 6, seg: 18 })
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        kit.box(0.08, 0.08, 0.05, {
          color: old ? palette.rust : palette.metalDark,
          top: old ? palette.rustLight : palette.metalLight,
          at: [0.41 + Math.cos(a) * 0.23, 1.42 + Math.sin(a) * 0.23, z],
          rot: [0, 0, a],
          r: 0.015,
        })
      }
    }
  })

  // ------------------------------------------------------------ stock and clutter
  crate(kit, [-0.9, F, -1.05], 0.4, 0.3)
  crate(kit, [0.62, F, -0.75], 0.36, -0.2, palette.blue)
  crate(kit, [0.7, F, 0.85], 0.42, 0.5)
  crate(kit, [0.74, F + 0.42, 0.85], 0.28, 0.1, palette.orange)
  barrel(kit, [-2.05, F, -0.75], old ? palette.rustDark : palette.tealDark, old ? palette.rust : palette.teal)
  barrel(kit, [-2.1, F, -0.35], palette.yellowDark, palette.yellow)
  barrel(kit, [0.45, F, 0.3], palette.blueDark, palette.blue)
  if (level >= 3) {
    crate(kit, [-0.45, F, -1.0], 0.34, -0.4, palette.yellow)
    barrel(kit, [-1.7, F, -0.55], palette.redDark, palette.red)
  }
  // loading spot: painted corner marks where the truck pulls up
  for (const [x, z, r] of [
    [-1.05, 2.3, 0],
    [0.0, 2.3, Math.PI / 2],
  ] as const) {
    kit.box(0.4, 0.02, 0.08, { color: old ? faded(palette.hazard, 0.3) : palette.hazard, at: [x + (r ? -0.16 : 0.16), F + 0.03, z], r: 0.008, shade: 0 })
    kit.box(0.08, 0.02, 0.3, { color: old ? faded(palette.hazard, 0.3) : palette.hazard, at: [x, F + 0.03, z - 0.14], r: 0.008, shade: 0 })
  }

  // string lights between the stalls (bare, dead bulbs on the old market)
  const bulbs = old ? [palette.creamShade] : [palette.lampWarm, palette.flowerPink, palette.screenGlow, palette.lampHot]
  stringLights(kit, [-2.25, F + 1.6, -2.05], [-0.74, F + 1.6, -2.05], 5, !old, bulbs)
  stringLights(kit, [-0.74, F + 1.55, -1.1], [0.55, F + 1.55, -1.1], 4, !old, bulbs)
  if (!old) {
    stringLights(kit, [1.2, F + 1.3, 0.75], [1.2, F + 1.3, 1.0], 2, true, bulbs)
    stringLights(kit, [0.55, F + 2.0, 2.15], [1.15, F + 1.35, 2.1], 4, true, bulbs)
  }

  const group = kit.build('partsMarket')

  const anchors: Record<string, THREE.Object3D> = {}
  const truckStop = new THREE.Object3D()
  truckStop.name = 'truckStop'
  truckStop.position.set(-0.52, F, 2.75)
  truckStop.rotation.y = Math.PI / 2
  group.add(truckStop)
  anchors.truckStop = truckStop
  for (const s of [...stalls, { key: 'propulsion', x: cx, z: cz }]) {
    const a = new THREE.Object3D()
    a.name = `stall_${s.key}`
    a.position.set(s.x, F + 1.0, s.z)
    group.add(a)
    anchors[`stall_${s.key}`] = a
  }
  ;(group.userData as ModelUserData).anchors = anchors
  return group
}
