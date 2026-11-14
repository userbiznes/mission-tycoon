import * as THREE from 'three'
import { Kit, type V3 } from '../kit'
import { palette } from '../palette'
import { seeded } from '../kit'

/**
 * Shared building blocks for the base's buildings: windows, doors, roofs,
 * awnings, lamps and the little signs of age that make level-1 buildings feel old.
 *
 * Convention: every helper draws at the origin facing +Z. Wrap the call in
 * `kit.at([x, y, z], [0, yaw, 0], () => …)` to place it on another wall:
 * yaw 0 = +Z wall, π/2 = +X wall, −π/2 = −X wall, π = −Z wall.
 */

export const YAW = { front: 0, right: Math.PI / 2, left: -Math.PI / 2, back: Math.PI } as const

export interface WinOpts {
  /** pane colour pair; defaults to sky glass */
  glass?: [string, string]
  /** make the pane softly emissive (screens, warm lamps) */
  glow?: string | false
  frame?: string
  sill?: boolean
  /** number of vertical mullions */
  bars?: number
  /** horizontal mullion */
  cross?: boolean
  /** shutter colour; draws a pair of shutters */
  shutters?: string
  /** one shutter hangs crooked (old buildings) */
  crooked?: boolean
  /** planks nailed across (old buildings) */
  boarded?: boolean
  round?: number
}

/** A framed window, centred on the origin, facing +Z, sitting just proud of the wall. */
export function win(kit: Kit, w: number, h: number, o: WinOpts = {}): void {
  const frame = o.frame ?? palette.white
  const r = o.round ?? 0.04
  kit.box(w + 0.14, h + 0.14, 0.1, { color: frame, at: [0, 0, 0.02], r: Math.min(r + 0.03, 0.05), shade: 0.06 })
  if (o.glow) {
    kit.box(w, h, 0.06, { color: o.glow, at: [0, 0, 0.06], r: Math.min(r, 0.028), mat: 'glowSoft', shade: 0.1 })
  } else {
    const [g0, g1] = o.glass ?? [palette.glassDark, palette.glass]
    kit.box(w, h, 0.06, { color: g0, top: g1, at: [0, 0, 0.06], r: Math.min(r, 0.028), mat: 'glass', shade: 0.1 })
  }
  const bars = o.bars ?? (w > 0.7 ? 1 : 0)
  for (let i = 1; i <= bars; i++) {
    const x = -w / 2 + (w * i) / (bars + 1)
    kit.box(0.045, h, 0.05, { color: frame, at: [x, 0, 0.085], r: 0.015, shade: 0.04 })
  }
  if (o.cross) kit.box(w, 0.045, 0.05, { color: frame, at: [0, 0, 0.085], r: 0.015, shade: 0.04 })
  if (o.sill !== false) {
    kit.box(w + 0.26, 0.07, 0.17, { color: frame, at: [0, -h / 2 - 0.085, 0.07], r: 0.03, shade: 0.06 })
  }
  if (o.shutters) {
    const sw = Math.min(0.24, w * 0.42)
    kit.box(sw, h + 0.06, 0.05, { color: o.shutters, at: [-w / 2 - sw / 2 - 0.08, 0, 0.05], r: 0.02 })
    kit.box(sw, h + 0.06, 0.05, {
      color: o.shutters,
      at: [w / 2 + sw / 2 + 0.08 + (o.crooked ? 0.03 : 0), o.crooked ? -0.07 : 0, 0.06],
      rot: [0, 0, o.crooked ? -0.22 : 0],
      r: 0.02,
    })
  }
  if (o.boarded) {
    kit.box(w + 0.22, 0.11, 0.045, { color: palette.woodDark, top: palette.wood, at: [0, h * 0.16, 0.11], rot: [0, 0, 0.16], r: 0.02 })
    kit.box(w + 0.2, 0.11, 0.045, { color: palette.woodDark, top: palette.wood, at: [0, -h * 0.18, 0.115], rot: [0, 0, -0.1], r: 0.02 })
  }
}

export interface DoorOpts {
  frame?: string
  /** small round or square window in the door */
  porthole?: boolean
  /** double door */
  double?: boolean
  knob?: string
}

