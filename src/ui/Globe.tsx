import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { palette } from '../art/palette'
import type { OrbitId, StationId } from '../data/types'

/**
 * A soft, chunky stylized Earth for mission operations: procedural continents
 * (no imagery), the orbit ring, the satellite, ground stations and a beam that
 * lights up while the satellite is in view of a dish.
 */

/** Land spans [lonStart, lonEnd] for each 10° latitude band, from 85°N down to 85°S. */
const LAND: [number, number][][] = [
  [[-72, -22]],
  [[-125, -75], [-60, -20], [80, 115]],
  [[-165, -62], [-52, -35], [-23, -14], [5, 180]],
  [[-130, -58], [-10, 0], [5, 140], [155, 163]],
  [[-124, -62], [-5, 140]],
  [[-122, -76], [-8, 10], [27, 120], [126, 129], [132, 140]],
  [[-112, -97], [-15, 58], [62, 120]],
  [[-97, -83], [-17, 40], [43, 52], [74, 81], [97, 109], [120, 124]],
  [[-77, -52], [-8, 46], [97, 104], [110, 118]],
  [[-80, -36], [12, 40], [102, 112], [132, 150]],
  [[-75, -39], [12, 40], [46, 50], [125, 145]],
  [[-70, -48], [15, 33], [44, 47], [114, 153]],
  [[-72, -57], [18, 27], [116, 120], [135, 150], [173, 177]],
  [[-74, -66], [168, 172]],
  [[-70, -66]],
  [[-65, -60], [50, 140]],
  [[-140, -60], [-15, 165]],
  [[-180, 180]],
]

/** Dry belts, drawn sandy: [latBand, lonStart, lonEnd]. */
const DESERT: [number, number, number][] = [
  [6, -14, 56],
  [5, 40, 62],
  [11, 120, 140],
  [5, -116, -104],
  [4, 60, 105],
]

