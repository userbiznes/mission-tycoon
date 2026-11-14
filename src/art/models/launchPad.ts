import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../kit'
import { palette } from '../palette'
import { materials } from '../materials'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * Launch Pad. Level 1 is the old pad: rust on the tower, cracked concrete,
 * weeds, a patched hut roof and one tilted light mast. Higher levels get fresh
 * paint, more lights and extra tankage.
 *
 * Origin: centre of the apron at ground level. The rocket stands on
 * `anchors.rocket`.
 */

export const PAD_SIZE = 6.4
/** Height of the launch table top where the rocket sits. */
export const PAD_TABLE_Y = 0.74

export function createLaunchPad(opts: ModelOptions = {}): THREE.Object3D {
  const level = (opts.level as number) ?? 1
  const old = level <= 1
  const rnd = seeded(11)
  const kit = new Kit()

  const paint = old ? palette.rust : palette.red
  const paintTop = palette.red
  const paintDark = old ? palette.rustDark : palette.redDark
  const brace = old ? palette.rustLight : palette.orange

  // ------------------------------------------------------------ apron
  kit.slab(PAD_SIZE, PAD_SIZE, 0.2, 1.25, { color: palette.concreteDark, top: palette.concrete, bevel: 0.06 })
  kit.slab(PAD_SIZE - 0.5, PAD_SIZE - 0.5, 0.03, 1.05, {
    color: palette.concrete,
    top: palette.concreteLight,
    at: [0, 0.195, 0],
    bevel: 0.012,
    shade: 0.02,
  })
  // painted safety circle
  {
    const ring = new THREE.RingGeometry(2.2, 2.36, 56)
    ring.rotateX(-Math.PI / 2)
    kit.add(ring, { color: old ? palette.yellowDark : palette.yellow, at: [0, 0.232, 0], shade: 0 })
  }
  if (old) {
    // cracks: short wandering dark segments
    for (let c = 0; c < 7; c++) {
      let x = (rnd() - 0.5) * 4.8
      let z = (rnd() - 0.5) * 4.8
      let a = rnd() * Math.PI
      const segs = 2 + Math.floor(rnd() * 3)
      for (let i = 0; i < segs; i++) {
        const len = 0.25 + rnd() * 0.35
        if (Math.hypot(x, z) > 1.75 && Math.abs(x) < 2.9 && Math.abs(z) < 2.9) {
          kit.box(len, 0.02, 0.035, {
            color: palette.concreteDark,
            at: [x, 0.228, z],
            rot: [0, a, 0],
            r: 0.009,
            shade: 0,
          })
        }
        x += Math.cos(a) * len * 0.92
        z -= Math.sin(a) * len * 0.92
        a += (rnd() - 0.5) * 1.5
      }
      // a weed that found the crack
      if (c % 2 === 0 && Math.hypot(x, z) > 1.9 && Math.abs(x) < 2.8 && Math.abs(z) < 2.8) weed(kit, [x, 0.22, z], rnd)
    }
    // stained patches of older concrete
    for (const [x, z, s] of [
      [-2.0, 1.0, 0.7],
      [1.3, 2.3, 0.55],
      [2.3, -0.9, 0.5],
    ] as const) {
      kit.cyl(s, s, 0.012, {
        color: palette.concreteDark,
        top: palette.concrete,
        at: [x, 0.229, z],
        scale: [1, 1, 0.7],
        bevel: 0.005,
        shade: 0,
        seg: 14,
      })
    }
  }

  // ------------------------------------------------------------ launch table
  kit.cyl(1.52, 1.62, 0.54, { color: palette.concreteDark, top: palette.concrete, at: [0, 0.2 + 0.27, 0], bevel: 0.1, seg: 36 })
  kit.cyl(1.3, 1.3, 0.05, { color: palette.concreteLight, at: [0, PAD_TABLE_Y - 0.02, 0], bevel: 0.02, seg: 36, shade: 0.03 })
  // chunky hazard blocks around the rim
  const blocks = 22
  for (let i = 0; i < blocks; i++) {
    const a = (i / blocks) * Math.PI * 2
    kit.box(0.34, 0.09, 0.2, {
      color: i % 2 ? palette.hazardDark : palette.hazard,
      at: [Math.cos(a) * 1.38, PAD_TABLE_Y + 0.01, Math.sin(a) * 1.38],
      rot: [0, -a + Math.PI / 2, 0],
      r: 0.035,
      shade: 0.05,
    })
  }
  // flame hole with a steel collar and soot
  kit.cyl(0.74, 0.74, 0.06, { color: palette.soot, at: [0, PAD_TABLE_Y + 0.01, 0], bevel: 0.02, shade: 0 })
  kit.torus(0.76, 0.07, { color: palette.steel, top: palette.metalDark, at: [0, PAD_TABLE_Y + 0.04, 0], mat: 'metal' })
  // hold-down posts
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2
    const px = Math.cos(a) * 1.02
    const pz = Math.sin(a) * 1.02
    kit.box(0.24, 0.62, 0.24, { color: palette.steel, top: palette.metal, at: [px, PAD_TABLE_Y + 0.3, pz], rot: [0, -a, 0], r: 0.06, mat: 'metal' })
    kit.box(0.34, 0.12, 0.18, {
      color: palette.yellowDark,
      top: palette.yellow,
      at: [Math.cos(a) * 0.86, PAD_TABLE_Y + 0.6, Math.sin(a) * 0.86],
      rot: [0, -a, 0],
      r: 0.04,
    })
  }
  // steps up to the table (lit side)
  for (let i = 0; i < 3; i++) {
    kit.box(0.8, 0.18 * (3 - i), 0.26, {
      color: palette.concreteDark,
      top: palette.concreteLight,
      at: [-0.2, 0.2 + 0.09 * (3 - i), 1.66 + i * 0.24],
      r: 0.04,
    })
  }

  // ------------------------------------------------------------ flame trench
  kit.box(1.75, 0.03, 0.84, { color: palette.soot, at: [2.32, 0.225, 0], r: 0.012, shade: 0 })
  for (const z of [-0.52, 0.52]) {
    kit.box(1.8, 0.24, 0.2, { color: palette.concreteDark, top: palette.concreteLight, at: [2.32, 0.31, z], r: 0.06 })
  }
  // deflector ramp at the end
  kit.box(0.5, 0.12, 0.86, { color: paintDark, top: paint, at: [2.98, 0.4, 0], rot: [0, 0, 0.62], r: 0.04 })
  // scorch marks
  for (const [x, z, s] of [
    [1.75, 0.0, 0.5],
    [1.2, 1.15, 0.32],
    [-1.3, -1.25, 0.36],
  ] as const) {
    kit.cyl(s, s, 0.01, { color: palette.soot, at: [x, 0.231, z], scale: [1.2, 1, 0.8], bevel: 0.004, shade: 0, seg: 14 })
  }

  // ------------------------------------------------------------ service tower
  const tx = -1.82
  const tz = -0.3
  const half = 0.46
  const levels = 5
  const levelH = 1.12
  const tBase = 0.2
  const tTop = tBase + levels * levelH
  kit.at([tx, 0, tz], undefined, () => {
    // footing
    kit.box(1.36, 0.16, 1.36, { color: palette.concreteDark, top: palette.concrete, at: [0, tBase + 0.06, 0], r: 0.05 })
    // corner posts: rust creeping up from the bottom into the old red paint
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        kit.box(0.15, tTop - tBase, 0.15, {
          color: paint,
          top: paintTop,
          at: [sx * half, (tTop + tBase) / 2, sz * half],
          r: 0.05,
          shade: 0.1,
        })
      }
    for (let l = 0; l <= levels; l++) {
      const y = tBase + l * levelH
      // ring beams
      for (const s of [-1, 1]) {
        kit.box(half * 2 + 0.13, 0.11, 0.11, { color: paintDark, top: paint, at: [0, y, s * half], r: 0.04 })
        kit.box(0.11, 0.11, half * 2 + 0.13, { color: paintDark, top: paint, at: [s * half, y, 0], r: 0.04 })
      }
      if (l === levels) break
      // zig-zag bracing on all four faces
      const flip = l % 2 === 0 ? 1 : -1
      const y0 = y + 0.06
      const y1 = y + levelH - 0.06
      const faces: [V3, V3][] = [
        [[-half * flip, y0, half], [half * flip, y1, half]],
        [[half * flip, y0, -half], [-half * flip, y1, -half]],
        [[half, y0, half * flip], [half, y1, -half * flip]],
        [[-half, y0, -half * flip], [-half, y1, half * flip]],
      ]
      for (const [a, b] of faces) kit.beam(a, b, 0.065, { color: brace, round: true, shade: 0.05 })
    }
    // work platforms with railings, and swing arms reaching for the rocket
    for (const y of [tBase + 2 * levelH, tBase + 3 * levelH]) {
      kit.box(1.3, 0.08, 1.3, { color: palette.metalDark, top: palette.metal, at: [0, y + 0.08, 0], r: 0.03, mat: 'metal' })
      kit.box(0.92, 0.09, 0.36, { color: palette.metalDark, top: palette.metal, at: [0.98, y + 0.08, 0.3], r: 0.035, mat: 'metal' })
      // arm railing
      for (const dz of [-0.16, 0.16]) {
        kit.beam([0.56, y + 0.12, 0.3 + dz], [0.56, y + 0.46, 0.3 + dz], 0.045, { color: palette.yellow, round: true })
        kit.beam([1.36, y + 0.12, 0.3 + dz], [1.36, y + 0.46, 0.3 + dz], 0.045, { color: palette.yellow, round: true })
        kit.beam([0.56, y + 0.46, 0.3 + dz], [1.36, y + 0.46, 0.3 + dz], 0.045, { color: palette.yellow, round: true })
      }
      // cradle that hugs the rocket (open towards the pad's sunny side)
      kit.torus(0.84, 0.06, {
        color: palette.yellowDark,
        top: palette.yellow,
        at: [-tx, y + 0.1, -tz],
        rot: [0, THREE.MathUtils.degToRad(-85), 0],
        arc: THREE.MathUtils.degToRad(190),
        tube: 8,
      })
    }
    // ladder on the sunny face
    kit.beam([-0.16, tBase + 0.1, half + 0.1], [-0.16, tTop, half + 0.1], 0.045, { color: palette.metalLight, round: true })
    kit.beam([0.16, tBase + 0.1, half + 0.1], [0.16, tTop, half + 0.1], 0.045, { color: palette.metalLight, round: true })
    for (let y = tBase + 0.3; y < tTop - 0.1; y += 0.27) {
      kit.beam([-0.16, y, half + 0.1], [0.16, y, half + 0.1], 0.035, { color: palette.metalLight, round: true })
    }
    // crow's-nest cabin with a chunky roof
    kit.box(1.3, 0.62, 1.3, { color: palette.creamShade, top: palette.cream, at: [0, tTop + 0.36, 0], r: 0.12 })
    kit.box(1.02, 0.26, 0.05, { color: palette.glassDark, top: palette.glass, at: [0, tTop + 0.42, 0.65], r: 0.02, mat: 'glass' })
    kit.box(0.05, 0.26, 1.02, { color: palette.glassDark, top: palette.glass, at: [0.65, tTop + 0.42, 0], r: 0.02, mat: 'glass' })
    kit.box(1.56, 0.16, 1.56, { color: paintDark, top: old ? palette.rustLight : palette.red, at: [0, tTop + 0.74, 0], r: 0.07 })
    if (old) {
      // mismatched roof patch
      kit.box(0.6, 0.05, 0.5, { color: palette.metal, top: palette.metalLight, at: [0.32, tTop + 0.83, 0.38], rot: [0, 0.2, 0], r: 0.02 })
    }
    // crane jib over the rocket
    kit.beam([0.3, tTop + 0.95, 0], [1.95, tTop + 0.95, 0.3], 0.12, { color: palette.yellowDark, top: palette.yellow })
    kit.beam([0.3, tTop + 0.95, 0], [0.3, tTop + 1.5, 0], 0.1, { color: palette.yellowDark, top: palette.yellow })
    kit.beam([0.3, tTop + 1.5, 0], [1.9, tTop + 1.0, 0.29], 0.04, { color: palette.steel, round: true })
    kit.beam([1.82, tTop + 0.9, 0.28], [1.82, tTop + 0.52, 0.28], 0.03, { color: palette.steel, round: true })
    kit.sphere(0.07, { color: palette.steel, at: [1.82, tTop + 0.48, 0.28], seg: 8, mat: 'metal' })
    // lightning mast
    kit.beam([-0.3, tTop + 0.8, -0.3], [-0.3, tTop + 2.0, -0.3], 0.06, { color: palette.metalLight, round: true })
  })

  // ------------------------------------------------------------ oxidiser sphere
  const sx = -2.05
  const sz = 2.05
  kit.at([sx, 0, sz], undefined, () => {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2
      kit.beam([Math.cos(a) * 0.62, 0.2, Math.sin(a) * 0.62], [Math.cos(a) * 0.4, 0.85, Math.sin(a) * 0.4], 0.11, {
        color: palette.metalDark,
        top: palette.metal,
      })
    }
    kit.sphere(0.74, { color: palette.creamShade, top: palette.white, at: [0, 1.22, 0], seg: 28, mat: 'gloss', shade: 0.2 })
    kit.torus(0.745, 0.05, { color: old ? palette.rust : palette.blueDark, top: old ? palette.rustLight : palette.blue, at: [0, 1.22, 0] })
    kit.cyl(0.14, 0.16, 0.2, { color: palette.metalDark, top: palette.metalLight, at: [0, 2.0, 0], bevel: 0.04, mat: 'metal', seg: 14 })
    kit.torus(0.12, 0.03, { color: palette.red, at: [0, 2.16, 0], tube: 6, seg: 14 })
    if (old) {
      // rust streaks under the band
      for (const [a, len] of [
        [0.5, 0.36],
        [1.5, 0.24],
        [2.1, 0.3],
      ]) {
        kit.sphere(0.1, {
          color: palette.rust,
          top: palette.rustLight,
          at: [Math.sin(a) * 0.7, 1.22 - len * 0.55, Math.cos(a) * 0.7],
          scale: [0.9, len * 5, 0.35],
          rot: [0, a, 0],
          seg: 8,
          shade: 0.05,
        })
      }
    }
  })
  // feed line from the sphere to the table, with a valve wheel
  kit.pipe(
    [
      [sx + 0.2, 0.55, sz - 0.5],
      [sx + 0.3, 0.33, sz - 0.85],
      [sx + 0.7, 0.33, sz - 1.25],
      [-1.0, 0.33, 0.95],
      [-0.95, 0.5, 0.85],
    ],
    0.075,
    { color: palette.tealDark, top: palette.teal, tension: 0.2 },
  )
  kit.torus(0.13, 0.03, { color: palette.red, at: [sx + 0.72, 0.5, sz - 1.27], tube: 6, seg: 14 })
  kit.cyl(0.03, 0.03, 0.16, { color: palette.steel, at: [sx + 0.72, 0.43, sz - 1.27], bevel: 0.01, seg: 8 })

  // ------------------------------------------------------------ fuel tank (horizontal)
  kit.at([2.0, 0, 2.2], [0, -0.18, 0], () => {
    for (const x of [-0.42, 0.42]) {
      kit.box(0.2, 0.36, 0.78, { color: palette.concreteDark, top: palette.concrete, at: [x, 0.36, 0], r: 0.05 })
    }
    kit.capsule(0.42, 0.95, {
      color: old ? palette.orangeDark : palette.orange,
      top: palette.orange,
      at: [0, 0.82, 0],
      rot: [0, 0, Math.PI / 2],
      mat: 'gloss',
      shade: 0.2,
    })
    for (const x of [-0.42, 0.42]) {
      kit.torus(0.43, 0.04, { color: palette.creamShade, top: palette.white, at: [x, 0.82, 0], rot: [0, 0, Math.PI / 2], tube: 8 })
    }
    kit.cyl(0.09, 0.1, 0.16, { color: palette.metalDark, top: palette.metalLight, at: [0, 1.28, 0], bevel: 0.03, mat: 'metal', seg: 12 })
    if (old) {
      kit.sphere(0.2, { color: palette.rust, top: palette.rustLight, at: [0.1, 0.98, 0.37], scale: [1.4, 0.9, 0.25], seg: 8, shade: 0.05 })
      kit.sphere(0.12, { color: palette.rustDark, at: [-0.5, 0.7, 0.36], scale: [1.2, 1.0, 0.25], seg: 8, shade: 0.05 })
    }
  })
  kit.pipe(
    [
      [1.75, 0.5, 1.85],
      [1.5, 0.33, 1.6],
      [1.15, 0.33, 1.2],
      [0.95, 0.5, 0.98],
    ],
    0.065,
    { color: palette.yellowDark, top: palette.yellow, tension: 0.2 },
  )

  // ------------------------------------------------------------ pad hut
  kit.at([1.55, 0.2, -2.3], undefined, () => {
    kit.box(1.3, 0.86, 1.0, { color: palette.creamShade, top: palette.cream, at: [0, 0.43, 0], r: 0.1 })
    // door + window on the sunny face
    kit.box(0.3, 0.56, 0.05, { color: palette.tealDark, top: palette.teal, at: [-0.3, 0.3, 0.5], r: 0.03 })
    kit.sphere(0.03, { color: palette.yellow, at: [-0.21, 0.3, 0.53], seg: 6, mat: 'metal' })
    kit.box(0.46, 0.34, 0.06, { color: palette.white, at: [0.26, 0.5, 0.5], r: 0.03 })
    kit.box(0.36, 0.24, 0.07, { color: palette.glassDark, top: palette.glass, at: [0.26, 0.5, 0.51], r: 0.02, mat: 'glass' })
    kit.box(0.06, 0.34, 0.46, { color: palette.white, at: [0.65, 0.5, 0.05], r: 0.03 })
    kit.box(0.07, 0.24, 0.36, { color: palette.glassDark, top: palette.glass, at: [0.66, 0.5, 0.05], r: 0.02, mat: 'glass' })
    // roof: two slabs that don't quite match
    kit.box(1.52, 0.16, 1.22, { color: paintDark, top: old ? palette.rustLight : palette.roofRed, at: [0, 0.93, 0], rot: [0.07, 0, 0], r: 0.07 })
    if (old) kit.box(0.5, 0.06, 0.6, { color: palette.metalDark, top: palette.metalLight, at: [-0.3, 1.02, -0.1], rot: [0.07, 0.15, 0], r: 0.02 })
    // tiny whip antenna
    kit.beam([0.5, 1.0, -0.3], [0.5, 1.75, -0.3], 0.035, { color: palette.metalLight, round: true })
    kit.sphere(0.05, { color: palette.red, at: [0.5, 1.78, -0.3], seg: 8 })
  })

  // ------------------------------------------------------------ floodlight masts
  const lampHeads: THREE.Vector3[] = []
  const mast = (x: number, z: number, h: number, tilt: number, aim: number) => {
    kit.at([x, 0.2, z], [0, 0, tilt], () => {
      kit.cyl(0.2, 0.24, 0.16, { color: palette.concreteDark, top: palette.concrete, at: [0, 0.08, 0], bevel: 0.04, seg: 12 })
      kit.cyl(0.055, 0.085, h, { color: paint, top: palette.metalLight, at: [0, h / 2 + 0.1, 0], bevel: 0.02, seg: 10 })
      kit.at([0, h + 0.1, 0], [0, aim, 0], () => {
        kit.box(0.7, 0.07, 0.1, { color: palette.steel, at: [0, 0, 0], r: 0.03 })
        for (const dx of [-0.2, 0.2]) {
          kit.box(0.3, 0.26, 0.2, { color: palette.steel, top: palette.metalDark, at: [dx, 0.1, 0.03], rot: [0.5, 0, 0], r: 0.05 })
          kit.box(0.22, 0.18, 0.04, { color: palette.lampWarm, top: palette.lampHot, at: [dx, 0.065, 0.125], rot: [0.5, 0, 0], r: 0.015, mat: 'glow', shade: 0 })
        }
      })
    })
    lampHeads.push(new THREE.Vector3(x, h + 0.4, z))
  }
  mast(-2.75, -2.65, 3.3, old ? 0.07 : 0, Math.atan2(2.75, 2.65))
  mast(2.8, -2.8, 2.9, old ? -0.03 : 0, Math.atan2(-2.8, 2.8))
  if (level >= 2) mast(-2.85, 2.9, 2.6, 0, Math.atan2(2.85, -2.9))

  // ------------------------------------------------------------ clutter: crates, barrels, bollards
  crate(kit, [0.75, 0.2, 2.72], 0.42, 0.2)
  crate(kit, [1.05, 0.2, 2.3], 0.34, -0.3)
  barrel(kit, [-0.55, 0.2, 2.75], palette.blueDark, palette.blue)
  barrel(kit, [-2.75, 0.2, 0.85], old ? palette.rustDark : palette.tealDark, old ? palette.rust : palette.teal)
  barrel(kit, [-2.45, 0.2, 0.55], palette.yellowDark, palette.yellow)
  for (const [x, z] of [
    [2.95, 0.95],
    [2.95, -0.95],
    [-0.9, 2.95],
    [0.5, 2.95],
  ]) {
    kit.cyl(0.075, 0.09, 0.42, { color: palette.hazardDark, top: palette.hazard, at: [x, 0.41, z], bevel: 0.03, seg: 10 })
  }

  const group = kit.build('launchPad')

  // ------------------------------------------------------------ animated bits
  // beacon on the lightning mast
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), beaconMaterial())
  beacon.position.set(tx - 0.3, tTop + 2.05, tz - 0.3)
  group.add(beacon)

  // wind sock
  const sock = makeWindSock()
  sock.position.set(2.85, 0.2, 2.8)
  group.add(sock)
  const sockArm = sock.getObjectByName('sockArm')!

  // steam puffs from the table vents
  const steam = makeSteam([
    [0.95, PAD_TABLE_Y - 0.1, -1.0],
    [-0.7, PAD_TABLE_Y - 0.1, 1.2],
    [1.55, 0.3, 0.0],
  ])
  group.add(steam.object)

  const rocketAnchor = new THREE.Object3D()
  rocketAnchor.position.set(0, PAD_TABLE_Y + 0.06, 0)
  rocketAnchor.name = 'rocketAnchor'
  group.add(rocketAnchor)

  const data = group.userData as ModelUserData
  data.anchors = { rocket: rocketAnchor }
  data.tick = (t, dt) => {
    const blink = 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.4))
    beacon.scale.setScalar(0.75 + blink * 0.45)
    ;(beacon.material as THREE.MeshBasicMaterial).color.copy(_beaconTint).multiplyScalar(0.75 + blink * 1.5)
    sockArm.rotation.y = Math.sin(t * 0.7) * 0.28 + Math.sin(t * 1.9) * 0.08
    sockArm.rotation.z = -0.12 + Math.sin(t * 2.3) * 0.06
    steam.update(t, dt)
  }
  data.dispose = () => {
    ;(beacon.material as THREE.Material).dispose()
    steam.dispose()
  }
  group.userData.lampHeads = lampHeads
  return group
}

