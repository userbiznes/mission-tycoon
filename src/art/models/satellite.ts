import * as THREE from 'three'
import { Kit } from '../kit'
import { logoPlate } from '../logo'
import { palette } from '../palette'

/**
 * The player's satellite, assembled from the parts in the design. Each part is
 * its own child object (named `part:<index>`) so the builder can pop new parts
 * into place. Pure looks: the rules engine never sees this.
 */

export interface SatelliteDesign {
  busId: string | null
  parts: string[]
}

interface Bus {
  w: number
  h: number
  d: number
}

const BUS: Record<string, Bus> = {
  bus3u: { w: 1.0, h: 2.5, d: 1.0 },
  bus6u: { w: 1.9, h: 2.5, d: 1.0 },
}

function busModel(b: Bus): THREE.Group {
  const k = new Kit()
  // gold-foil body inside a steel frame
  k.box(b.w, b.h, b.d, { color: palette.yellowDark, top: palette.yellow, r: 0.06, mat: 'metal', shade: 0.1 })
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      k.box(0.11, b.h + 0.08, 0.11, { color: palette.metalDark, top: palette.metalLight, at: [(sx * b.w) / 2, 0, (sz * b.d) / 2], r: 0.035, mat: 'metal' })
  for (const y of [-b.h / 2, b.h / 2]) {
    k.box(b.w + 0.1, 0.1, b.d + 0.1, { color: palette.metalDark, top: palette.metalLight, at: [0, y, 0], r: 0.035, mat: 'metal' })
  }
  const g = k.build('bus')
  const logo = logoPlate(0.46)
  logo.position.set(b.w / 2 - 0.3, b.h / 2 - 0.36, b.d / 2 + 0.012)
  g.add(logo)
  return g
}

type Maker = (k: Kit, b: Bus, nth: number) => void

const lens = (k: Kit, x: number, y: number, z: number, r: number, len: number, glass: string, glassTop: string) => {
  k.cyl(r, r * 1.08, len, { color: palette.soot, top: palette.steel, at: [x, y, z + len / 2], rot: [Math.PI / 2, 0, 0], bevel: 0.03, mat: 'metal', seg: 18 })
  k.torus(r * 0.94, r * 0.14, { color: palette.metalLight, at: [x, y, z + len], rot: [Math.PI / 2, 0, 0], mat: 'metal', tube: 8, seg: 18 })
  k.sphere(r * 0.8, { color: glass, top: glassTop, at: [x, y, z + len - 0.02], scale: [1, 1, 0.3], mat: 'glass', seg: 14 })
}