function earthTexture(): THREE.CanvasTexture {
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const sea = g.createLinearGradient(0, 0, 0, H)
  sea.addColorStop(0, palette.blueDark)
  sea.addColorStop(0.5, palette.oceanMid)
  sea.addColorStop(1, palette.blueDark)
  g.fillStyle = sea
  g.fillRect(0, 0, W, H)
  const px = (lon: number) => ((lon + 180) / 360) * W
  const py = (lat: number) => ((90 - lat) / 180) * H
  const blob = (lon: number, lat: number, r: number) => {
    g.beginPath()
    g.ellipse(px(lon), py(lat), (r / 360) * W, (r / 180) * H, 0, 0, Math.PI * 2)
    g.fill()
  }
  const paint = (color: string, grow: number, pick?: (band: number) => boolean) => {
    g.fillStyle = color
    LAND.forEach((spans, band) => {
      if (pick && !pick(band)) return
      const lat = 85 - band * 10
      for (const [a, b] of spans) {
        for (let lon = a; lon <= b; lon += 3) blob(lon, lat + Math.sin(lon * 0.21 + band) * 2.2, 6.4 + grow)
      }
    })
  }
  // shallow shelf, then land, then lighter highlights
  paint(palette.oceanShallow, 2.2)
  paint(palette.grassDeep, 0)
  paint(palette.grass, -1.6)
  g.fillStyle = palette.sand
  for (const [band, a, b] of DESERT) for (let lon = a; lon <= b; lon += 4) blob(lon, 85 - band * 10 + Math.sin(lon * 0.3) * 1.5, 4.6)
  // ice: Greenland, the far north and Antarctica
  paint(palette.white, -0.8, (band) => band <= 1 || band >= 15)
  g.fillStyle = palette.white
  g.fillRect(0, py(-82), W, H)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Where each ground station sits (real sites of the same kind). */
export const STATION_AT: Record<StationId, { lat: number; lon: number }> = {
  home: { lat: 28, lon: -80 },
  equator: { lat: -3, lon: 40 },
  north: { lat: 78, lon: 15 },
  south: { lat: -72, lon: 3 },
  deepSpace: { lat: 35, lon: -117 },
}

const INCLINATION: Record<OrbitId, number> = { leo: 51.6, mid: 62, polar: 97, moon: 28, mars: 28 }
const RADIUS: Record<OrbitId, number> = { leo: 1.13, mid: 1.2, polar: 1.22, moon: 1.3, mars: 1.3 }

function onGlobe(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

export interface GlobeClock {
  /** mission time in days (fractional) */
  days: number
  /** false while an event card is up */
  running: boolean
  /** set by the globe: true while a dish can see the satellite */
  inContact: boolean
}

function Scene({ orbitId, stationIds, clock }: { orbitId: OrbitId; stationIds: StationId[]; clock: GlobeClock }) {
  const earth = useRef<THREE.Group>(null)
  const sat = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const tex = useMemo(earthTexture, [])
  const r = RADIUS[orbitId]
  const stations = useMemo(() => stationIds.map((id) => ({ id, local: onGlobe(STATION_AT[id].lat, STATION_AT[id].lon, 1.005) })), [stationIds])
  const plane = useMemo(() => new THREE.Euler(THREE.MathUtils.degToRad(90 - INCLINATION[orbitId]), 0, THREE.MathUtils.degToRad(-18)), [orbitId])
  const angle = useRef(0)
  const tmp = useMemo(() => ({ s: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion().setFromEuler(plane) }), [plane])

  useFrame((_, dt) => {
    // frame the whole globe whatever the aspect
    const aspect = size.width / size.height
    const d = 1.42 / (Math.tan(THREE.MathUtils.degToRad(15)) * Math.min(1, aspect))
    camera.position.set(0, d * 0.22, d)
    camera.lookAt(0, 0, 0)

    if (clock.running) angle.current += dt * 3.4
    if (earth.current) earth.current.rotation.y = clock.days * Math.PI * 2 - 1.2
    // satellite on its ring
    tmp.s.set(Math.cos(angle.current) * r, 0, Math.sin(angle.current) * r).applyQuaternion(tmp.q)
    if (sat.current) {
      sat.current.position.copy(tmp.s)
      sat.current.lookAt(0, 0, 0)
    }
    // a beam to the nearest dish that can see it
    let best = -1
    let bestDot = 0.9
    stations.forEach((st, i) => {
      tmp.w.copy(st.local)
      if (earth.current) tmp.w.applyQuaternion(earth.current.quaternion)
      const dot = tmp.w.clone().normalize().dot(tmp.s.clone().normalize())
      if (dot > bestDot) {
        bestDot = dot
        best = i
      }
    })
    clock.inContact = best >= 0
    if (beam.current) {
      beam.current.visible = best >= 0
      if (best >= 0) {
        tmp.w.copy(stations[best].local)
        if (earth.current) tmp.w.applyQuaternion(earth.current.quaternion)
        const mid = tmp.w.clone().add(tmp.s).multiplyScalar(0.5)
        const len = tmp.w.distanceTo(tmp.s)
        beam.current.position.copy(mid)
        beam.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.s.clone().sub(tmp.w).normalize())
        beam.current.scale.set(1 + Math.sin(angle.current * 9) * 0.25, len, 1 + Math.sin(angle.current * 9) * 0.25)
      }
    }
  })

  return (
    <>
      <hemisphereLight args={[palette.hemiSky, palette.navyDark, 0.9]} />
      <directionalLight color={palette.sun} intensity={2.6} position={[-4, 2.5, 4]} />
      <group rotation={[0.3, 0, 0.1]}>
        <group ref={earth}>
          <mesh>
            <sphereGeometry args={[1, 64, 40]} />
            <meshStandardMaterial map={tex} roughness={0.85} metalness={0} />
          </mesh>
          {stations.map((s) => (
            <group key={s.id} position={s.local} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.local.clone().normalize())}>
              <mesh position={[0, 0.035, 0]}>
                <coneGeometry args={[0.035, 0.07, 10]} />
                <meshStandardMaterial color={s.id === 'home' ? palette.red : palette.yellow} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.085, 0]}>
                <sphereGeometry args={[0.03, 10, 8]} />
                <meshBasicMaterial color={palette.white} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
        {/* soft atmosphere */}
        <mesh scale={1.06}>
          <sphereGeometry args={[1, 40, 24]} />
          <meshBasicMaterial color={palette.skyMid} transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        <mesh rotation={plane}>
          <torusGeometry args={[r, 0.007, 6, 120]} />
          <meshBasicMaterial color={palette.lampHot} toneMapped={false} transparent opacity={0.85} />
        </mesh>
        <mesh ref={beam} visible={false}>
          <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
          <meshBasicMaterial color={palette.screenGlow} toneMapped={false} transparent opacity={0.9} />
        </mesh>
        <group ref={sat}>
          <mesh>
            <boxGeometry args={[0.05, 0.05, 0.09]} />
            <meshStandardMaterial color={palette.yellow} roughness={0.5} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.075, 0, 0]}>
              <boxGeometry args={[0.09, 0.008, 0.05]} />
              <meshStandardMaterial color={palette.blue} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  )
}

export function Globe(props: { orbitId: OrbitId; stationIds: StationId[]; clock: GlobeClock }) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} camera={{ fov: 30, near: 0.5, far: 60, position: [0, 1, 6] }}>
      <Scene {...props} />
    </Canvas>
  )
}
