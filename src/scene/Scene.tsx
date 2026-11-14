import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { CameraControls } from './CameraControls'
import { Effects } from './Effects'
import { Lights } from './Lights'
import { Model } from './Model'
import { GroundCover, Overgrowth, Pier, Props, Roads, useBlockedCells } from './Props'
import { Clouds, SkyDome } from './Sky'
import { Terrain } from './Terrain'
import { Water } from './Water'
import { CAMERA_FOV, uvToWorld } from './world'
import { BUILDING_IDS, type BuildingId } from '../data/layout'
import { usePlacement } from '../state/placement'
import type { CellPos } from './grid'
import { Placement } from './Placement'
import { Base } from './Base'
import { useSettings } from '../state/settings'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { tapBuilding } from '../state/actions'
import { tourHooks } from '../ui/Tour'
import { PinProjector } from './pins'
import { PadRocket } from './Launch'
import { DeliveryTruck } from './Truck'

const query = new URLSearchParams(window.location.search)
/** `?model=<id>&level=2` shows one model alone on the grass: the art preview bench. */
const PREVIEW_MODEL = query.get('model')
const PREVIEW_LEVEL = Number(query.get('level') ?? 1)
/** `?all=1` shows every building, built, for art review. */
const SHOW_ALL = query.has('all')

function PreviewBench() {
  const [x, z] = uvToWorld(0, -6)
  return (
    <group position={[x, 0, z]}>
      <Model model={PREVIEW_MODEL!} options={{ level: PREVIEW_LEVEL, kind: query.get('kind') ?? undefined }} />
    </group>
  )
}

/** The base as the saved game describes it. */
function GameBase() {
  const buildings = useGame((s) => s.buildings)
  const placed = useGame((s) => s.placed)
  const phase = useGame((s) => s.phase)
  const inHand = usePlacement((s) => (s.isNew ? null : s.id))
  const list = useMemo(() => {
    const out: { id: BuildingId; at: CellPos; level: number; constructing?: boolean }[] = []
    for (const id of BUILDING_IDS) {
      const at = placed[id]
      if (!at) continue
      const b = buildings[id]
      out.push({ id, at, level: SHOW_ALL ? Number(query.get('level') ?? 1) : b.level, constructing: b.level === 0 && !!b.buildEnd })
    }
    return out
  }, [buildings, placed])
  const busy = () => phase !== 'play' || !!usePlacement.getState().id
  return (
    <Base
      buildings={list}
      hidden={inHand}
      onTap={(id) => {
        if (busy()) return
        if (tourHooks.onBuildingTap?.(id)) return
        tapBuilding(id)
      }}
      onHold={(id) => {
        if (busy() || useGame.getState().tourStep >= 0 || useGame.getState().buildings[id].level < 1) return
        usePlacement.getState().begin(id, false)
      }}
    />
  )
}

function Meadow() {
  const blocked = useBlockedCells()
  return <GroundCover blocked={blocked} />
}

export function Scene() {
  const low = useSettings((s) => s.lowQuality)
  // full-screen flows cover the world: stop drawing it to save the phone's GPU
  const screen = useUi((s) => s.screen)
  const paused = screen === 'builder' || screen === 'launchPrep' || screen === 'ops' || screen === 'debrief'
  return (
    <Canvas
      frameloop={paused ? 'never' : 'always'}
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
        <Roads />
        <Pier />
        <Props />
        <Meadow />
        <Overgrowth />
        <Placement />
        <Clouds />
        {PREVIEW_MODEL ? (
          <PreviewBench />
        ) : (
          <>
            <GameBase />
            <PadRocket />
            <DeliveryTruck />
          </>
        )}
      </Suspense>
      <CameraControls />
      <PinProjector />
      {!low && <Effects />}
    </Canvas>
  )
}