const MAKERS: Record<string, Maker> = {
  bodyCells: (k, b) => {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        k.box(0.04, b.h * 0.27, b.d * 0.74, { color: palette.navyDark, top: palette.blueDark, at: [sx * (b.w / 2 + 0.03), -b.h * 0.3 + i * b.h * 0.3, 0], r: 0.015, mat: 'glass' })
      }
    }
    for (let i = 0; i < 3; i++) {
      k.box(b.w * 0.74, b.h * 0.27, 0.04, { color: palette.navyDark, top: palette.blueDark, at: [0, -b.h * 0.3 + i * b.h * 0.3, -(b.d / 2 + 0.03)], r: 0.015, mat: 'glass' })
    }
  },
  deployPanels: (k, b, nth) => {
    const reach = nth * 1.9
    for (const sx of [-1, 1]) {
      const x0 = sx * (b.w / 2 + 0.12 + reach)
      k.box(0.3, 0.09, 0.09, { color: palette.metalDark, top: palette.metalLight, at: [x0 + sx * 0.06, 0.2, 0], r: 0.03, mat: 'metal' })
      for (let i = 0; i < 2; i++) {
        const x = x0 + sx * (0.62 + i * 0.86)
        k.box(0.8, 1.7, 0.06, { color: palette.navyDark, top: palette.blue, at: [x, 0.2, 0], r: 0.03, mat: 'glass' })
        // cell grid
        for (const dy of [-0.42, 0, 0.42]) k.box(0.74, 0.025, 0.075, { color: palette.metalLight, at: [x, 0.2 + dy, 0], r: 0.01, shade: 0 })
        k.box(0.025, 1.62, 0.075, { color: palette.metalLight, at: [x, 0.2, 0], r: 0.01, shade: 0 })
      }
    }
  },
  batterySmall: (k, b, nth) => {
    k.box(0.5, 0.5, 0.2, { color: palette.orangeDark, top: palette.orange, at: [-b.w * 0.18 + nth * 0.3, -b.h * 0.26, -(b.d / 2 + 0.12)], r: 0.06 })
    k.cyl(0.05, 0.05, 0.08, { color: palette.metalLight, at: [-b.w * 0.18 + nth * 0.3 - 0.12, -b.h * 0.26 + 0.28, -(b.d / 2 + 0.12)], bevel: 0.01, seg: 8, mat: 'metal' })
  },
  batteryLarge: (k, b, nth) => {
    k.box(0.72, 0.9, 0.24, { color: palette.redDark, top: palette.red, at: [nth * 0.2, b.h * 0.1, -(b.d / 2 + 0.14)], r: 0.07 })
    for (const dx of [-0.2, 0.2]) k.cyl(0.06, 0.06, 0.1, { color: palette.metalLight, at: [nth * 0.2 + dx, b.h * 0.1 + 0.48, -(b.d / 2 + 0.14)], bevel: 0.01, seg: 8, mat: 'metal' })
  },
  radioUhf: (k, b) => {
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        k.beam([(sx * b.w) / 2, b.h / 2, (sz * b.d) / 2], [sx * (b.w / 2 + 0.75), b.h / 2 + 0.75, sz * (b.d / 2 + 0.75)], 0.045, { color: palette.metalLight, round: true })
        k.sphere(0.06, { color: palette.red, at: [sx * (b.w / 2 + 0.75), b.h / 2 + 0.75, sz * (b.d / 2 + 0.75)], seg: 8 })
      }
  },
  radioSband: (k, b) => {
    k.cyl(0.06, 0.08, 0.3, { color: palette.metalDark, top: palette.metalLight, at: [-b.w * 0.2, b.h / 2 + 0.18, 0], bevel: 0.02, seg: 10, mat: 'metal' })
    k.lathe(
      [
        [0.0, 0],
        [0.3, 0.07],
        [0.46, 0.2],
        [0.5, 0.3],
        [0.47, 0.3],
        [0.28, 0.12],
        [0.0, 0.06],
      ],
      { color: palette.creamShade, top: palette.white, at: [-b.w * 0.2, b.h / 2 + 0.3, 0.05], rot: [0.5, 0, 0], seg: 20, mat: 'gloss' },
    )
    k.sphere(0.06, { color: palette.red, at: [-b.w * 0.2, b.h / 2 + 0.62, 0.22], seg: 8 })
  },
  cpuBasic: (k, b) => {
    k.box(0.5, 0.42, 0.05, { color: palette.leafDark, top: palette.green, at: [-b.w / 2 + 0.36, b.h * 0.3, b.d / 2 + 0.03], r: 0.02 })
    k.box(0.16, 0.16, 0.07, { color: palette.soot, at: [-b.w / 2 + 0.3, b.h * 0.32, b.d / 2 + 0.045], r: 0.02 })
    k.box(0.1, 0.07, 0.07, { color: palette.yellow, at: [-b.w / 2 + 0.5, b.h * 0.24, b.d / 2 + 0.045], r: 0.015, mat: 'metal' })
  },
  cpuHardened: (k, b) => {
    k.box(0.58, 0.5, 0.09, { color: palette.metalDark, top: palette.metalLight, at: [-b.w / 2 + 0.38, b.h * 0.3, b.d / 2 + 0.04], r: 0.03, mat: 'metal' })
    k.box(0.42, 0.34, 0.11, { color: palette.leafDark, top: palette.green, at: [-b.w / 2 + 0.38, b.h * 0.3, b.d / 2 + 0.045], r: 0.02 })
    for (const [dx, dy] of [
      [-0.24, -0.2],
      [0.24, -0.2],
      [-0.24, 0.2],
      [0.24, 0.2],
    ])
      k.sphere(0.035, { color: palette.yellow, at: [-b.w / 2 + 0.38 + dx, b.h * 0.3 + dy, b.d / 2 + 0.09], seg: 6, mat: 'metal' })
  },
  magnetorquers: (k, b) => {
    for (const y of [-b.h * 0.42, b.h * 0.42]) {
      k.box(b.w + 0.2, 0.09, b.d + 0.2, { color: palette.rustDark, top: palette.rustLight, at: [0, y, 0], r: 0.04, mat: 'metal' })
    }
  },
  reactionWheels: (k, b) => {
    k.box(0.62, 0.62, 0.22, { color: palette.steel, top: palette.metal, at: [b.w * 0.14, -b.h * 0.24, b.d / 2 + 0.1], r: 0.05, mat: 'metal' })
    k.cyl(0.24, 0.24, 0.08, { color: palette.tealDark, top: palette.teal, at: [b.w * 0.14, -b.h * 0.24, b.d / 2 + 0.23], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 18, mat: 'gloss' })
    k.sphere(0.06, { color: palette.metalLight, at: [b.w * 0.14, -b.h * 0.24, b.d / 2 + 0.28], seg: 8, mat: 'metal' })
  },
  camWide: (k, b, nth) => lens(k, b.w * 0.12 - nth * 0.42, b.h * 0.06, b.d / 2, 0.21, 0.26, palette.glassDeep, palette.glass),
  camHiRes: (k, b, nth) => lens(k, -b.w * 0.05 + nth * 0.5, -b.h * 0.02, b.d / 2, 0.34, 0.85, palette.glassDeep, palette.glass),
  thermalSensor: (k, b, nth) => {
    const x = b.w * 0.22 - nth * 0.4
    lens(k, x, b.h * 0.34, b.d / 2, 0.19, 0.3, palette.redDark, palette.orange)
    for (let i = 0; i < 3; i++) k.box(0.34, 0.04, 0.16, { color: palette.metalDark, top: palette.metalLight, at: [x, b.h * 0.34 + 0.3 + i * 0.08, b.d / 2 + 0.08], r: 0.012, mat: 'metal' })
  },
  thrusterColdGas: (k, b) => {
    k.lathe(
      [
        [0.0, 0],
        [0.2, 0],
        [0.13, 0.2],
        [0.09, 0.3],
      ],
      { color: palette.soot, top: palette.steel, at: [0, -b.h / 2 - 0.32, 0], seg: 14, mat: 'metal' },
    )
    k.sphere(0.16, { color: palette.creamShade, top: palette.white, at: [0.3, -b.h / 2 - 0.12, 0], seg: 12, mat: 'gloss' })
  },
  thrusterIon: (k, b) => {
    k.cyl(0.3, 0.26, 0.3, { color: palette.steel, top: palette.metalLight, at: [0, -b.h / 2 - 0.18, 0], bevel: 0.04, seg: 18, mat: 'metal' })
    k.cyl(0.2, 0.2, 0.04, { color: palette.screenGlow, at: [0, -b.h / 2 - 0.34, 0], bevel: 0.01, seg: 18, mat: 'glow', shade: 0 })
  },
}

