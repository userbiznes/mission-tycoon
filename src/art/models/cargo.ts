import * as THREE from 'three'
import { Kit, type V3 } from '../kit'
import { palette } from '../palette'
import { mix } from './common'

/**
 * Harbour kit: the pieces shared by the dock and the Parts Market. Sagging
 * canvas awnings, stencilled crates, lanterns, strings of bulbs, and the
 * oversized toy space parts the market sells (they are drawn far bigger than
 * life so they still read from the game camera).
 *
 * Convention as in `common.ts`: helpers draw at the origin facing +Z.
 */

// ------------------------------------------------------------------ canvas
export interface AwningOpts {
  /** how far the front edge hangs below the back edge */
  drop?: number
  /** belly of the cloth between the wall and its front edge */
  sag?: number
  /** extra droop of the front edge in the middle of the span */
  droop?: number
  stripes?: number
  thick?: number
  /** a sewn-on patch: [x as a fraction of the width (−0.5…0.5), z as a fraction of the depth, colour] */
  patch?: [number, number, string]
}

/**
 * Striped canvas awning with real thickness: the cloth bellies between the wall
 * and its front edge, the stripes run front to back, and a scalloped valance
 * hangs off the front. Origin: middle of the high (back) edge; the cloth runs
 * out towards +Z. Returns the height of the front edge at the two corners.
 */
export function canvasAwning(kit: Kit, w: number, d: number, a: string, b: string, o: AwningOpts = {}): number {
  const drop = o.drop ?? d * 0.34
  const sag = o.sag ?? 0.07
  const droop = o.droop ?? 0.05
  const n = o.stripes ?? Math.max(3, Math.round(w / 0.26))
  const sw = w / n
  const bevel = 0.018
  const t = (o.thick ?? 0.075) - bevel * 2
  const N = 8
  for (let i = 0; i < n; i++) {
    const xc = -w / 2 + sw * (i + 0.5)
    const k = (2 * xc) / w
    const fall = drop + droop * (1 - k * k)
    const y = (z: number) => -fall * (z / d) - sag * Math.sin((Math.PI * z) / d)
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    for (let s = 1; s <= N; s++) shape.lineTo((d * s) / N, y((d * s) / N))
    for (let s = N; s >= 0; s--) shape.lineTo((d * s) / N, y((d * s) / N) - t)
    shape.closePath()
    const c = i % 2 ? b : a
    // the shape lives in (z, y); turn it so the extrusion runs along X
    kit.extrude(shape, sw + 0.004, { color: mix(c, palette.navyDark, 0.1), top: c, at: [xc, 0, 0], rot: [0, -Math.PI / 2, 0], bevel, bevelSeg: 2, curveSeg: 4, shade: 0.05 })
    // scalloped valance: a round flap hanging off the front edge
    kit.cyl(sw * 0.5, sw * 0.5, 0.05, {
      color: mix(c, palette.navyDark, 0.14),
      top: c,
      at: [xc, -fall - t - 0.035, d + 0.012],
      rot: [Math.PI / 2 - 0.12, 0, 0],
      bevel: 0.022,
      seg: 12,
      shade: 0.05,
    })
  }
  if (o.patch) {
    const [px, pz, pc] = o.patch
    const z = d * pz
    const tilt = Math.atan2(drop, d)
    kit.box(0.3, 0.035, 0.26, { color: pc, at: [w * px, -drop * pz - sag * Math.sin(Math.PI * pz) + 0.022, z], rot: [tilt, 0.3, 0], r: 0.012, shade: 0.03 })
  }
  return -drop
}

// ------------------------------------------------------------------ lights
/** A little lantern hanging from the origin (its hook): a warm glass globe under a tin cap. */
export function lantern(kit: Kit, s = 1, lit = true): void {
  kit.torus(0.035 * s, 0.014 * s, { color: palette.steel, at: [0, -0.03 * s, 0], rot: [Math.PI / 2, 0, 0], tube: 5, seg: 8, shade: 0 })
  kit.lathe(
    [
      [0, 0.0],
      [0.12 * s, 0.0],
      [0.13 * s, 0.018 * s],
      [0.045 * s, 0.07 * s],
      [0, 0.08 * s],
    ],
    { color: palette.navy, top: palette.metalDark, at: [0, -0.14 * s, 0], seg: 10 },
  )
  const warm = mix(palette.lampWarm, palette.orange, 0.65)
  kit.sphere(0.115 * s, {
    color: lit ? warm : palette.creamShade,
    top: lit ? palette.lampWarm : palette.cream,
    at: [0, -0.235 * s, 0],
    scale: [1, 1.12, 1],
    seg: 10,
    mat: lit ? 'glowSoft' : 'gloss',
    shade: 0.05,
  })
  kit.cyl(0.075 * s, 0.06 * s, 0.04 * s, { color: palette.navy, top: palette.metalDark, at: [0, -0.36 * s, 0], bevel: 0.012 * s, seg: 10 })
}

