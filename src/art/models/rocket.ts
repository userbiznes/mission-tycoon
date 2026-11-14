import * as THREE from 'three'
import { Kit } from '../kit'
import { logoDecal } from '../logo'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * Stubby, friendly rockets. One factory, three kinds:
 *  - rideshare: a little shared ride (≤ 12 kg to low orbit)
 *  - small:     the agency's own small launcher
 *  - medium:    taller, with two strap-on boosters
 *
 * Every rocket is built as two stages (children `stageLower` and `stageUpper`)
 * so the launch can drop the first stage.
 */

export type RocketKind = 'rideshare' | 'small' | 'medium'

interface RocketSpec {
  /** body radius */
  r: number
  /** length of the straight body between skirt and nose */
  body: number
  /** nose length */
  nose: number
  accent: string
  accentDark: string
  stripe: string
  fins: number
  boosters: boolean
}

const SPECS: Record<RocketKind, RocketSpec> = {
  rideshare: {
    r: 0.52,
    body: 1.45,
    nose: 1.1,
    accent: palette.teal,
    accentDark: palette.tealDark,
    stripe: palette.yellow,
    fins: 3,
    boosters: false,
  },
  small: {
    r: 0.7,
    body: 2.05,
    nose: 1.45,
    accent: palette.red,
    accentDark: palette.redDark,
    stripe: palette.red,
    fins: 3,
    boosters: false,
  },
  medium: {
    r: 0.74,
    body: 2.75,
    nose: 1.5,
    accent: palette.orange,
    accentDark: palette.orangeDark,
    stripe: palette.blue,
    fins: 4,
    boosters: true,
  },
}

/** Height of each rocket kind from engine bell to nose tip. */
export function rocketHeight(kind: RocketKind): number {
  const s = SPECS[kind]
  return 0.8 + s.body + s.nose + 0.06
}

function finShape(scale: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 1.2 * scale)
  s.quadraticCurveTo(0.4 * scale, 0.98 * scale, 0.64 * scale, 0.1 * scale)
  s.quadraticCurveTo(0.7 * scale, -0.12 * scale, 0.5 * scale, -0.04 * scale)
  s.quadraticCurveTo(0.22 * scale, 0.1 * scale, 0, 0.26 * scale)
  s.closePath()
  return s
}

