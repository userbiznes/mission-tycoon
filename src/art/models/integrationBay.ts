import * as THREE from 'three'
import { Kit, seeded } from '../kit'
import { palette } from '../palette'
import { logoPlate } from '../logo'
import type { ModelOptions, ModelUserData } from '../registry'
import {
  YAW,
  acUnit,
  archShape,
  barrel,
  cracks,
  crate,
  dolly,
  door,
  faded,
  foundation,
  miniSatellite,
  readOpts,
  roofVent,
  rustPatch,
  vaultRoof,
  weed,
  win,
} from './common'

/**
 * Integration Bay: a barrel-roofed hangar where satellites are put together.
 * Big roll-up door with a satellite waiting inside, a crane beam over the
 * door, rails and a dolly out front.
 *
 * `userData.setDoor(open01)` rolls the door (0 closed, 1 open).
 * Level 1: faded roof with rusty and lifted panels, worn hazard paint.
 * Level 2+: fresh paint, skylights, door lights. Level 3: a clean-room annex.
 * Front door on +Z. Footprint about 4.6 × 5.0.
 */
export function createIntegrationBay(opts: ModelOptions = {}): THREE.Object3D {
  const { level, colorA } = readOpts(opts)
  const old = level <= 1
  const rnd = seeded(41)
  const kit = new Kit()
  const F = 0.16

  const wall = old ? faded(palette.creamShade, 0.25) : palette.creamShade
  const wallTop = old ? palette.plaster : palette.white
  const roofA: [string, string] = old ? [faded(palette.tealDark, 0.45), faded(palette.roofTeal, 0.4)] : [palette.tealDark, palette.roofTeal]
  const roofB: [string, string] = old ? [faded(palette.tealDark, 0.55), faded(palette.teal, 0.5)] : [palette.tealDark, palette.teal]
  const frame = old ? palette.cream : palette.white
  const trim = colorA ?? palette.orange

  foundation(kit, 4.5, 5.0, { r: 0.6, z: -0.05 })
  if (old) {
    cracks(kit, rnd, 7, 2.1, F + 0.03, (x, z) => z > 0.9 || Math.abs(x) > 1.85)
    weed(kit, [1.95, F, 1.6], rnd)
    weed(kit, [-1.9, F, 2.1], rnd, 1.1)
    weed(kit, [2.0, F, -1.2], rnd)
  }

  // ------------------------------------------------------------ hall
  const W = 3.5
  const H = 1.36
  const zBack = -2.3
  const zFront = 0.82
  const zCav = 0.28 // back of the door cavity
  const doorW = 2.16
  const doorH = 1.2
  const doorX = -0.31
  const dL = doorX - doorW / 2
  const dR = doorX + doorW / 2
  // back body
  kit.box(W, H, zCav - zBack, { color: wall, top: wallTop, at: [0, F + H / 2, (zCav + zBack) / 2], r: 0.1 })
  // front frame around the door cavity
  kit.box(dL + W / 2, H, zFront - zCav + 0.1, { color: wall, top: wallTop, at: [(-W / 2 + dL) / 2, F + H / 2, (zFront + zCav) / 2 - 0.05], r: 0.08 })
  kit.box(W / 2 - dR, H, zFront - zCav + 0.1, { color: wall, top: wallTop, at: [(W / 2 + dR) / 2, F + H / 2, (zFront + zCav) / 2 - 0.05], r: 0.08 })
  kit.box(doorW + 0.1, H - doorH, zFront - zCav + 0.1, { color: wall, top: wallTop, at: [doorX, F + doorH + (H - doorH) / 2, (zFront + zCav) / 2 - 0.05], r: 0.05 })
  // dark interior
  kit.box(doorW + 0.06, doorH + 0.04, 0.05, { color: palette.navyDark, top: palette.navy, at: [doorX, F + doorH / 2, zCav + 0.02], r: 0.01, shade: 0.2 })
  kit.box(W + 0.08, 0.24, zFront - zBack + 0.08, { color: palette.concreteDark, top: palette.concrete, at: [0, F + 0.07, (zFront + zBack) / 2], r: 0.06 })
  kit.box(doorW, 0.2, zFront - zCav, { color: palette.concrete, top: palette.concreteLight, at: [doorX, F + 0.02, (zFront + zCav) / 2 + 0.02], r: 0.02, shade: 0.03 })
  // the satellite on its stand, waiting inside
  kit.at([doorX, F + 0.1, zCav + 0.3], [0, 0.5, 0], () => {
    kit.cyl(0.2, 0.26, 0.1, { color: palette.steel, top: palette.metalDark, at: [0, 0.05, 0], bevel: 0.03, seg: 12 })
    kit.cyl(0.05, 0.05, 0.22, { color: palette.metalLight, at: [0, 0.2, 0], bevel: 0.015, seg: 8 })
    kit.at([0, 0.3, 0], undefined, () => miniSatellite(kit, 1.15))
  })

  // gable arch over the walls, roof panels on top
  const a = W / 2 + 0.03
  const b = 1.08
  kit.extrude(archShape(a - 0.05, (b - 0.05) / (a - 0.05)), zFront - zBack - 0.04, {
    color: wallTop,
    top: wallTop,
    at: [0, F + H - 0.03, (zFront + zBack) / 2],
    bevel: 0.035,
    shade: 0.05,
  })
  kit.at([0, F + H, (zFront + zBack) / 2], undefined, () =>
    vaultRoof(
      kit,
      a,
      b,
      zFront - zBack + 0.56,
      (i) => {
        if (old && (i === 2 || i === 6)) return [palette.rustDark, palette.rust]
        return i % 2 ? roofA : roofB
      },
      { panels: 9, thick: 0.17, lift: (i) => (old && i === 6 ? 0.07 : 0) },
    ),
  )
  // eave gutters
  for (const s of [-1, 1]) {
    kit.box(0.2, 0.16, zFront - zBack + 0.6, { color: old ? faded(palette.tealDark, 0.4) : palette.tealDark, top: roofA[1], at: [s * (a + 0.08), F + H + 0.02, (zFront + zBack) / 2], r: 0.06 })
  }
  // ridge vents
  for (const z of [-1.6, -0.5]) kit.at([0, F + H + b + 0.12, z], undefined, () => roofVent(kit, 1.15))
  if (!old) {
    // skylights on the sunny side
    for (const z of [-1.7, -0.75, 0.2]) {
      const t = Math.PI * 0.72
      const px = a * Math.cos(t)
      const py = b * Math.sin(t)
      const ang = Math.atan2(b * Math.cos(t), -a * Math.sin(t))
      kit.box(0.5, 0.06, 0.56, { color: palette.white, at: [px * 1.1, F + H + py * 1.12 + 0.08, z], rot: [0, 0, ang], r: 0.025, shade: 0.03 })
      kit.box(0.4, 0.07, 0.46, { color: palette.glassDark, top: palette.glass, at: [px * 1.1, F + H + py * 1.12 + 0.085, z], rot: [0, 0, ang], r: 0.02, mat: 'glass' })
    }
  } else {
    // one rusty bloom and a patch on the vault
    const t = Math.PI * 0.6
    kit.at([a * Math.cos(t) * 1.12, F + H + b * Math.sin(t) * 1.14 + 0.1, 0.1], [0, 0, Math.atan2(b * Math.cos(t), -a * Math.sin(t))], () =>
      kit.at([0, 0, 0], [-Math.PI / 2, 0, 0], () => rustPatch(kit, 0.5, 0.6, { dark: true })),
    )
  }

  // ------------------------------------------------------------ front details
  // hazard posts either side of the big door
  for (const x of [dL - 0.02, dR + 0.02]) {
    for (let i = 0; i < 5; i++) {
      kit.box(0.17, doorH / 5 + 0.005, 0.1, {
        color: i % 2 ? palette.hazardDark : old ? faded(palette.hazard, 0.25) : palette.hazard,
        at: [x, F + (doorH / 5) * (i + 0.5), zFront + 0.04],
        r: 0.03,
        shade: 0.04,
      })
    }
  }
  kit.box(doorW + 0.34, 0.12, 0.14, { color: palette.steel, top: palette.metalDark, at: [doorX, F + doorH + 0.05, zFront + 0.05], r: 0.04 })
  // crane beam and hook over the door
  kit.box(0.2, 0.2, 1.25, { color: palette.yellowDark, top: palette.yellow, at: [doorX, F + H + 0.42, zFront + 0.38], r: 0.05 })
  kit.box(0.3, 0.12, 0.2, { color: palette.steel, top: palette.metalDark, at: [doorX, F + H + 0.3, zFront + 0.78], r: 0.04 })
  kit.beam([doorX, F + H + 0.26, zFront + 0.78], [doorX, F + H - 0.1, zFront + 0.78], 0.03, { color: palette.steel, round: true })
  kit.torus(0.055, 0.02, { color: palette.steel, at: [doorX, F + H - 0.16, zFront + 0.78], rot: [Math.PI / 2, 0, 0], tube: 5, seg: 10, arc: Math.PI * 1.5 })
  // sign board in the gable
  kit.cyl(0.36, 0.36, 0.08, { color: palette.woodDark, top: palette.woodLight, at: [doorX + 1.0, F + H + 0.42, zFront + 0.02], rot: [Math.PI / 2, 0, 0], bevel: 0.03, seg: 22 })
  // staff door and a porthole on the right of the front
  const sideX = (W / 2 + dR) / 2 + 0.06
  kit.at([sideX, F, zFront + 0.05], undefined, () => door(kit, 0.4, 0.86, old ? faded(trim, 0.3) : trim, old ? faded(trim, 0.15) : trim, { frame, porthole: true }))
  if (!old) {
    for (const x of [dL + 0.3, dR - 0.3]) {
      kit.box(0.2, 0.1, 0.12, { color: palette.steel, at: [x, F + H - 0.02, zFront + 0.08], r: 0.03 })
      kit.box(0.14, 0.05, 0.08, { color: palette.lampWarm, top: palette.lampHot, at: [x, F + H - 0.085, zFront + 0.09], r: 0.015, mat: 'glow', shade: 0 })
    }
  }

  // ------------------------------------------------------------ side walls: tall clean-room windows
  for (const z of [-1.75, -0.95, -0.15]) {
    kit.at([W / 2, F + 0.72, z], [0, YAW.right, 0], () => win(kit, 0.42, 0.78, { frame, cross: true, glow: !old && z === -0.95 ? palette.screenGlow : false, boarded: old && z === -1.75 }))
    kit.at([-W / 2, F + 0.72, z], [0, YAW.left, 0], () => win(kit, 0.42, 0.78, { frame, cross: true }))
  }
  // gas bottles and an AC unit by the side wall
  kit.at([W / 2 + 0.24, F, 0.45], undefined, () => {
    kit.capsule(0.1, 0.42, { color: palette.blueDark, top: palette.blue, at: [0, 0.34, 0], seg: 10 })
    kit.capsule(0.1, 0.36, { color: old ? palette.rust : palette.green, top: old ? palette.rustLight : palette.leafLight, at: [0.04, 0.3, 0.25], seg: 10 })
    kit.box(0.34, 0.06, 0.55, { color: palette.steel, at: [-0.02, 0.36, 0.12], r: 0.02 })
  })
  kit.at([W / 2 + 0.3, F, -2.0], [0, YAW.right, 0], () => acUnit(kit))
  if (old) kit.at([W / 2 + 0.01, F + 0.9, -0.55], [0, YAW.right, 0], () => rustPatch(kit, 0.28, 0.5, { dark: true }))

  if (level >= 3) {
    // clean-room annex with its own stack
    kit.box(0.9, 1.0, 1.6, { color: palette.creamShade, top: palette.white, at: [-W / 2 - 0.4, F + 0.5, -1.3], r: 0.1 })
    kit.box(1.06, 0.14, 1.76, { color: palette.tealDark, top: palette.roofTeal, at: [-W / 2 - 0.4, F + 1.05, -1.3], r: 0.06 })
    kit.cyl(0.13, 0.15, 1.3, { color: palette.metalDark, top: palette.metalLight, at: [-W / 2 - 0.45, F + 1.7, -1.8], bevel: 0.03, seg: 12, mat: 'metal' })
  }

  // ------------------------------------------------------------ rails, dolly and clutter out front
  for (const x of [doorX - 0.36, doorX + 0.36]) {
    kit.box(0.07, 0.06, 1.85, { color: palette.steel, top: palette.metalLight, at: [x, F + 0.05, zFront + 0.82], r: 0.02, mat: 'metal' })
  }
  for (let i = 0; i < 6; i++) {
    kit.box(1.04, 0.045, 0.14, { color: palette.woodDark, top: palette.wood, at: [doorX, F + 0.02, zFront + 0.12 + i * 0.3], r: 0.015, shade: 0.04 })
  }
  kit.at([doorX, F - 0.02, zFront + 1.22], undefined, () => {
    dolly(kit, 0.86, 0.9)
    crate(kit, [-0.12, 0.245, -0.08], 0.4, 0.15, palette.red)
    crate(kit, [0.24, 0.245, 0.2], 0.24, -0.4)
  })
  crate(kit, [1.75, F, 1.55], 0.44, 0.35)
  crate(kit, [1.82, F + 0.44, 1.5], 0.3, -0.2)
  barrel(kit, [1.3, F, 1.75], old ? palette.rustDark : palette.yellowDark, old ? palette.rust : palette.yellow)
  for (const [x, z] of [
    [dL - 0.5, 2.15],
    [dR + 0.5, 2.15],
  ]) {
    kit.cyl(0.075, 0.09, 0.42, { color: palette.hazardDark, top: palette.hazard, at: [x, F + 0.21, z], bevel: 0.03, seg: 10 })
  }

  const group = kit.build('integrationBay')

  // ------------------------------------------------------------ logo + roll-up door
  const logo = logoPlate(0.62)
  logo.position.set(doorX + 1.0, F + H + 0.42, zFront + 0.075)
  group.add(logo)

  const dk = new Kit()
  const slats = 7
  for (let i = 0; i < slats; i++) {
    const dented = old && i === 4
    dk.box(doorW - 0.04, doorH / slats + 0.012, 0.07, {
      color: dented ? palette.rust : palette.metal,
      top: dented ? palette.rustLight : palette.metalLight,
      at: [0, -(doorH / slats) * (i + 0.5), 0],
      r: 0.028,
      mat: 'metal',
      shade: 0.1,
    })
  }
  dk.box(doorW, 0.1, 0.1, { color: palette.hazard, at: [0, -doorH + 0.03, 0.01], r: 0.03 })
  const doorMesh = dk.build('rollDoor')
  doorMesh.name = 'rollDoor'
  doorMesh.position.set(doorX, F + doorH + 0.01, zFront - 0.06)
  group.add(doorMesh)

  let open = 0.42
  let shown = open
  const apply = () => doorMesh.scale.set(1, Math.max(0.06, 1 - shown * 0.94), 1)
  apply()
  const doorAnchor = new THREE.Object3D()
  doorAnchor.name = 'doorAnchor'
  doorAnchor.position.set(doorX, F, zFront + 0.6)
  group.add(doorAnchor)

  const data = group.userData as ModelUserData & { setDoor: (o: number) => void }
  data.setDoor = (o: number) => {
    open = THREE.MathUtils.clamp(o, 0, 1)
  }
  data.anchors = { door: doorAnchor, rollDoor: doorMesh }
  data.tick = (_t, dt) => {
    if (Math.abs(open - shown) > 0.001) {
      shown += (open - shown) * Math.min(1, dt * 4)
      apply()
    }
  }
  return group
}