/** A door whose bottom edge sits on the origin, facing +Z. */
export function door(kit: Kit, w: number, h: number, color: string, colorTop: string, o: DoorOpts = {}): void {
  const frame = o.frame ?? palette.white
  kit.box(w + 0.16, h + 0.08, 0.1, { color: frame, at: [0, h / 2 + 0.04, 0.02], r: 0.04, shade: 0.06 })
  if (o.double) {
    for (const s of [-1, 1]) {
      kit.box(w / 2 - 0.02, h, 0.07, { color, top: colorTop, at: [(s * w) / 4, h / 2, 0.06], r: 0.03 })
      kit.sphere(0.032, { color: o.knob ?? palette.yellow, at: [s * 0.06, h * 0.46, 0.11], seg: 6, mat: 'metal' })
      if (o.porthole) {
        kit.box(w / 2 - 0.16, h * 0.3, 0.05, { color: palette.glassDark, top: palette.glass, at: [(s * w) / 4, h * 0.68, 0.085], r: 0.025, mat: 'glass' })
      }
    }
  } else {
    kit.box(w, h, 0.07, { color, top: colorTop, at: [0, h / 2, 0.06], r: 0.035 })
    kit.sphere(0.034, { color: o.knob ?? palette.yellow, at: [w * 0.3, h * 0.46, 0.11], seg: 6, mat: 'metal' })
    if (o.porthole) {
      kit.cyl(w * 0.2, w * 0.2, 0.05, { color: palette.glassDark, top: palette.glass, at: [0, h * 0.7, 0.085], rot: [Math.PI / 2, 0, 0], bevel: 0.015, seg: 14, mat: 'glass' })
    }
  }
  // doorstep
  kit.box(w + 0.34, 0.08, 0.3, { color: palette.concreteDark, top: palette.concreteLight, at: [0, 0.0, 0.16], r: 0.03 })
}

/** Triangle shape with softened corners for gable roofs (base centred on x = 0, sitting on y = 0). */
export function gableShape(w: number, h: number, soft = 0.12): THREE.Shape {
  const s = new THREE.Shape()
  const hw = w / 2
  s.moveTo(-hw, 0)
  s.lineTo(hw, 0)
  s.lineTo(soft * 0.9, h - soft * 0.55)
  s.quadraticCurveTo(0, h + soft * 0.2, -soft * 0.9, h - soft * 0.55)
  s.closePath()
  return s
}

/**
 * A chunky gable roof whose ridge runs along Z, base at the origin.
 * `w` spans X (eaves), `d` spans Z (gable to gable).
 */
export function gableRoof(kit: Kit, w: number, h: number, d: number, color: string, colorTop: string, o: { bevel?: number; shade?: number } = {}): void {
  kit.extrude(gableShape(w, h), d, { color, top: colorTop, bevel: o.bevel ?? 0.09, bevelSeg: 3, shade: o.shade ?? 0.14 })
}

/** Half-disc shape (for barrel-vault roofs and domes cut in half). */
export function archShape(r: number, squash = 1, lift = 0): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(-r, 0)
  s.lineTo(r, 0)
  if (lift > 0) s.lineTo(r, lift)
  const n = 20
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * Math.PI
    s.lineTo(Math.cos(a) * r, lift + Math.sin(a) * r * squash)
  }
  if (lift > 0) s.lineTo(-r, 0)
  s.closePath()
  return s
}

/**
 * Striped market awning. Origin at the middle of the high (back) edge; slopes down towards +Z.
 * Stripes alternate `a` and `b`, with a scalloped lip along the low edge.
 */
export function awning(kit: Kit, w: number, d: number, a: string, b: string, o: { tilt?: number; stripes?: number; thick?: number; sag?: boolean } = {}): void {
  const tilt = o.tilt ?? 0.42
  const n = o.stripes ?? 6
  const sw = w / n
  const thick = o.thick ?? 0.07
  kit.at([0, 0, 0], [tilt, 0, 0], () => {
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + sw * (i + 0.5)
      const c = i % 2 ? b : a
      kit.box(sw + 0.012, thick, d, { color: c, at: [x, 0, d / 2], r: 0.028, shade: 0.08 })
      // scalloped lip
      kit.cyl(sw * 0.5, sw * 0.5, thick * 0.9, {
        color: c,
        at: [x, -0.035, d + 0.01],
        rot: [Math.PI / 2 - 0.25, 0, 0],
        scale: [1, 1, 0.78],
        bevel: 0.025,
        seg: 12,
        shade: 0.06,
      })
    }
  })
}

