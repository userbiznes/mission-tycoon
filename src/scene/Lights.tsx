import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { palette } from '../art/palette'
import { SUN_DIR } from './Sky'
import { rig } from './cameraRig'

const _t = new THREE.Vector3()

/**
 * Warm afternoon sun with soft shadows + sky/ground hemisphere bounce.
 * The shadow frustum follows the camera target and scales with zoom, snapped to
 * shadow texels so the edges don't shimmer while panning.
 */
export function Lights({ shadowSize = 2048 }: { shadowSize?: number }) {
  const sun = useRef<THREE.DirectionalLight>(null)

  useFrame(() => {
    const light = sun.current
    if (!light) return
    rig.targetWorld(_t)
    // cover what the camera can see (portrait: taller than wide), with margin for tall things
    const half = THREE.MathUtils.clamp(rig.width * 0.8, 18, 72)
    const cam = light.shadow.camera
    if (Math.abs(cam.right - half) > 0.5) {
      cam.left = -half
      cam.right = half
      cam.top = half
      cam.bottom = -half
      cam.updateProjectionMatrix()
    }
    // snap the target to texel increments in light space
    const texel = (half * 2) / light.shadow.mapSize.x
    _t.x = Math.round(_t.x / texel) * texel
    _t.z = Math.round(_t.z / texel) * texel
    light.target.position.copy(_t)
    light.position.copy(_t).addScaledVector(SUN_DIR, 90)
    light.target.updateMatrixWorld()
  })

  return (
    <>
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, 1.25]} />
      <ambientLight color={palette.sunGlow} intensity={0.18} />
      <directionalLight
        ref={sun}
        color={palette.sun}
        intensity={2.5}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={3}
        shadow-camera-near={10}
        shadow-camera-far={200}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* cool fill from the camera side so shaded faces keep their colour */}
      <directionalLight color={palette.sun} intensity={0.95} position={[40, 26, -6]} />
    </>
  )
}
