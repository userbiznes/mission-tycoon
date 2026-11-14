import * as THREE from 'three'
import { Kit, seeded } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import {
  YAW,
  acUnit,
  barrel,
  cracks,
  crate,
  dishBowl,
  door,
  faded,
  foundation,
  patchPlate,
  readOpts,
  rustPatch,
  screenWindow,
  weed,
  whip,
  win,
} from './common'

/**
 * Comms Center: a little station hut, a data silo, and one gloriously
 * oversized dish that swivels to follow satellites.
 *
 * The dish is a separate child named `dish` that turns about Y.
 * `userData.setTracking(azimuth | null)` points it (radians in model space,
 * 0 = towards +Z); null returns it to a slow idle sweep.
 * Level 1: tilted, patched dish with a bent strut. Level 2: bigger and clean.
 * Level 3: a second small dish on the hut roof.
 * Front door on +Z. Footprint about 4.8 × 4.6.
 */
export function createCommsCenter(opts: ModelOptions = {}): THREE.Object3D {
  const { level, colorA } = readOpts(opts)
  const old = level <= 1
  const rnd = seeded(31)
  const kit = new Kit()
  const F = 0.16

  const wall = old ? faded(palette.creamShade, 0.25) : palette.creamShade
  const wallTop = old ? palette.plaster : palette.white
  const roof = old ? faded(palette.orangeDark, 0.4) : palette.orangeDark
  const roofTop = old ? faded(palette.roofOrange, 0.35) : palette.roofOrange
  const trim = colorA ?? palette.navy
  const frame = old ? palette.cream : palette.white
  const steel = old ? palette.rust : palette.metalDark
  const steelTop = old ? palette.metal : palette.metalLight

  foundation(kit, 4.7, 4.3, { r: 1.0, z: -0.05 })
  if (old) {
    cracks(kit, rnd, 8, 2.0, F + 0.03, (x, z) => !(x < -0.3 && z > -0.3 && z < 1.4) && Math.hypot(x - 0.8, z + 0.55) > 1.0)
    weed(kit, [1.9, F, 1.5], rnd)
    weed(kit, [-0.2, F, 1.75], rnd, 1.1)
    weed(kit, [-2.0, F, -0.6], rnd)
  }

  // ------------------------------------------------------------ dish pedestal
  const dx = 0.8
  const dz = -0.55
  kit.cyl(0.92, 1.02, 0.42, { color: palette.concreteDark, top: palette.concrete, at: [dx, F + 0.21, dz], bevel: 0.09, seg: 28 })
  const towerH = 1.05
  kit.cyl(0.46, 0.62, towerH, { color: steel, top: steelTop, at: [dx, F + 0.42 + towerH / 2, dz], bevel: 0.07, seg: 20, shade: 0.12 })
  const topY = F + 0.42 + towerH
  kit.torus(0.5, 0.07, { color: palette.steel, top: palette.metalDark, at: [dx, topY, dz], mat: 'metal' })
  // hazard blocks round the base ring
  const blocks = 14
  for (let i = 0; i < blocks; i++) {
    const a = (i / blocks) * Math.PI * 2
    kit.box(0.3, 0.08, 0.16, {
      color: i % 2 ? palette.hazardDark : palette.hazard,
      at: [dx + Math.cos(a) * 0.86, F + 0.44, dz + Math.sin(a) * 0.86],
      rot: [0, -a + Math.PI / 2, 0],
      r: 0.03,
      shade: 0.05,
    })
  }
  // service hatch and ladder on the camera side
  kit.at([dx + Math.sin(0.5) * 0.55, F + 0.8, dz + Math.cos(0.5) * 0.55], [0, 0.5, 0], () => {
    kit.box(0.34, 0.5, 0.06, { color: palette.navyDark, top: palette.navy, r: 0.03 })
    kit.sphere(0.03, { color: palette.yellow, at: [0.1, 0, 0.04], seg: 6, mat: 'metal' })
  })
  if (old) {
    kit.at([dx + Math.sin(-0.5) * 0.52, F + 1.0, dz + Math.cos(-0.5) * 0.52], [0, -0.5, 0], () => rustPatch(kit, 0.34, 0.6, { dark: true }))
    kit.at([dx + Math.sin(1.3) * 0.5, F + 1.15, dz + Math.cos(1.3) * 0.5], [0, 1.3, 0], () => rustPatch(kit, 0.3, 0.4, { dark: true }))
  }

  // ------------------------------------------------------------ station hut
  const hx = -1.3
  const hz = 0.55
  const hw = 1.75
  const hh = 1.2
  const hd = 1.5
  kit.box(hw, hh, hd, { color: wall, top: wallTop, at: [hx, F + hh / 2, hz], r: 0.1 })
  kit.box(hw + 0.08, 0.22, hd + 0.08, { color: palette.concreteDark, top: palette.concrete, at: [hx, F + 0.11, hz], r: 0.06 })
  // chunky flat roof with a lip
  kit.box(hw + 0.42, 0.2, hd + 0.42, { color: roof, top: roofTop, at: [hx, F + hh + 0.09, hz], rot: [0, 0, old ? 0.03 : 0], r: 0.09 })
  kit.box(hw + 0.1, 0.07, hd + 0.1, { color: roofTop, top: roofTop, at: [hx, F + hh + 0.21, hz], rot: [0, 0, old ? 0.03 : 0], r: 0.03, shade: 0.03 })
  const roofY = F + hh + 0.245
  if (old) {
    kit.at([hx + 0.35, roofY + 0.01, hz - 0.3], [-Math.PI / 2, 0, 0.2], () => patchPlate(kit, 0.55, 0.45, palette.metalDark, palette.metalLight))
    kit.at([hx - 0.5, roofY + 0.005, hz + 0.4], [-Math.PI / 2, 0, 0], () => rustPatch(kit, 0.45, 0.35))
  } else {
    kit.at([hx + 0.35, roofY, hz - 0.3], undefined, () => acUnit(kit, 0.9))
  }
  kit.at([hx - 0.55, roofY, hz - 0.45], undefined, () => whip(kit, old ? 0.8 : 1.05, palette.red, old ? -0.14 : 0))
  kit.at([hx - 0.25, roofY, hz - 0.5], undefined, () => whip(kit, 0.5, palette.yellow))
  // front: door + screens
  const fz = hz + hd / 2
  kit.at([hx - 0.42, F, fz], undefined, () => door(kit, 0.42, 0.86, old ? faded(trim, 0.3) : trim, old ? faded(trim, 0.15) : trim, { frame, porthole: true }))
  kit.at([hx + 0.36, F + 0.68, fz], undefined, () => screenWindow(kit, 0.66, 0.46, { frame, colors: [palette.beaconGreen, palette.screenGlow, palette.lampWarm] }))
  // side window towards the dish
  kit.at([hx + hw / 2, F + 0.68, hz + 0.1], [0, YAW.right, 0], () => win(kit, 0.6, 0.46, { frame, cross: true, boarded: old }))
  // cable trunk from the hut to the dish
  kit.pipe(
    [
      [hx + hw / 2 + 0.02, F + 0.35, hz - 0.45],
      [hx + hw / 2 + 0.3, F + 0.12, hz - 0.5],
      [dx - 0.95, F + 0.12, dz + 0.35],
      [dx - 0.6, F + 0.5, dz + 0.2],
    ],
    0.07,
    { color: palette.navyDark, top: palette.navy, tension: 0.25 },
  )

  // ------------------------------------------------------------ data silo: where raw data waits
  const sx = -1.55
  const sz = -1.25
  kit.cyl(0.5, 0.56, 0.12, { color: palette.concreteDark, top: palette.concrete, at: [sx, F + 0.05, sz], bevel: 0.03, seg: 18 })
  kit.cyl(0.44, 0.44, 1.2, { color: old ? faded(palette.tealDark, 0.35) : palette.tealDark, top: old ? faded(palette.teal, 0.3) : palette.teal, at: [sx, F + 0.7, sz], bevel: 0.06, seg: 20 })
  for (const y of [0.42, 0.98]) kit.torus(0.445, 0.03, { color: palette.metalLight, at: [sx, F + y, sz], tube: 6, seg: 20 })
  kit.lathe(
    [
      [0.46, 0],
      [0.47, 0.05],
      [0.3, 0.26],
      [0.1, 0.36],
      [0, 0.38],
    ],
    { color: palette.metalDark, top: palette.metalLight, at: [sx, F + 1.28, sz], seg: 20 },
  )
  kit.sphere(0.06, { color: palette.red, at: [sx, F + 1.68, sz], seg: 8 })
  // fill gauge facing the camera
  kit.at([sx + Math.sin(0.66) * 0.44, F + 0.7, sz + Math.cos(0.66) * 0.44], [0, 0.66, 0], () => {
    kit.box(0.16, 0.62, 0.05, { color: palette.navyDark, r: 0.025, shade: 0 })
    const lit = old ? 1 : 3
    for (let i = 0; i < 4; i++) {
      kit.box(0.1, 0.1, 0.03, {
        color: i < lit ? palette.beaconGreen : palette.steel,
        at: [0, -0.21 + i * 0.14, 0.03],
        r: 0.015,
        mat: i < lit ? 'glowSoft' : 'matte',
        shade: 0,
      })
    }
  })
  if (old) kit.at([sx + Math.sin(-0.4) * 0.445, F + 0.85, sz + Math.cos(-0.4) * 0.445], [0, -0.4, 0], () => rustPatch(kit, 0.3, 0.5))

  // ------------------------------------------------------------ yard clutter
  // cable reel
  kit.at([1.85, F, 1.25], [0, 0.5, 0], () => {
    for (const x of [-0.14, 0.14]) kit.cyl(0.26, 0.26, 0.05, { color: palette.woodDark, top: palette.wood, at: [x, 0.26, 0], rot: [0, 0, Math.PI / 2], bevel: 0.015, seg: 16 })
    kit.cyl(0.15, 0.15, 0.26, { color: palette.navyDark, top: palette.navy, at: [0, 0.26, 0], rot: [0, 0, Math.PI / 2], bevel: 0.02, seg: 12 })
  })
  crate(kit, [0.35, F, 1.55], 0.36, 0.3)
  barrel(kit, [2.0, F, 0.45], old ? palette.rustDark : palette.blueDark, old ? palette.rust : palette.blue)
  // equipment cabinet with status lights
  kit.at([-0.1, F, 0.95], [0, 0.2, 0], () => {
    kit.box(0.46, 0.62, 0.34, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.31, 0], r: 0.05 })
    for (let i = 0; i < 3; i++) {
      kit.sphere(0.028, { color: [palette.beaconGreen, palette.lampWarm, palette.beaconGreen][i], at: [-0.1 + i * 0.1, 0.48, 0.175], seg: 6, mat: 'glowSoft', shade: 0 })
    }
    kit.box(0.3, 0.16, 0.03, { color: palette.steel, at: [0, 0.26, 0.175], r: 0.012, shade: 0 })
  })

  const group = kit.build('commsCenter')

  // ------------------------------------------------------------ the dish
  const R = old ? 1.5 : level >= 3 ? 1.85 : 1.72
  const depth = R * 0.3
  const dk = new Kit()
  // turntable + yoke
  dk.cyl(0.5, 0.56, 0.2, { color: palette.steel, top: palette.metalDark, at: [0, 0.1, 0], bevel: 0.05, seg: 20, mat: 'metal' })
  for (const s of [-1, 1]) {
    dk.box(0.2, 0.86, 0.4, { color: steel, top: steelTop, at: [s * 0.44, 0.58, 0], r: 0.07 })
    dk.cyl(0.13, 0.13, 0.12, { color: palette.yellowDark, top: palette.yellow, at: [s * 0.56, 0.86, 0], rot: [0, 0, Math.PI / 2], bevel: 0.03, seg: 12 })
  }
  // counterweight
  dk.box(0.6, 0.3, 0.3, { color: palette.steel, top: palette.metalDark, at: [0, 0.6, -0.42], r: 0.07 })
  // bowl, tipped back to look at the sky (old one droops and rolls a little)
  const elevation = old ? 0.78 : 0.62
  dk.at([0, 0.86, 0], [elevation, 0, old ? 0.09 : 0], () => {
    dk.at([0, 0.22, 0], undefined, () => {
      dishBowl(dk, R, depth, {
        inner: old ? [faded(palette.creamShade, 0.2), palette.cream] : [palette.creamShade, palette.white],
        outer: old ? [palette.rustDark, palette.metal] : [palette.metalDark, palette.metalLight],
        rim: old ? palette.rust : (colorA ?? palette.red),
        feed: old ? palette.rustLight : palette.red,
        old,
      })
      if (old) {
        // a missing reflector panel, a bolted patch and rust blooms
        const spot = (a: number, f: number, fn: () => void) => {
          const r = R * f
          const slope = Math.atan2((2 * depth * r) / (R * R), 1)
          dk.at([Math.cos(a) * r, depth * f * f + 0.03, Math.sin(a) * r], [0, -a, 0], () => dk.at([0, 0, 0], [0, 0, slope], () => dk.at([0, 0, 0], [-Math.PI / 2, 0, 0], fn)))
        }
        spot(1.9, 0.62, () => dk.box(0.46, 0.4, 0.03, { color: palette.soot, r: 0.02, shade: 0 }))
        spot(0.4, 0.55, () => patchPlate(dk, 0.5, 0.42, palette.metalDark, palette.metalLight))
        spot(3.6, 0.7, () => rustPatch(dk, 0.5, 0.36))
        spot(5.1, 0.45, () => rustPatch(dk, 0.36, 0.3, { dark: true }))
      }
    })
  })
  const dish = dk.build('dish')
  dish.name = 'dish'
  dish.position.set(dx, topY, dz)
  group.add(dish)

  let dish2: THREE.Object3D | null = null
  if (level >= 3) {
    const k2 = new Kit()
    k2.cyl(0.07, 0.09, 0.4, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.2, 0], bevel: 0.02, seg: 10 })
    k2.at([0, 0.46, 0], [0.7, 0, 0], () => dishBowl(k2, 0.55, 0.17, { rim: colorA ?? palette.red }))
    dish2 = k2.build('dish2')
    dish2.position.set(hx + 0.3, roofY, hz + 0.25)
    group.add(dish2)
  }

  // steady beacon on the feed is cute but costly; a soft status lamp on the hut instead
  let tracking: number | null = null
  let az = 0.55
  dish.rotation.y = az
  const data = group.userData as ModelUserData & { setTracking: (a: number | null) => void }
  data.setTracking = (a: number | null) => {
    tracking = a
  }
  data.anchors = { dish }
  data.tick = (t, dt) => {
    const target = tracking ?? 0.45 + Math.sin(t * 0.16) * 0.75 + Math.sin(t * 0.07 + 1) * 0.25
    // shortest way round, at a dignified pace
    let diff = target - az
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    const rate = tracking === null ? 0.5 : 1.6
    az += THREE.MathUtils.clamp(diff, -rate * dt, rate * dt)
    dish.rotation.y = az
    if (dish2) dish2.rotation.y = az * 0.8 + 1.2
  }
  return group
}