/** Street lamp with a warm glowing head. Base on the origin. */
export function lampPost(kit: Kit, h: number, o: { lit?: boolean; color?: string; lean?: number } = {}): void {
  const col = o.color ?? palette.navy
  kit.at([0, 0, 0], [0, 0, o.lean ?? 0], () => {
    kit.cyl(0.09, 0.12, 0.14, { color: palette.concreteDark, top: palette.concrete, at: [0, 0.07, 0], bevel: 0.03, seg: 10 })
    kit.cyl(0.035, 0.05, h, { color: col, top: palette.metalDark, at: [0, h / 2 + 0.1, 0], bevel: 0.015, seg: 8 })
    kit.cyl(0.13, 0.06, 0.1, { color: col, at: [0, h + 0.2, 0], bevel: 0.03, seg: 10 })
    kit.sphere(0.11, {
      color: o.lit === false ? palette.creamShade : palette.lampWarm,
      top: o.lit === false ? palette.cream : palette.lampHot,
      at: [0, h + 0.09, 0],
      seg: 10,
      mat: o.lit === false ? 'gloss' : 'glowSoft',
      shade: 0.05,
    })
  })
}

/** A flat blotch of rust lying on a +Z-facing surface. */
export function rustPatch(kit: Kit, w: number, h: number, o: { dark?: boolean } = {}): void {
  kit.sphere(0.5, {
    color: o.dark ? palette.rustDark : palette.rust,
    top: o.dark ? palette.rust : palette.rustLight,
    scale: [w, h, 0.05],
    seg: 8,
    shade: 0.05,
  })
}

/** A bolted-on repair plate lying on a +Z-facing surface. */
export function patchPlate(kit: Kit, w: number, h: number, color: string, colorTop: string): void {
  kit.box(w, h, 0.045, { color, top: colorTop, r: 0.02, shade: 0.06 })
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      kit.sphere(0.022, { color: palette.metalLight, at: [sx * (w / 2 - 0.06), sy * (h / 2 - 0.06), 0.028], seg: 6, mat: 'metal' })
    }
}

export function weed(kit: Kit, at: V3, rnd: () => number, s = 1): void {
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2
    const h = (0.2 + rnd() * 0.12) * s
    kit.cone(0.05 * s, h, {
      color: palette.leafDark,
      top: palette.leafLight,
      at: [at[0] + Math.cos(a) * 0.05, at[1] + h / 2 - 0.02, at[2] + Math.sin(a) * 0.05],
      rot: [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35],
      seg: 5,
    })
  }
}

/** Short wandering crack lines on a flat floor at height `y`. */
export function cracks(kit: Kit, rnd: () => number, count: number, half: number, y: number, keep: (x: number, z: number) => boolean = () => true): void {
  for (let c = 0; c < count; c++) {
    let x = (rnd() - 0.5) * half * 2
    let z = (rnd() - 0.5) * half * 2
    let a = rnd() * Math.PI
    const segs = 2 + Math.floor(rnd() * 3)
    for (let i = 0; i < segs; i++) {
      const len = 0.22 + rnd() * 0.3
      if (Math.abs(x) < half && Math.abs(z) < half && keep(x, z)) {
        kit.box(len, 0.02, 0.035, { color: palette.concreteDark, at: [x, y, z], rot: [0, a, 0], r: 0.009, shade: 0 })
      }
      x += Math.cos(a) * len * 0.92
      z -= Math.sin(a) * len * 0.92
      a += (rnd() - 0.5) * 1.5
    }
  }
}

