import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { hasModel } from '../art/registry'
import '../art/models'
import { palette } from '../art/palette'
import type { BuildingId } from '../data/layout'
import { DOCK_YAW, buildingCenter, type CellPos } from './grid'

/** Height of the quay's planks: the market stands on them. */
export const DECK_TOP = 0.14
import { sampleJuice } from './juice'
import { Model } from './Model'

export interface BaseBuilding {
  id: BuildingId
  at: CellPos
  /** 0 = door down-left, 1 = door down-right */
  facing?: number
  /** 0 while the first build is under way, then 1+ */
  level: number
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

const LONG_PRESS_MS = 520

/**
 * Every building on the island, where the player put it. Purely visual: a tap
 * is reported through `onTap`, a long press through `onHold` (pick up to move).
 */
export function Base({
  buildings,
  hidden,
  modelOptions,
  onTap,
  onHold,
}: {
  buildings: BaseBuilding[]
  /** a building that is "in hand" and drawn by the placement ghost instead */
  hidden?: BuildingId | null
  modelOptions?: Record<string, unknown>
  onTap?: (id: BuildingId) => void
  onHold?: (id: BuildingId) => void
}) {
  const press = useRef<{ id: BuildingId; timer: ReturnType<typeof setTimeout>; x: number; y: number; fired: boolean } | null>(null)
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }
  return (
    <group name="base">
      {buildings.map((b) => {
        if (b.id === hidden) return null
        const [x, z] = buildingCenter(b.id, b.at)
        const built = b.level > 0
        return (
          <group
            key={b.id}
            position={[x, b.id === 'partsMarket' ? DECK_TOP : 0, z]}
            rotation-y={b.id === 'partsMarket' ? DOCK_YAW : (b.facing ?? 0) * (Math.PI / 2)}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              cancel()
              const id = b.id
              press.current = {
                id,
                x: e.nativeEvent.clientX,
                y: e.nativeEvent.clientY,
                fired: false,
                timer: setTimeout(() => {
                  if (press.current) press.current.fired = true
                  onHold?.(id)
                }, LONG_PRESS_MS),
              }
            }}
            onPointerMove={(e: ThreeEvent<PointerEvent>) => {
              const p = press.current
              if (p && Math.hypot(e.nativeEvent.clientX - p.x, e.nativeEvent.clientY - p.y) > 8) cancel()
            }}
            onPointerUp={() => {
              if (press.current && !press.current.fired) cancel()
            }}
            onPointerLeave={() => {
              if (press.current && !press.current.fired) cancel()
            }}
            onClick={(e) => {
              const held = press.current?.fired
              cancel()
              // a drag that ends on a building is a pan, and a long press already picked it up
              if (e.delta > 8 || held) return
              e.stopPropagation()
              onTap?.(b.id)
            }}
          >
            <Juicy id={b.id}>
              {b.constructing && hasModel('construction') ? (
                <Model model="construction" options={{ level: 1, building: b.id }} />
              ) : hasModel(b.id) ? (
                <Model model={b.id} options={{ level: Math.max(1, b.level), building: b.id, ...modelOptions }} />
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
