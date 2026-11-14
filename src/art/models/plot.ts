import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { CAMERA_YAW } from '../../scene/world'
import { mix } from './common'

/**
 * Empty construction plot: a cleared dirt patch roped off with corner stakes,
 * a wooden "build here" sign (a hammer, no words) and a bobbing arrow.
 *
 * The sign turns to face the camera whatever the plot's rotation.
 * Footprint about 3.6 × 3.6.
 */
export function createPlot(_opts: ModelOptions = {}): THREE.Object3D {
  const rnd = seeded(61)
  const kit = new Kit()
  const S = 1.5 // half-size of the roped square

  // cleared ground
  kit.slab(3.5, 3.5, 0.05, 1.0, { color: palette.dirtDark, top: palette.dirt, bevel: 0.02 })
  kit.slab(3.0, 3.0, 0.03, 0.8, { color: palette.dirt, top: mix(palette.dirt, palette.sand, 0.4), at: [0, 0.04, 0], bevel: 0.012, shade: 0.02 })
  for (let i = 0; i < 6; i++) {
    const x = (rnd() - 0.5) * 2.2
    const z = (rnd() - 0.5) * 2.2
    const s = 0.3 + rnd() * 0.35
    kit.cyl(s, s, 0.012, { color: i % 2 ? palette.dirtDark : mix(palette.dirt, palette.sandLight, 0.5), at: [x, 0.072 + i * 0.004, z], scale: [1.25, 1, 0.8], rot: [0, rnd() * 3, 0], bevel: 0.004, shade: 0, seg: 12 })
  }
  // a few pebbles
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2
    const r = 0.5 + rnd() * 0.85
    kit.blob(0.06 + rnd() * 0.05, { color: palette.rockDark, top: palette.rock, at: [Math.cos(a) * r, 0.09, Math.sin(a) * r], scale: [1.2, 0.6, 1], detail: 1 })
  }

  // corner stakes with ribbons, and rope sagging between them
  const corners: V3[] = [
    [-S, 0, -S],
    [S, 0, -S],
    [S, 0, S],
    [-S, 0, S],
  ]
  corners.forEach(([x, , z], i) => {
    const lean = (rnd() - 0.5) * 0.16
    kit.beam([x, 0, z], [x + lean, 0.62, z + lean * 0.5], 0.09, { color: palette.woodDark, top: palette.woodLight })
    kit.box(0.2, 0.11, 0.02, { color: i % 2 ? palette.red : palette.yellow, at: [x + lean + 0.1, 0.56, z + lean * 0.5], rot: [0, 0.5 + i, 0.15], r: 0.008 })
  })
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const pts: V3[] = []
    for (let k = 0; k <= 6; k++) {
      const t = k / 6
      pts.push([a[0] + (b[0] - a[0]) * t, 0.48 - Math.sin(t * Math.PI) * 0.16, a[2] + (b[2] - a[2]) * t])
    }
    kit.pipe(pts, 0.022, { color: palette.sandWet, top: palette.sandLight, radial: 5, seg: 14, shade: 0.03 })
  }

  // a shovel in a dirt mound, and a stack of planks
  kit.blob(0.36, { color: palette.dirtDark, top: palette.dirt, at: [-0.85, 0.08, -0.7], scale: [1.2, 0.5, 1], detail: 2 })
  kit.beam([-0.8, 0.15, -0.68], [-0.62, 0.95, -0.82], 0.045, { color: palette.woodDark, top: palette.woodLight, round: true })
  kit.box(0.14, 0.05, 0.06, { color: palette.woodDark, at: [-0.61, 0.98, -0.83], rot: [0, 0, 0.2], r: 0.02 })
  kit.box(0.2, 0.24, 0.03, { color: palette.metalDark, top: palette.metalLight, at: [-0.83, 0.2, -0.66], rot: [0.16, 0, -0.22], r: 0.02, mat: 'metal' })
  for (let i = 0; i < 4; i++) {
    kit.box(1.0, 0.06, 0.16, {
      color: palette.wood,
      top: palette.woodLight,
      at: [0.7 + (i % 2) * 0.05, 0.1 + Math.floor(i / 2) * 0.065, -0.8 + (i % 2) * 0.18],
      rot: [0, 0.45 + (i > 1 ? 0.12 : 0), 0],
      r: 0.02,
    })
  }
  for (const [x, z, r] of [
    [0.95, 0.75, 0.3],
    [1.12, 0.6, -0.5],
    [0.98, 0.68, 1.2],
  ] as const) {
    kit.box(0.22, 0.1, 0.11, { color: palette.brick, top: mix(palette.brick, palette.white, 0.15), at: [x, 0.11 + (r > 1 ? 0.1 : 0), z], rot: [0, r, 0], r: 0.02 })
  }

  const group = kit.build('plot')

  // ------------------------------------------------------------ the sign (turns to face the camera)
  const sk = new Kit()
  for (const x of [-0.36, 0.36]) sk.beam([x, 0, 0], [x, 1.0, 0], 0.09, { color: palette.woodDark, top: palette.wood })
  sk.box(1.06, 0.72, 0.09, { color: palette.woodDark, top: palette.wood, at: [0, 1.05, 0], r: 0.05 })
  for (const side of [-1, 1]) {
    const z = side * 0.05
    sk.box(0.9, 0.56, 0.03, { color: palette.woodLight, top: palette.sandLight, at: [0, 1.05, z], r: 0.03, shade: 0.04 })
    // hammer: handle + head, tilted
    sk.at([-0.06 * side, 1.03, z + side * 0.02], [0, 0, side * 0.7], () => {
      sk.box(0.07, 0.44, 0.04, { color: palette.woodDark, top: palette.trunk, at: [0, -0.04, 0], r: 0.018 })
      sk.box(0.3, 0.13, 0.06, { color: palette.steel, top: palette.metalLight, at: [0, 0.19, 0], r: 0.03, mat: 'metal' })
      sk.box(0.06, 0.15, 0.065, { color: palette.metalDark, at: [-0.13, 0.19, 0], r: 0.015, mat: 'metal' })
    })
    // green "plus" badge in the corner
    sk.cyl(0.14, 0.14, 0.04, { color: palette.good, top: palette.leafLight, at: [0.33 * side, 1.27, z + side * 0.015], rot: [Math.PI / 2, 0, 0], bevel: 0.012, seg: 16 })
    sk.box(0.16, 0.045, 0.02, { color: palette.white, at: [0.33 * side, 1.27, z + side * 0.04], r: 0.008, shade: 0 })
    sk.box(0.045, 0.16, 0.02, { color: palette.white, at: [0.33 * side, 1.27, z + side * 0.04], r: 0.008, shade: 0 })
  }
  const sign = sk.build('plotSign')
  sign.name = 'sign'
  sign.position.set(0, 0.05, 0.25)
  group.add(sign)

  // bobbing arrow above the sign
  const ak = new Kit()
  const arrow = new THREE.Shape()
  arrow.moveTo(-0.13, 0.42)
  arrow.lineTo(0.13, 0.42)
  arrow.lineTo(0.13, 0.12)
  arrow.lineTo(0.3, 0.12)
  arrow.lineTo(0, -0.24)
  arrow.lineTo(-0.3, 0.12)
  arrow.lineTo(-0.13, 0.12)
  arrow.closePath()
  ak.extrude(arrow, 0.16, { color: palette.yellowDark, top: palette.yellow, bevel: 0.05, bevelSeg: 3, mat: 'gloss', shade: 0.14 })
  const arrowObj = ak.build('plotArrow')
  arrowObj.name = 'arrow'
  group.add(arrowObj)

  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const data = group.userData as ModelUserData
  data.anchors = { sign, arrow: arrowObj }
  data.tick = (t) => {
    // face the camera regardless of how the plot is rotated
    group.getWorldQuaternion(q)
    e.setFromQuaternion(q, 'YXZ')
    const face = CAMERA_YAW - e.y
    sign.rotation.y = face + Math.sin(t * 1.3) * 0.05
    sign.rotation.z = Math.sin(t * 1.9) * 0.025
    const bob = Math.sin(t * 2.6)
    arrowObj.position.set(0, 2.25 + bob * 0.12, 0.25)
    arrowObj.rotation.y = face + t * 1.2
    const squash = 1 + bob * 0.05
    arrowObj.scale.set(1 / squash, squash, 1 / squash)
  }
  data.tick(0, 0)
  return group
}