/** A string of fat bulbs sagging between two points. */
export function bulbString(kit: Kit, a: V3, b: V3, n: number, colors: string[], o: { sag?: number; r?: number; lit?: boolean } = {}): void {
  const sag = o.sag ?? 0.2
  const r = o.r ?? 0.06
  const at = (t: number, extra = 0): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag - extra, a[2] + (b[2] - a[2]) * t]
  const pts: V3[] = []
  for (let i = 0; i <= 8; i++) pts.push(at(i / 8))
  kit.pipe(pts, 0.014, { color: palette.steel, radial: 4, seg: 16, shade: 0 })
  for (let i = 0; i < n; i++) {
    const c = colors[i % colors.length]
    kit.sphere(r, { color: c, top: mix(c, palette.white, 0.35), at: at((i + 0.5) / n, r * 0.9), seg: 8, mat: o.lit === false ? 'gloss' : 'glowSoft', shade: 0.04 })
  }
}

// ------------------------------------------------------------------ crates and barrels
export type Stencil = 'bolt' | 'panel' | 'sat' | 'dish'

/** A painted icon lying in the XY plane, facing +Z, fitting a square of side `s`. */
export function stencil(kit: Kit, kind: Stencil, s: number, color: string): void {
  const flat = { color, shade: 0 }
  switch (kind) {
    case 'bolt': {
      const p: [number, number][] = [
        [0.12, 0.5],
        [-0.3, -0.06],
        [-0.03, -0.06],
        [-0.16, -0.5],
        [0.3, 0.1],
        [0.03, 0.1],
        [0.26, 0.5],
      ]
      const shape = new THREE.Shape()
      p.forEach(([x, y], i) => (i ? shape.lineTo(x * s, y * s) : shape.moveTo(x * s, y * s)))
      shape.closePath()
      kit.extrude(shape, 0.03, { ...flat, bevel: 0.006, bevelSeg: 1, curveSeg: 1 })
      break
    }
    case 'panel':
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 3; j++) kit.box(s * 0.4, s * 0.25, 0.024, { ...flat, at: [(i - 0.5) * s * 0.46, (j - 1) * s * 0.3, 0], r: 0.01, seg: 1 })
      break
    case 'sat':
      kit.box(s * 0.3, s * 0.38, 0.024, { ...flat, r: 0.012, seg: 1 })
      for (const sx of [-1, 1]) kit.box(s * 0.27, s * 0.2, 0.024, { ...flat, at: [sx * s * 0.34, 0, 0], r: 0.01, seg: 1 })
      kit.cyl(s * 0.07, s * 0.07, 0.024, { ...flat, at: [0, s * 0.33, 0], rot: [Math.PI / 2, 0, 0], bevel: 0.006, seg: 8 })
      break
    case 'dish': {
      // a bowl tipped back on a short stand, with its feed out in front
      const bowl = new THREE.Shape()
      bowl.absarc(0, 0, s * 0.36, Math.PI, Math.PI * 2, false)
      bowl.closePath()
      kit.at([-s * 0.06, s * 0.1, 0], [0, 0, -0.7], () => kit.extrude(bowl, 0.03, { ...flat, bevel: 0.006, bevelSeg: 1, curveSeg: 8 }))
      kit.cyl(s * 0.085, s * 0.085, 0.024, { ...flat, at: [s * 0.26, s * 0.36, 0], rot: [Math.PI / 2, 0, 0], bevel: 0.006, seg: 8 })
      kit.beam([-s * 0.12, -s * 0.12, 0], [-s * 0.12, -s * 0.44, 0], s * 0.09, { ...flat })
      kit.beam([-s * 0.32, -s * 0.44, 0], [s * 0.08, -s * 0.44, 0], s * 0.09, { ...flat })
      break
    }
  }
}

/**
 * A chunky wooden crate with slatted rims and a painted label carrying a
 * stencilled icon on its front and its lid. Bottom on the origin.
 */
