import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../kit'
import { logoPlate } from '../logo'
import { palette } from '../palette'
import type { ModelOptions, ModelUserData } from '../registry'
import { batteryPack, buildShowSatellite, bulbString, cameraLens, canvasAwning, dishAntenna, foldedSolar, lantern, stencil, stencilCrate, type Stencil } from './cargo'
import { gableShape, mix, panelRoof, patchPlate, planter, readOpts, win, YAW } from './common'

/**
 * Parts Market: a timber market hall on the dock. A chunky hipped roof with a
 * front gable, the hanging "Parts Market" sign under the agency crest, one long
 * striped awning over the front counter, and the goods set out in the yard:
 * folded solar arrays, dish antennas, camera lenses, battery packs, stencilled
 * crates and a satellite turning on a stand. Two small stalls flank the hall.
 *
 * The goods are drawn far bigger than life so they still read from the game camera.
 * Level 1 has a patch or two; level 2 adds flower boxes, a weathervane and more
 * lights; level 3 more stock. Shop front on +Z; the origin is the middle of the
 * shop front, on the deck. The hall is about 5.4 × 2.8, the whole market 11 × 6.
 */

const HW = 5.4
const HD = 2.8
const HZ = -1.3
const WH = 2.05
const OV = 0.42
const RISE = 1.3
const FZ = HZ + HD / 2

/** A hipped roof solid: base w × d on y = 0, ridge of length `ridge` along X at height h. */
function hipSolid(w: number, d: number, h: number, ridge: number): THREE.BufferGeometry {
  const hw = w / 2
  const hd = d / 2
  const hr = ridge / 2
  const A = [-hw, 0, -hd]
  const B = [hw, 0, -hd]
  const C = [hw, 0, hd]
  const D = [-hw, 0, hd]
  const R1 = [-hr, h, 0]
  const R2 = [hr, h, 0]
  const tris = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris.flat()), 3))
  g.computeVertexNormals()
  return g
}

// ------------------------------------------------------------------ the sign's lettering
let signCanvas: HTMLCanvasElement | null = null
let signTexture: THREE.CanvasTexture | null = null
let signMaterial: THREE.MeshStandardMaterial | null = null

