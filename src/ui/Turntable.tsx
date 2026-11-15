import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createSatellite, createTurntable, type SatelliteDesign } from '../art/models/satellite'
import { palette } from '../art/palette'
import { regionTint } from '../scene/regionTint'

function Stage({ design }: { design: SatelliteDesign }) {
  const spin = useRef<THREE.Group>(null)
  const prevCount = useRef(design.parts.length)
  const stand = useMemo(createTurntable, [])
  // this little scene shares its materials with the island: keep the island's region tint out of it
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.onBeforeRender = () => {
      regionTint.uRegionOn.value = 0
    }
  }, [scene])
  const key = `${design.busId}|${design.parts.join(',')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sat = useMemo(() => createSatellite(design), [key])

  // parts that are new since the last build pop into place
  useEffect(() => {
    const now = performance.now()
    sat.children.forEach((c) => {
      const m = /^part:(\d+)$/.exec(c.name)
      if (m && Number(m[1]) >= prevCount.current) c.userData.born = now
    })
    prevCount.current = design.parts.length
    return () => {
      sat.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sat])

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.45
    const now = performance.now()
    for (const c of sat.children) {
      const born = c.userData.born as number | undefined
      if (!born) continue
      const k = (now - born) / 520
      if (k >= 1) {
        c.scale.setScalar(1)
        c.userData.born = undefined
      } else {
        // 0 → 1.15 → 0.95 → 1
        const s = k < 0.45 ? 1.15 * (1 - Math.pow(1 - k / 0.45, 3)) : k < 0.72 ? 1.15 - 0.2 * ((k - 0.45) / 0.27) : 0.95 + 0.05 * ((k - 0.72) / 0.28)
        c.scale.setScalar(Math.max(0.001, s))
      }
    }
  })

  const wide = design.busId === 'bus6u'
  return (
    <>
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, 1.3]} />
      <directionalLight color={palette.sun} intensity={2.4} position={[-3, 6, 5]} />
      <directionalLight color={palette.hemiSky} intensity={0.5} position={[5, 2, -3]} />
      <group ref={spin} position={[0, -2.2, 0]}>
        <primitive object={stand} />
        <group position={[0, 2.55, 0]} rotation={[0, 0, 0.12]} scale={wide ? 0.86 : 1}>
          <primitive object={sat} />
        </group>
      </group>
    </>
  )
}

/** The satellite on its slowly turning stand: a small canvas of its own inside the builder. */
export function Turntable({ design }: { design: SatelliteDesign }) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} camera={{ fov: 30, position: [0, 1.4, 12.5], near: 1, far: 60 }} style={{ touchAction: 'none' }}>
      <Stage design={design} />
    </Canvas>
  )
}