/** Wooden crate, bottom on the origin. */
export function crate(kit: Kit, at: V3, size: number, rotY = 0, lid?: string): void {
  kit.at(at, [0, rotY, 0], () => {
    kit.box(size, size, size, { color: palette.woodDark, top: palette.wood, at: [0, size / 2, 0], r: size * 0.08 })
    const t = size * 0.14
    for (const y of [t * 0.9, size - t * 0.9]) {
      kit.box(size * 1.05, t, size * 1.05, { color: palette.wood, top: palette.woodLight, at: [0, y, 0], r: t * 0.3, shade: 0.06 })
    }
    if (lid) kit.box(size * 0.5, 0.03, size * 0.5, { color: lid, at: [0, size + 0.012, 0], r: 0.012, shade: 0.03 })
  })
}

/** Oil-drum style barrel, bottom on the origin. */
export function barrel(kit: Kit, at: V3, dark: string, light: string, s = 1): void {
  kit.at(at, undefined, () => {
    kit.cyl(0.17 * s, 0.17 * s, 0.44 * s, { color: dark, top: light, at: [0, 0.22 * s, 0], bevel: 0.05 * s, seg: 14 })
    kit.torus(0.172 * s, 0.022 * s, { color: palette.metalLight, at: [0, 0.14 * s, 0], tube: 6, seg: 14 })
    kit.torus(0.172 * s, 0.022 * s, { color: palette.metalLight, at: [0, 0.31 * s, 0], tube: 6, seg: 14 })
  })
}

/** Planter box with a row of flowers. Centre-bottom on the origin, long side along X. */
export function planter(kit: Kit, w: number, colors: string[], rnd: () => number): void {
  kit.box(w, 0.16, 0.2, { color: palette.woodDark, top: palette.wood, at: [0, 0.08, 0], r: 0.035 })
  kit.box(w - 0.06, 0.05, 0.14, { color: palette.dirtDark, at: [0, 0.155, 0], r: 0.02, shade: 0 })
  const n = Math.max(2, Math.round(w / 0.16))
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.09 + ((w - 0.18) * i) / (n - 1)
    kit.sphere(0.075, { color: palette.leafDark, top: palette.leafLight, at: [x, 0.2, (rnd() - 0.5) * 0.04], seg: 6, shade: 0.1 })
    kit.sphere(0.045, { color: colors[i % colors.length], at: [x + (rnd() - 0.5) * 0.04, 0.275, (rnd() - 0.5) * 0.05], seg: 6, shade: 0.03 })
  }
}

/** Whip antenna with a ball tip. Base on the origin. */
export function whip(kit: Kit, h: number, tip: string = palette.red, lean = 0): void {
  kit.beam([0, 0, 0], [Math.sin(lean) * h, Math.cos(lean) * h, 0], 0.035, { color: palette.metalLight, round: true })
  kit.sphere(0.05, { color: tip, at: [Math.sin(lean) * h, Math.cos(lean) * h + 0.03, 0], seg: 8 })
}

/** Boxy air-conditioning unit with a fan grille on top. Bottom on the origin. */
export function acUnit(kit: Kit, s = 1): void {
  kit.box(0.5 * s, 0.3 * s, 0.4 * s, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.15 * s, 0], r: 0.05 * s })
  kit.cyl(0.14 * s, 0.14 * s, 0.04, { color: palette.steel, at: [0, 0.31 * s, 0], bevel: 0.012, seg: 12, shade: 0 })
  kit.torus(0.14 * s, 0.02, { color: palette.metalLight, at: [0, 0.32 * s, 0], tube: 5, seg: 12 })
}

/** A string of little bulbs sagging between two points. */
export function stringLights(kit: Kit, a: V3, b: V3, n: number, lit: boolean, colors: string[] = [palette.lampWarm]): void {
  const sag = 0.16
  const pts: V3[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t])
  }
  kit.pipe(pts, 0.012, { color: palette.steel, radial: 4, seg: 12, shade: 0 })
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag - 0.045, a[2] + (b[2] - a[2]) * t]
    kit.sphere(0.045, { color: colors[i % colors.length], at: p, seg: 6, mat: lit ? 'glowSoft' : 'gloss', shade: 0.02 })
  }
}

