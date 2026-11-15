import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Kit } from '../art/kit'
import '../art/models'
import { createRocket } from '../art/models/rocket'
import { createSatellite } from '../art/models/satellite'
import { palette } from '../art/palette'
import { createModel, hasModel } from '../art/registry'
import { REGIONS, type RegionId } from '../data/regions'
import { regionTint } from '../scene/regionTint'
import { SUN_DIR } from '../scene/Sky'
import { CAMERA_FOV, CAMERA_TILT, CAMERA_YAW } from '../scene/world'
import { Icon, type IconName } from './icons'

/**
 * Thumbnails drawn from the real 3D models: every building, part, rocket and
 * ruin in a menu is the same object the island shows, under the same sun, so
 * the icons match the world exactly.
 *
 * One small offscreen renderer draws each picture once and keeps it as an
 * image. Pictures are made one per frame, so opening a menu never stutters;
 * until one is ready its frame shows a shimmer.
 *
 * Keys: `building:<id>`, `region:<id>:<0|1>`, `part:<id>`, `rocket:<kind>`,
 * `material:<id>`, `sat:<busId>|<part,part,…>`.
 */

const SIZE = 256
const cache = new Map<string, string | null>()
const waiting = new Map<string, Set<() => void>>()
const queue: string[] = []
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let broken = false
let pumping = false

function setup(): boolean {
  if (renderer) return true
  if (broken) return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(1)
    renderer.setSize(SIZE, SIZE, false)
    renderer.setClearColor(0x000000, 0)
    // the same tone curve the island is finished with (see scene/Effects.tsx)
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1
    // the island's own light: sky and ground bounce, a little glow, the afternoon sun
    scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, 1.25))
    scene.add(new THREE.AmbientLight(palette.sunGlow, 0.18))
    const sun = new THREE.DirectionalLight(palette.sun, 2.5)
    sun.position.copy(SUN_DIR).multiplyScalar(90)
    scene.add(sun)
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 2000)
    return true
  } catch {
    broken = true
    return false
  }
}

/** Building materials for the restorations: drawn with the same kit as everything on the island. */
function materialModel(id: string): THREE.Object3D | null {
  const k = new Kit()
  if (id === 'cableSpool') {
    k.cyl(0.62, 0.62, 0.1, { color: palette.woodDark, top: palette.woodLight, at: [0, 0.05, 0], bevel: 0.03, seg: 22 })
    k.cyl(0.4, 0.4, 0.62, { color: palette.navyDark, top: palette.navy, at: [0, 0.41, 0], seg: 22 })
    for (let i = 0; i < 5; i++) k.torus(0.41, 0.05, { color: palette.orangeDark, top: palette.orange, at: [0, 0.17 + i * 0.12, 0], tube: 6, seg: 22 })
    k.cyl(0.62, 0.62, 0.1, { color: palette.woodDark, top: palette.woodLight, at: [0, 0.77, 0], bevel: 0.03, seg: 22 })
    k.cyl(0.12, 0.12, 0.05, { color: palette.metalDark, top: palette.metalLight, at: [0, 0.84, 0], seg: 12, mat: 'metal' })
  } else if (id === 'steelBeam') {
    for (const [y, z, rot] of [
      [0.12, -0.2, 0],
      [0.12, 0.22, 0],
      [0.38, 0.02, 0.5],
    ] as [number, number, number][]) {
      k.at([0, y, z], [0, rot, 0], () => {
        k.box(1.7, 0.05, 0.22, { color: palette.steel, top: palette.metalLight, at: [0, -0.09, 0], r: 0.015, mat: 'metal' })
        k.box(1.7, 0.16, 0.05, { color: palette.metalDark, top: palette.metal, at: [0, 0, 0], r: 0.01, mat: 'metal' })
        k.box(1.7, 0.05, 0.22, { color: palette.steel, top: palette.metalLight, at: [0, 0.09, 0], r: 0.015, mat: 'metal' })
      })
    }
  } else if (id === 'controlPanel') {
    k.box(1.2, 0.7, 0.5, { color: palette.navyDark, top: palette.navy, at: [0, 0.35, 0], r: 0.06 })
    k.at([0, 0.78, -0.02], [-0.5, 0, 0], () => {
      k.box(1.2, 0.08, 0.62, { color: palette.metalDark, top: palette.metalLight, at: [0, 0, 0], r: 0.03, mat: 'metal' })
      k.box(0.42, 0.04, 0.3, { color: palette.screenGlow, at: [-0.3, 0.05, -0.08], r: 0.02, mat: 'glow', shade: 0 })
      for (let i = 0; i < 3; i++) k.cyl(0.06, 0.06, 0.07, { color: [palette.red, palette.yellow, palette.green][i], at: [0.14 + i * 0.17, 0.07, -0.14], seg: 10 })
      for (let i = 0; i < 3; i++) k.box(0.05, 0.1, 0.05, { color: palette.cream, at: [0.14 + i * 0.17, 0.08, 0.1], r: 0.015 })
    })
  } else return null
  return k.build(`material:${id}`)
}

const ON_HULL = new Set(['radioUhf', 'magnetorquers', 'bodyCells'])

