import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import '../art/models'
import { palette } from '../art/palette'
import { createModel, disposeModel } from '../art/registry'
import { STATIONS } from '../data/stations'
import type { OrbitId, RocketId, StationId } from '../data/types'
import { RADIUS, STATION_AT, TARGET_AT, earthTexture, onGlobe } from '../scene/earth'
import { regionTint } from '../scene/regionTint'
import { LAPS_PER_DAY, SUN, TILT, align, ringQuat } from './OpsGlobe'

/**
 * The launch board's live picture. It answers each choice as it is made:
 * the orbit as a ring at its height and tilt with the path it traces over the
 * ground and the target lit; the rocket itself; and each dish with a cone for
 * the sky it can see.
 */

export interface BoardLabels {
  /** where each dish is on screen, 0–1, and whether it faces the player */
  at: Partial<Record<StationId, { x: number; y: number; show: boolean }>>
}

const Y = new THREE.Vector3(0, 1, 0)
const TRACK = 120

function Stage({ mode, orbitId, rocketId, picked, contractId, labels }: { mode: number; orbitId: OrbitId; rocketId: RocketId; picked: StationId[]; contractId: string; labels: BoardLabels }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const scene = useThree((s) => s.scene)
  const target = TARGET_AT[contractId] ?? TARGET_AT.firstLight
  // the rocket shares its materials with the island: keep the island's region tint out of this picture
  useEffect(() => {
    scene.onBeforeRender = () => {
      regionTint.uRegionOn.value = 0
    }
  }, [scene])

  const o = useMemo(() => {
    const root = new THREE.Group()
    const tilt = new THREE.Group()
    tilt.quaternion.copy(TILT)
    root.add(tilt)
    const tex = earthTexture()
    const earth = new THREE.Group()
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })))
    tilt.add(earth)
    const air = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: palette.skyMid, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false }))
    air.scale.setScalar(1.06)
    tilt.add(air)

    // the region the contract looks at
    const spot = new THREE.Group()
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.yellow).multiplyScalar(1.4), transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false })
    const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.yellow).multiplyScalar(1.7), transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    spot.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), glowMat), new THREE.Mesh(new THREE.RingGeometry(0.2, 0.222, 48), edgeMat))
    const spotAt = onGlobe(target.lat, target.lon, 1.006)
    spot.position.copy(spotAt)
    spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spotAt.clone().normalize())
    earth.add(spot)

    // every dish this board can offer, each with a cone for the sky it sees
    const coneMat = new THREE.MeshBasicMaterial({ color: palette.screenGlow, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    const stations = STATIONS.map((def) => {
      const local = onGlobe(STATION_AT[def.id].lat, STATION_AT[def.id].lon, 1.005)
      const g = new THREE.Group()
      g.position.copy(local)
      g.quaternion.setFromUnitVectors(Y, local.clone().normalize())
      const coneOn = new THREE.MeshStandardMaterial({ color: def.id === 'home' ? palette.red : palette.yellow, roughness: 0.6 })
      const marker = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 12), coneOn)
      marker.position.y = 0.045
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), new THREE.MeshBasicMaterial({ color: palette.white, toneMapped: false }))
      top.position.y = 0.105
      // the sky it can see: a funnel opening up to the orbit
      const sky = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.42, 32, 1, true), coneMat)
      sky.rotation.x = Math.PI
      sky.position.y = 0.21
      g.add(marker, top, sky)
      earth.add(g)
      return { id: def.id, local, g, sky, coneOn, k: 0 }
    })

    // the ring, the satellite on it, and the path it traces over the ground in a day
    const ringMat = new THREE.MeshBasicMaterial({ color: palette.lampHot, toneMapped: false, transparent: true, opacity: 0.9 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.008, 6, 140), ringMat)
    tilt.add(ring)
    const sat = new THREE.Group()
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: palette.yellow, roughness: 0.5 })))
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.01, 0.06), new THREE.MeshStandardMaterial({ color: palette.blue, roughness: 0.3, emissive: new THREE.Color(palette.blue), emissiveIntensity: 0.4 }))
      wing.position.x = sx * 0.09
      sat.add(wing)
    }
    tilt.add(sat)
    const track = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.screenGlow).multiplyScalar(1.25), toneMapped: false }), TRACK)
    track.frustumCulled = false
    earth.add(track)

    // the rocket, on its own stand
    const pad = new THREE.Group()
    pad.visible = false
    root.add(pad)
    return { root, tilt, earth, spot, stations, ring, sat, track, pad, tex }
  }, [target])

  useEffect(
    () => () => {
      o.tex.dispose()
    },
    [o],
  )

  // the rocket follows the choice
  const rocket = useMemo(() => createModel('rocket', { kind: rocketId }), [rocketId])
  useEffect(() => {
    const h = (rocket.userData.height as number) || 8
    rocket.scale.setScalar(2.05 / h)
    rocket.position.set(0, -1.0, 0)
    o.pad.add(rocket)
    return () => {
      o.pad.remove(rocket)
      disposeModel(rocket)
    }
  }, [rocket, o])

  const st = useRef({ spin: 0.4, alpha: 0, pathQ: ringQuat(orbitId), r: RADIUS[orbitId], orbit: '' as string, show: 1 })
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3(), goal: new THREE.Quaternion() }), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const aspect = size.width / size.height
    // the globe fills about three quarters of the picture's height, less in a narrow one
    const d = Math.max(5.1, 6.2 / aspect)
    camera.position.set(0, d * 0.14, d)
    camera.lookAt(0, 0, 0)

    const globe = mode !== 1
    o.tilt.visible = globe
    o.pad.visible = !globe
    if (!globe) {
      o.pad.rotation.y += dt * 0.5
      // the rocket stands in the left half; the capacity gauge is drawn beside it
      o.pad.position.set(-d * 0.13 * Math.min(1.6, aspect), 0.1, 0)
      labels.at = {}
      return
    }

    // ---- the orbit: the ring leans and grows to the one picked
    tmp.goal.copy(ringQuat(orbitId))
    s.pathQ.slerp(tmp.goal, Math.min(1, dt * 4))
    s.r += (RADIUS[orbitId] - s.r) * Math.min(1, dt * 4)
    o.ring.quaternion.copy(s.pathQ)
    o.ring.rotateX(Math.PI / 2)
    o.ring.scale.setScalar(s.r)
    s.alpha += dt * 0.9
    tmp.v.set(Math.cos(s.alpha) * s.r, 0, Math.sin(s.alpha) * s.r).applyQuaternion(s.pathQ)
    o.sat.position.copy(tmp.v)
    o.sat.lookAt(o.root.position)

    // its path over the ground in one day, in the planet's own frame (the same path operations will fly)
    if (s.orbit !== orbitId) {
      s.orbit = orbitId
      const { phi0, alpha0 } = align(orbitId, target)
      const rq = ringQuat(orbitId)
      for (let i = 0; i < TRACK; i++) {
        const t = i / TRACK
        const a = alpha0 + t * Math.PI * 2 * LAPS_PER_DAY
        tmp.w.set(Math.cos(a), 0, Math.sin(a)).applyQuaternion(rq).applyAxisAngle(Y, -(t * Math.PI * 2 + phi0)).multiplyScalar(1.006)
        tmp.sc.setScalar(0.012)
        o.track.setMatrixAt(i, tmp.m.compose(tmp.w, tmp.q.identity(), tmp.sc))
      }
      o.track.instanceMatrix.needsUpdate = true
    }
    // the planet turns slowly so every dish comes round
    s.spin += dt * 0.16
    o.earth.rotation.y = s.spin

    // ---- the dishes: lit when picked, with the sky each can see
    const at: BoardLabels['at'] = {}
    o.root.updateMatrixWorld()
    for (const station of o.stations) {
      const def = STATIONS.find((x) => x.id === station.id)!
      const offered = def.passes[orbitId] > 0 || station.id === 'home'
      const on = picked.includes(station.id)
      station.g.visible = offered && (mode === 2 || on)
      station.k += ((on && mode === 2 ? 1 : 0) - station.k) * Math.min(1, dt * 6)
      station.sky.visible = station.k > 0.02
      station.sky.scale.setScalar(Math.max(0.001, station.k))
      station.g.scale.setScalar(on ? 1 : 0.7)
      if (!station.g.visible) continue
      const world = o.earth.localToWorld(tmp.v.copy(station.local).multiplyScalar(1.16))
      const facing = tmp.w.copy(world).normalize().dot(tmp.sc.copy(camera.position).normalize())
      world.project(camera)
      at[station.id] = { x: (world.x + 1) / 2, y: (1 - world.y) / 2, show: facing > -0.05 }
    }
    labels.at = mode === 2 ? at : {}
  })

  return (
    <>
      <hemisphereLight args={[palette.hemiSky, palette.navyDark, 0.5]} />
      <directionalLight color={palette.sun} intensity={2.8} position={[SUN.x * 6, SUN.y * 6 + 1.5, SUN.z * 6 + 2]} />
      <primitive object={o.root} />
    </>
  )
}

export function BoardPreview(props: { mode: number; orbitId: OrbitId; rocketId: RocketId; picked: StationId[]; contractId: string; labels: BoardLabels }) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} camera={{ fov: 30, near: 0.5, far: 80, position: [0, 1, 8] }}>
      <Stage {...props} />
    </Canvas>
  )
}