/** Concrete foundation pad with optional cracks and weeds for old buildings. */
export function foundation(kit: Kit, w: number, d: number, o: { old?: boolean; seed?: number; r?: number; h?: number; z?: number; x?: number; color?: [string, string] } = {}): void {
  const h = o.h ?? 0.16
  const [c0, c1] = o.color ?? [palette.concreteDark, palette.concrete]
  kit.slab(w, d, h, o.r ?? 0.5, { color: c0, top: c1, at: [o.x ?? 0, 0, o.z ?? 0], bevel: 0.05 })
  kit.slab(w - 0.34, d - 0.34, 0.025, Math.max(0.1, (o.r ?? 0.5) - 0.15), {
    color: c1,
    top: o.color ? mix(c1, palette.white, 0.18) : palette.concreteLight,
    at: [o.x ?? 0, h - 0.005, o.z ?? 0],
    bevel: 0.01,
    shade: 0.02,
  })
}

/** Soft cartoon puffs (steam, chimney smoke): an instanced pool animated by `update(t)`. */
export function makePuffs(vents: V3[], o: { perVent?: number; rise?: number; size?: number; speed?: number; color?: string; drift?: V3 } = {}) {
  const perVent = o.perVent ?? 4
  const rise = o.rise ?? 1.2
  const size = o.size ?? 0.2
  const speed = o.speed ?? 0.2
  const drift = o.drift ?? [0.25, 0, 0]
  const count = vents.length * perVent
  const geo = new THREE.IcosahedronGeometry(size, 1)
  const mat = new THREE.MeshStandardMaterial({
    color: o.color ?? palette.steam,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(o.color ?? palette.steam),
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.9,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.frustumCulled = false
  const dummy = new THREE.Object3D()
  const rnd = seeded(count * 7 + 3)
  const phase = new Float32Array(count)
  for (let i = 0; i < count; i++) phase[i] = rnd()
  const update = (t: number) => {
    for (let i = 0; i < count; i++) {
      const v = vents[Math.floor(i / perVent)]
      const life = (t * speed + phase[i] * 0.3 + (i % perVent) / perVent) % 1
      const sway = Math.sin(t * 0.9 + i * 1.7) * 0.1
      dummy.position.set(v[0] + (sway + drift[0]) * life, v[1] + life * rise, v[2] + drift[2] * life + Math.cos(i * 2.3) * 0.08 * life)
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
    update,
    dispose: () => {
      geo.dispose()
      mat.dispose()
    },
  }
}

/** Read the common model options with defaults. */
export function readOpts(opts: Record<string, unknown>) {
  const level = Math.max(1, Math.min(3, Number(opts.level ?? 1)))
  return {
    level,
    colorA: (opts.colorA as string | undefined) ?? undefined,
    colorB: (opts.colorB as string | undefined) ?? undefined,
  }
}

/**
 * A chunky pitched roof made of two thick panels and a ridge cap, ridge along Z.
 * Origin: centre of the wall top. `w` is the wall width (X), `d` the wall depth (Z).
 * Unlike `gableRoof` it leaves the gable wall visible underneath.
 */
export function panelRoof(
  kit: Kit,
  w: number,
  rise: number,
  d: number,
  color: string,
  colorTop: string,
  o: { thick?: number; overhang?: number; overhangZ?: number; ridge?: string; rows?: number; rowColor?: string } = {},
): void {
  const thick = o.thick ?? 0.2
  const ov = o.overhang ?? 0.28
  const hw = w / 2
  const a = Math.atan2(rise, hw)
  const len = Math.hypot(hw, rise) + ov
  const dz = d + (o.overhangZ ?? 0.3) * 2
  for (const s of [-1, 1]) {
    // midpoint between ridge and eave, pushed out along the panel normal
    const ex = hw + ov * Math.cos(a)
    const ey = -ov * Math.sin(a)
    const cx = (ex / 2 + Math.sin(a) * thick * 0.5) * s
    const cy = (rise + ey) / 2 + Math.cos(a) * thick * 0.5
    kit.box(len + thick * 0.4, thick, dz, { color, top: colorTop, at: [cx, cy, 0], rot: [0, 0, -a * s], r: thick * 0.42, shade: 0.12 })
  }
  kit.box(thick * 1.25, thick * 0.9, dz + 0.08, { color: o.ridge ?? colorTop, at: [0, rise + thick * 0.62, 0], r: thick * 0.4, shade: 0.06 })
  // shingle rows: slim raised strips running along each panel
  const rows = o.rows ?? 3
  for (const s of [-1, 1]) {
    for (let i = 1; i <= rows; i++) {
      const f = i / (rows + 1)
      const px = (hw + ov * Math.cos(a)) * f
      const py = rise - (rise + ov * Math.sin(a)) * f
      kit.box(0.07, 0.045, dz - 0.06, {
        color: o.rowColor ?? color,
        at: [(px + Math.sin(a) * (thick + 0.012)) * s, py + Math.cos(a) * (thick + 0.012), 0],
        rot: [0, 0, -a * s],
        r: 0.02,
        shade: 0.03,
      })
    }
  }
}

/** A window full of glowing mission screens: dark pane with little bright displays. Facing +Z. */
export function screenWindow(kit: Kit, w: number, h: number, o: { frame?: string; colors?: string[] } = {}): void {
  const frame = o.frame ?? palette.white
  kit.box(w + 0.14, h + 0.14, 0.1, { color: frame, at: [0, 0, 0.02], r: 0.05, shade: 0.06 })
  kit.box(w, h, 0.06, { color: palette.navyDark, top: palette.navy, at: [0, 0, 0.06], r: 0.028, mat: 'glass', shade: 0.1 })
  const colors = o.colors ?? [palette.screenGlow, palette.lampWarm, palette.beaconGreen]
  const n = Math.max(2, Math.round(w / 0.34))
  const sw = (w - 0.1) / n
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.05 + sw * (i + 0.5)
    const c = colors[i % colors.length]
    kit.box(sw - 0.07, h * 0.5, 0.03, { color: c, at: [x, h * 0.1, 0.09], r: 0.02, mat: 'glowSoft', shade: 0.25 })
    kit.box(sw - 0.12, h * 0.1, 0.03, { color: colors[(i + 1) % colors.length], at: [x, -h * 0.3, 0.09], r: 0.012, mat: 'glowSoft', shade: 0 })
  }
  kit.box(w + 0.26, 0.07, 0.17, { color: frame, at: [0, -h / 2 - 0.085, 0.07], r: 0.03, shade: 0.06 })
}

/** A waving flag carrying the agency logo. Origin at the top-left corner where it meets the pole. */
export function makeFlag(w: number, h: number, color: string, logo: (size: number) => THREE.Mesh) {
  const group = new THREE.Group()
  group.name = 'flag'
  const clothGeo = new THREE.PlaneGeometry(w, h, 10, 4)
  clothGeo.translate(w / 2, -h / 2, 0)
  const clothMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, side: THREE.DoubleSide })
  const cloth = new THREE.Mesh(clothGeo, clothMat)
  cloth.castShadow = true
  cloth.receiveShadow = false
  group.add(cloth)
  const size = h * 0.86
  const geos: THREE.BufferGeometry[] = [clothGeo]
  for (const side of [1, -1]) {
    const plate = logo(size)
    const g = new THREE.PlaneGeometry(size, size, 8, 4)
    if (side < 0) g.rotateY(Math.PI)
    g.translate(w * 0.5, -h / 2, 0.014 * side)
    plate.geometry.dispose()
    plate.geometry = g
    group.add(plate)
    geos.push(g)
  }
  const bases = geos.map((g) => (g.attributes.position.array as Float32Array).slice())
  const update = (t: number) => {
    geos.forEach((g, gi) => {
      const pos = g.attributes.position as THREE.BufferAttribute
      const base = bases[gi]
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3]
        const y = base[i * 3 + 1]
        const k = x / w
        const wave = Math.sin(x * 5.2 - t * 4.2 + y * 1.3) * 0.075 * k + Math.sin(x * 2.3 - t * 2.6) * 0.05 * k
        pos.setZ(i, base[i * 3 + 2] + wave)
        pos.setY(i, y - k * k * 0.06 + Math.sin(t * 2.1 + x * 3.0) * 0.012 * k)
      }
      pos.needsUpdate = true
      g.computeVertexNormals()
    })
  }
  update(0)
  return {
    group,
    update,
    dispose: () => {
      geos.forEach((g) => g.dispose())
      clothMat.dispose()
    },
  }
}

