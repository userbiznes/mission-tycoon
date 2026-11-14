import * as THREE from 'three'

/**
 * Model registry. Game logic asks for a model by id and never knows how it is
 * made, so any procedural model can later be swapped for a GLB by registering a
 * different factory under the same id.
 *
 * A factory returns an Object3D. Optional hooks live in `userData`:
 *   - `tick(t, dt)`: per-frame animation (blinking lights, steam, sway)
 *   - `anchors`: named Object3Ds or positions other systems can attach to
 */

export interface ModelOptions {
  level?: number
  /** agency colours, logo texture and anything else a model wants */
  [key: string]: unknown
}

export type ModelFactory = (opts: ModelOptions) => THREE.Object3D

export interface ModelUserData {
  tick?: (t: number, dt: number) => void
  anchors?: Record<string, THREE.Object3D>
  dispose?: () => void
}

const registry = new Map<string, ModelFactory>()

export function registerModel(id: string, factory: ModelFactory): void {
  registry.set(id, factory)
}

export function hasModel(id: string): boolean {
  return registry.has(id)
}

export function createModel(id: string, opts: ModelOptions = {}): THREE.Object3D {
  const factory = registry.get(id)
  if (!factory) throw new Error(`No model registered for "${id}"`)
  const obj = factory(opts)
  obj.name = obj.name || id
  return obj
}

/** Free GPU memory for a model made by `createModel`. Shared materials are left alone. */
export function disposeModel(obj: THREE.Object3D): void {
  ;(obj.userData as ModelUserData).dispose?.()
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.geometry?.dispose()
  })
}