export function stencilCrate(kit: Kit, at: V3, size: number, rotY: number, kind?: Stencil, color: string = palette.navy, o: { label?: string; wood?: [string, string] } = {}): void {
  const [w0, w1] = o.wood ?? [palette.woodDark, palette.wood]
  const label = o.label ?? palette.cream
  kit.at(at, [0, rotY, 0], () => {
    kit.box(size, size, size, { color: w0, top: w1, at: [0, size / 2, 0], r: size * 0.07, seg: 2 })
    const t = size * 0.15
    for (const y of [t * 0.75, size - t * 0.75]) {
      kit.box(size * 1.07, t, size * 1.07, { color: w1, top: mix(w1, palette.woodLight, 0.7), at: [0, y, 0], r: t * 0.32, shade: 0.06, seg: 2 })
    }
    // corner battens
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(t * 0.9, size * 0.72, t * 0.9, { color: w1, top: mix(w1, palette.woodLight, 0.5), at: [sx * size * 0.5, size / 2, sz * size * 0.5], r: t * 0.25, shade: 0.05, seg: 1 })
    if (kind) {
      // front label
      kit.box(size * 0.6, size * 0.5, 0.03, { color: label, at: [0, size / 2, size / 2 + 0.004], r: 0.02, shade: 0.03, seg: 1 })
      kit.at([0, size / 2, size / 2 + 0.02], undefined, () => stencil(kit, kind, size * 0.42, color))
      // lid label
      kit.box(size * 0.62, 0.03, size * 0.62, { color: label, at: [0, size + 0.004, 0], r: 0.02, shade: 0.03, seg: 1 })
      kit.at([0, size + 0.02, 0], [-Math.PI / 2, 0, 0], () => stencil(kit, kind, size * 0.46, color))
    }
  })
}

/** A stout wooden cask with iron hoops, bottom on the origin. */
export function cask(kit: Kit, at: V3, s = 1, hoop: string = palette.steel): void {
  kit.at(at, undefined, () => {
    kit.lathe(
      [
        [0, 0],
        [0.2 * s, 0],
        [0.235 * s, 0.05 * s],
        [0.275 * s, 0.3 * s],
        [0.235 * s, 0.55 * s],
        [0.2 * s, 0.6 * s],
        [0, 0.6 * s],
      ],
      { color: palette.woodDark, top: palette.plankWarm, seg: 14 },
    )
    kit.cyl(0.19 * s, 0.19 * s, 0.03, { color: palette.wood, top: palette.woodLight, at: [0, 0.6 * s, 0], bevel: 0.01, seg: 14, shade: 0.04 })
    for (const [y, r] of [
      [0.13, 0.252],
      [0.47, 0.252],
    ]) kit.torus(r * s, 0.022 * s, { color: hoop, top: palette.metalLight, at: [0, y * s, 0], tube: 5, seg: 14, mat: 'metal' })
  })
}

/** A painted steel drum, bottom on the origin. */
export function drum(kit: Kit, at: V3, dark: string, light: string, s = 1): void {
  kit.at(at, undefined, () => {
    kit.cyl(0.24 * s, 0.24 * s, 0.62 * s, { color: dark, top: light, at: [0, 0.31 * s, 0], bevel: 0.06 * s, seg: 14 })
    for (const y of [0.2, 0.42]) kit.torus(0.243 * s, 0.024 * s, { color: mix(light, palette.white, 0.45), at: [0, y * s, 0], tube: 5, seg: 14 })
    kit.cyl(0.05 * s, 0.05 * s, 0.03, { color: palette.metalLight, at: [0.1 * s, 0.625 * s, 0.05 * s], bevel: 0.008, seg: 8, shade: 0 })
  })
}

/** A flat cargo pallet, bottom on the origin. */
export function pallet(kit: Kit, at: V3, s = 1, rotY = 0): void {
  kit.at(at, [0, rotY, 0], () => {
    for (const x of [-0.36, 0, 0.36]) kit.box(0.12 * s, 0.07, 0.92 * s, { color: palette.woodDark, top: palette.wood, at: [x * s, 0.035, 0], r: 0.02, seg: 1 })
    for (let i = 0; i < 5; i++) kit.box(0.94 * s, 0.035, 0.15 * s, { color: palette.wood, top: i % 2 ? palette.woodLight : palette.plankWarm, at: [0, 0.085, (i - 2) * 0.195 * s], r: 0.012, shade: 0.04, seg: 1 })
  })
}

