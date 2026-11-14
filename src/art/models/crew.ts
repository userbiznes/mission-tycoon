import * as THREE from 'three'
import { Kit } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * Tiny crew member, about 0.78 tall: capsule body, big head, stubby limbs.
 * All crew are original adult characters.
 *
 *  - `opts.role`: 'builder' (hard hat + hi-vis vest), 'engineer' (overalls + cap),
 *    'scientist' (lab coat + glasses)
 *  - `opts.skin`: 0–2, `opts.variant`: 0–3 changes hair and small details
 *  - `userData.setWalk(phase | null)`: pass a growing phase (radians) to walk,
 *    null to stand and idle. Faces +Z.
 */
export type CrewRole = 'builder' | 'engineer' | 'scientist'

export function createCrew(opts: ModelOptions = {}): THREE.Object3D {
  const role = ((opts.role as CrewRole) ?? 'builder') as CrewRole
  const skinIdx = Math.max(0, Math.min(2, Number(opts.skin ?? 0)))
  const variant = Number(opts.variant ?? 0)
  const skin = [palette.skinA, palette.skinB, palette.skinC][skinIdx]
  const hair = variant % 2 ? palette.hairGrey : palette.hairDark
  const accent = (opts.colorA as string | undefined) ?? palette.red

  const suit = role === 'scientist' ? palette.labCoat : role === 'builder' ? palette.vest : palette.overalls
  const suitDark = role === 'scientist' ? palette.creamShade : role === 'builder' ? palette.orangeDark : palette.blueDark
  const legs = role === 'scientist' ? palette.navy : palette.navyDark

  const root = new THREE.Group()
  root.name = 'crew'
  const body = new THREE.Group()
  root.add(body)

  // ---- torso + head (one merged mesh)
  const k = new Kit()
  k.capsule(0.15, 0.14, { color: suitDark, top: suit, at: [0, 0.34, 0], seg: 14, shade: 0.12 })
  if (role === 'builder') {
    // hi-vis stripes
    k.torus(0.153, 0.018, { color: palette.yellow, at: [0, 0.32, 0], tube: 5, seg: 14 })
    k.torus(0.15, 0.018, { color: palette.yellow, at: [0, 0.4, 0], tube: 5, seg: 14 })
  } else if (role === 'engineer') {
    // bib pocket and a tool in it
    k.box(0.14, 0.1, 0.03, { color: palette.blue, at: [0, 0.36, 0.14], r: 0.015 })
    k.box(0.03, 0.09, 0.03, { color: palette.metalLight, at: [0.03, 0.42, 0.15], r: 0.01 })
  } else {
    // coat lapels and a badge
    k.box(0.05, 0.2, 0.03, { color: palette.creamShade, at: [0, 0.34, 0.145], r: 0.012 })
    k.box(0.05, 0.05, 0.02, { color: accent, at: [0.08, 0.4, 0.14], r: 0.01 })
  }
  // head
  const hy = 0.62
  k.sphere(0.19, { color: skin, at: [0, hy, 0], seg: 18, shade: 0.08 })
  for (const sx of [-1, 1]) {
    k.sphere(0.028, { color: palette.ink, at: [sx * 0.07, hy + 0.01, 0.172], seg: 6, shade: 0 })
    k.sphere(0.04, { color: skin, at: [sx * 0.185, hy - 0.01, 0], seg: 6, shade: 0.05 })
  }
  // every crew member is a grown-up: moustaches, greying hair and glasses to prove it
  if (variant % 3 === 1) k.box(0.13, 0.035, 0.03, { color: hair, at: [0, hy - 0.06, 0.175], r: 0.015, shade: 0 })
  if (role === 'scientist') {
    for (const sx of [-1, 1]) k.torus(0.045, 0.012, { color: palette.ink, at: [sx * 0.07, hy + 0.01, 0.18], rot: [Math.PI / 2, 0, 0], tube: 5, seg: 10 })
    // hair bun or side parting
    k.sphere(0.19, { color: hair, at: [0, hy + 0.035, -0.03], scale: [1.02, 0.86, 1.0], seg: 14, shade: 0.05 })
    if (variant % 2 === 0) k.sphere(0.08, { color: hair, at: [0, hy + 0.2, -0.06], seg: 8, shade: 0.05 })
  } else if (role === 'builder') {
    k.lathe(
      [
        [0.24, 0],
        [0.235, 0.025],
        [0.2, 0.03],
        [0.2, 0.08],
        [0.15, 0.16],
        [0.07, 0.195],
        [0, 0.2],
      ],
      { color: palette.yellowDark, top: palette.hardHat, at: [0, hy + 0.06, 0], seg: 16, mat: 'gloss' },
    )
    k.box(0.04, 0.04, 0.3, { color: palette.hardHat, at: [0, hy + 0.24, 0], r: 0.018 })
  } else {
    // cap with a peak in the agency colour
    k.sphere(0.195, { color: accent, at: [0, hy + 0.045, -0.01], scale: [1, 0.72, 1], seg: 14, shade: 0.08 })
    k.box(0.22, 0.03, 0.14, { color: accent, at: [0, hy + 0.07, 0.18], rot: [0.15, 0, 0], r: 0.014 })
    k.sphere(0.19, { color: hair, at: [0, hy - 0.015, -0.035], scale: [1.01, 0.8, 0.98], seg: 12, shade: 0.05 })
  }
  body.add(k.build('crewBody'))

  // ---- limbs (separate so they can swing)
  const limb = (color: string, top: string, len: number, r: number, foot?: string) => {
    const lk = new Kit()
    lk.capsule(r, len, { color, top, at: [0, -len / 2 - r * 0.4, 0], seg: 8 })
    if (foot) lk.box(r * 2.3, r * 1.3, r * 3.2, { color: foot, at: [0, -len - r * 1.1, r * 0.7], r: r * 0.5 })
    return lk.build('limb')
  }
  const legL = limb(legs, legs, 0.1, 0.06, palette.ink)
  const legR = limb(legs, legs, 0.1, 0.06, palette.ink)
  legL.position.set(-0.075, 0.2, 0)
  legR.position.set(0.075, 0.2, 0)
  const armL = limb(suitDark, suit, 0.12, 0.05)
  const armR = limb(suitDark, suit, 0.12, 0.05)
  armL.position.set(-0.19, 0.44, 0)
  armR.position.set(0.19, 0.44, 0)
  armL.rotation.z = -0.18
  armR.rotation.z = 0.18
  // hands
  for (const arm of [armL, armR]) {
    const h = new Kit()
    h.sphere(0.05, { color: skin, at: [0, -0.2, 0], seg: 8 })
    arm.add(h.build('hand'))
  }
  root.add(legL, legR)
  body.add(armL, armR)

  let phase: number | null = null
  const data = root.userData as ModelUserData & { setWalk: (p: number | null) => void }
  data.setWalk = (p: number | null) => {
    phase = p
  }
  data.tick = (t) => {
    if (phase === null) {
      // idle: breathe, sway, look around a little
      const b = Math.sin(t * 2.2 + variant)
      body.position.y = b * 0.008
      body.rotation.y = Math.sin(t * 0.6 + variant * 2) * 0.25
      legL.rotation.x = legR.rotation.x = 0
      armL.rotation.x = Math.sin(t * 1.1) * 0.08
      armR.rotation.x = -Math.sin(t * 1.1) * 0.08
    } else {
      const s = Math.sin(phase)
      body.position.y = Math.abs(Math.cos(phase)) * 0.035
      body.rotation.y = 0
      body.rotation.z = s * 0.05
      legL.rotation.x = s * 0.75
      legR.rotation.x = -s * 0.75
      armL.rotation.x = -s * 0.6
      armR.rotation.x = s * 0.6
    }
  }
  return root
}
