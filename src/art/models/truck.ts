import * as THREE from 'three'
import { Kit } from '../kit'
import { palette } from '../palette'
import { logoPlate } from '../logo'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * Delivery truck: a chunky cab and a cargo box carrying the agency logo.
 * Front faces +Z; about 1.85 long, 0.95 wide, 1.2 tall.
 *
 * `userData.setSpeed(unitsPerSecond)` spins the wheels and adds a little bounce;
 * the four wheels live in the child group `wheels`.
 */
export function createTruck(opts: ModelOptions = {}): THREE.Object3D {
  const cab = (opts.colorA as string | undefined) ?? palette.orange
  const cabDark = (opts.colorA as string | undefined) ?? palette.orangeDark
  const kit = new Kit()
  const WR = 0.19

  // chassis
  kit.box(0.74, 0.12, 1.74, { color: palette.steel, top: palette.metalDark, at: [0, 0.26, 0], r: 0.04 })
  // cargo box
  kit.box(0.94, 0.86, 1.12, { color: palette.creamShade, top: palette.white, at: [0, 0.76, -0.34], r: 0.1 })
  kit.box(0.96, 0.14, 1.14, { color: cabDark, top: cab, at: [0, 0.44, -0.34], r: 0.05, shade: 0.06 })
  // roll door and step at the back
  kit.box(0.7, 0.62, 0.04, { color: palette.metal, top: palette.metalLight, at: [0, 0.8, -0.905], r: 0.02, mat: 'metal' })
  for (let i = 0; i < 4; i++) kit.box(0.7, 0.012, 0.045, { color: palette.metalDark, at: [0, 0.58 + i * 0.15, -0.905], r: 0.004, shade: 0 })
  kit.box(0.8, 0.06, 0.14, { color: palette.steel, at: [0, 0.3, -0.94], r: 0.02 })
  for (const sx of [-1, 1]) kit.box(0.09, 0.07, 0.03, { color: palette.red, at: [sx * 0.36, 0.42, -0.915], r: 0.012, mat: 'glowSoft', shade: 0 })
  // cab
  kit.box(0.88, 0.62, 0.62, { color: cabDark, top: cab, at: [0, 0.6, 0.55], r: 0.15, mat: 'gloss' })
  kit.box(0.7, 0.3, 0.06, { color: palette.glassDark, top: palette.glass, at: [0, 0.72, 0.835], rot: [-0.14, 0, 0], r: 0.04, mat: 'glass' })
  for (const sx of [-1, 1]) {
    kit.box(0.05, 0.24, 0.3, { color: palette.glassDark, top: palette.glass, at: [sx * 0.425, 0.73, 0.56], r: 0.03, mat: 'glass' })
    // mirror, headlight
    kit.box(0.07, 0.11, 0.04, { color: palette.steel, at: [sx * 0.5, 0.72, 0.78], r: 0.015 })
    kit.cyl(0.065, 0.065, 0.04, { color: palette.lampWarm, top: palette.lampHot, at: [sx * 0.3, 0.44, 0.862], rot: [Math.PI / 2, 0, 0], bevel: 0.012, seg: 10, mat: 'glowSoft', shade: 0 })
    // wheel arches
    kit.box(0.08, 0.1, 0.5, { color: cabDark, at: [sx * 0.45, 0.42, 0.52], r: 0.03 })
    kit.box(0.06, 0.08, 0.5, { color: palette.steel, at: [sx * 0.46, 0.42, -0.5], r: 0.03 })
  }
  // grille, bumper, roof light
  kit.box(0.34, 0.12, 0.03, { color: palette.steel, at: [0, 0.45, 0.862], r: 0.012 })
  kit.box(0.92, 0.1, 0.12, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.3, 0.86], r: 0.04, mat: 'metal' })
  kit.box(0.3, 0.06, 0.12, { color: palette.yellow, at: [0, 0.93, 0.5], r: 0.025, mat: 'glowSoft', shade: 0.05 })

  const body = kit.build('truckBody')
  const group = new THREE.Group()
  group.name = 'truck'
  group.add(body)

  // logo on both sides of the box
  for (const sx of [-1, 1]) {
    const plate = logoPlate(0.56)
    plate.position.set(sx * 0.476, 0.86, -0.34)
    plate.rotation.y = sx * (Math.PI / 2)
    body.add(plate)
  }

  // wheels: separate so they can spin
  const wk = new Kit()
  wk.cyl(WR, WR, 0.15, { color: palette.rubber, rot: [0, 0, Math.PI / 2], bevel: 0.05, seg: 16, shade: 0.05 })
  wk.cyl(0.1, 0.1, 0.17, { color: palette.metalDark, top: palette.metalLight, rot: [0, 0, Math.PI / 2], bevel: 0.02, seg: 10, mat: 'metal' })
  // a bolt off-centre so the spin reads
  wk.box(0.18, 0.05, 0.05, { color: palette.metalLight, at: [0, 0.05, 0], r: 0.015, mat: 'metal' })
  const wheelProto = wk.build('wheel')
  const wheels = new THREE.Group()
  wheels.name = 'wheels'
  const wheelList: THREE.Object3D[] = []
  for (const [x, z] of [
    [-0.4, 0.52],
    [0.4, 0.52],
    [-0.4, -0.5],
    [0.4, -0.5],
  ]) {
    const w = wheelProto.clone()
    w.position.set(x, WR, z)
    wheels.add(w)
    wheelList.push(w)
  }
  group.add(wheels)

  let speed = 0
  let roll = 0
  const data = group.userData as ModelUserData & { setSpeed: (v: number) => void }
  data.setSpeed = (v: number) => {
    speed = v
  }
  data.anchors = { wheels, body }
  data.tick = (t, dt) => {
    roll += (speed / WR) * dt
    for (const w of wheelList) w.rotation.x = roll
    const moving = Math.min(1, Math.abs(speed) / 2)
    // cargo bounce while driving, a gentle idle shudder when parked
    body.position.y = Math.abs(Math.sin(t * 13)) * 0.018 * moving + Math.sin(t * 30) * 0.003 * (1 - moving)
    body.rotation.x = Math.sin(t * 9) * 0.012 * moving
  }
  return group
}
