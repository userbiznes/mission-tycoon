import * as THREE from 'three'
import { Kit } from '../kit'
import { logoPlate } from '../logo'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'

/**
 * The delivery boat: a stubby little cargo tug that brings ordered parts to the
 * dock. Bow points along +Z. `userData.tick` bobs it on the swell.
 */
export function createBoat(_opts: ModelOptions = {}): THREE.Object3D {
  const k = new Kit()
  // hull: a rounded lozenge seen from above, extruded and bevelled
  const hull = new THREE.Shape()
  hull.moveTo(-0.95, -2.0)
  hull.quadraticCurveTo(-1.15, 0.2, -0.75, 1.5)
  hull.quadraticCurveTo(0, 2.75, 0.75, 1.5)
  hull.quadraticCurveTo(1.15, 0.2, 0.95, -2.0)
  hull.quadraticCurveTo(0, -2.35, -0.95, -2.0)
  const put = (shape: THREE.Shape, depth: number, y: number, color: string, top: string, bevel = 0.12) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 12 })
    g.rotateX(Math.PI / 2)
    g.translate(0, y + depth, 0)
    k.add(g, { color, top, mat: 'gloss', shade: 0.16 })
  }
  put(hull, 0.75, -0.25, palette.redDark, palette.red)
  // white gunwale band and the deck
  const deck = new THREE.Shape()
  deck.moveTo(-0.86, -1.9)
  deck.quadraticCurveTo(-1.04, 0.2, -0.68, 1.42)
  deck.quadraticCurveTo(0, 2.55, 0.68, 1.42)
  deck.quadraticCurveTo(1.04, 0.2, 0.86, -1.9)
  deck.quadraticCurveTo(0, -2.2, -0.86, -1.9)
  put(deck, 0.14, 0.52, palette.creamShade, palette.white, 0.05)
  put(deck, 0.04, 0.62, palette.woodDark, palette.wood, 0.01)
  // wheelhouse at the stern
  k.box(1.15, 0.85, 1.0, { color: palette.creamShade, top: palette.cream, at: [0, 1.12, -1.15], r: 0.12 })
  k.box(0.95, 0.34, 0.06, { color: palette.glassDark, top: palette.glass, at: [0, 1.22, -0.64], r: 0.03, mat: 'glass' })
  for (const sx of [-1, 1]) k.box(0.06, 0.34, 0.6, { color: palette.glassDark, top: palette.glass, at: [sx * 0.58, 1.22, -1.15], r: 0.03, mat: 'glass' })
  k.box(1.4, 0.14, 1.25, { color: palette.tealDark, top: palette.teal, at: [0, 1.62, -1.15], r: 0.06 })
  k.cyl(0.14, 0.17, 0.6, { color: palette.orangeDark, top: palette.orange, at: [0.3, 1.98, -1.35], bevel: 0.04, seg: 12 })
  k.torus(0.15, 0.03, { color: palette.soot, at: [0.3, 2.2, -1.35], tube: 6, seg: 12 })
  // cargo: crates, a drum and a tarp-covered box
  for (const [x, z, s, r] of [
    [-0.38, 0.45, 0.62, 0.2],
    [0.36, 0.3, 0.56, -0.3],
    [-0.05, 1.1, 0.5, 0.5],
  ] as const) {
    k.box(s, s, s, { color: palette.woodDark, top: palette.wood, at: [x, 0.68 + s / 2, z], rot: [0, r, 0], r: 0.05 })
    k.box(s * 1.05, 0.08, s * 1.05, { color: palette.wood, top: palette.woodLight, at: [x, 0.68 + s * 0.82, z], rot: [0, r, 0], r: 0.02 })
  }
  k.cyl(0.2, 0.2, 0.5, { color: palette.blueDark, top: palette.blue, at: [0.42, 0.93, 0.95], bevel: 0.05, seg: 12 })
  // bumpers and a bow light
  for (const sx of [-1, 1]) for (const z of [-0.9, 0.3]) k.torus(0.16, 0.07, { color: palette.rubber, at: [sx * 1.05, 0.42, z], rot: [0, 0, Math.PI / 2], tube: 8, seg: 12 })
  k.sphere(0.09, { color: palette.lampWarm, top: palette.lampHot, at: [0, 0.86, 2.2], seg: 8, mat: 'glow', shade: 0 })
  // flag mast with the agency colours
  k.cyl(0.035, 0.045, 1.5, { color: palette.metalDark, top: palette.metalLight, at: [-0.45, 2.3, -1.5], bevel: 0.01, seg: 8 })
  k.box(0.5, 0.36, 0.03, { color: palette.creamShade, top: palette.white, at: [-0.18, 2.82, -1.5], r: 0.012 })
  const g = k.build('boat')
  const logo = logoPlate(0.3)
  logo.position.set(-0.18, 2.82, -1.48)
  g.add(logo)
  const back = logoPlate(0.3)
  back.position.set(-0.18, 2.82, -1.52)
  back.rotation.y = Math.PI
  g.add(back)
  ;(g.userData as ModelUserData).tick = (t) => {
    g.position.y = Math.sin(t * 1.7) * 0.06
    g.rotation.z = Math.sin(t * 1.3) * 0.035
    g.rotation.x = Math.sin(t * 1.1 + 1) * 0.025
  }
  const root = new THREE.Group()
  root.add(g)
  root.userData.tick = (g.userData as ModelUserData).tick
  return root
}
