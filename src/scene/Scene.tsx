import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { CameraControls } from './CameraControls'
import { Effects } from './Effects'
import { Lights } from './Lights'
import { Model } from './Model'
import { Paths, Props } from './Props'
import { Clouds, SkyDome } from './Sky'
import { Terrain } from './Terrain'
import { Water } from './Water'
import { CAMERA_FOV, uvToWorld } from './world'
import { PLOTS } from '../data/layout'
import { PAD_TABLE_Y } from '../art/models/launchPad'
import { useSettings } from '../state/settings'

function LaunchSite() {
  const plot = PLOTS.launchPad
  const [x, z] = uvToWorld(plot.u, plot.v)
  return (
    <group position={[x, 0, z]}>
      <Model model="launchPad" options={{ level: 1 }} />
      <Model model="rocket" options={{ kind: 'small' }} position={[0, PAD_TABLE_Y + 0.06, 0]} />
    </group>
  )
}

export function Scene() {
  const low = useSettings((s) => s.lowQuality)
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, low ? 1.5 : 2]}
      gl={{
        antialias: low,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
      camera={{ fov: CAMERA_FOV, near: 8, far: 1600, position: [60, 60, 60] }}
      style={{ touchAction: 'none' }}
    >
      <SkyDome />
      <Lights shadowSize={low ? 1024 : 2048} />
      <Suspense fallback={null}>
        <Terrain />
        <Water />
        <Paths />
        <Props />
        <Clouds />
        <LaunchSite />
      </Suspense>
      <CameraControls />
      {!low && <Effects />}
    </Canvas>
  )
}
