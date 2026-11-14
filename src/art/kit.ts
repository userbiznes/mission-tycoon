import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { materials, type MatKey } from './materials'

/**
 * Kit: a tiny procedural modelling toolkit.
 *
 * Every model in the game is built from rounded primitives through this class.
 * Each primitive is baked (transform + vertex colours with a soft vertical tint)
 * and merged per material, so a whole building is 1–3 draw calls.
 */

export type V3 = [number, number, number]

export interface PartOpts {
  /** base colour (from the palette) */
  color: string
  /** optional second colour blended in towards the top of the part */
  top?: string
  /** position */
  at?: V3
  /** euler rotation in radians (XYZ) */
  rot?: V3
  /** uniform or per-axis scale */
  scale?: number | V3
  /** material bucket */
  mat?: MatKey
  /** strength of the vertical shade tint (0 = flat). Default 0.16 */
  shade?: number
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c1 = new THREE.Color()
const _c2 = new THREE.Color()
const _c3 = new THREE.Color()

function matrixOf(at?: V3, rot?: V3, scale?: number | V3): THREE.Matrix4 {
  _p.set(at?.[0] ?? 0, at?.[1] ?? 0, at?.[2] ?? 0)
  _e.set(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0)
  _q.setFromEuler(_e)
  if (typeof scale === 'number') _s.set(scale, scale, scale)
  else if (scale) _s.set(scale[0], scale[1], scale[2])
  else _s.set(1, 1, 1)
  return new THREE.Matrix4().compose(_p, _q, _s)
}

/** A rounded 2D rectangle shape centred on the origin. */
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  r = Math.min(r, w / 2, h / 2)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/** Profile points for a cylinder with rounded top and bottom rims (for LatheGeometry). */
export function roundedCylinderProfile(
  rTop: number,
  rBottom: number,
  h: number,
  bevel: number,
  capTop = true,
  capBottom = true,
): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  const bt = Math.min(bevel, rTop * 0.95, h / 2)
  const bb = Math.min(bevel, rBottom * 0.95, h / 2)
  const n = 5
  if (capBottom) pts.push(new THREE.Vector2(0.0001, -h / 2))
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2)
    pts.push(new THREE.Vector2(rBottom - bb + Math.cos(a) * bb, -h / 2 + bb + Math.sin(a) * bb))
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2)
    pts.push(new THREE.Vector2(rTop - bt + Math.cos(a) * bt, h / 2 - bt + Math.sin(a) * bt))
  }
  if (capTop) pts.push(new THREE.Vector2(0.0001, h / 2))
  return pts
}

export class Kit {
  private buckets = new Map<MatKey, THREE.BufferGeometry[]>()
  private stack: THREE.Matrix4[] = []
  private current = new THREE.Matrix4()

  /** Run `fn` with an extra transform applied to everything added inside. */
  at(at: V3, rot: V3 | undefined, fn: () => void, scale?: number | V3): this {
    this.stack.push(this.current.clone())
    this.current.multiply(matrixOf(at, rot, scale))
    fn()
    this.current = this.stack.pop()!
    return this
  }

  /** Add any geometry. The geometry is consumed. */
  add(geo: THREE.BufferGeometry, o: PartOpts): this {
    let g = geo.index ? geo.toNonIndexed() : geo
    if (g !== geo) geo.dispose()
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    }
    if (!g.attributes.normal) g.computeVertexNormals()