const _ca = new THREE.Color()
const _cb = new THREE.Color()
/** Blend two palette colours (0 = a, 1 = b). Used to fade paint on old buildings. */
export function mix(a: string, b: string, t: number): string {
  return `#${_ca.set(a).lerp(_cb.set(b), t).getHexString()}`
}
/** Sun-bleached, dusty version of a paint colour. */
export function faded(c: string, amount = 0.42): string {
  return mix(c, palette.concrete, amount)
}

/** Run `fn` on a surface tilted about Z by `slope` (roof panels): inside, +Z is the surface normal. */
export function onSlope(kit: Kit, at: V3, slope: number, fn: () => void, spin = 0): void {
  kit.at(at, [0, 0, slope], () => kit.at([0, 0, 0], [-Math.PI / 2, 0, spin], fn))
}

/**
 * A parabolic dish with feed horn and struts, opening along +Y from the origin (the vertex).
 * Returns the focus height so callers can attach things there.
 */
export function dishBowl(
  kit: Kit,
  R: number,
  depth: number,
  o: { inner?: [string, string]; outer?: [string, string]; rim?: string; feed?: string; old?: boolean; struts?: number } = {},
): number {
  const [i0, i1] = o.inner ?? [palette.creamShade, palette.white]
  const [o0, o1] = o.outer ?? [palette.metalDark, palette.metal]
  const t = 0.07
  const n = 9
  const inner: [number, number][] = []
  const outer: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const r = (i / n) * R
    inner.push([r, depth * (r / R) ** 2 + 0.012])
    outer.push([r, depth * (r / R) ** 2 - t])
  }
  // reflector faces up/in: lathe profiles face outward when drawn bottom-to-top, so run this one rim-to-centre
  kit.lathe(inner.slice().reverse(), { color: i0, top: i1, seg: 32, shade: 0.1 })
  kit.lathe([...outer, [R + 0.02, depth + 0.012]], { color: o0, top: o1, seg: 32, shade: 0.12 })
  kit.torus(R + 0.005, 0.06, { color: o.rim ?? palette.red, at: [0, depth + 0.01, 0], tube: 8, seg: 32 })
  // panel rings on the reflector
  for (const f of [0.42, 0.72]) {
    kit.torus(R * f, 0.016, { color: palette.creamShade, at: [0, depth * f * f + 0.02, 0], tube: 5, seg: 28, shade: 0 })
  }
  // back ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const c = Math.cos(a)
    const s2 = Math.sin(a)
    kit.beam([c * R * 0.18, -t - 0.02, s2 * R * 0.18], [c * R * 0.92, depth * 0.846 - t - 0.03, s2 * R * 0.92], 0.07, { color: o0, top: o1 })
  }
  kit.cyl(R * 0.2, R * 0.26, 0.22, { color: o0, top: o1, at: [0, -t - 0.1, 0], bevel: 0.05, seg: 14 })
  // feed
  const focus = Math.min((R * R) / (4 * depth), R * 0.95)
  const struts = o.struts ?? 3
  for (let i = 0; i < struts; i++) {
    const a = (i / struts) * Math.PI * 2 + 0.5
    const bend = o.old && i === 1 ? 0.12 : 0
    kit.beam([Math.cos(a) * R * 0.86, depth * 0.74, Math.sin(a) * R * 0.86], [Math.cos(a) * 0.07 + bend, focus - 0.03, Math.sin(a) * 0.07], 0.04, {
      color: palette.metalLight,
      round: true,
    })
  }
  kit.cyl(0.11, 0.15, 0.24, { color: o.feed ?? palette.red, at: [0, focus - 0.02, 0], bevel: 0.04, seg: 12 })
  kit.sphere(0.085, { color: palette.metalLight, at: [0, focus - 0.17, 0], seg: 8, mat: 'metal' })
  return focus
}

