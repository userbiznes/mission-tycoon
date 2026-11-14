import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { palette } from '../art/palette'
import { hasModel } from '../art/registry'
import { FOOTPRINT } from '../data/layout'
import { usePlacement } from '../state/placement'
import { rig } from './cameraRig'
import { CELL, isLand, worldToCell } from './grid'
import { Model } from './Model'

/** Faint diamond grid over the buildable ground, shown only while placing. */
function GridLines() {
  const geo = useMemo(() => {
    const pts: number[] = []
    for (let i = -50; i <= 50; i++)
      for (let j = -50; j <= 50; j++) {
        if (!isLand(i, j)) continue
        const x = i * CELL
        const z = j * CELL
        pts.push(x, 0.07, z, x + CELL, 0.07, z, x, 0.07, z, x, 0.07, z + CELL)
        if (!isLand(i + 1, j)) pts.push(x + CELL, 0.07, z, x + CELL, 0.07, z + CELL)
        if (!isLand(i, j + 1)) pts.push(x, 0.07, z + CELL, x + CELL, 0.07, z + CELL)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color={palette.white} transparent opacity={0.34} depthWrite={false} />
    </lineSegments>
  )
}

/**
 * Placement mode in the 3D world: the building follows the finger over the
 * grid, standing on green tiles where it fits and red ones where it doesn't.
 */
export function Placement() {
  const id = usePlacement((s) => s.id)
  const at = usePlacement((s) => s.at)
  const problem = usePlacement((s) => s.problem)
  const moveTo = usePlacement((s) => s.moveTo)
  const ghost = useRef<THREE.Group>(null)
  const drag = useRef<{ di: number; dj: number } | null>(null)

  useFrame((state) => {
    if (ghost.current) ghost.current.position.y = 0.35 + Math.sin(state.clock.elapsedTime * 4) * 0.08
  })

  if (!id) return null
  const n = FOOTPRINT[id]
  const size = n * CELL
  const cx = at.i * CELL + size / 2
  const cz = at.j * CELL + size / 2

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const c = worldToCell(e.point.x, e.point.z)
    // grab the building if the finger lands on (or right beside) it
    if (c.i >= at.i - 1 && c.i <= at.i + n && c.j >= at.j - 1 && c.j <= at.j + n) {
      drag.current = { di: at.i - c.i, dj: at.j - c.j }
      rig.locked = true
      e.stopPropagation()
    }
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const c = worldToCell(e.point.x, e.point.z)
    moveTo({ i: c.i + drag.current.di, j: c.j + drag.current.dj })
  }
  const onUp = () => {
    if (drag.current) {
      drag.current = null
      rig.locked = false
    }
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // a plain tap on open ground brings the building there
    if (e.delta > 8) return
    const c = worldToCell(e.point.x, e.point.z)
    moveTo({ i: c.i - Math.floor(n / 2), j: c.j - Math.floor(n / 2) })
  }

  return (
    <group name="placement">
      <GridLines />
      {/* catches the finger anywhere on the ground */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onClick={onClick}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.09, cz]}>
        <planeGeometry args={[size + 0.5, size + 0.5]} />
        <meshBasicMaterial color={problem ? palette.bad : palette.good} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={ghost} position={[cx, 0.35, cz]}>
        {hasModel(id) && <Model model={id} options={{ level: 1, building: id }} />}
      </group>
    </group>
  )
}
