import * as THREE from 'three'
import { Kit, seeded } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { YAW, barrel, door, foundation, gableShape, makePuffs, mix, panelRoof, planter, readOpts, stringLights, win } from './common'

/**
 * Crew Quarters: a cozy bunkhouse. Red roof, a porch with a bench and a
 * lantern, a brick chimney puffing smoke, window boxes, and a laundry line
 * swaying beside it.
 *
 * Built by the player, so level 1 is brand new. Level 2 adds a dormer and
 * string lights; level 3 a second bunk wing.
 * Front door on +Z. Footprint about 4.3 × 4.2.
 */
export function createCrewQuarters(opts: ModelOptions = {}): THREE.Object3D {
  const { level, colorA } = readOpts(opts)
  const rnd = seeded(81)
  const kit = new Kit()
  const F = 0.14
  const trim = colorA ?? palette.red
  const frame = palette.white

  // a stone pad under the house and a boardwalk out front
  foundation(kit, 4.2, 4.1, { r: 0.7, z: -0.05, h: F, color: [palette.rockDark, palette.rock] })

  // ------------------------------------------------------------ house
  const bx = -0.35
  const bz = -0.65
  const bw = 2.7
  const bh = 1.25
  const bd = 1.9
  const wallA = mix(palette.wood, palette.cream, 0.45)
  const wallB = mix(palette.woodLight, palette.cream, 0.6)
  kit.box(bw, bh, bd, { color: wallA, top: wallB, at: [bx, F + bh / 2, bz], r: 0.09 })
  // plank lines
  for (let i = 1; i < 5; i++) {
    kit.box(bw + 0.03, 0.025, bd + 0.03, { color: palette.wood, at: [bx, F + (bh / 5) * i, bz], r: 0.01, shade: 0 })
  }
  // corner posts and a stone footing
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.14, bh + 0.02, 0.14, { color: palette.woodDark, top: palette.wood, at: [bx + sx * (bw / 2 - 0.02), F + bh / 2, bz + sz * (bd / 2 - 0.02)], r: 0.04 })
  kit.box(bw + 0.1, 0.2, bd + 0.1, { color: palette.rockDark, top: palette.rock, at: [bx, F + 0.1, bz], r: 0.06 })
  // gable ends (on ±X) and the roof, ridge running along X
  const rise = 0.85
  kit.at([bx, F + bh - 0.03, bz], [0, Math.PI / 2, 0], () => {
    kit.extrude(gableShape(bd - 0.05, rise, 0.05), bw - 0.03, { color: wallB, top: wallB, bevel: 0.035, shade: 0.04 })
  })
  kit.at([bx, F + bh, bz], [0, Math.PI / 2, 0], () =>
    panelRoof(kit, bd, rise, bw, palette.redDark, palette.roofRed, { thick: 0.2, overhang: 0.26, overhangZ: 0.24, ridge: palette.red, rows: 3 }),
  )
  // round attic windows in the gables
  for (const s of [-1, 1]) {
    kit.at([bx + s * (bw / 2 + 0.01), F + bh + 0.3, bz], [0, s > 0 ? YAW.right : YAW.left, 0], () => {
      kit.torus(0.16, 0.045, { color: frame, rot: [Math.PI / 2, 0, 0], tube: 6, seg: 14 })
      kit.cyl(0.15, 0.15, 0.04, { color: palette.lampWarm, top: palette.lampHot, rot: [Math.PI / 2, 0, 0], bevel: 0.01, seg: 12, mat: 'glowSoft', shade: 0.1 })
    })
  }
  // brick chimney on the back slope
  const chx = bx + 0.75
  const chz = bz - 0.45
  kit.box(0.4, 1.0, 0.4, { color: palette.brick, top: mix(palette.brick, palette.cream, 0.25), at: [chx, F + bh + 0.75, chz], r: 0.05 })
  kit.box(0.5, 0.1, 0.5, { color: palette.rockDark, top: palette.rock, at: [chx, F + bh + 1.27, chz], r: 0.04 })
  for (const y of [0.5, 0.75, 1.0]) kit.box(0.42, 0.02, 0.42, { color: mix(palette.brick, palette.ink, 0.25), at: [chx, F + bh + y, chz], r: 0.008, shade: 0 })

  // front wall: door in the middle, windows with shutters and flower boxes
  const fz = bz + bd / 2
  kit.at([bx, F + 0.1, fz], undefined, () => door(kit, 0.46, 0.92, palette.redDark, trim, { frame, porthole: true }))
  ;[-0.85, 0.85].forEach((dx, i) => {
    kit.at([bx + dx, F + 0.78, fz], undefined, () => win(kit, 0.5, 0.5, { frame, cross: true, shutters: palette.tealDark, glow: i === 0 ? palette.lampWarm : false }))
    kit.at([bx + dx, F + 0.36, fz + 0.14], undefined, () => planter(kit, 0.66, [palette.flowerPink, palette.flowerYellow, palette.flowerWhite, palette.flowerOrange], rnd))
  })
  // side windows
  for (const s of [-1, 1]) {
    kit.at([bx + s * (bw / 2), F + 0.76, bz], [0, s > 0 ? YAW.right : YAW.left, 0], () => win(kit, 0.6, 0.5, { frame, cross: true, shutters: palette.tealDark }))
  }

  // ------------------------------------------------------------ porch
  const pz0 = fz
  const pd = 0.95
  kit.box(bw + 0.1, 0.14, pd, { color: palette.woodDark, top: palette.woodLight, at: [bx, F + 0.07, pz0 + pd / 2], r: 0.04 })
  for (let i = 0; i < 9; i++) kit.box(0.02, 0.02, pd - 0.04, { color: palette.woodDark, at: [bx - bw / 2 + 0.2 + i * 0.3, F + 0.142, pz0 + pd / 2], r: 0.006, shade: 0 })
  for (const dx of [-bw / 2 + 0.08, bw / 2 - 0.08]) {
    kit.beam([bx + dx, F + 0.12, pz0 + pd - 0.1], [bx + dx, F + 1.18, pz0 + pd - 0.1], 0.09, { color: palette.woodDark, top: palette.wood })
  }
  // porch roof: a lower, shallower lean-to
  kit.box(bw + 0.5, 0.12, pd + 0.34, { color: palette.redDark, top: palette.roofRed, at: [bx, F + 1.27, pz0 + pd / 2 + 0.02], rot: [0.2, 0, 0], r: 0.05 })
  // railing on one side, steps in the middle
  kit.beam([bx - bw / 2 + 0.08, F + 0.5, pz0 + pd - 0.1], [bx - 0.5, F + 0.5, pz0 + pd - 0.1], 0.05, { color: palette.woodDark, top: palette.wood })
  for (const dx of [-1.0, -0.72]) kit.beam([bx + dx, F + 0.12, pz0 + pd - 0.1], [bx + dx, F + 0.5, pz0 + pd - 0.1], 0.04, { color: palette.wood })
  for (let i = 0; i < 2; i++) kit.box(0.7, 0.07 * (2 - i), 0.2, { color: palette.woodDark, top: palette.woodLight, at: [bx, F + 0.035 * (2 - i), pz0 + pd + 0.1 + i * 0.18], r: 0.02 })
  // bench
  kit.at([bx + 0.85, F + 0.14, pz0 + 0.3], undefined, () => {
    kit.box(0.7, 0.05, 0.22, { color: palette.wood, top: palette.woodLight, at: [0, 0.2, 0], r: 0.02 })
    kit.box(0.7, 0.2, 0.04, { color: palette.wood, top: palette.woodLight, at: [0, 0.36, -0.1], r: 0.02 })
    for (const sx of [-1, 1]) kit.box(0.05, 0.2, 0.2, { color: palette.woodDark, at: [sx * 0.3, 0.1, 0], r: 0.015 })
  })
  // hanging lantern by the door
  kit.beam([bx - 0.45, F + 1.2, pz0 + 0.4], [bx - 0.45, F + 1.04, pz0 + 0.4], 0.02, { color: palette.steel, round: true })
  kit.box(0.12, 0.16, 0.12, { color: palette.lampWarm, top: palette.lampHot, at: [bx - 0.45, F + 0.96, pz0 + 0.4], r: 0.03, mat: 'glowSoft', shade: 0.1 })
  kit.box(0.15, 0.03, 0.15, { color: palette.steel, at: [bx - 0.45, F + 1.05, pz0 + 0.4], r: 0.01 })

  // ------------------------------------------------------------ yard
  // mailbox
  kit.at([-1.75, F, 1.6], [0, 0.3, 0], () => {
    kit.beam([0, 0, 0], [0, 0.55, 0], 0.07, { color: palette.woodDark, top: palette.wood })
    kit.capsule(0.11, 0.16, { color: palette.blueDark, top: palette.blue, at: [0, 0.62, 0], rot: [Math.PI / 2, 0, 0], seg: 10 })
    kit.box(0.02, 0.14, 0.06, { color: palette.red, at: [0.12, 0.7, 0.02], r: 0.008 })
  })
  barrel(kit, [1.3, F, 0.2], palette.woodDark, palette.wood)
  // log pile against the back
  for (let i = 0; i < 5; i++) {
    kit.cyl(0.09, 0.09, 0.5, { color: palette.trunkDark, top: palette.trunk, at: [-1.45 + (i % 3) * 0.19 + (i > 2 ? 0.1 : 0), F + 0.09 + (i > 2 ? 0.16 : 0), -1.75], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 8 })
  }
  // laundry poles (the line and washing sway as a separate child)
  const lx = 1.62
  const lz0 = -1.35
  const lz1 = 0.95
  for (const z of [lz0, lz1]) {
    kit.beam([lx, F, z], [lx, F + 1.35, z], 0.07, { color: palette.woodDark, top: palette.wood })
    kit.beam([lx - 0.22, F + 1.3, z], [lx + 0.22, F + 1.3, z], 0.05, { color: palette.woodDark, top: palette.wood })
  }

  if (level >= 2) {
    // dormer window on the front slope, lights along the porch
    kit.box(0.6, 0.5, 0.6, { color: wallB, at: [bx, F + bh + 0.42, bz + 0.5], r: 0.06 })
    kit.at([bx, F + bh + 0.42, bz + 0.8], undefined, () => win(kit, 0.34, 0.3, { frame, glow: palette.lampWarm, sill: false }))
    kit.box(0.74, 0.1, 0.72, { color: palette.redDark, top: palette.roofRed, at: [bx, F + bh + 0.7, bz + 0.5], r: 0.04 })
    stringLights(kit, [bx - bw / 2 - 0.1, F + 1.2, pz0 + pd + 0.1], [bx + bw / 2 + 0.1, F + 1.2, pz0 + pd + 0.1], 8, true, [palette.lampWarm, palette.flowerPink, palette.lampHot, palette.screenGlow])
  }
  if (level >= 3) {
    // a second little bunk wing at the back
    kit.box(1.3, 0.95, 1.1, { color: wallA, top: wallB, at: [bx - 0.9, F + 0.475, bz - 1.2], r: 0.08 })
    kit.box(1.5, 0.14, 1.3, { color: palette.redDark, top: palette.roofRed, at: [bx - 0.9, F + 1.0, bz - 1.2], rot: [-0.12, 0, 0], r: 0.05 })
    kit.at([bx - 0.9 - 0.65, F + 0.55, bz - 1.2], [0, YAW.left, 0], () => win(kit, 0.44, 0.4, { frame, cross: true, glow: palette.lampWarm }))
  }

  const group = kit.build('crewQuarters')

  // ------------------------------------------------------------ the washing line
  const wk = new Kit()
  const len = lz1 - lz0
  wk.beam([0, 0, 0], [0, 0, len], 0.02, { color: palette.sandLight, round: true })
  const wash: [number, number, number, string][] = [
    [0.3, 0.3, 0.36, palette.white],
    [0.75, 0.24, 0.3, palette.blue],
    [1.2, 0.34, 0.26, trim],
    [1.65, 0.22, 0.34, palette.yellow],
    [2.0, 0.26, 0.2, palette.white],
  ]
  for (const [z, w, h, c] of wash) {
    if (z > len - 0.15) continue
    wk.box(0.025, h, w, { color: c, at: [0, -h / 2 - 0.01, z], r: 0.01, shade: 0.1 })
    wk.box(0.04, 0.05, 0.03, { color: palette.woodDark, at: [0, 0.0, z - w / 2 + 0.05], r: 0.01 })
    wk.box(0.04, 0.05, 0.03, { color: palette.woodDark, at: [0, 0.0, z + w / 2 - 0.05], r: 0.01 })
  }
  const washing = wk.build('washing')
  washing.name = 'washing'
  washing.position.set(lx, F + 1.3, lz0)
  group.add(washing)

  const puffs = makePuffs([[chx, F + bh + 1.36, chz]], { perVent: 5, rise: 1.1, size: 0.15, speed: 0.14, color: palette.smoke, drift: [0.3, 0, -0.1] })
  group.add(puffs.object)

  const data = group.userData as ModelUserData
  data.anchors = { washing }
  data.tick = (t) => {
    washing.rotation.z = Math.sin(t * 1.4) * 0.16 + Math.sin(t * 2.7) * 0.05
    puffs.update(t)
  }
  data.dispose = () => puffs.dispose()
  return group
}