// ------------------------------------------------------------------ the goods: toy space parts
/** Glossy blue solar panel with a pale frame and cell lines. Stands on the origin in the XY plane, facing +Z. */
export function solarPanel(kit: Kit, w: number, h: number): void {
  kit.box(w, h, 0.05, { color: palette.navy, top: palette.blue, at: [0, h / 2, 0], r: 0.018, mat: 'gloss', shade: 0.1, seg: 1 })
  const f = 0.035
  for (const sy of [f / 2, h - f / 2]) kit.box(w + 0.02, f, 0.065, { color: palette.metalLight, top: palette.white, at: [0, sy, 0], r: 0.012, shade: 0.02, seg: 1 })
  for (const sx of [-1, 1]) kit.box(f, h, 0.065, { color: palette.metalLight, top: palette.white, at: [sx * (w / 2 - f / 2 + 0.01), h / 2, 0], r: 0.012, shade: 0.02, seg: 1 })
  // cell lines
  kit.box(0.016, h - f * 2, 0.058, { color: palette.sky, at: [0, h / 2, 0], r: 0.004, shade: 0, seg: 1 })
  for (const k of [1 / 3, 2 / 3]) kit.box(w - f * 2, 0.016, 0.058, { color: palette.sky, at: [0, h * k, 0], r: 0.004, shade: 0, seg: 1 })
}

/** A solar array folded like a concertina, standing on its hinge edge. Centre-bottom on the origin, facing +Z. */
export function foldedSolar(kit: Kit, panels: number, w: number, h: number, fold = 0.5): void {
  const stepX = w * Math.cos(fold)
  const x0 = (-(panels - 1) * stepX) / 2
  kit.box(panels * stepX + 0.12, 0.06, 0.34, { color: palette.steel, top: palette.metal, at: [0, 0.03, 0], r: 0.025, seg: 1 })
  for (let i = 0; i < panels; i++) {
    kit.at([x0 + i * stepX, 0.06, 0], [0, i % 2 ? -fold : fold, 0], () => solarPanel(kit, w, h))
  }
  // hinge posts at the folds
  for (let i = 0; i <= panels; i++) {
    const z = (i % 2 ? 1 : -1) * (w / 2) * Math.sin(fold)
    kit.cyl(0.022, 0.022, h + 0.02, { color: palette.metalLight, at: [x0 + (i - 0.5) * stepX, 0.06 + h / 2, z], bevel: 0.008, seg: 6, shade: 0.02 })
  }
}

/** A small dish antenna on a stubby stand, looking up and towards +Z. Bottom on the origin. */
export function dishAntenna(kit: Kit, R: number, rim: string = palette.red, tilt = 0.75): void {
  const stem = R * 0.9
  kit.cyl(R * 0.42, R * 0.5, R * 0.22, { color: palette.steel, top: palette.metal, at: [0, R * 0.11, 0], bevel: R * 0.07, seg: 12, mat: 'metal' })
  kit.cyl(R * 0.13, R * 0.17, stem, { color: palette.metalDark, top: palette.metalLight, at: [0, R * 0.2 + stem / 2, 0], bevel: 0.02, seg: 8, mat: 'metal' })
  kit.at([0, R * 0.2 + stem, 0], [tilt, 0, 0], () => {
    const depth = R * 0.36
    const n = 6
    const inner: [number, number][] = []
    const outer: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const r = (i / n) * R
      inner.push([r, depth * (r / R) ** 2 + 0.012])
      outer.push([r, depth * (r / R) ** 2 - R * 0.14])
    }
    kit.lathe(inner.slice().reverse(), { color: palette.creamShade, top: palette.white, seg: 18, shade: 0.08 })
    kit.lathe([...outer, [R + 0.01, depth + 0.012]], { color: palette.metalDark, top: palette.metal, seg: 18, shade: 0.1 })
    kit.torus(R, R * 0.11, { color: rim, at: [0, depth + 0.01, 0], tube: 6, seg: 18 })
    // feed on three struts
    const focus = R * 0.86
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5
      kit.beam([Math.cos(a) * R * 0.82, depth * 0.7, Math.sin(a) * R * 0.82], [0, focus, 0], R * 0.07, { color: palette.metalLight, round: true })
    }
    kit.sphere(R * 0.17, { color: rim, at: [0, focus, 0], seg: 8 })
  })
}

