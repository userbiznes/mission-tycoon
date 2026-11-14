import * as THREE from 'three'
import { Kit } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { YAW, barrel, crate, door, foundation, makePuffs, miniSatellite, readOpts, win } from './common'

/**
 * Engineering Lab: research and testing. A saw-tooth-roofed workshop with a
 * roll-up door, and a test yard where a satellite sits on a shake table under
 * a yellow gantry.
 *
 * Built by the player, so level 1 is brand new. Level 2 adds a thermal-vacuum
 * tank and lights; level 3 a tall test tower.
 * `userData.setTesting(on)` shakes the table harder; the child `shaker` is the table top.
 * Front door on +Z. Footprint about 4.3 × 4.2.
 */
export function createEngineeringLab(opts: ModelOptions = {}): THREE.Object3D {
  const { level, colorA } = readOpts(opts)
  const kit = new Kit()
  const F = 0.16
  const trim = colorA ?? palette.orange
  const frame = palette.white

  foundation(kit, 4.3, 4.2, { r: 0.6, z: -0.05 })

  // ------------------------------------------------------------ workshop
  const bx = -0.65
  const bz = -0.45
  const bw = 2.6
  const bh = 1.3
  const bd = 2.3
  kit.box(bw, bh, bd, { color: palette.creamShade, top: palette.cream, at: [bx, F + bh / 2, bz], r: 0.1 })
  kit.box(bw + 0.08, 0.26, bd + 0.08, { color: palette.orangeDark, top: trim, at: [bx, F + 0.13, bz], r: 0.06 })
  kit.box(bw + 0.14, 0.12, bd + 0.14, { color: palette.steel, top: palette.metalDark, at: [bx, F + bh, bz], r: 0.05 })
  // saw-tooth roof: two teeth, glazed on the sunny (−X) faces
  const teeth = 2
  const tw = bw / teeth
  const tH = 0.62
  for (let i = 0; i < teeth; i++) {
    const x0 = bx - bw / 2 + i * tw
    const s = new THREE.Shape()
    s.moveTo(0.04, 0)
    s.lineTo(tw - 0.02, 0)
    s.lineTo(0.1, tH)
    s.quadraticCurveTo(0.03, tH + 0.02, 0.03, tH - 0.08)
    s.closePath()
    kit.extrude(s, bd + 0.24, { color: palette.orangeDark, top: palette.roofOrange, at: [x0, F + bh + 0.05, bz], bevel: 0.06, shade: 0.16 })
    // glazing on the vertical face
    kit.box(0.05, tH - 0.2, bd - 0.1, { color: palette.glassDark, top: palette.glass, at: [x0 - 0.03, F + bh + 0.05 + tH / 2, bz], r: 0.02, mat: 'glass' })
    for (const z of [-0.6, 0, 0.6]) kit.box(0.07, tH - 0.14, 0.06, { color: frame, at: [x0 - 0.035, F + bh + 0.05 + tH / 2, bz + z], r: 0.02 })
  }
  // exhaust stack
  kit.cyl(0.11, 0.13, 0.9, { color: palette.metalDark, top: palette.metalLight, at: [bx + 0.95, F + bh + 0.6, bz - 0.8], bevel: 0.03, seg: 12, mat: 'metal' })
  kit.torus(0.13, 0.03, { color: palette.steel, at: [bx + 0.95, F + bh + 1.05, bz - 0.8], tube: 6, seg: 12 })

  // front: roll-up door glowing with workshop light, staff door
  const fz = bz + bd / 2
  const gx = bx - 0.4
  kit.box(1.36, 1.02, 0.06, { color: palette.steel, at: [gx, F + 0.5, fz + 0.01], r: 0.03 })
  kit.box(1.2, 0.42, 0.05, { color: palette.lampWarm, top: palette.lampHot, at: [gx, F + 0.24, fz + 0.035], r: 0.02, mat: 'glowSoft', shade: 0.25 })
  for (let i = 0; i < 4; i++) {
    kit.box(1.22, 0.14, 0.07, { color: palette.metal, top: palette.metalLight, at: [gx, F + 0.53 + i * 0.135, fz + 0.045], r: 0.03, mat: 'metal', shade: 0.1 })
  }
  kit.box(1.24, 0.08, 0.09, { color: palette.hazard, at: [gx, F + 0.455, fz + 0.05], r: 0.03 })
  // a workbench silhouette in the doorway
  kit.box(0.5, 0.2, 0.04, { color: palette.woodDark, top: palette.wood, at: [gx - 0.15, F + 0.14, fz + 0.06], r: 0.02 })
  kit.at([bx + 0.85, F, fz], undefined, () => door(kit, 0.4, 0.88, palette.orangeDark, trim, { frame, porthole: true }))
  // gear emblem above the doors
  kit.at([bx + 0.2, F + 1.12, fz + 0.03], undefined, () => {
    kit.torus(0.12, 0.04, { color: palette.metalDark, top: palette.metalLight, rot: [Math.PI / 2, 0, 0], tube: 6, seg: 16 })
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      kit.box(0.065, 0.065, 0.04, { color: palette.metalDark, top: palette.metalLight, at: [Math.cos(a) * 0.175, Math.sin(a) * 0.175, 0], rot: [0, 0, a], r: 0.012 })
    }
  })

  // sunny side wall (−X): windows and a rack of gas bottles
  const lx = bx - bw / 2
  for (const z of [-0.65, 0.35]) kit.at([lx, F + 0.8, bz + z], [0, YAW.left, 0], () => win(kit, 0.56, 0.5, { frame, cross: true }))
  kit.at([lx - 0.2, F, bz - 0.15], undefined, () => {
    kit.box(0.26, 0.08, 0.8, { color: palette.steel, at: [0, 0.04, 0], r: 0.02 })
    const cols = [palette.blue, palette.green, palette.red]
    cols.forEach((c, i) => {
      kit.capsule(0.09, 0.4, { color: c, at: [0, 0.37, -0.26 + i * 0.26], seg: 10, shade: 0.2 })
      kit.cyl(0.03, 0.03, 0.08, { color: palette.metalLight, at: [0, 0.7, -0.26 + i * 0.26], bevel: 0.01, seg: 6 })
    })
    kit.box(0.05, 0.05, 0.8, { color: palette.steel, at: [0.1, 0.45, 0], r: 0.015 })
  })

  // ------------------------------------------------------------ test yard
  const yx = 1.3
  const yz = 0.55
  // painted test pad
  kit.cyl(0.92, 0.92, 0.02, { color: palette.hazard, at: [yx, F + 0.03, yz], bevel: 0.006, seg: 28, shade: 0 })
  kit.cyl(0.8, 0.8, 0.022, { color: palette.concreteLight, at: [yx, F + 0.032, yz], bevel: 0.006, seg: 28, shade: 0 })
  // shake-table base and springs
  kit.box(0.92, 0.2, 0.92, { color: palette.steel, top: palette.metalDark, at: [yx, F + 0.12, yz], r: 0.06 })
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        kit.torus(0.07, 0.022, { color: palette.red, at: [yx + sx * 0.3, F + 0.25 + k * 0.045, yz + sz * 0.3], tube: 5, seg: 10 })
      }
    }
  // gantry over the table
  const gH = 1.75
  for (const sx of [-1, 1]) {
    kit.beam([yx + sx * 0.78, F, yz - 0.3], [yx + sx * 0.66, F + gH, yz], 0.09, { color: palette.yellowDark, top: palette.yellow })
    kit.beam([yx + sx * 0.78, F, yz + 0.3], [yx + sx * 0.66, F + gH, yz], 0.09, { color: palette.yellowDark, top: palette.yellow })
    kit.box(0.2, 0.08, 0.8, { color: palette.steel, at: [yx + sx * 0.78, F + 0.04, yz], r: 0.025 })
  }
  kit.box(1.6, 0.16, 0.16, { color: palette.yellowDark, top: palette.yellow, at: [yx, F + gH + 0.02, yz], r: 0.05 })
  kit.box(0.22, 0.14, 0.24, { color: palette.steel, top: palette.metalDark, at: [yx + 0.1, F + gH - 0.1, yz], r: 0.04 })
  kit.beam([yx + 0.1, F + gH - 0.16, yz], [yx + 0.1, F + gH - 0.5, yz], 0.028, { color: palette.steel, round: true })
  kit.torus(0.05, 0.018, { color: palette.steel, at: [yx + 0.1, F + gH - 0.56, yz], rot: [Math.PI / 2, 0, 0], tube: 5, seg: 10, arc: Math.PI * 1.5 })
  // control console
  kit.at([yx - 0.25, F, yz + 1.05], [0, 0.3, 0], () => {
    kit.box(0.5, 0.42, 0.3, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.21, 0], r: 0.05 })
    kit.box(0.42, 0.2, 0.04, { color: palette.screenGlow, at: [0, 0.4, 0.1], rot: [-0.7, 0, 0], r: 0.015, mat: 'glowSoft', shade: 0.2 })
    kit.sphere(0.035, { color: palette.red, at: [0.17, 0.3, 0.16], seg: 6 })
  })
  crate(kit, [0.45, F, 1.55], 0.36, -0.3, palette.orange)
  barrel(kit, [1.85, F, -0.6], palette.blueDark, palette.blue)
  // tool cart
  kit.at([0.35, F, 0.35], [0, 0.2, 0], () => {
    kit.box(0.4, 0.3, 0.28, { color: palette.redDark, top: palette.red, at: [0, 0.25, 0], r: 0.04 })
    for (const y of [0.18, 0.3]) kit.box(0.3, 0.025, 0.02, { color: palette.metalLight, at: [0, y, 0.145], r: 0.008 })
    for (const sx of [-1, 1]) kit.cyl(0.05, 0.05, 0.05, { color: palette.rubber, at: [sx * 0.15, 0.05, 0], rot: [Math.PI / 2, 0, 0], bevel: 0.015, seg: 8 })
  })

  if (level >= 2) {
    // thermal-vacuum tank: a fat horizontal drum with a porthole door
    kit.at([1.35, F, -1.15], [0, 0.2, 0], () => {
      for (const x of [-0.3, 0.3]) kit.box(0.14, 0.26, 0.7, { color: palette.steel, at: [x, 0.13, 0], r: 0.04 })
      kit.capsule(0.42, 0.5, { color: palette.metal, top: palette.metalLight, at: [0, 0.62, 0], rot: [0, 0, Math.PI / 2], mat: 'metal', shade: 0.18 })
      kit.torus(0.43, 0.04, { color: palette.blueDark, top: palette.blue, at: [0.1, 0.62, 0], rot: [0, 0, Math.PI / 2], tube: 6 })
      kit.cyl(0.2, 0.2, 0.06, { color: palette.glassDark, top: palette.glass, at: [0, 0.62, 0.42], rot: [Math.PI / 2, 0, 0], bevel: 0.015, seg: 14, mat: 'glass' })
      kit.torus(0.2, 0.035, { color: palette.steel, at: [0, 0.62, 0.42], rot: [Math.PI / 2, 0, 0], tube: 6, seg: 14 })
    })
    for (const x of [gx - 0.45, gx + 0.45]) {
      kit.box(0.18, 0.09, 0.1, { color: palette.steel, at: [x, F + 1.12, fz + 0.07], r: 0.03 })
      kit.box(0.12, 0.045, 0.07, { color: palette.lampWarm, top: palette.lampHot, at: [x, F + 1.06, fz + 0.08], r: 0.012, mat: 'glow', shade: 0 })
    }
  }
  if (level >= 3) {
    // drop-test tower
    const ttx = -1.75
    const ttz = 1.45
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.beam([ttx + sx * 0.25, F, ttz + sz * 0.25], [ttx + sx * 0.2, F + 2.6, ttz + sz * 0.2], 0.07, { color: palette.orangeDark, top: trim })
    for (const y of [0.9, 1.75, 2.6]) kit.box(0.6, 0.07, 0.6, { color: palette.steel, top: palette.metalDark, at: [ttx, F + y, ttz], r: 0.02 })
    kit.sphere(0.07, { color: palette.red, at: [ttx, F + 2.75, ttz], seg: 8, mat: 'glowSoft' })
  }

  const group = kit.build('engineeringLab')

  // ------------------------------------------------------------ shake table top with the test article
  const sk = new Kit()
  sk.box(0.84, 0.1, 0.84, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.05, 0], r: 0.04 })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) sk.cyl(0.04, 0.04, 0.05, { color: palette.steel, at: [sx * 0.34, 0.11, sz * 0.34], bevel: 0.012, seg: 8 })
  sk.at([0, 0.1, 0], [0, 0.6, 0], () => miniSatellite(sk, 1.1))
  const shaker = sk.build('shaker')
  shaker.name = 'shaker'
  const tableY = F + 0.4
  shaker.position.set(yx, tableY, yz)
  group.add(shaker)

  const puffs = makePuffs([[bx + 0.95, F + bh + 1.1, bz - 0.8]], { perVent: 4, rise: 0.9, size: 0.13, speed: 0.16, color: palette.smoke })
  group.add(puffs.object)

  let testing = false
  let amp = 0.3
  const data = group.userData as ModelUserData & { setTesting: (on: boolean) => void }
  data.setTesting = (on: boolean) => {
    testing = on
  }
  data.anchors = { shaker }
  data.tick = (t, dt) => {
    amp += ((testing ? 1 : 0.3) - amp) * Math.min(1, dt * 3)
    // bursts of shaking, like a real vibration sweep
    const burst = testing ? 1 : Math.max(0, Math.sin(t * 0.8)) ** 2
    const a = 0.012 * amp * (0.25 + burst)
    shaker.position.set(yx + Math.sin(t * 61) * a, tableY + Math.abs(Math.sin(t * 47)) * a * 1.4, yz + Math.cos(t * 53) * a)
    shaker.rotation.z = Math.sin(t * 39) * a * 1.5
    puffs.update(t)
  }
  data.dispose = () => puffs.dispose()
  return group
}