function build(key: string): { obj: THREE.Object3D; tilt: number; yaw: number } | null {
  const [kind, a, b] = key.split(':')
  try {
    if (kind === 'building') return hasModel(a) ? { obj: createModel(a, { level: Number(b ?? 1) || 1 }), tilt: CAMERA_TILT * 0.8, yaw: CAMERA_YAW } : null
    if (kind === 'region') return { obj: createModel(REGIONS[a as RegionId].model, { level: Number(b ?? 0) }), tilt: CAMERA_TILT * 0.75, yaw: CAMERA_YAW }
    if (kind === 'rocket') return { obj: createRocket({ kind: a }), tilt: 0.2, yaw: 0.6 }
    if (kind === 'material') {
      const obj = materialModel(a)
      return obj ? { obj, tilt: 0.62, yaw: 0.7 } : null
    }
    if (kind === 'part') {
      // most parts are drawn alone; the ones that only make sense wrapped round the hull are drawn on it
      const design = a.startsWith('bus') ? { busId: a, parts: [] } : ON_HULL.has(a) ? { busId: 'bus3u', parts: [a] } : { busId: null, parts: [a] }
      return { obj: createSatellite(design), tilt: 0.36, yaw: 0.62 }
    }
    if (kind === 'sat') {
      const [busId, parts] = a.split('|')
      return { obj: createSatellite({ busId: busId || null, parts: parts ? parts.split(',') : [] }), tilt: 0.3, yaw: 0.62 }
    }
  } catch {
    return null
  }
  return null
}

const _c = new THREE.Vector3()
const _v = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _fwd = new THREE.Vector3()

function draw(key: string): string | null {
  if (!setup() || !renderer || !scene || !camera) return null
  const made = build(key)
  if (!made) return null
  const { obj, tilt, yaw } = made
  scene.add(obj)
  obj.updateMatrixWorld(true)
  // look from the game's side of the world
  _fwd.set(-Math.sin(yaw) * Math.cos(tilt), -Math.sin(tilt), -Math.cos(yaw) * Math.cos(tilt))
  _right.set(Math.cos(yaw), 0, -Math.sin(yaw))
  _up.crossVectors(_right, _fwd)
  // frame what can actually be seen: the silhouette of the solid meshes as the camera sees them
  // (a bounding box is much looser: a flagpole or one far corner would shrink the whole picture)
  let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity, f0 = Infinity, f1 = -Infinity
  obj.traverseVisible((o) => {
    const mesh = o as THREE.Mesh
    const pos = mesh.isMesh ? (mesh.geometry?.getAttribute('position') as THREE.BufferAttribute | undefined) : undefined
    if (!pos) return
    const step = Math.max(1, Math.floor(pos.count / 6000))
    for (let n = 0; n < pos.count; n += step) {
      _v.fromBufferAttribute(pos, n).applyMatrix4(mesh.matrixWorld)
      const r = _v.dot(_right), u = _v.dot(_up), f = _v.dot(_fwd)
      if (r < r0) r0 = r
      if (r > r1) r1 = r
      if (u < u0) u0 = u
      if (u > u1) u1 = u
      if (f < f0) f0 = f
      if (f > f1) f1 = f
    }
  })
  if (!isFinite(r0)) {
    scene.remove(obj)
    return null
  }
  const half = Math.max((r1 - r0) / 2, (u1 - u0) / 2, 0.001)
  const depth = (f1 - f0) / 2
  _c.set(0, 0, 0).addScaledVector(_right, (r0 + r1) / 2).addScaledVector(_up, (u0 + u1) / 2).addScaledVector(_fwd, (f0 + f1) / 2)
  const dist = (half * 1.08) / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) + depth
  camera.position.copy(_c).addScaledVector(_fwd, -dist)
  camera.up.set(0, 1, 0)
  camera.lookAt(_c)
  camera.near = Math.max(0.05, dist - depth * 2 - half * 3)
  camera.far = dist + depth * 2 + half * 6
  camera.updateProjectionMatrix()
  // these materials are shared with the island: keep its region tint out of the picture
  const tint = regionTint.uRegionOn.value
  regionTint.uRegionOn.value = 0
  let url: string | null = null
  try {
    renderer.render(scene, camera)
    url = renderer.domElement.toDataURL('image/png')
  } catch {
    url = null
  }
  regionTint.uRegionOn.value = tint
  scene.remove(obj)
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.geometry?.dispose()
  })
  return url
}

function pump() {
  if (pumping) return
  pumping = true
  const step = () => {
    const key = queue.shift()
    if (key === undefined) {
      pumping = false
      return
    }
    if (!cache.has(key)) cache.set(key, draw(key))
    const subs = waiting.get(key)
    waiting.delete(key)
    subs?.forEach((fn) => fn())
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** Draw a thumbnail right away (used by the screenshot tools; menus go through `useThumb`). */
export function drawThumb(key: string): string | null {
  if (!cache.has(key)) cache.set(key, draw(key))
  return cache.get(key) ?? null
}

/** The picture for a model key: `undefined` while it is being drawn, `null` if there is no model for it. */
export function useThumb(key: string | null | undefined): string | null | undefined {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!key || cache.has(key)) return
    const fn = () => bump((n) => n + 1)
    let subs = waiting.get(key)
    if (!subs) {
      subs = new Set()
      waiting.set(key, subs)
      queue.push(key)
    }
    subs.add(fn)
    pump()
    return () => {
      subs.delete(fn)
    }
  }, [key])
  if (!key) return null
  return cache.get(key)
}

/**
 * An item's picture well. Shows the 3D-rendered thumbnail for `model`; while it
 * is being drawn the well shimmers, and if there is no model the icon stands in.
 */
export function Thumb({ model, icon, tint, size, className = '' }: { model?: string | null; icon?: IconName; tint?: string; size?: 'sm' | 'big'; className?: string }) {
  const url = useThumb(model)
  const I = icon ? Icon[icon] : null
  return (
    <span className={`thumb${size ? ` ${size}` : ''}${model && /^(building|region):/.test(model) ? ' outdoors' : ''}${model && url === undefined ? ' loading' : ''} ${className}`} style={tint ? ({ '--tint': tint } as React.CSSProperties) : undefined}>
      {url ? <img src={url} alt="" draggable={false} /> : url === null && I ? <I /> : null}
    </span>
  )
}
