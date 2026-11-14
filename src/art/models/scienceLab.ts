import * as THREE from 'three'
import { Kit, seeded } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { YAW, dishBowl, door, foundation, lampPost, planter, readOpts, roofVent, screenWindow, whip, win } from './common'

/**
 * Science Lab: turns raw data into maps. A crisp white lab with a wall of
 * screens, a big tiled "map" mural, rooftop solar panels and an observatory
 * dome whose telescope slowly scans the sky.
 *
 * Built by the player, so level 1 is brand new. Level 2 adds a rooftop dish
 * and lamps; level 3 a glass annex.
 * `userData.setBusy(on)` makes the screens' status lamp pulse faster.
 * Front door on +Z. Footprint about 4.2 × 4.0.
 */
export function createScienceLab(opts: ModelOptions = {}): THREE.Object3D {
  const { level, colorA } = readOpts(opts)
  const rnd = seeded(71)
  const kit = new Kit()
  const F = 0.16
  const trim = colorA ?? palette.teal
  const frame = palette.white

  foundation(kit, 4.2, 4.0, { r: 0.7, z: -0.05 })

  // ------------------------------------------------------------ lab block
  const bx = -0.45
  const bz = -0.2
  const bw = 2.5
  const bh = 1.5
  const bd = 2.2
  kit.box(bw, bh, bd, { color: palette.creamShade, top: palette.white, at: [bx, F + bh / 2, bz], r: 0.12 })
  kit.box(bw + 0.08, 0.24, bd + 0.08, { color: palette.tealDark, top: trim, at: [bx, F + 0.12, bz], r: 0.06 })
  // roof: chunky slab with a coloured band
  kit.box(bw + 0.4, 0.14, bd + 0.4, { color: palette.tealDark, top: palette.roofTeal, at: [bx, F + bh + 0.04, bz], r: 0.07 })
  kit.box(bw + 0.2, 0.12, bd + 0.2, { color: palette.creamShade, top: palette.white, at: [bx, F + bh + 0.15, bz], r: 0.05, shade: 0.04 })
  const roofY = F + bh + 0.21
  // rooftop solar panels, tipped towards the sun
  for (const [x, z] of [
    [bx - 0.7, bz - 0.5],
    [bx - 0.7, bz + 0.35],
    [bx + 0.05, bz - 0.5],
  ]) {
    kit.at([x, roofY, z], [0, 0, 0.3], () => {
      kit.box(0.6, 0.05, 0.7, { color: palette.navyDark, top: palette.blueDark, at: [0, 0.16, 0], r: 0.02, mat: 'gloss' })
      kit.box(0.02, 0.055, 0.7, { color: palette.metalLight, at: [0, 0.165, 0], r: 0.005, shade: 0 })
      kit.box(0.6, 0.055, 0.02, { color: palette.metalLight, at: [0, 0.165, 0], r: 0.005, shade: 0 })
      kit.box(0.08, 0.16, 0.5, { color: palette.steel, at: [0.12, 0.06, 0], r: 0.02 })
    })
  }
  kit.at([bx + 0.2, roofY, bz + 0.55], undefined, () => roofVent(kit, 1.0))
  kit.at([bx + 0.85, roofY, bz + 0.8], undefined, () => whip(kit, 0.9, palette.red))

  // front: a wall of screens and the door
  const fz = bz + bd / 2
  kit.at([bx - 0.3, F + 0.86, fz], undefined, () =>
    screenWindow(kit, 1.36, 0.72, { frame, colors: [palette.screenGlow, palette.beaconGreen, palette.lampWarm, palette.flowerPink] }),
  )
  kit.at([bx + 0.85, F, fz], undefined, () => door(kit, 0.42, 0.9, palette.tealDark, trim, { frame, porthole: true }))
  kit.box(0.7, 0.07, 0.34, { color: palette.tealDark, top: trim, at: [bx + 0.85, F + 1.1, fz + 0.16], r: 0.03 })
  kit.at([bx - 0.3, F, fz + 0.16], undefined, () => planter(kit, 1.3, [palette.flowerBlue, palette.flowerWhite, palette.flowerPink], rnd))

  // sunny side wall (−X): the big map mural, Level 3 style: the world on a grid
  const lx = bx - bw / 2
  kit.at([lx, F + 0.84, bz], [0, YAW.left, 0], () => {
    kit.box(1.56, 0.98, 0.08, { color: palette.woodDark, top: palette.wood, at: [0, 0, 0.02], r: 0.04 })
    const cols = 6
    const rows = 4
    const map = ['oogggo', 'ogggso', 'oggfgo', 'oosggo']
    const colour: Record<string, [string, string]> = {
      o: [palette.blueDark, palette.blue],
      g: [palette.leafDark, palette.leafLight],
      s: [palette.sandWet, palette.sandLight],
      f: [palette.red, palette.orange],
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = map[r][c]
        kit.box(0.215, 0.195, 0.04, {
          color: colour[k][0],
          top: colour[k][1],
          at: [-0.6 + c * 0.24, 0.33 - r * 0.22, 0.07],
          r: 0.03,
          mat: k === 'f' ? 'glowSoft' : 'matte',
          shade: 0.1,
        })
      }
    }
  })
  kit.at([lx, F + 0.75, bz - 0.95], [0, YAW.left, 0], () => win(kit, 0.24, 0.7, { frame, sill: false }))
  kit.at([lx, F + 0.75, bz + 0.95], [0, YAW.left, 0], () => win(kit, 0.24, 0.7, { frame, sill: false }))

  // ------------------------------------------------------------ observatory tower
  const tx = 1.2
  const tz = -0.6
  const tr = 0.74
  const th = 2.0
  kit.cyl(tr, tr + 0.05, th, { color: palette.creamShade, top: palette.white, at: [tx, F + th / 2, tz], bevel: 0.08, seg: 26 })
  kit.torus(tr + 0.02, 0.07, { color: palette.tealDark, top: trim, at: [tx, F + th - 0.02, tz], tube: 8, seg: 26 })
  kit.torus(tr + 0.04, 0.05, { color: palette.tealDark, top: trim, at: [tx, F + 0.3, tz], tube: 8, seg: 26 })
  // porthole windows winding up the tower
  for (const [a, y] of [
    [0.2, 0.8],
    [0.75, 1.3],
    [-0.5, 1.25],
    [-1.05, 0.75],
  ]) {
    kit.at([tx + Math.sin(a) * tr, F + y, tz + Math.cos(a) * tr], [0, a, 0], () => {
      kit.torus(0.14, 0.04, { color: palette.white, rot: [Math.PI / 2, 0, 0], tube: 6, seg: 14 })
      kit.cyl(0.13, 0.13, 0.04, { color: palette.glassDark, top: palette.glass, at: [0, 0, 0.0], rot: [Math.PI / 2, 0, 0], bevel: 0.01, seg: 12, mat: 'glass' })
    })
  }

  // ------------------------------------------------------------ yard
  kit.at([0.25, F, 1.5], undefined, () => lampPost(kit, 1.2, { lit: true, color: palette.tealDark }))
  if (level >= 2) {
    kit.at([-1.75, F, 1.55], undefined, () => lampPost(kit, 1.2, { lit: true, color: palette.tealDark }))
    kit.at([bx + 0.75, roofY, bz - 0.55], [0, -0.9, 0], () => {
      kit.cyl(0.05, 0.07, 0.3, { color: palette.metalDark, at: [0, 0.15, 0], bevel: 0.015, seg: 8 })
      kit.at([0, 0.36, 0], [0.8, 0, 0], () => dishBowl(kit, 0.4, 0.13, { rim: trim, feed: trim }))
    })
  }
  if (level >= 3) {
    // glass annex: a little greenhouse of instruments
    kit.box(1.5, 0.75, 1.0, { color: palette.glassDark, top: palette.glass, at: [1.25, F + 0.375, 0.95], r: 0.08, mat: 'glass' })
    kit.box(1.6, 0.1, 1.1, { color: palette.white, at: [1.25, F + 0.78, 0.95], r: 0.04 })
    for (const x of [0.52, 1.25, 1.98]) kit.box(0.07, 0.78, 1.04, { color: palette.white, at: [x, F + 0.39, 0.95], r: 0.025 })
  }
  // sample crates and a soil-sensor stake by the door
  kit.box(0.34, 0.26, 0.3, { color: palette.creamShade, top: palette.white, at: [1.0, F + 0.13, 1.45], rot: [0, 0.3, 0], r: 0.04 })
  kit.box(0.36, 0.05, 0.32, { color: palette.tealDark, top: trim, at: [1.0, F + 0.275, 1.45], rot: [0, 0.3, 0], r: 0.02 })

  const group = kit.build('scienceLab')

  // ------------------------------------------------------------ dome (turns slowly)
  const dk = new Kit()
  const R = tr + 0.1
  const prof: [number, number][] = []
  for (let i = 0; i <= 9; i++) {
    const a = (i / 9) * (Math.PI / 2)
    prof.push([Math.cos(a) * R, Math.sin(a) * R * 0.95])
  }
  dk.lathe(prof, { color: palette.metal, top: palette.white, seg: 28, mat: 'gloss', shade: 0.14 })
  dk.torus(R, 0.06, { color: palette.tealDark, top: trim, tube: 8, seg: 28 })
  // observing slit: dark strips up the meridian facing +Z
  for (let i = 0; i < 6; i++) {
    const a = 0.12 + (i / 5) * 1.3
    dk.box(0.36, 0.3, 0.05, {
      color: palette.navyDark,
      at: [0, Math.sin(a) * R * 0.955, Math.cos(a) * R * 1.005],
      rot: [-(Math.PI / 2 - a), 0, 0],
      r: 0.02,
      shade: 0,
    })
  }
  // telescope peeking out
  dk.cyl(0.13, 0.15, 0.75, { color: palette.creamShade, top: palette.white, at: [0, 0.6, 0.5], rot: [0.85, 0, 0], bevel: 0.03, seg: 14, mat: 'gloss' })
  dk.cyl(0.165, 0.165, 0.12, { color: palette.tealDark, top: trim, at: [0, 0.82, 0.75], rot: [0.85, 0, 0], bevel: 0.03, seg: 14 })
  dk.cyl(0.11, 0.11, 0.03, { color: palette.glassDark, top: palette.glass, at: [0, 0.865, 0.8], rot: [0.85, 0, 0], bevel: 0.008, seg: 12, mat: 'glass' })
  const dome = dk.build('dome')
  dome.name = 'dome'
  dome.position.set(tx, F + th, tz)
  group.add(dome)

  // status lamp over the door
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: palette.beaconGreen, toneMapped: false }))
  lamp.position.set(bx + 0.85, F + 1.22, fz + 0.3)
  group.add(lamp)
  const tint = new THREE.Color(palette.beaconGreen)

  let busy = false
  const data = group.userData as ModelUserData & { setBusy: (on: boolean) => void }
  data.setBusy = (on: boolean) => {
    busy = on
  }
  data.anchors = { dome, lamp }
  data.tick = (t) => {
    // the slit faces the camera once the plot has turned the lab towards the road
    dome.rotation.y = -0.9 + Math.sin(t * 0.13) * 0.55
    const pulse = 0.6 + 0.4 * Math.sin(t * (busy ? 7 : 1.6))
    ;(lamp.material as THREE.MeshBasicMaterial).color.copy(tint).multiplyScalar(0.7 + pulse * (busy ? 1.6 : 0.7))
  }
  data.dispose = () => (lamp.material as THREE.Material).dispose()
  return group
}