export function createSatellite(design: SatelliteDesign): THREE.Group {
  const root = new THREE.Group()
  root.name = 'satellite'
  const b = BUS[design.busId ?? 'bus3u'] ?? BUS.bus3u
  if (design.busId) root.add(busModel(b))
  const seen: Record<string, number> = {}
  design.parts.forEach((id, index) => {
    const make = MAKERS[id]
    const nth = seen[id] ?? 0
    seen[id] = nth + 1
    const k = new Kit()
    if (make) make(k, b, nth)
    else k.box(0.3, 0.3, 0.12, { color: palette.metal, at: [0, 0, b.d / 2 + 0.07], r: 0.04 })
    const g = k.build(`part:${index}`)
    g.name = `part:${index}`
    g.userData.partId = id
    root.add(g)
  })
  root.userData.bus = b
  return root
}

/** The stand the satellite sits on in the Integration Bay. */
export function createTurntable(): THREE.Group {
  const k = new Kit()
  k.cyl(1.9, 2.05, 0.22, { color: palette.concreteDark, top: palette.concreteLight, at: [0, 0.11, 0], bevel: 0.06, seg: 40 })
  k.cyl(1.55, 1.55, 0.1, { color: palette.tealDark, top: palette.teal, at: [0, 0.26, 0], bevel: 0.03, seg: 40 })
  k.torus(1.72, 0.05, { color: palette.hazard, at: [0, 0.24, 0], seg: 40, tube: 6 })
  k.cyl(0.16, 0.22, 0.75, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.68, 0], bevel: 0.04, seg: 14, mat: 'metal' })
  k.box(0.9, 0.12, 0.9, { color: palette.steel, top: palette.metal, at: [0, 1.08, 0], r: 0.04, mat: 'metal' })
  const g = k.build('turntable')
  return g
}
