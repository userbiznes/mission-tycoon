import { useMemo } from 'react'
import * as THREE from 'three'
import { hasModel } from '../art/registry'
import '../art/models'
import { palette } from '../art/palette'
import { PAD_TABLE_Y } from '../art/models/launchPad'
import { PLOTS, type BuildingId } from '../data/layout'
import { Model } from './Model'
import { uvToWorld } from './world'

export interface BaseBuilding {
  id: BuildingId
  /** 0 = empty plot, 1+ = built at that level */
  level: number
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

/**
 * Every plot on the plateau: a building model when built, the "Build here"
 * plot marker when empty. Purely visual; taps are reported through `onTap`.
 */
export function Base({
  buildings,
  rocketKind = 'small',
  showRocket = true,
  onTap,
}: {
  buildings: BaseBuilding[]
  rocketKind?: string
  showRocket?: boolean
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
            {hasModel(modelId) ? (
              <Model model={modelId} options={{ level: Math.max(1, b.level), building: b.id }} />
            ) : built ? (
              <Placeholder id={b.id} />
            ) : null}
            {b.id === 'launchPad' && built && showRocket && (
              <Model model="rocket" options={{ kind: rocketKind }} position={[0, PAD_TABLE_Y + 0.06, 0]} />
            )}
          </group>
        )
      })}
    </group>
  )
}