/** A fat camera lens lying in a cradle, glass towards +Z and tipped up at the camera. Bottom on the origin. */
export function cameraLens(kit: Kit, r: number, ring: string = palette.red, tilt = 0.7): void {
  kit.box(r * 1.5, r * 0.34, r * 1.3, { color: palette.woodDark, top: palette.wood, at: [0, r * 0.17, 0], r: r * 0.1, seg: 1 })
  kit.at([0, r * 1.05, 0], [-tilt, 0, 0], () => {
    const ax: V3 = [Math.PI / 2, 0, 0]
    kit.cyl(r * 0.86, r * 0.8, r * 1.2, { color: palette.soot, top: palette.steel, at: [0, 0, -r * 0.3], rot: ax, bevel: r * 0.12, seg: 16 })
    kit.cyl(r, r * 0.92, r * 0.7, { color: palette.navyDark, top: palette.navy, at: [0, 0, r * 0.45], rot: ax, bevel: r * 0.14, seg: 16 })
    kit.torus(r * 0.9, r * 0.09, { color: ring, at: [0, 0, r * 0.08], rot: ax, tube: 6, seg: 16 })
    kit.torus(r * 0.84, r * 0.13, { color: palette.metalLight, at: [0, 0, r * 0.8], rot: ax, tube: 6, seg: 16, mat: 'metal' })
    kit.cyl(r * 0.76, r * 0.76, r * 0.1, { color: palette.glassDeep, top: palette.glass, at: [0, 0, r * 0.8], rot: ax, bevel: r * 0.04, seg: 16, mat: 'glass', shade: 0.3 })
    // glint
    kit.sphere(r * 0.2, { color: palette.white, at: [-r * 0.28, r * 0.28, r * 0.84], scale: [1, 1, 0.3], seg: 6, mat: 'glowSoft', shade: 0 })
  })
}

/** A battery pack: fat cells with bright caps standing in a tray. Centre-bottom on the origin, cells along X. */
export function batteryPack(kit: Kit, cells: number, r: number, h: number, colors: [string, string][] = [[palette.roofGreenDark, palette.green]]): void {
  const span = (cells - 1) * r * 2.15
  kit.box(span + r * 2.7, r * 0.6, r * 2.7, { color: palette.steel, top: palette.metal, at: [0, r * 0.3, 0], r: r * 0.25, seg: 1 })
  for (let i = 0; i < cells; i++) {
    const x = -span / 2 + i * r * 2.15
    const [c0, c1] = colors[i % colors.length]
    kit.cyl(r, r, h, { color: c0, top: c1, at: [x, r * 0.35 + h / 2, 0], bevel: r * 0.25, seg: 12, mat: 'gloss' })
    kit.torus(r * 1.01, r * 0.13, { color: palette.yellow, at: [x, r * 0.35 + h * 0.74, 0], tube: 5, seg: 12 })
    kit.cyl(r * 0.42, r * 0.42, r * 0.36, { color: palette.metalLight, top: palette.white, at: [x, r * 0.35 + h + r * 0.1, 0], bevel: r * 0.1, seg: 8, mat: 'metal' })
  }
}

/**
 * The display satellite: gold-foil body, two blue wings, a dish and a whip.
 * Built into its own kit so it can turn on its stand. Centre-bottom on the origin.
 */
export function buildShowSatellite(s = 1): THREE.Group {
  const kit = new Kit()
  kit.box(0.62 * s, 0.7 * s, 0.62 * s, { color: palette.yellowDark, top: palette.yellow, at: [0, 0.35 * s, 0], r: 0.09 * s, mat: 'gloss' })
  // foil seams
  for (const y of [0.24, 0.48]) kit.box(0.64 * s, 0.03 * s, 0.64 * s, { color: palette.orangeDark, at: [0, y * s, 0], r: 0.012, shade: 0, seg: 1 })
  kit.box(0.26 * s, 0.26 * s, 0.03, { color: palette.navyDark, top: palette.navy, at: [0, 0.36 * s, 0.315 * s], r: 0.03, mat: 'glass', seg: 1 })
  for (const side of [-1, 1]) {
    kit.beam([side * 0.31 * s, 0.36 * s, 0], [side * 0.5 * s, 0.36 * s, 0], 0.06 * s, { color: palette.metalLight, round: true })
    kit.at([side * 1.0 * s, 0.06 * s, 0], [0.3, 0, 0], () => kit.at([0, 0, 0], [0, 0, 0], () => solarPanel(kit, 0.98 * s, 0.6 * s)))
  }
  kit.at([0, 0.7 * s, 0], [0, 0.6, 0], () => dishAntenna(kit, 0.26 * s, palette.red, 0.5))
  kit.beam([0.2 * s, 0.7 * s, -0.2 * s], [0.26 * s, 1.15 * s, -0.26 * s], 0.035 * s, { color: palette.metalLight, round: true })
  kit.sphere(0.055 * s, { color: palette.red, at: [0.26 * s, 1.17 * s, -0.26 * s], seg: 8 })
  return kit.build('showSatellite')
}
