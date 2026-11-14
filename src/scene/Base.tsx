import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { hasModel } from '../art/registry'
import '../art/models'
import { palette } from '../art/palette'
import { PLOTS, type BuildingId } from '../data/layout'
import { sampleJuice } from './juice'
import { Model } from './Model'
import { uvToWorld } from './world'

export interface BaseBuilding {
  id: BuildingId
  /** 0 = empty plot, 1+ = built at that level */
  level: number
  /** a first build is under way on this plot */
  constructing?: boolean
}

/** Soft stand-in box for a building whose model isn't registered yet. */
function Placeholder({ id }: { id: BuildingId }) {
  const color = useMemo(() => new THREE.Color(palette.cream), [])
  return (
    <mesh position={[0, 1, 0]} castShadow receiveShadow name={`placeholder:${id}`}>
      <boxGeometry args={[3.2, 2, 3.2]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  )
}

/** Plays pop / wobble animations requested through `juice(id, kind)`. */
export function Juicy({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const st = useRef({ sx: 1, sy: 1, rot: 0, active: false })
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const s = st.current
    if (sampleJuice(id, s)) {
      g.scale.set(s.sx, s.sy, s.sx)
      g.rotation.z = s.rot
      s.active = true
    } else if (s.active) {
      g.scale.set(1, 1, 1)
      g.rotation.z = 0
      s.active = false
    }
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Every plot on the plateau: a building model when built, the "Build here"
 * plot marker when empty. Purely visual; taps are reported through `onTap`.
 */
export function Base({
  buildings,
  modelOptions,
  onTap,
}: {
  /** extra options passed to every building model (agency colours…) */
  modelOptions?: Record<string, unknown>
  buildings: BaseBuilding[]
  onTap?: (id: BuildingId) => void
}) {
  return (
    <group name="base">
      {buildings.map((b) => {
        const plot = PLOTS[b.id]
        const [x, z] = uvToWorld(plot.u, plot.v)
        const built = b.level > 0
        const modelId = built ? b.id : 'plot'
        return (
          <group
            key={b.id}
            position={[x, 0, z]}
            rotation-y={plot.rotY}
            onClick={(e) => {
              // a drag that ends on a building is a pan, not a tap
              if (e.delta > 8) return
              e.stopPropagation()
              onTap?.(b.id)
            }}
          >
            <Juicy id={b.id}>
              {b.constructing && hasModel('construction') ? (
                <Model model="construction" options={{ level: 1, building: b.id }} />
              ) : hasModel(modelId) ? (
                <Model model={modelId} options={{ level: Math.max(1, b.level), building: b.id, ...modelOptions }} />
              ) : built ? (
                <Placeholder id={b.id} />
              ) : null}
            </Juicy>
          </group>
        )
      })}
    </group>
  )
}
