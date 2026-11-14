import * as THREE from 'three'
import { Kit, seeded } from '../kit'
import { palette } from '../palette'
import { logoPlate } from '../logo'
import type { ModelOptions, ModelUserData } from '../registry'
import {
  YAW,
  awning,
  cracks,
  door,
  faded,
  foundation,
  gableShape,
  lampPost,
  makeFlag,
  onSlope,
  panelRoof,
  patchPlate,
  planter,
  readOpts,
  rustPatch,
  screenWindow,
  weed,
  whip,
  win,
} from './common'

/**
 * Mission Control: the agency HQ. A gabled hall with the logo in the pediment,
 * a glazed control cab on a stubby tower, a turning radar, the flag, and the
 * cork contract board out front.
 *
 * Level 1 is the tired old building (faded paint, a boarded window, a crooked
 * shutter, a patched roof); level 2+ is repainted with lights and planters.
 * Front door on +Z. Footprint about 4.9 × 4.1.
 */
export function createMissionControl(opts: ModelOptions = {}): THREE.Object3D {
  const { level, colorA } = readOpts(opts)
  const old = level <= 1
  const rnd = seeded(21)
  const kit = new Kit()
  const F = 0.16

  const wall = old ? faded(palette.creamShade, 0.25) : palette.creamShade
  const wallTop = old ? palette.plaster : palette.white
  const roof = old ? faded(palette.blueDark, 0.5) : palette.blueDark
  const roofTop = old ? faded(palette.roofBlue, 0.45) : palette.roofBlue
  const trim = colorA ?? palette.teal
  const trimDark = colorA ? colorA : palette.tealDark
  const frame = old ? palette.cream : palette.white

  foundation(kit, 4.9, 3.6, { z: -0.2, r: 0.55 })
  if (old) {
    cracks(kit, rnd, 6, 2.2, F + 0.03, (x, z) => z > 0.95 || x > 2.25 || x < -2.1)
    weed(kit, [-2.2, F, 1.25], rnd)
    weed(kit, [1.1, F, 1.35], rnd)
    weed(kit, [2.3, F, -1.7], rnd, 1.2)
  }

  // ------------------------------------------------------------ hall
  const hx = -0.55
  const hz = -0.3
  const hw = 3.0
  const hh = 1.55
  const hd = 2.6
  const rise = 0.92
  kit.box(hw, hh, hd, { color: wall, top: wallTop, at: [hx, F + hh / 2, hz], r: 0.1 })
  kit.box(hw + 0.08, 0.24, hd + 0.08, { color: palette.concreteDark, top: palette.concrete, at: [hx, F + 0.12, hz], r: 0.06 })
  // gable walls under the roof panels
  kit.extrude(gableShape(hw - 0.05, rise, 0.05), hd - 0.03, { color: wallTop, top: wallTop, at: [hx, F + hh - 0.03, hz], bevel: 0.035, shade: 0.04 })
  kit.at([hx, F + hh, hz], undefined, () =>
    panelRoof(kit, hw, rise, hd, roof, roofTop, { thick: 0.2, overhang: 0.3, overhangZ: 0.26, ridge: old ? faded(palette.roofBlue, 0.25) : palette.blue }),
  )
  const slope = Math.atan2(rise, hw / 2)
  if (old) {
    // a mismatched patch and a few slipped tiles on the sunny roof slope
    onSlope(kit, [hx - 0.92, F + hh + 0.6, hz + 0.45], slope, () => patchPlate(kit, 0.62, 0.5, palette.metalDark, palette.metalLight), 0.12)
    onSlope(kit, [hx - 0.55, F + hh + 0.84, hz - 0.65], slope, () => rustPatch(kit, 0.5, 0.36))
    onSlope(kit, [hx + 0.85, F + hh + 0.65, hz + 0.2], -slope, () => patchPlate(kit, 0.5, 0.42, palette.woodDark, palette.wood), -0.2)
  }
  // roof vent pipe
  kit.cyl(0.11, 0.13, 0.7, { color: palette.metalDark, top: palette.metalLight, at: [hx + 0.75, F + hh + 0.72, hz - 0.75], bevel: 0.03, seg: 12, mat: 'metal' })
  kit.cone(0.2, 0.2, { color: palette.steel, top: palette.metalDark, at: [hx + 0.75, F + hh + 1.14, hz - 0.75], seg: 12 })

  // front: double door under a little awning, screens glowing either side
  const fz = hz + hd / 2
  kit.at([hx, F, fz], [0, YAW.front, 0], () => door(kit, 0.74, 1.02, trimDark, trim, { double: true, porthole: true, frame }))
  kit.at([hx, F + 1.3, fz + 0.03], undefined, () => awning(kit, 1.24, 0.5, old ? faded(trim, 0.3) : trim, old ? palette.creamShade : palette.white, { tilt: 0.4, stripes: 5, thick: 0.06 }))
  kit.at([hx - 1.02, F + 0.9, fz], undefined, () => screenWindow(kit, 0.62, 0.52, { frame }))
  if (old) kit.at([hx + 0.98, F + 0.9, fz], undefined, () => win(kit, 0.5, 0.52, { frame, boarded: true }))
  else kit.at([hx + 0.98, F + 0.9, fz], undefined, () => screenWindow(kit, 0.5, 0.52, { frame, colors: [palette.lampWarm, palette.screenGlow] }))
  // pediment sign board
  kit.cyl(0.4, 0.4, 0.09, { color: palette.woodDark, top: palette.woodLight, at: [hx, F + hh + 0.3, fz + 0.03], rot: [Math.PI / 2, 0, 0], bevel: 0.03, seg: 24 })

  // sunny side wall (−X): shuttered windows either side of a big emblem
  const lx = hx - hw / 2
  ;[-0.92, 0.36].forEach((dz, i) => {
    kit.at([lx, F + 0.92, hz + dz], [0, YAW.left, 0], () => win(kit, 0.52, 0.58, { frame, shutters: old ? faded(trim, 0.35) : trim, crooked: old && i === 1, cross: true }))
    if (!old) kit.at([lx - 0.14, F, hz + dz], [0, YAW.left, 0], () => planter(kit, 0.74, [palette.flowerPink, palette.flowerYellow, palette.flowerWhite], rnd))
  })
  kit.cyl(0.33, 0.33, 0.08, { color: palette.woodDark, top: palette.woodLight, at: [lx - 0.03, F + 1.02, hz - 0.28], rot: [0, 0, Math.PI / 2], bevel: 0.03, seg: 22 })
  if (old) kit.at([lx - 0.02, F + 0.5, hz - 1.05], [0, YAW.left, 0], () => rustPatch(kit, 0.34, 0.5, { dark: true }))
  // drain pipe at the corner
  kit.pipe(
    [
      [lx - 0.05, F + hh - 0.05, hz + hd / 2 - 0.12],
      [lx - 0.07, F + 0.3, hz + hd / 2 - 0.12],
      [lx - 0.2, F + 0.12, hz + hd / 2 - 0.12],
    ],
    0.045,
    { color: palette.metalDark, top: palette.metal, tension: 0.2, radial: 6 },
  )

  // ------------------------------------------------------------ tower with the control cab
  const tx = 1.5
  const tz = -0.55
  const tw = 1.5
  const td = 1.7
  const th = 1.78
  kit.box(tw, th, td, { color: wall, top: wallTop, at: [tx, F + th / 2, tz], r: 0.1 })
  kit.box(tw + 0.08, 0.24, td + 0.08, { color: palette.concreteDark, top: palette.concrete, at: [tx, F + 0.12, tz], r: 0.06 })
  const cabY = F + th
  kit.box(tw + 0.22, 0.12, td + 0.22, { color: old ? faded(trim, 0.3) : trim, at: [tx, cabY, tz], r: 0.05, shade: 0.06 })
  kit.box(tw + 0.06, 0.62, td + 0.06, { color: wallTop, at: [tx, cabY + 0.34, tz], r: 0.09, shade: 0.06 })
  // wrap-around glazing
  const cab: [number, number, number, number][] = [
    [tx, tz + td / 2 + 0.03, YAW.front, tw],
    [tx + tw / 2 + 0.03, tz, YAW.right, td],
    [tx - tw / 2 - 0.03, tz, YAW.left, td],
  ]
  for (const [x, z, yaw, span] of cab) {
    kit.at([x, cabY + 0.36, z], [0, yaw, 0], () => win(kit, span - 0.36, 0.38, { frame, bars: 2, sill: false }))
  }
  // roof slab
  kit.box(tw + 0.5, 0.2, td + 0.5, { color: roof, top: roofTop, at: [tx, cabY + 0.75, tz], r: 0.09 })
  const roofY = cabY + 0.85
  // tower front: mission clock over a window
  kit.at([tx + 0.1, F + 0.82, tz + td / 2], undefined, () => win(kit, 0.5, 0.5, { frame, cross: true, glow: old ? false : palette.lampWarm }))
  kit.at([tx + 0.1, F + 1.42, tz + td / 2 + 0.02], undefined, () => {
    kit.cyl(0.2, 0.2, 0.07, { color: palette.navyDark, top: palette.navy, rot: [Math.PI / 2, 0, 0], bevel: 0.025, seg: 18 })
    kit.cyl(0.155, 0.155, 0.04, { color: palette.white, at: [0, 0, 0.03], rot: [Math.PI / 2, 0, 0], bevel: 0.01, seg: 18, shade: 0.03 })
    kit.box(0.03, 0.12, 0.02, { color: palette.ink, at: [0, 0.05, 0.055], r: 0.008, shade: 0 })
    kit.box(0.09, 0.03, 0.02, { color: palette.red, at: [0.04, 0.0, 0.055], r: 0.008, shade: 0 })
  })
  // tower side: window + roof ladder
  kit.at([tx + tw / 2, F + 0.86, tz + 0.3], [0, YAW.right, 0], () => win(kit, 0.46, 0.5, { frame, cross: true }))
  for (const dz of [-0.16, 0.16]) {
    kit.beam([tx + tw / 2 + 0.1, F + 0.2, tz - 0.5 + dz], [tx + tw / 2 + 0.1, cabY - 0.02, tz - 0.5 + dz], 0.045, { color: palette.metalLight, round: true })
  }
  for (let y = F + 0.4; y < cabY - 0.1; y += 0.26) {
    kit.beam([tx + tw / 2 + 0.1, y, tz - 0.66], [tx + tw / 2 + 0.1, y, tz - 0.34], 0.035, { color: palette.metalLight, round: true })
  }
  if (old) {
    kit.at([tx - 0.3, F + 1.2, tz + td / 2 + 0.01], undefined, () => rustPatch(kit, 0.3, 0.55, { dark: true }))
    kit.at([tx + tw / 2 + 0.01, F + 1.3, tz - 0.05], [0, YAW.right, 0], () => rustPatch(kit, 0.4, 0.6))
  }
  // roof kit: radar pedestal, antenna mast, and from level 2 a dish
  kit.cyl(0.14, 0.18, 0.3, { color: palette.metalDark, top: palette.metalLight, at: [tx - 0.25, roofY + 0.15, tz - 0.3], bevel: 0.04, seg: 12, mat: 'metal' })
  kit.at([tx + 0.55, roofY, tz + 0.55], undefined, () => whip(kit, old ? 0.95 : 1.25, palette.red, old ? 0.16 : 0))
  kit.at([tx + 0.62, roofY, tz - 0.65], undefined, () => whip(kit, 0.6, palette.yellow, old ? -0.1 : 0))
  if (!old) {
    kit.at([tx - 0.55, roofY, tz + 0.6], [0, -0.7, 0], () => {
      kit.cyl(0.05, 0.06, 0.3, { color: palette.metalDark, at: [0, 0.15, 0], bevel: 0.015, seg: 8 })
      kit.lathe(
        [
          [0, 0],
          [0.18, 0.03],
          [0.3, 0.1],
          [0.34, 0.17],
          [0.3, 0.13],
          [0.17, 0.06],
          [0, 0.035],
        ],
        { color: palette.creamShade, top: palette.white, at: [0, 0.34, 0.05], rot: [0.9, 0, 0], seg: 16 },
      )
    })
  }

  // ------------------------------------------------------------ yard
  // flagpole
  const px = 1.9
  const pz = 1.4
  const poleH = 3.35
  kit.cyl(0.16, 0.2, 0.16, { color: palette.concreteDark, top: palette.concrete, at: [px, F + 0.06, pz], bevel: 0.04, seg: 12 })
  kit.cyl(0.035, 0.055, poleH, { color: palette.metalDark, top: palette.metalLight, at: [px, F + poleH / 2 + 0.1, pz], bevel: 0.015, seg: 8, mat: 'metal' })
  kit.sphere(0.075, { color: palette.yellowDark, top: palette.yellow, at: [px, F + poleH + 0.15, pz], seg: 10, mat: 'gloss' })

  // cork contract board, angled towards the camera
  kit.at([-1.6, F, 1.62], [0, -0.75, 0], () => {
    for (const x of [-0.46, 0.46]) kit.beam([x, 0, 0], [x, 1.2, 0], 0.09, { color: palette.woodDark, top: palette.wood })
    kit.box(1.14, 0.78, 0.09, { color: palette.woodDark, top: palette.wood, at: [0, 0.82, 0], r: 0.035 })
    kit.box(0.98, 0.62, 0.05, { color: palette.dirt, top: palette.woodLight, at: [0, 0.82, 0.035], r: 0.02, shade: 0.05 })
    kit.box(1.3, 0.09, 0.3, { color: old ? faded(palette.red, 0.3) : palette.red, at: [0, 1.27, 0.03], rot: [0.25, 0, 0], r: 0.035 })
    const notes: [number, number, number, string][] = [
      [-0.3, 0.95, 0.12, palette.white],
      [0.02, 0.9, -0.08, palette.yellow],
      [0.32, 0.97, 0.06, palette.white],
      [-0.2, 0.67, -0.1, palette.flowerPink],
      [0.2, 0.66, 0.14, palette.sandLight],
    ]
    for (const [x, y, r, c] of notes) {
      kit.box(0.22, 0.26, 0.02, { color: c, at: [x, y, 0.07], rot: [0, 0, r], r: 0.008, shade: 0.04 })
      kit.sphere(0.026, { color: palette.red, at: [x, y + 0.09, 0.09], seg: 6 })
    }
  })
  // entrance lamp
  kit.at([0.58, F, 1.42], undefined, () => lampPost(kit, 1.25, { lit: !old, lean: old ? 0.1 : 0 }))
  if (level >= 3) kit.at([-2.15, F, 1.45], undefined, () => lampPost(kit, 1.25, { lit: true }))
  if (!old) {
    kit.at([hx - 1.02, F, fz + 0.16], undefined, () => planter(kit, 0.78, [palette.flowerOrange, palette.flowerWhite, palette.flowerPink], rnd))
    kit.at([hx + 0.98, F, fz + 0.16], undefined, () => planter(kit, 0.66, [palette.flowerYellow, palette.flowerBlue], rnd))
  }

  const group = kit.build('missionControl')

  // ------------------------------------------------------------ logo, flag, radar
  const frontLogo = logoPlate(0.7)
  frontLogo.position.set(hx, F + hh + 0.3, fz + 0.09)
  group.add(frontLogo)
  const sideLogo = logoPlate(0.58)
  sideLogo.position.set(lx - 0.085, F + 1.02, hz - 0.28)
  sideLogo.rotation.y = YAW.left
  group.add(sideLogo)

  const flag = makeFlag(1.0, 0.64, colorA ?? palette.red, logoPlate)
  flag.group.position.set(px, F + poleH + 0.06, pz)
  // faces the camera once the plot has turned the building towards the road
  flag.group.rotation.y = -0.9
  group.add(flag.group)

  const radarKit = new Kit()
  radarKit.cyl(0.05, 0.05, 0.22, { color: palette.metalDark, at: [0, 0.11, 0], bevel: 0.015, seg: 8 })
  radarKit.box(0.95, 0.34, 0.07, { color: palette.creamShade, top: palette.white, at: [0, 0.38, 0], rot: [-0.18, 0, 0], r: 0.03 })
  radarKit.box(0.95, 0.05, 0.1, { color: old ? palette.rust : palette.red, at: [0, 0.22, 0.02], r: 0.02 })
  radarKit.beam([0, 0.3, 0.02], [0, 0.42, 0.3], 0.035, { color: palette.metalDark, round: true })
  radarKit.sphere(0.05, { color: palette.red, at: [0, 0.43, 0.31], seg: 8 })
  const radar = radarKit.build('radar')
  radar.position.set(tx - 0.25, roofY + 0.28, tz - 0.3)
  group.add(radar)

  const board = new THREE.Object3D()
  board.name = 'boardAnchor'
  board.position.set(-1.6, F + 0.8, 1.62)
  group.add(board)
  const doorAnchor = new THREE.Object3D()
  doorAnchor.name = 'doorAnchor'
  doorAnchor.position.set(hx, F, fz + 0.5)
  group.add(doorAnchor)

  const data = group.userData as ModelUserData
  data.anchors = { board, door: doorAnchor, flag: flag.group }
  data.tick = (t) => {
    flag.update(t)
    radar.rotation.y = t * (old ? 0.7 : 1.1)
  }
  data.dispose = () => flag.dispose()
  return group
}