/**
 * Barrel-vault roof made of chunky curved-plank panels, ridge along Z.
 * Origin: centre of the wall top. `a` and `b` are the half-width and height of the arch.
 * `colors(i)` picks each panel's [base, top] colours so old roofs can have odd panels.
 */
export function vaultRoof(
  kit: Kit,
  a: number,
  b: number,
  depth: number,
  colors: (i: number, n: number) => [string, string],
  o: { panels?: number; thick?: number; lift?: (i: number) => number } = {},
): void {
  const n = o.panels ?? 9
  const thick = o.thick ?? 0.16
  const P = (t: number): [number, number] => [a * Math.cos(t), b * Math.sin(t)]
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * Math.PI
    const t1 = ((i + 1) / n) * Math.PI
    const tm = (t0 + t1) / 2
    const [x0, y0] = P(t0)
    const [x1, y1] = P(t1)
    const len = Math.hypot(x1 - x0, y1 - y0)
    const ang = Math.atan2(y1 - y0, x1 - x0)
    // outward normal of the chord
    const nx = (y1 - y0) / len
    const ny = -(x1 - x0) / len
    const [mx, my] = P(tm)
    const lift = o.lift?.(i) ?? 0
    const [c0, c1] = colors(i, n)
    kit.box(len + thick * 0.55, thick, depth, {
      color: c0,
      top: c1,
      at: [mx * 0.985 + nx * (thick * 0.42 + lift), my * 0.985 + ny * (thick * 0.42 + lift), 0],
      rot: [0, 0, ang + lift * 0.8],
      r: thick * 0.4,
      shade: 0.1,
    })
  }
}