    // vertex colours with a soft vertical tint, measured in the part's local space
    g.computeBoundingBox()
    const bb = g.boundingBox!
    const h = Math.max(1e-5, bb.max.y - bb.min.y)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const shade = o.shade ?? 0.16
    _c1.set(o.color)
    _c2.set(o.top ?? o.color)
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) - bb.min.y) / h
      _c3.copy(_c1).lerp(_c2, t)
      // darker and a touch cooler at the base, lighter and warmer up top
      const k = 1 - shade * (1 - t) + shade * 0.35 * t
      colors[i * 3] = _c3.r * k
      colors[i * 3 + 1] = _c3.g * k
      colors[i * 3 + 2] = _c3.b * (k + shade * 0.12 * (1 - t))
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    _m.copy(this.current).multiply(matrixOf(o.at, o.rot, o.scale))
    g.applyMatrix4(_m)
    const key = o.mat ?? 'matte'
    let list = this.buckets.get(key)
    if (!list) this.buckets.set(key, (list = []))
    list.push(g)
    return this
  }

  /** Rounded box. `r` is the bevel radius. */
  box(w: number, h: number, d: number, o: PartOpts & { r?: number; seg?: number }): this {
    const r = Math.min(o.r ?? 0.08, w / 2, h / 2, d / 2)
    return this.add(new RoundedBoxGeometry(w, h, d, o.seg ?? 3, r), o)
  }

  /** Cylinder with rounded rims, standing on the Y axis. */
  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    o: PartOpts & { bevel?: number; seg?: number; open?: boolean },
  ): this {
    const profile = roundedCylinderProfile(rTop, rBottom, h, o.bevel ?? 0.06, !o.open, !o.open)
    return this.add(new THREE.LatheGeometry(profile, o.seg ?? 24), o)
  }

  /** Free-form lathe. Points are [radius, y] pairs from bottom to top. */
  lathe(points: [number, number][], o: PartOpts & { seg?: number }): this {
    const pts = points.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y))
    return this.add(new THREE.LatheGeometry(pts, o.seg ?? 28), o)
  }

  sphere(r: number, o: PartOpts & { seg?: number }): this {
    const seg = o.seg ?? 20
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), o)
  }

  /** Low-poly blob (for clouds, bushes, rocks). */
  blob(r: number, o: PartOpts & { detail?: number }): this {
    return this.add(new THREE.IcosahedronGeometry(r, o.detail ?? 2), o)
  }

  /** Capsule along Y. `len` is the straight section length. */
  capsule(r: number, len: number, o: PartOpts & { seg?: number }): this {
    return this.add(new THREE.CapsuleGeometry(r, len, 6, o.seg ?? 16), o)
  }

  cone(r: number, h: number, o: PartOpts & { seg?: number; bevel?: number }): this {
    // rounded tip + rounded base rim via lathe
    const b = Math.min(o.bevel ?? 0.05, r * 0.5)
    const pts: [number, number][] = [
      [0, -h / 2],
      [r - b, -h / 2],
      [r, -h / 2 + b],
      [r * 0.55, -h / 2 + h * 0.48],
      [r * 0.16, h / 2 - h * 0.08],
      [r * 0.06, h / 2 - h * 0.02],
      [0, h / 2],
    ]
    return this.lathe(pts, o)
  }

  torus(R: number, r: number, o: PartOpts & { seg?: number; tube?: number; arc?: number }): this {
    // lies flat in the XZ plane
    const g = new THREE.TorusGeometry(R, r, o.tube ?? 10, o.seg ?? 28, o.arc ?? Math.PI * 2)
    g.rotateX(Math.PI / 2)
    return this.add(g, o)
  }

  /** Extrude a 2D shape (in XY) along Z with a rounded bevel, centred on Z. */
  extrude(
    shape: THREE.Shape,
    depth: number,
    o: PartOpts & { bevel?: number; curveSeg?: number; bevelSeg?: number },
  ): this {
    const bevel = Math.min(o.bevel ?? 0.04, depth / 2 - 0.001)
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, depth - bevel * 2),
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: o.bevelSeg ?? 3,
      curveSegments: o.curveSeg ?? 10,
    })
    g.translate(0, 0, -(depth - bevel * 2) / 2)
    return this.add(g, o)
  }

  /** Rounded slab lying flat on the ground (shape in XZ), `h` tall, sitting on y=0. */
  slab(w: number, d: number, h: number, r: number, o: PartOpts & { bevel?: number }): this {
    const shape = roundedRectShape(w, d, r)
    const bevel = Math.min(o.bevel ?? 0.05, h / 2 - 0.001)
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, h - bevel * 2),
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 8,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bevel, 0)
    return this.add(g, o)
  }

  /** A pipe/tube through points with rounded joints. */
  pipe(points: V3[], r: number, o: PartOpts & { seg?: number; radial?: number; tension?: number }): this {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      o.tension ?? 0.08,
    )
    this.add(new THREE.TubeGeometry(curve, o.seg ?? points.length * 8, r, o.radial ?? 8, false), o)
    // round end caps
    this.sphere(r, { ...o, at: addV(o.at, points[0]), seg: 8 })
    this.sphere(r, { ...o, at: addV(o.at, points[points.length - 1]), seg: 8 })
    return this
  }

  /** Straight rounded beam between two points. */
  beam(a: V3, b: V3, thickness: number, o: PartOpts & { round?: boolean }): this {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const len = va.distanceTo(vb)
    const mid = va.clone().add(vb).multiplyScalar(0.5)
    const dir = vb.clone().sub(va).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    const e = new THREE.Euler().setFromQuaternion(q)
    const g = o.round
      ? new THREE.CapsuleGeometry(thickness / 2, len, 4, 8)
      : new RoundedBoxGeometry(thickness, len + thickness, thickness, 2, thickness * 0.3)
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1))
    g.applyMatrix4(m)
    void e
    return this.add(g, { ...o, rot: undefined, at: o.at })
  }

  /** Merge one material bucket into a single geometry (for instancing). */
  geometry(key: MatKey = 'matte'): THREE.BufferGeometry {
    const list = this.buckets.get(key) ?? []
    const merged = mergeGeometries(list, false) ?? new THREE.BufferGeometry()
    list.forEach((g) => g.dispose())
    this.buckets.delete(key)
    merged.computeBoundingSphere()
    return merged
  }

  /** Merge everything into a group of at most one mesh per material. */
  build(name?: string): THREE.Group {
    const group = new THREE.Group()
    if (name) group.name = name
    for (const [key, list] of this.buckets) {
      if (!list.length) continue
      const merged = mergeGeometries(list, false)
      list.forEach((g) => g.dispose())
      if (!merged) continue
      merged.computeBoundingSphere()
      const mesh = new THREE.Mesh(merged, materials[key])
      const glowing = key === 'glow' || key === 'glowSoft'
      mesh.castShadow = !glowing && key !== 'glass'
      mesh.receiveShadow = !glowing
      mesh.name = `${name ?? 'part'}:${key}`
      group.add(mesh)
    }
    this.buckets.clear()
    return group
  }
}

function addV(a: V3 | undefined, b: V3): V3 {
  return a ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : b
}

/** Deterministic random numbers so the world looks the same every load. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
