import * as THREE from 'three'
import { Kit } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * Stubby, friendly rockets. One factory, three kinds:
 *  - rideshare: a little shared ride (≤ 12 kg to low orbit)
 *  - small:     the agency's own small launcher
 *  - medium:    taller, with two strap-on boosters
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
  const s = SPECS[kind]
  const body = (opts.bodyColor as string) ?? palette.cream
  const accent = (opts.accent as string) ?? s.accent
  const accentDark = (opts.accentDark as string) ?? s.accentDark
  const r = s.r
  const kit = new Kit()

  const y0 = 0.8 // top of the aft skirt
  const y1 = y0 + s.body // base of the nose
  const y2 = y1 + s.nose // tip

  // --- engine bell ---
  kit.lathe(
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
  kit.torus(r * 0.56, 0.035, { color: palette.metalDark, at: [0, 0.035, 0], mat: 'metal', tube: 8 })

  // --- aft skirt ---
  kit.lathe(
    [
      [r * 0.3, 0.42],
      [r * 0.62, 0.44],
      [r * 0.84, 0.52],
      [r * 0.97, 0.66],
      [r * 1.0, y0],
    ],
    { color: palette.navyDark, top: palette.navy, mat: 'gloss' },
  )

  // --- main body: a soft barrel, slightly fatter in the middle ---
  const mid = (y0 + y1) / 2
  const stripeH = 0.3
  const stripeY = y0 + s.body * 0.6
  kit.lathe(
    [
      [r * 1.0, y0],
      [r * 1.045, y0 + (mid - y0) * 0.5],
      [r * 1.06, mid],
      [r * 1.05, stripeY],
    ],
    { color: body, top: palette.white, mat: 'gloss', shade: 0.12 },
  )
  // stripe band, a touch proud of the hull
  kit.lathe(
    [
      [r * 1.05, stripeY],
      [r * 1.075, stripeY + 0.03],
      [r * 1.07, stripeY + stripeH - 0.03],
      [r * 1.04, stripeY + stripeH],
    ],
    { color: s.stripe === accent ? accentDark : s.stripe, top: s.stripe, mat: 'gloss', shade: 0.08 },
  )
  kit.lathe(
    [
      [r * 1.04, stripeY + stripeH],
      [r * 1.02, y1 - (y1 - stripeY - stripeH) * 0.4],
      [r * 0.99, y1],
    ],
    { color: body, top: palette.white, mat: 'gloss', shade: 0.06 },
  )

  // --- nose: a plump ogive ---
  const nose: [number, number][] = []
  const N = 9
  for (let i = 0; i <= N; i++) {
    const t = i / N
    // superellipse-ish profile: stays fat, then rounds over
    const rr = r * 0.99 * Math.pow(1 - Math.pow(t, 2.1), 0.62)
    nose.push([rr, y1 + t * s.nose])
  }
  kit.lathe(nose, { color: accentDark, top: accent, mat: 'gloss', shade: 0.18 })
  kit.sphere(0.075, { color: palette.yellow, at: [0, y2 + 0.03, 0], mat: 'gloss', seg: 10 })

  // --- trim rings ---
  kit.torus(r * 1.01, 0.04, { color: palette.metalLight, at: [0, y0, 0], mat: 'metal', tube: 8 })
  kit.torus(r * 1.0, 0.04, { color: palette.metalLight, at: [0, y1, 0], mat: 'metal', tube: 8 })

  // rivets around the base ring
  const rivets = 12
  for (let i = 0; i < rivets; i++) {
    const a = (i / rivets) * Math.PI * 2
    kit.sphere(0.028, {
      color: palette.metalLight,
      at: [Math.cos(a) * r * 1.035, y0 + 0.12, Math.sin(a) * r * 1.035],
      mat: 'metal',
      seg: 6,
    })
  }

  // --- porthole, facing three-quarters towards the camera ---
  const windowAngle = THREE.MathUtils.degToRad(24)
  const wy = y1 - 0.34
  kit.at([0, 0, 0], [0, windowAngle, 0], () => {
    const wr = r * 0.36
    kit.torus(wr, 0.055, {
      color: palette.yellowDark,
      top: palette.yellow,
      at: [0, wy, r * 0.99],
      rot: [Math.PI / 2, 0, 0],
      mat: 'gloss',
      tube: 10,
    })
    kit.sphere(wr * 0.96, {
      color: palette.glassDark,
      top: palette.glass,
      at: [0, wy, r * 0.93],
      scale: [1, 1, 0.38],
      mat: 'glass',
      seg: 14,
    })
    // a little highlight glint
    kit.sphere(wr * 0.22, {
      color: palette.white,
      at: [-wr * 0.32, wy + wr * 0.34, r * 0.93 + wr * 0.33],
      scale: [1.3, 0.8, 0.35],
      mat: 'glowSoft',
      seg: 8,
    })
    if (patched) {
      // an honest repair plate with rivets: this rocket has flown before
      const py = y0 + 0.42
      kit.box(r * 0.62, 0.34, 0.05, {
        color: palette.creamShade,
        top: palette.plaster,
        at: [r * 0.52, py, r * 0.9],
        rot: [0, 0.52, 0],
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
        kit.sphere(0.022, {
          color: palette.metal,
          at: [r * 0.52 + Math.cos(0.52) * lx, py + dy * 0.12, r * 0.9 - Math.sin(0.52) * lx + 0.028],
          mat: 'metal',
          seg: 6,
        })
      }
    }
  })

  // --- fins ---
  const fin = finShape(kind === 'rideshare' ? 0.9 : 1.18)
  for (let i = 0; i < s.fins; i++) {
    // fins flank the porthole so none points straight at the camera
    const a = windowAngle - Math.PI / 2 + Math.PI / s.fins + (i / s.fins) * Math.PI * 2
    kit.at([0, 0, 0], [0, a, 0], () => {
      kit.extrude(fin, 0.22, {
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

  // --- strap-on boosters ---
  if (s.boosters) {
    for (const side of [-1, 1]) {
      const a = windowAngle + (side > 0 ? 0 : Math.PI)
      kit.at([0, 0, 0], [0, a, 0], () => {
        const bx = r * 1.06 + 0.3
        const br = 0.29
        const bh = s.body * 0.78
        kit.lathe(
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
        kit.lathe(cone, { color: palette.blueDark, top: palette.blue, at: [bx, 0, 0], mat: 'gloss', seg: 18 })
        kit.torus(br * 1.02, 0.03, { color: palette.metalLight, at: [bx, 0.6 + bh, 0], mat: 'metal', tube: 6 })
        // struts
        kit.box(0.3, 0.09, 0.14, { color: palette.metalDark, at: [r * 1.02 + 0.08, 0.95, 0], r: 0.03, mat: 'metal' })
        kit.box(0.3, 0.09, 0.14, { color: palette.metalDark, at: [r * 1.02 + 0.08, 0.5 + bh, 0], r: 0.03, mat: 'metal' })
      })
    }
  }

  const group = kit.build(`rocket-${kind}`)

  // anchors for the logo decal and exhaust
  const logo = new THREE.Object3D()
  logo.name = 'logoAnchor'
  const la = windowAngle - THREE.MathUtils.degToRad(62)
  logo.position.set(Math.sin(la) * r * 1.07, y0 + s.body * 0.28, Math.cos(la) * r * 1.07)
  logo.rotation.y = la
  group.add(logo)
  const exhaust = new THREE.Object3D()
  exhaust.name = 'exhaustAnchor'
  group.add(exhaust)
  ;(group.userData as ModelUserData).anchors = { logo, exhaust }
  group.userData.height = y2 + 0.1
  group.userData.radius = r
  return group
}
