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
import { PLOTS, STARTING_BUILDINGS, type BuildingId } from '../data/layout'
import { Base } from './Base'
import { useSettings } from '../state/settings'

const query = new URLSearchParams(window.location.search)
/** `?model=<id>&level=2` shows one model alone on the grass: the art preview bench. */
const PREVIEW_MODEL = query.get('model')
const PREVIEW_LEVEL = Number(query.get('level') ?? 1)
/** `?all=1` shows every building, built, for art review. */
const SHOW_ALL = query.has('all')

const ALL_IDS = Object.keys(PLOTS) as BuildingId[]

function PreviewBench() {
  const [x, z] = uvToWorld(-4.4, 6.8)
  return (
    <group position={[x, 0, z]}>
      <Model model={PREVIEW_MODEL!} options={{ level: PREVIEW_LEVEL, kind: query.get('kind') ?? undefined }} />
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
        {PREVIEW_MODEL ? (
          <PreviewBench />
        ) : (
          <Base
            buildings={ALL_IDS.map((id) => ({
              id,
              level: SHOW_ALL || STARTING_BUILDINGS.includes(id) ? Number(query.get('level') ?? 1) : 0,
            }))}
          />
        )}
      </Suspense>
      <CameraControls />
      {!low && <Effects />}
    </Canvas>
  )
}