/** Mushroom-cap roof vent. Base on the origin. */
export function roofVent(kit: Kit, s = 1): void {
  kit.cyl(0.1 * s, 0.12 * s, 0.26 * s, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.13 * s, 0], bevel: 0.03, seg: 10, mat: 'metal' })
  kit.lathe(
    [
      [0, 0],
      [0.2 * s, 0.0],
      [0.22 * s, 0.04 * s],
      [0.14 * s, 0.13 * s],
      [0, 0.16 * s],
    ],
    { color: palette.steel, top: palette.metalLight, at: [0, 0.25 * s, 0], seg: 12, mat: 'metal' },
  )
}

/** A tiny boxed-up satellite: gold foil body, blue solar wings, a dish. Bottom on the origin. */
export function miniSatellite(kit: Kit, s = 1): void {
  kit.box(0.34 * s, 0.4 * s, 0.34 * s, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.2 * s, 0], r: 0.05 * s, mat: 'gloss' })
  for (const side of [-1, 1]) {
    kit.box(0.42 * s, 0.26 * s, 0.03 * s, { color: palette.blueDark, top: palette.blue, at: [side * 0.4 * s, 0.22 * s, 0], r: 0.012, mat: 'gloss' })
    kit.box(0.02 * s, 0.26 * s, 0.035 * s, { color: palette.white, at: [side * 0.4 * s, 0.22 * s, 0], r: 0.006, shade: 0 })
  }
  kit.cyl(0.11 * s, 0.03 * s, 0.07 * s, { color: palette.creamShade, top: palette.white, at: [0, 0.45 * s, 0], bevel: 0.01, seg: 10 })
  kit.sphere(0.03 * s, { color: palette.red, at: [0, 0.5 * s, 0], seg: 6 })
}

/** Low hand cart / dolly: a deck on four small wheels. Bottom on the origin, long side along Z. */
export function dolly(kit: Kit, w: number, len: number): void {
  kit.box(w, 0.09, len, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.2, 0], r: 0.035 })
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      kit.cyl(0.085, 0.085, 0.07, { color: palette.rubber, at: [sx * (w / 2 - 0.03), 0.09, sz * (len / 2 - 0.14)], rot: [0, 0, Math.PI / 2], bevel: 0.025, seg: 12 })
    }
  // push handle
  kit.beam([-w / 2 + 0.06, 0.22, len / 2 - 0.03], [-w / 2 + 0.06, 0.62, len / 2 + 0.07], 0.04, { color: palette.steel, round: true })
  kit.beam([w / 2 - 0.06, 0.22, len / 2 - 0.03], [w / 2 - 0.06, 0.62, len / 2 + 0.07], 0.04, { color: palette.steel, round: true })
  kit.beam([-w / 2 + 0.06, 0.62, len / 2 + 0.07], [w / 2 - 0.06, 0.62, len / 2 + 0.07], 0.045, { color: palette.steel, round: true })
}