const _beaconTint = new THREE.Color(palette.beaconRed)
function beaconMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: palette.beaconRed, toneMapped: false })
}

function weed(kit: Kit, at: V3, rnd: () => number) {
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2
    kit.cone(0.045, 0.2 + rnd() * 0.1, {
      color: palette.leafDark,
      top: palette.leafLight,
      at: [at[0] + Math.cos(a) * 0.05, at[1] + 0.1, at[2] + Math.sin(a) * 0.05],
      rot: [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35],
      seg: 5,
    })
  }
}

export function crate(kit: Kit, at: V3, size: number, rotY: number) {
  kit.at(at, [0, rotY, 0], () => {
    kit.box(size, size, size, { color: palette.woodDark, top: palette.wood, at: [0, size / 2, 0], r: size * 0.08 })
    const t = size * 0.14
    for (const y of [t * 0.9, size - t * 0.9]) {
      kit.box(size * 1.05, t, size * 1.05, { color: palette.wood, top: palette.woodLight, at: [0, y, 0], r: t * 0.3, shade: 0.06 })
    }
  })
}

export function barrel(kit: Kit, at: V3, dark: string, light: string) {
  kit.at(at, undefined, () => {
    kit.cyl(0.17, 0.17, 0.44, { color: dark, top: light, at: [0, 0.22, 0], bevel: 0.05, seg: 14 })
    kit.torus(0.172, 0.022, { color: palette.metalLight, at: [0, 0.14, 0], tube: 6, seg: 14 })
    kit.torus(0.172, 0.022, { color: palette.metalLight, at: [0, 0.31, 0], tube: 6, seg: 14 })
  })
}