export function createRocket(opts: ModelOptions = {}): THREE.Object3D {
  const kind = (opts.kind as RocketKind) ?? 'small'
  const patched = opts.patched !== false
  const s = SPECS[kind] ?? SPECS.small
  const body = (opts.bodyColor as string) ?? palette.cream
  const accent = (opts.accent as string) ?? s.accent
  const accentDark = (opts.accentDark as string) ?? s.accentDark
  const r = s.r
  const lower = new Kit()
  const upper = new Kit()

  const y0 = 0.8 // top of the aft skirt
  const y1 = y0 + s.body // base of the nose
  const y2 = y1 + s.nose // tip
  const mid = (y0 + y1) / 2
  const stripeH = 0.3
  const stripeY = y0 + s.body * 0.6 // the stages part here
  const windowAngle = THREE.MathUtils.degToRad(24)

  // =========================================================== first stage
  // engine bell
  lower.lathe(
    [
      [0.0, 0.03],
      [r * 0.5, 0.0],
      [r * 0.58, 0.03],
      [r * 0.54, 0.1],
      [r * 0.4, 0.3],
      [r * 0.3, 0.46],
      [r * 0.34, 0.5],
    ],
    { color: palette.soot, top: palette.steel, mat: 'metal', shade: 0.1 },
  )
  lower.torus(r * 0.56, 0.035, { color: palette.metalDark, at: [0, 0.035, 0], mat: 'metal', tube: 8 })
  // aft skirt
  lower.lathe(
    [
      [r * 0.3, 0.42],
      [r * 0.62, 0.44],
      [r * 0.84, 0.52],
      [r * 0.97, 0.66],
      [r * 1.0, y0],
    ],
    { color: palette.navyDark, top: palette.navy, mat: 'gloss' },
  )
  // main barrel, slightly fatter in the middle
  lower.lathe(
    [
      [r * 1.0, y0],
      [r * 1.045, y0 + (mid - y0) * 0.5],
      [r * 1.06, mid],
      [r * 1.05, stripeY],
      [r * 0.6, stripeY + 0.02],
    ],
    { color: body, top: palette.white, mat: 'gloss', shade: 0.12 },
  )
  lower.torus(r * 1.01, 0.04, { color: palette.metalLight, at: [0, y0, 0], mat: 'metal', tube: 8 })
  const rivets = 12
  for (let i = 0; i < rivets; i++) {
    const a = (i / rivets) * Math.PI * 2
    lower.sphere(0.028, {
      color: palette.metalLight,
      at: [Math.cos(a) * r * 1.035, y0 + 0.12, Math.sin(a) * r * 1.035],
      mat: 'metal',
      seg: 6,
    })
  }
  if (patched) {
    // an honest repair plate with rivets: this rocket has flown before
    lower.at([0, 0, 0], [0, windowAngle, 0], () => {
      const py = y0 + 0.42
      lower.box(r * 0.62, 0.34, 0.05, {
        color: palette.creamShade,
        top: palette.plaster,
        at: [r * 0.78, py, r * 0.7],
        rot: [0, 0.84, 0],
        r: 0.025,
        mat: 'gloss',
      })
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const lx = dx * r * 0.24
        lower.sphere(0.022, {
          color: palette.metal,
          at: [r * 0.78 + Math.cos(0.84) * lx + 0.02, py + dy * 0.12, r * 0.7 - Math.sin(0.84) * lx + 0.02],
          mat: 'metal',
          seg: 6,
        })
      }
    })
  }
  // fins flank the porthole so none points straight at the camera
  const fin = finShape(kind === 'rideshare' ? 0.9 : 1.18)
  for (let i = 0; i < s.fins; i++) {
    const a = windowAngle - Math.PI / 2 + Math.PI / s.fins + (i / s.fins) * Math.PI * 2
    lower.at([0, 0, 0], [0, a, 0], () => {
      lower.extrude(fin, 0.22, {
        color: accentDark,
        top: accent,
        at: [r * 0.88, 0.3, 0],
        bevel: 0.085,
        bevelSeg: 4,
        mat: 'gloss',
        shade: 0.2,
      })
    })
  }
  // strap-on boosters
  if (s.boosters) {
    for (const side of [-1, 1]) {
      const a = windowAngle + (side > 0 ? 0 : Math.PI)
      lower.at([0, 0, 0], [0, a, 0], () => {
        const bx = r * 1.06 + 0.3
        const br = 0.29
        const bh = Math.min(s.body * 0.78, stripeY - 0.75)
        lower.lathe(
          [
            [0.0, 0.14],
            [br * 0.62, 0.12],
            [br * 0.74, 0.18],
            [br * 0.5, 0.42],
            [br * 0.9, 0.5],
            [br, 0.62],
            [br, 0.6 + bh],
          ],
          { color: palette.creamShade, top: palette.white, at: [bx, 0, 0], mat: 'gloss', seg: 18 },
        )
        const cone: [number, number][] = []
        for (let i = 0; i <= 7; i++) {
          const t = i / 7
          cone.push([br * Math.pow(1 - Math.pow(t, 2), 0.6), 0.6 + bh + t * 0.62])
        }
        lower.lathe(cone, { color: palette.blueDark, top: palette.blue, at: [bx, 0, 0], mat: 'gloss', seg: 18 })
        lower.torus(br * 1.02, 0.03, { color: palette.metalLight, at: [bx, 0.6 + bh, 0], mat: 'metal', tube: 6 })
        lower.box(0.3, 0.09, 0.14, { color: palette.metalDark, at: [r * 1.02 + 0.08, 0.95, 0], r: 0.03, mat: 'metal' })
        lower.box(0.3, 0.09, 0.14, { color: palette.metalDark, at: [r * 1.02 + 0.08, 0.5 + bh, 0], r: 0.03, mat: 'metal' })
      })
    }
  }

  // =========================================================== second stage
  // small vacuum engine, hidden inside the interstage until the stages part
  upper.lathe(
    [
      [0.0, stripeY - 0.3],
      [r * 0.42, stripeY - 0.34],
      [r * 0.46, stripeY - 0.3],
      [r * 0.22, stripeY + 0.02],
    ],
    { color: palette.soot, top: palette.steel, mat: 'metal', shade: 0.1, seg: 16 },
  )
  // stripe band, a touch proud of the hull
  upper.lathe(
    [
      [r * 0.4, stripeY],
      [r * 1.05, stripeY],
      [r * 1.075, stripeY + 0.03],
      [r * 1.07, stripeY + stripeH - 0.03],
      [r * 1.04, stripeY + stripeH],
    ],
    { color: s.stripe === accent ? accentDark : s.stripe, top: s.stripe, mat: 'gloss', shade: 0.08 },
  )
  upper.lathe(
    [
      [r * 1.04, stripeY + stripeH],
      [r * 1.02, y1 - (y1 - stripeY - stripeH) * 0.4],
      [r * 0.99, y1],
    ],
    { color: body, top: palette.white, mat: 'gloss', shade: 0.06 },
  )
  // nose: a plump ogive
  const nose: [number, number][] = []
  const N = 9
  for (let i = 0; i <= N; i++) {
    const t = i / N
    nose.push([r * 0.99 * Math.pow(1 - Math.pow(t, 2.1), 0.62), y1 + t * s.nose])
  }
  upper.lathe(nose, { color: accentDark, top: accent, mat: 'gloss', shade: 0.18 })
  upper.sphere(0.075, { color: palette.yellow, at: [0, y2 + 0.03, 0], mat: 'gloss', seg: 10 })
  upper.torus(r * 1.0, 0.04, { color: palette.metalLight, at: [0, y1, 0], mat: 'metal', tube: 8 })
  // porthole, facing three-quarters towards the camera
  const wy = y1 - 0.34
  upper.at([0, 0, 0], [0, windowAngle, 0], () => {
    const wr = r * 0.36
    upper.torus(wr, 0.055, {
      color: palette.yellowDark,
      top: palette.yellow,
      at: [0, wy, r * 0.99],
      rot: [Math.PI / 2, 0, 0],
      mat: 'gloss',
      tube: 10,
    })
    upper.sphere(wr * 0.96, {
      color: palette.glassDark,
      top: palette.glass,
      at: [0, wy, r * 0.93],
      scale: [1, 1, 0.38],
      mat: 'glass',
      seg: 14,
    })
    upper.sphere(wr * 0.22, {
      color: palette.white,
      at: [-wr * 0.32, wy + wr * 0.34, r * 0.93 + wr * 0.33],
      scale: [1.3, 0.8, 0.35],
      mat: 'glowSoft',
      seg: 8,
    })
  })

  const group = new THREE.Group()
  group.name = `rocket-${kind}`
  const stageLower = lower.build('stageLower')
  const stageUpper = upper.build('stageUpper')
  group.add(stageLower, stageUpper)

  // agency logo on the first stage, on the sunny side
  const la = windowAngle - THREE.MathUtils.degToRad(8)
  const logo = logoDecal(r * 1.068, r * 0.86)
  logo.position.set(0, y0 + (stripeY - y0) * 0.6, 0)
  logo.rotation.y = la
  stageLower.add(logo)

  const exhaust = new THREE.Object3D()
  exhaust.name = 'exhaustAnchor'
  stageLower.add(exhaust)
  const exhaustUpper = new THREE.Object3D()
  exhaustUpper.name = 'exhaustUpperAnchor'
  exhaustUpper.position.y = stripeY - 0.34
  stageUpper.add(exhaustUpper)

  ;(group.userData as ModelUserData).anchors = { logo, exhaust, exhaustUpper, stageLower, stageUpper }
  group.userData.height = y2 + 0.1
  group.userData.radius = r
  group.userData.stageY = stripeY
  return group
}