function drawSign(): void {
  const c = signCanvas!
  const ctx = c.getContext('2d')!
  ctx.fillStyle = palette.cream
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = palette.navy
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.round(c.height * 0.56)}px "Fredoka Variable", "Fredoka", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`
  ctx.fillText('PARTS MARKET', c.width / 2, c.height * 0.54, c.width * 0.8)
  // a little star either end
  ctx.fillStyle = palette.red
  for (const x of [c.width * 0.06, c.width * 0.94]) {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 ? 0.1 : 0.22) * c.height
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      ctx.lineTo(x + Math.cos(a) * r, c.height * 0.52 + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
  }
  signTexture!.needsUpdate = true
}

function signLettering(): THREE.MeshStandardMaterial {
  if (!signMaterial) {
    signCanvas = document.createElement('canvas')
    signCanvas.width = 1024
    signCanvas.height = 256
    signTexture = new THREE.CanvasTexture(signCanvas)
    signTexture.colorSpace = THREE.SRGBColorSpace
    signTexture.anisotropy = 8
    signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.85, metalness: 0 })
    drawSign()
    // the game font may still be on its way: letter the sign again once it lands
    document.fonts?.load('700 100px "Fredoka Variable"').then(drawSign, () => {})
  }
  return signMaterial
}

/** The hanging sign: a framed board on two chains under the agency crest. Origin: the hook it hangs from. */
function buildSign(): THREE.Group {
  const k = new Kit()
  const w = 2.5
  const h = 0.78
  const cy = -0.29 - h / 2
  k.box(w, h, 0.12, { color: palette.woodDark, top: palette.wood, at: [0, cy, 0], r: 0.06 })
  k.box(w - 0.16, h - 0.16, 0.05, { color: palette.creamShade, top: palette.cream, at: [0, cy, 0.05], r: 0.03, shade: 0.03, seg: 1 })
  for (const sx of [-1, 1]) {
    k.beam([0, 0, 0], [sx * (w / 2 - 0.2), -0.29, 0], 0.035, { color: palette.steel, round: true, shade: 0 })
    k.sphere(0.05, { color: palette.metalLight, at: [sx * (w / 2 - 0.2), -0.3, 0.02], seg: 6, mat: 'metal' })
  }
  // the crest's backing disc
  k.cyl(0.42, 0.42, 0.1, { color: palette.woodDark, top: palette.woodLight, at: [0, -0.3, 0.04], rot: [Math.PI / 2, 0, 0], bevel: 0.035, seg: 24 })
  k.cyl(0.36, 0.36, 0.06, { color: palette.creamShade, top: palette.white, at: [0, -0.3, 0.08], rot: [Math.PI / 2, 0, 0], bevel: 0.02, seg: 24, shade: 0.03 })
  const g = k.build('market-sign')
  const text = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, (w - 0.2) / 4), signLettering())
  text.position.set(0, cy - 0.06, 0.08)
  text.scale.set(1, (h - 0.3) / ((w - 0.2) / 4), 1)
  text.name = 'market-sign-text'
  g.add(text)
  const logo = logoPlate(0.6)
  logo.position.set(0, -0.3, 0.115)
  g.add(logo)
  return g
}

// ------------------------------------------------------------------ side stalls
/** A small market stall: four posts, a counter, a shelf board and a sagging striped awning. Front on +Z. */
function stall(kit: Kit, color: string, icon: Stencil, iconColor: string, goods: () => void): void {
  // posts: tall at the back, short at the front
  for (const sx of [-1, 1]) {
    kit.beam([sx * 0.8, 0, -0.5], [sx * 0.8, 1.66, -0.5], 0.11, { color: palette.woodDark, top: palette.wood })
    kit.beam([sx * 0.8, 0, 0.62], [sx * 0.8, 1.24, 0.62], 0.1, { color: palette.woodDark, top: palette.wood })
  }
  // counter with a painted front
  // (it stands proud of the awning, so the goods on it show from above)
  kit.box(1.44, 0.54, 0.66, { color: palette.woodDark, top: palette.wood, at: [0, 0.27, 0.52], r: 0.05 })
  kit.box(1.56, 0.09, 0.8, { color: palette.wood, top: palette.woodLight, at: [0, 0.58, 0.52], r: 0.035, shade: 0.05, seg: 2 })
  kit.box(1.24, 0.34, 0.04, { color: palette.cream, at: [0, 0.29, 0.855], r: 0.02, shade: 0.03, seg: 1 })
  kit.at([0, 0.29, 0.88], undefined, () => stencil(kit, icon, 0.28, iconColor))
  // back board and a shelf of boxed stock
  kit.box(1.56, 0.86, 0.07, { color: palette.woodDark, top: palette.wood, at: [0, 0.98, -0.5], r: 0.03, seg: 2 })
  kit.box(1.5, 0.05, 0.26, { color: palette.wood, top: palette.woodLight, at: [0, 1.02, -0.36], r: 0.02, seg: 1 })
  const stock: [number, number, string][] = [
    [-0.5, 0.24, color],
    [-0.16, 0.2, palette.creamShade],
    [0.18, 0.26, palette.metal],
    [0.52, 0.2, color],
  ]
  for (const [x, s, c] of stock) kit.box(s, s, s * 0.9, { color: mix(c, palette.navyDark, 0.2), top: c, at: [x, 1.045 + s / 2, -0.36], r: s * 0.16, seg: 1 })
  // the awning, and a lantern on the front post
  kit.at([0, 1.68, -0.6], undefined, () => canvasAwning(kit, 1.84, 1.3, color, palette.white, { drop: 0.4, sag: 0.13, droop: 0.09, stripes: 7 }))
  kit.beam([0.8, 1.2, 0.62], [1.02, 1.3, 0.72], 0.035, { color: palette.navyDark, round: true })
  kit.at([1.02, 1.3, 0.72], undefined, () => lantern(kit, 1.35))
  kit.at([0, 0.625, 0.66], undefined, goods)
}

export function createPartsMarket(opts: ModelOptions = {}): THREE.Object3D {
  const { level } = readOpts(opts)
  const old = level <= 1
  const rnd = seeded(51)
  const kit = new Kit()

  const roofDark = palette.redDark
  const roof = palette.roofRed
  const cap = mix(palette.roofRed, palette.cream, 0.42)
  const bulbs = [palette.lampWarm, palette.flowerPink, palette.screenGlow, palette.lampHot, palette.beaconGreen]

  // ---------------------------------------------------------------- the hall: timber frame, plaster panels
  kit.box(HW + 0.18, 0.16, HD + 0.18, { color: palette.trunkDark, top: palette.woodDark, at: [0, 0.08, HZ], r: 0.05, seg: 2 })
  kit.box(HW, WH, HD, { color: palette.creamShade, top: palette.cream, at: [0, WH / 2, HZ], r: 0.08 })
  // corner posts and the plate under the eaves
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.26, WH, 0.26, { color: palette.woodDark, top: palette.wood, at: [sx * (HW / 2 - 0.05), WH / 2, HZ + sz * (HD / 2 - 0.05)], r: 0.06, seg: 2 })
  kit.box(HW + 0.12, 0.2, 0.2, { color: palette.woodDark, top: palette.wood, at: [0, WH - 0.12, FZ + 0.02], r: 0.05, seg: 2 })
  for (const x of [-0.66, 0.66]) kit.box(0.2, WH, 0.18, { color: palette.woodDark, top: palette.wood, at: [x, WH / 2, FZ + 0.02], r: 0.05, seg: 2 })
  // the doorway, lit from inside
  const glow0 = mix(palette.lampWarm, palette.orangeDark, 0.5)
  kit.box(1.0, 1.4, 0.08, { color: glow0, top: palette.lampWarm, at: [0, 0.74, FZ + 0.03], r: 0.03, mat: 'glowSoft', shade: 0.1, seg: 1 })
  kit.box(1.24, 0.14, 0.24, { color: palette.woodDark, top: palette.wood, at: [0, 1.5, FZ + 0.04], r: 0.04, seg: 1 })
  kit.box(1.3, 0.08, 0.34, { color: palette.woodDark, top: palette.woodLight, at: [0, 0.04, FZ + 0.2], r: 0.03, seg: 1 })
  // serving hatches over the counters, with shelves of stock inside
  for (const sx of [-1, 1]) {
    const x = sx * 1.68
    kit.box(1.86, 0.9, 0.1, { color: palette.woodDark, top: palette.wood, at: [x, 1.14, FZ + 0.02], r: 0.04, seg: 2 })
    kit.box(1.68, 0.72, 0.07, { color: glow0, top: palette.lampWarm, at: [x, 1.14, FZ + 0.05], r: 0.025, mat: 'glowSoft', shade: 0.1, seg: 1 })
    kit.box(1.68, 0.05, 0.14, { color: palette.woodDark, top: palette.wood, at: [x, 1.16, FZ + 0.1], r: 0.02, seg: 1 })
    const shelf = [palette.blue, palette.yellow, palette.teal, palette.red, palette.purple]
    for (let i = 0; i < 5; i++) {
      const s = 0.16 + (i % 2) * 0.05
      kit.box(s, s, 0.1, { color: mix(shelf[i], palette.navyDark, 0.25), top: shelf[i], at: [x - 0.62 + i * 0.31, 1.185 + s / 2, FZ + 0.1], r: 0.03, seg: 1 })
    }
  }
  // a window in each end wall
  kit.at([-HW / 2, 1.15, HZ], [0, YAW.left, 0], () => win(kit, 0.7, 0.66, { frame: palette.wood, cross: true, glow: palette.lampWarm }))
  kit.at([HW / 2, 1.15, HZ], [0, YAW.right, 0], () => win(kit, 0.7, 0.66, { frame: palette.wood, cross: true, glow: palette.lampWarm }))

  // ---------------------------------------------------------------- the roof: a chunky hip with a front gable
  const rw = HW + OV * 2
  const rd = HD + OV * 2
  const ridge = rw - rd * 0.92
  const ry = WH + 0.05
  kit.box(rw + 0.08, 0.22, rd + 0.08, { color: roofDark, top: roof, at: [0, WH - 0.05, HZ], r: 0.1 })
  kit.add(hipSolid(rw, rd, RISE, ridge), { color: roofDark, top: roof, at: [0, ry, HZ], shade: 0.1 })
  // corner points of the hip, to hang the caps and shingle courses on
  const corner = (sx: number, sz: number): V3 => [(sx * rw) / 2, ry, HZ + (sz * rd) / 2]
  const peak = (sx: number): V3 => [(sx * ridge) / 2, ry + RISE, HZ]
  const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 0.03, a[2] + (b[2] - a[2]) * t]
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.beam(corner(sx, sz), peak(sx), 0.2, { color: mix(cap, roofDark, 0.4), top: cap })
  kit.beam(peak(-1), peak(1), 0.24, { color: cap, top: mix(cap, palette.white, 0.3) })
  for (const sx of [-1, 1]) kit.sphere(0.17, { color: cap, top: mix(cap, palette.white, 0.4), at: [(sx * ridge) / 2, ry + RISE + 0.06, HZ], seg: 10 })
  const course = mix(roofDark, palette.navyDark, 0.18)
  for (const f of [0.3, 0.62]) {
    for (const sz of [-1, 1]) kit.beam(lerp(corner(-1, sz), peak(-1), f), lerp(corner(1, sz), peak(1), f), 0.085, { color: course, top: roofDark })
    for (const sx of [-1, 1]) kit.beam(lerp(corner(sx, -1), peak(sx), f), lerp(corner(sx, 1), peak(sx), f), 0.085, { color: course, top: roofDark })
  }
  if (old) {
    // a mismatched patch on the sunny slope
    const alpha = Math.atan2(rd / 2, RISE)
    kit.at([1.75, ry + RISE * 0.42 + 0.03, HZ + (rd / 2) * 0.58], [-alpha, 0, 0], () => kit.at([0, 0, 0], [0, 0, 0.2], () => patchPlate(kit, 0.62, 0.46, palette.woodDark, palette.wood)))
  }

  // the front gable, rising from the eaves, with a tie beam and a ridge beam that carries the sign
  const GW = 2.5
  const gz = FZ + OV
  kit.extrude(gableShape(GW - 0.1, 0.98, 0.05), 0.14, { color: palette.creamShade, top: palette.cream, at: [0, WH, gz], bevel: 0.03, shade: 0.05 })
  kit.box(GW + 0.06, 0.17, 0.2, { color: palette.woodDark, top: palette.wood, at: [0, WH + 0.06, gz + 0.04], r: 0.05, seg: 2 })
  kit.box(0.16, 0.9, 0.16, { color: palette.woodDark, top: palette.wood, at: [0, WH + 0.5, gz + 0.03], r: 0.04, seg: 1 })
  kit.at([0, WH + 0.02, gz - 0.76], undefined, () => panelRoof(kit, GW, 1.0, 1.52, roofDark, roof, { thick: 0.18, overhang: 0.22, overhangZ: 0.14, ridge: cap, rows: 2, rowColor: course }))
  const hookY = WH + 1.1
  const hookZ = gz + 0.5
  kit.beam([0, hookY + 0.06, gz - 0.2], [0, hookY + 0.06, hookZ + 0.08], 0.15, { color: palette.woodDark, top: palette.wood })
  kit.sphere(0.07, { color: palette.metalLight, at: [0, hookY - 0.02, hookZ], seg: 6, mat: 'metal' })

  // ---------------------------------------------------------------- the shop front: counter, awning, lanterns
  const AW = 5.1
  const AD = 1.22
  const ay = 1.74
  const az = FZ + 0.06
  kit.at([0, ay, az], undefined, () =>
    canvasAwning(kit, AW, AD, palette.red, palette.white, { drop: 0.34, sag: 0.13, droop: 0.1, stripes: 17, patch: old ? [-0.3, 0.5, palette.creamShade] : undefined }),
  )
  const lip = az + AD
  for (const x of [-AW / 2 + 0.04, -0.56, 0.56, AW / 2 - 0.04]) kit.beam([x, 0, lip - 0.05], [x, ay - 0.42, lip - 0.05], 0.1, { color: palette.woodDark, top: palette.wood })
  for (const sx of [-1, 1]) {
    const x = sx * 1.54
    // the counter stands half out from under the awning, so what is on it shows from above
    kit.box(1.86, 0.54, 0.62, { color: palette.woodDark, top: palette.wood, at: [x, 0.27, lip - 0.08], r: 0.05 })
    kit.box(2.0, 0.09, 0.76, { color: palette.wood, top: palette.woodLight, at: [x, 0.58, lip - 0.08], r: 0.035, shade: 0.05, seg: 2 })
    // painted front with three stencils
    kit.box(1.66, 0.34, 0.04, { color: palette.cream, at: [x, 0.29, lip + 0.235], r: 0.02, shade: 0.03, seg: 1 })
    const icons: [Stencil, string][] = sx < 0 ? [['bolt', palette.orangeDark], ['panel', palette.blueDark], ['bolt', palette.orangeDark]] : [['dish', palette.blueDark], ['sat', palette.tealDark], ['dish', palette.blueDark]]
    icons.forEach(([kind, c], i) => kit.at([x + (i - 1) * 0.52, 0.29, lip + 0.26], undefined, () => stencil(kit, kind, 0.26, c)))
    // a lantern at each end of the awning
    kit.beam([sx * (AW / 2 - 0.04), ay - 0.5, lip - 0.05], [sx * (AW / 2 + 0.2), ay - 0.4, lip + 0.04], 0.035, { color: palette.navyDark, round: true })
    kit.at([sx * (AW / 2 + 0.2), ay - 0.4, lip + 0.04], undefined, () => lantern(kit, 1.5))
  }
  // on the counters: batteries and a small folded array; lenses and a little dish
  const cy = 0.625
  const cz = lip + 0.06
  kit.at([-2.0, cy, cz], undefined, () => batteryPack(kit, 3, 0.115, 0.32, [[palette.roofGreenDark, palette.green], [palette.orangeDark, palette.orange], [palette.roofGreenDark, palette.green]]))
  kit.at([-1.08, cy, cz - 0.02], undefined, () => foldedSolar(kit, 3, 0.26, 0.4, 0.55))
  kit.at([1.02, cy, cz], [0, 0.25, 0], () => cameraLens(kit, 0.17, palette.red))
  kit.at([1.5, cy, cz], [0, -0.2, 0], () => cameraLens(kit, 0.14, palette.yellow))
  kit.at([2.08, cy, cz - 0.02], [0, -1.2, 0], () => dishAntenna(kit, 0.22, palette.blue, 0.85))

  // ---------------------------------------------------------------- the yard: big, readable goods with room between them
  kit.at([-1.62, 0, 2.2], [0, 0.06, 0], () => foldedSolar(kit, 4, 0.44, 0.9, 0.5))
  kit.at([3.1, 0, 1.95], [0, -1.15, 0], () => dishAntenna(kit, 0.44, palette.red, 0.9))
  // camera lenses on a low crate, glass turned up to the light
  kit.box(1.2, 0.3, 0.66, { color: palette.woodDark, top: palette.wood, at: [3.05, 0.15, 3.2], rot: [0, -0.15, 0], r: 0.05, seg: 2 })
  kit.at([2.74, 0.3, 3.24], [0, 0.1, 0], () => cameraLens(kit, 0.29, palette.red))
  kit.at([3.4, 0.3, 3.12], [0, -0.3, 0], () => cameraLens(kit, 0.23, palette.yellow))
  // a rack of fat battery cells at the other end of the shop front
  kit.at([-3.32, 0, 1.95], [0, 0.2, 0], () => batteryPack(kit, 3, 0.2, 0.56, [[palette.roofGreenDark, palette.green], [palette.orangeDark, palette.orange], [palette.blueDark, palette.blue]]))
  // a neat stack of stencilled crates by the path
  stencilCrate(kit, [-3.0, 0, 3.25], 0.74, 0, 'bolt', palette.orangeDark)
  stencilCrate(kit, [-2.18, 0, 3.25], 0.74, 0, 'panel', palette.blueDark)
  stencilCrate(kit, [-2.59, 0.74, 3.25], 0.62, 0, 'dish', palette.tealDark)
  // the stand the display satellite turns on
  const sx0 = 1.45
  const sz0 = 3.0
  kit.cyl(0.56, 0.62, 0.2, { color: palette.woodDark, top: palette.wood, at: [sx0, 0.1, sz0], bevel: 0.06, seg: 18 })
  kit.cyl(0.46, 0.5, 0.26, { color: palette.creamShade, top: palette.white, at: [sx0, 0.3, sz0], bevel: 0.06, seg: 18 })
  kit.torus(0.49, 0.04, { color: palette.red, at: [sx0, 0.3, sz0], tube: 5, seg: 18 })
  kit.cyl(0.07, 0.09, 0.3, { color: palette.metalDark, top: palette.metalLight, at: [sx0, 0.56, sz0], bevel: 0.02, seg: 8, mat: 'metal' })
  if (level >= 3) {
    stencilCrate(kit, [3.4, 0, 4.0], 0.66, 0, 'sat', palette.tealDark)
    stencilCrate(kit, [-3.82, 0, 3.25], 0.62, 0, 'sat', palette.tealDark)
  }

  // ---------------------------------------------------------------- side stalls, turned in towards the yard
  const SX = 4.78
  const SZ = 0.3
  const SYAW = 0.42
  kit.at([-SX, 0, SZ], [0, SYAW, 0], () =>
    stall(kit, palette.teal, 'bolt', palette.orangeDark, () => {
      kit.at([-0.36, 0, 0], [0, 0.1, 0], () => foldedSolar(kit, 3, 0.25, 0.46, 0.55))
      kit.at([0.42, 0, 0.02], undefined, () => batteryPack(kit, 2, 0.12, 0.3, [[palette.blueDark, palette.blue], [palette.redDark, palette.red]]))
    }),
  )
  kit.at([SX, 0, SZ], [0, -SYAW, 0], () =>
    stall(kit, palette.yellow, 'dish', palette.blueDark, () => {
      kit.at([-0.4, 0, 0], [0, -0.73, 0], () => dishAntenna(kit, 0.25, palette.purple, 0.9))
      kit.at([0.16, 0, 0.04], [0, 0.1, 0], () => cameraLens(kit, 0.15, palette.teal))
      kit.at([0.56, 0, 0.04], [0, -0.2, 0], () => cameraLens(kit, 0.12, palette.red))
    }),
  )

  // ---------------------------------------------------------------- strings of bulbs
  const ey = WH - 0.09
  const ez = FZ + OV + 0.1
  bulbString(kit, [-rw / 2 + 0.05, ey, ez], [-GW / 2 - 0.2, ey, ez], 5, bulbs, { sag: 0.16 })
  bulbString(kit, [GW / 2 + 0.2, ey, ez], [rw / 2 - 0.05, ey, ez], 5, bulbs.slice(2).concat(bulbs.slice(0, 2)), { sag: 0.16 })
  // out to the stalls' near back posts
  const c = Math.cos(SYAW)
  const s = Math.sin(SYAW)
  const postX = SX - (0.8 * c - 0.5 * s)
  const postZ = SZ - 0.8 * s - 0.5 * c
  bulbString(kit, [-rw / 2 + 0.05, ey, ez], [-postX, 1.7, postZ], 4, bulbs, { sag: 0.2 })
  bulbString(kit, [rw / 2 - 0.05, ey, ez], [postX, 1.7, postZ], 4, bulbs.slice(1).concat(bulbs[0]), { sag: 0.2 })

  if (!old) {
    // flower boxes at the ends of the counters and a rocket weathervane on the ridge
    for (const sx of [-1, 1]) kit.at([sx * 2.95, 0, lip - 0.3], [0, sx * 0.5, 0], () => planter(kit, 0.74, [palette.flowerPink, palette.flowerYellow, palette.flowerWhite], rnd))
    kit.at([0.9, ry + RISE + 0.1, HZ], [0, 0.5, 0], () => {
      kit.cyl(0.03, 0.04, 0.6, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.3, 0], bevel: 0.01, seg: 6, mat: 'metal' })
      kit.beam([-0.3, 0.6, 0], [0.3, 0.6, 0], 0.035, { color: palette.metalLight, round: true })
      kit.capsule(0.07, 0.2, { color: palette.creamShade, top: palette.white, at: [0, 0.6, 0], rot: [0, 0, Math.PI / 2], seg: 8 })
      kit.cone(0.07, 0.14, { color: palette.red, at: [0.2, 0.6, 0], rot: [0, 0, -Math.PI / 2], seg: 8 })
      kit.box(0.02, 0.2, 0.12, { color: palette.red, at: [-0.2, 0.6, 0], r: 0.008, seg: 1 })
    })
    // a third string of bulbs swagged from the gable to the stalls' front posts
    const fx = SX - (0.8 * c + 0.62 * s)
    const fz = SZ - 0.8 * s + 0.62 * c
    bulbString(kit, [-GW / 2 - 0.1, WH + 0.25, gz + 0.2], [-fx, 1.3, fz], 6, bulbs, { sag: 0.3 })
    bulbString(kit, [GW / 2 + 0.1, WH + 0.25, gz + 0.2], [fx, 1.3, fz], 6, bulbs.slice(3).concat(bulbs.slice(0, 3)), { sag: 0.3 })
  }

  const group = kit.build('partsMarket')

  // ---------------------------------------------------------------- moving parts: the sign sways, the satellite turns
  const sign = buildSign()
  sign.position.set(0, hookY - 0.02, hookZ)
  group.add(sign)
  const sat = buildShowSatellite(0.78)
  sat.position.set(sx0, 0.7, sz0)
  sat.rotation.z = 0.12
  group.add(sat)

  const data = group.userData as ModelUserData
  data.tick = (t) => {
    sign.rotation.x = Math.sin(t * 1.15) * 0.035 + Math.sin(t * 2.7 + 1) * 0.012
    sat.rotation.y = t * 0.45
  }
  data.anchors = { sign, satellite: sat }
  return group
}