function makeWindSock(): THREE.Group {
  const g = new THREE.Group()
  const pole = new Kit()
  pole.cyl(0.14, 0.17, 0.12, { color: palette.concreteDark, top: palette.concrete, at: [0, 0.06, 0], bevel: 0.03, seg: 10 })
  pole.cyl(0.04, 0.055, 2.1, { color: palette.metalDark, top: palette.metalLight, at: [0, 1.1, 0], bevel: 0.02, seg: 8 })
  pole.sphere(0.07, { color: palette.red, at: [0, 2.18, 0], seg: 8 })
  g.add(pole.build('sockPole'))

  const arm = new Kit()
  arm.torus(0.17, 0.025, { color: palette.metalLight, at: [0.1, 0, 0], rot: [0, 0, Math.PI / 2], tube: 6, seg: 14 })
  const stripes = [palette.orange, palette.white, palette.orange, palette.white, palette.orange]
  let x = 0.1
  let r = 0.17
  stripes.forEach((c, i) => {
    const len = 0.2
    const r2 = r - 0.024
    const cone = new THREE.CylinderGeometry(r2, r, len, 12, 1, true)
    cone.rotateZ(-Math.PI / 2)
    arm.add(cone, { color: c, at: [x + len / 2, -i * 0.012, 0], shade: 0.08 })
    x += len
    r = r2
  })
  const armGroup = arm.build('sockArm')
  armGroup.name = 'sockArm'
  armGroup.position.set(0, 1.95, 0)
  armGroup.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      // the sock is an open tube: draw both sides
      m.material = sockMaterial
    }
  })
  g.add(armGroup)
  return g
}

