import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../kit'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { makePuffs, mix } from './common'

/**
 * A plot under construction: plank fence with striped barriers, a scaffold
 * that grows as work progresses, a half-built core, a cement mixer, piles of
 * planks and bricks, and puffs of dust.
 *
 * `userData.setProgress(p01)` raises the scaffold and the walls.
 * Footprint about 3.8 × 3.8 (fits every plot).
 */
export function createConstruction(_opts: ModelOptions = {}): THREE.Object3D {
  const rnd = seeded(91)
  const kit = new Kit()
  const S = 1.7

  // churned ground
  kit.slab(3.8, 3.8, 0.05, 1.0, { color: palette.dirtDark, top: palette.dirt, bevel: 0.02 })
  kit.slab(3.3, 3.3, 0.03, 0.8, { color: palette.dirt, top: mix(palette.dirt, palette.sand, 0.4), at: [0, 0.04, 0], bevel: 0.012, shade: 0.02 })
  for (let i = 0; i < 5; i++) {
    const s = 0.3 + rnd() * 0.3
    kit.cyl(s, s, 0.012, { color: palette.dirtDark, at: [(rnd() - 0.5) * 2.4, 0.072 + i * 0.004, (rnd() - 0.5) * 2.4], scale: [1.25, 1, 0.8], rot: [0, rnd() * 3, 0], bevel: 0.004, shade: 0, seg: 12 })
  }

  // plank fence on the back and sides, striped barriers across the front
  const fence = (a: V3, b: V3) => {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.85))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = a[0] + (b[0] - a[0]) * t
      const z = a[2] + (b[2] - a[2]) * t
      kit.beam([x, 0, z], [x + (rnd() - 0.5) * 0.04, 0.72, z], 0.09, { color: palette.woodDark, top: palette.woodLight })
    }
    for (const y of [0.28, 0.56]) kit.beam([a[0], y, a[2]], [b[0], y + (rnd() - 0.5) * 0.04, b[2]], 0.07, { color: palette.wood, top: palette.woodLight })
  }
  fence([-S, 0, -S], [S, 0, -S])
  fence([-S, 0, -S], [-S, 0, S])
  fence([S, 0, -S], [S, 0, S])
  for (const [x0, x1] of [
    [-S, -0.45],
    [0.45, S],
  ]) {
    for (const x of [x0, x1]) kit.beam([x, 0, S], [x, 0.66, S], 0.08, { color: palette.steel })
    const n = 5
    const w = (x1 - x0) / n
    for (let i = 0; i < n; i++) {
      kit.box(w + 0.01, 0.16, 0.05, { color: i % 2 ? palette.white : palette.orange, at: [x0 + w * (i + 0.5), 0.5, S], r: 0.02, shade: 0.05 })
    }
  }
  // traffic cones at the gap
  for (const x of [-0.3, 0.3]) {
    kit.box(0.2, 0.03, 0.2, { color: palette.orangeDark, at: [x, 0.085, S + 0.25], r: 0.01 })
    kit.cone(0.085, 0.3, { color: palette.orangeDark, top: palette.orange, at: [x, 0.24, S + 0.25], seg: 10 })
    kit.torus(0.05, 0.018, { color: palette.white, at: [x, 0.26, S + 0.25], tube: 5, seg: 10 })
  }

  // cement mixer
  kit.at([1.05, 0.05, 0.95], [0, -0.5, 0], () => {
    for (const sx of [-1, 1]) {
      kit.beam([sx * 0.2, 0, 0.12], [sx * 0.14, 0.4, 0], 0.05, { color: palette.steel })
      kit.cyl(0.09, 0.09, 0.05, { color: palette.rubber, at: [sx * 0.24, 0.09, -0.16], rot: [0, 0, Math.PI / 2], bevel: 0.02, seg: 10 })
    }
    kit.lathe(
      [
        [0.0, 0],
        [0.17, 0.02],
        [0.25, 0.14],
        [0.25, 0.3],
        [0.15, 0.46],
        [0.13, 0.48],
      ],
      { color: palette.orangeDark, top: palette.orange, at: [0, 0.34, -0.02], rot: [0.75, 0, 0], seg: 16 },
    )
    kit.torus(0.25, 0.03, { color: palette.steel, at: [0, 0.48, 0.13], rot: [0.75, 0, 0], tube: 6, seg: 16 })
  })
  // stacks of planks, bricks, a sand heap and a wheelbarrow
  for (let i = 0; i < 6; i++) {
    kit.box(1.05, 0.06, 0.16, { color: palette.wood, top: palette.woodLight, at: [-1.0 + (i % 2) * 0.04, 0.1 + Math.floor(i / 2) * 0.065, 0.95 + (i % 2) * 0.18], rot: [0, 0.2 + (i > 3 ? 0.1 : 0), 0], r: 0.02 })
  }
  for (let i = 0; i < 8; i++) {
    kit.box(0.22, 0.1, 0.11, { color: palette.brick, top: mix(palette.brick, palette.white, 0.15), at: [1.2 + (i % 2) * 0.13 - (i > 5 ? 0.06 : 0), 0.11 + Math.floor(i / 3) * 0.1, -1.05 + (i % 3) * 0.12], rot: [0, 0.1, 0], r: 0.02 })
  }
  kit.blob(0.42, { color: palette.sandWet, top: palette.sandLight, at: [-1.1, 0.08, -1.0], scale: [1.15, 0.55, 1], detail: 2 })
  kit.beam([-1.05, 0.2, -0.95], [-0.86, 0.95, -1.08], 0.045, { color: palette.woodDark, top: palette.woodLight, round: true })

  const group = kit.build('construction')

  // ------------------------------------------------------------ the rising core and its scaffold
  const ck = new Kit()
  ck.box(1.9, 1.0, 1.7, { color: mix(palette.brick, palette.cream, 0.55), top: palette.cream, at: [0, 0.5, 0], r: 0.06 })
  for (const y of [0.25, 0.5, 0.75]) ck.box(1.93, 0.02, 1.73, { color: mix(palette.brick, palette.cream, 0.25), at: [0, y, 0], r: 0.008, shade: 0 })
  // door and window holes, still empty
  ck.box(0.5, 0.62, 0.05, { color: palette.navyDark, at: [0, 0.31, 0.85], r: 0.02, shade: 0 })
  ck.box(0.05, 0.4, 0.5, { color: palette.navyDark, at: [0.95, 0.55, 0], r: 0.02, shade: 0 })
  ck.box(0.05, 0.4, 0.5, { color: palette.navyDark, at: [-0.95, 0.55, 0], r: 0.02, shade: 0 })
  const core = ck.build('core')
  core.name = 'core'
  core.position.y = 0.06
  group.add(core)

  const sk = new Kit()
  const hw = 1.2
  const hd = 1.1
  const H = 2.0
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) sk.beam([sx * hw, 0, sz * hd], [sx * hw, H, sz * hd], 0.06, { color: palette.metal, top: palette.metalLight, round: true })
  for (const y of [0.7, 1.4, H]) {
    for (const sz of [-1, 1]) sk.beam([-hw, y, sz * hd], [hw, y, sz * hd], 0.05, { color: palette.metal, round: true })
    for (const sx of [-1, 1]) sk.beam([sx * hw, y, -hd], [sx * hw, y, hd], 0.05, { color: palette.metal, round: true })
  }
  // plank walkways on the camera-facing sides
  for (const y of [0.72, 1.42]) {
    sk.box(2.4, 0.05, 0.3, { color: palette.wood, top: palette.woodLight, at: [0, y + 0.02, hd - 0.08], r: 0.02 })
    sk.box(0.3, 0.05, 2.2, { color: palette.wood, top: palette.woodLight, at: [hw - 0.08, y + 0.02, 0], r: 0.02 })
    sk.box(0.3, 0.05, 2.2, { color: palette.wood, top: palette.woodLight, at: [-hw + 0.08, y + 0.02, 0], r: 0.02 })
  }
  // cross braces
  sk.beam([-hw, 0.05, hd], [0, 0.7, hd], 0.04, { color: palette.orange, round: true })
  sk.beam([hw, 0.05, hd], [0, 0.7, hd], 0.04, { color: palette.orange, round: true })
  sk.beam([hw, 0.72, -hd], [hw, 1.4, hd], 0.04, { color: palette.orange, round: true })
  sk.beam([-hw, 0.72, hd], [-hw, 1.4, -hd], 0.04, { color: palette.orange, round: true })
  // ladder
  for (const dx of [-0.1, 0.1]) sk.beam([0.6 + dx, 0, hd + 0.08], [0.6 + dx, 1.45, hd + 0.02], 0.035, { color: palette.woodDark, round: true })
  for (let y = 0.2; y < 1.4; y += 0.24) sk.beam([0.5, y, hd + 0.07], [0.7, y, hd + 0.07], 0.03, { color: palette.woodDark, round: true })
  const scaffold = sk.build('scaffold')
  scaffold.name = 'scaffold'
  scaffold.position.y = 0.06
  group.add(scaffold)

  const dust = makePuffs(
    [
      [-0.9, 0.15, 1.25],
      [1.25, 0.15, 0.2],
      [0.2, 0.2, -1.25],
      [-1.3, 0.15, -0.3],
    ],
    { perVent: 3, rise: 0.7, size: 0.2, speed: 0.3, color: mix(palette.sandLight, palette.white, 0.4), drift: [0.15, 0, 0.1] },
  )
  group.add(dust.object)

  let progress = 0.4
  const apply = () => {
    scaffold.scale.y = 0.4 + 0.6 * progress
    core.scale.y = Math.max(0.08, progress * 1.6)
  }
  apply()
  const data = group.userData as ModelUserData & { setProgress: (p: number) => void }
  data.setProgress = (p: number) => {
    progress = THREE.MathUtils.clamp(p, 0, 1)
    apply()
  }
  data.anchors = { scaffold, core }
  data.tick = (t) => dust.update(t)
  data.dispose = () => dust.dispose()
  return group
}