const sockMaterial = (materials.matte as THREE.MeshStandardMaterial).clone()
sockMaterial.side = THREE.DoubleSide
sockMaterial.onBeforeCompile = (materials.matte as THREE.MeshStandardMaterial).onBeforeCompile
sockMaterial.customProgramCacheKey = () => 'rim-sock'

/** Chunky cartoon steam: a small pool of white puffs that rise, swell and shrink away. */
function makeSteam(vents: V3[]) {
  const perVent = 5
  const count = vents.length * perVent
  const geo = new THREE.IcosahedronGeometry(0.2, 1)
  const mat = new THREE.MeshStandardMaterial({
    color: palette.steam,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(palette.steam),
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.92,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.frustumCulled = false
  const dummy = new THREE.Object3D()
  const phase = new Float32Array(count)
  const rnd = seeded(5)
  for (let i = 0; i < count; i++) phase[i] = rnd()
  const update = (t: number) => {
    for (let i = 0; i < count; i++) {
      const v = vents[Math.floor(i / perVent)]
      const life = (t * 0.22 + phase[i] + (i % perVent) / perVent) % 1
      const sway = Math.sin(t * 0.9 + i * 1.7) * 0.12
      dummy.position.set(v[0] + sway * life + life * 0.25, v[1] + life * 1.25, v[2] + Math.cos(i * 2.3) * 0.1 * life)
      // swell fast, then melt away
      const s = Math.sin(Math.min(1, life * 1.9) * Math.PI * 0.5) * (1 - Math.pow(life, 3)) * (0.55 + phase[i] * 0.5)
      dummy.scale.setScalar(Math.max(0.0001, s))
      dummy.rotation.set(i, t * 0.3 + i, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  update(0)
  return {
    object: mesh,
    update: (t: number, _dt: number) => update(t),
    dispose: () => {
      geo.dispose()
      mat.dispose()
    },
  }
}
