import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { palette } from '../art/palette'
import { seeded } from '../art/kit'
import type { OrbitId, StationId } from '../data/types'
import { INCLINATION, RADIUS, STATION_AT, TARGET_AT, earthTexture, onGlobe } from '../scene/earth'

/**
 * Mission operations, drawn: the planet turning under a line between day and
 * night, the satellite on its ring with a trail, the target region it photographs,
 * the dishes, the beam, and the photos themselves streaming down it.
 *
 * The screen and the scene talk through one plain object, `OpsView`: the screen
 * sets the mission time and each day's quota of photos (from the rules engine),
 * the scene plays them out where they happen and reports back what the satellite
 * is doing, so the gauges beside the globe show the same thing.
 */

/** Laps of the ring per mission day. A whole number, so the track over the ground repeats every day. */
export const LAPS_PER_DAY = 2
/** The moment of each day the satellite crosses its target, facing the player. */
const T_PASS = 0.28

export type OpsEffect = null | { kind: 'storm' | 'rain' | 'fire' | 'debris' | 'cold' | 'wobble' | 'bonus'; station?: StationId }

export interface OpsView {
  // ---- set by the screen
  /** mission time in days */
  days: number
  /** how fast the time-lapse is running: 1, 4, or near 0 while a decision is open */
  speed: number
  nDays: number
  /** photos taken and photos that can be kept that day, in tiles */
  quota: (dayIndex: number) => { make: number; keep: number }
  /** 0–1: how fast the radio is, which sets the beam's width and how quickly photos go down it */
  beam: number
  /** share of the battery one pass through the shadow uses */
  depth: number
  /** something happening in the world (an event), and where */
  effect: OpsEffect
  /** the decision is open: the camera eases over to where it is happening */
  focus: boolean
  /** the choice is made and the event passes through (the storm sweeps across) */
  sweep: boolean
  /** the satellite rests, dark and taking no photos, until this mission time */
  safeUntil: number
  /** a rented dish is listening too */
  backup: boolean
  /** bumped when something strikes the satellite: it flashes */
  hit: number
  /** room on screen that the globe must leave free, px */
  insetRight: number
  insetBottom: number
  // ---- reported by the scene
  satX: number
  satY: number
  /** false while the satellite is behind the planet */
  satShown: boolean
  shadow: boolean
  contact: StationId | null
  overTarget: boolean
  /** photos waiting on board, in tiles */
  held: number
  battery: number
  /** running counts; the screen animates when they change */
  pops: number
  spills: number
  arrivals: number
  /** where the event is on screen, 0–1 */
  fxX: number
  fxY: number
}

export function makeOpsView(): OpsView {
  return {
    days: 0,
    speed: 1,
    nDays: 7,
    quota: () => ({ make: 0, keep: 0 }),
    beam: 0.5,
    depth: 0.3,
    effect: null,
    focus: false,
    sweep: false,
    safeUntil: -1,
    backup: false,
    hit: 0,
    insetRight: 0,
    insetBottom: 0,
    satX: 0.5,
    satY: 0.5,
    satShown: true,
    shadow: false,
    contact: null,
    overTarget: false,
    held: 0,
    battery: 1,
    pops: 0,
    spills: 0,
    arrivals: 0,
    fxX: 0.5,
    fxY: 0.5,
  }
}

const Y = new THREE.Vector3(0, 1, 0)
export const TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0.1))
/** Sunlight comes from the upper left, a little towards the player, so the night side shows on the right. */
export const SUN = new THREE.Vector3(-0.82, 0.22, 0.52).normalize()
const TRACK_DOTS = 110
const TRAIL_DOTS = 16
const TILES = 28

/** The plane the satellite flies in: the equator, leaned over by the orbit's inclination. */
export const ringQuat = (orbitId: OrbitId) =>
  new THREE.Quaternion().setFromAxisAngle(Y, 0.5).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(INCLINATION[orbitId])))

/**
 * Turn the planet and start the satellite so that, once a day, it crosses its
 * target while the target faces the player.
 */
export function align(orbitId: OrbitId, target: { lat: number; lon: number }): { phi0: number; alpha0: number } {
  const q = ringQuat(orbitId)
  const normal = Y.clone().applyQuaternion(q)
  const spot = onGlobe(target.lat, target.lon)
  const dir = new THREE.Vector3()
  let best = { score: Infinity, phi0: 0 }
  for (let i = 0; i < 360; i++) {
    const phi0 = (i / 360) * Math.PI * 2
    dir.copy(spot).applyAxisAngle(Y, T_PASS * Math.PI * 2 + phi0)
    const off = Math.abs(dir.dot(normal))
    const facing = dir.clone().applyQuaternion(TILT).z
    const score = off * 3 + (1 - facing)
    if (score < best.score) best = { score, phi0 }
  }
  dir.copy(spot).applyAxisAngle(Y, T_PASS * Math.PI * 2 + best.phi0).applyQuaternion(q.clone().invert())
  const at = Math.atan2(dir.z, dir.x)
  return { phi0: best.phi0, alpha0: at - T_PASS * Math.PI * 2 * LAPS_PER_DAY }
}

function Stage({ orbitId, stationIds, contractId, view }: { orbitId: OrbitId; stationIds: StationId[]; contractId: string; view: OpsView }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const r = RADIUS[orbitId]
  const target = TARGET_AT[contractId] ?? TARGET_AT.firstLight
  const { phi0, alpha0 } = useMemo(() => align(orbitId, target), [orbitId, target])

  // ---- everything on the stage, built once
  const o = useMemo(() => {
    const root = new THREE.Group()
    const tilt = new THREE.Group()
    tilt.quaternion.copy(TILT)
    root.add(tilt)

    const tex = earthTexture()
    const earth = new THREE.Group()
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }))
    earth.add(ball)
    tilt.add(earth)

    // soft atmosphere
    const air = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: palette.skyMid, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false }))
    air.scale.setScalar(1.06)
    tilt.add(air)

    // the region the contract looks at: a glowing patch
    const spot = new THREE.Group()
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.yellow).multiplyScalar(1.4), transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false })
    const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.yellow).multiplyScalar(1.7), transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), glowMat)
    const edge = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.222, 48), edgeMat)
    spot.add(glow, edge)
    const spotAt = onGlobe(target.lat, target.lon, 1.006)
    spot.position.copy(spotAt)
    spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spotAt.clone().normalize())
    earth.add(spot)
    // the camera's flash on the ground
    const flashMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    const flash = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), flashMat)
    flash.position.z = 0.004
    spot.add(flash)

    // dishes
    const spare = (['equator', 'south', 'north', 'home'] as StationId[]).find((id) => !stationIds.includes(id))
    const stations = [...stationIds, ...(spare ? [spare] : [])].map((id, index) => {
      const rented = index >= stationIds.length
      const local = onGlobe(STATION_AT[id].lat, STATION_AT[id].lon, 1.005)
      const g = new THREE.Group()
      g.position.copy(local)
      g.quaternion.setFromUnitVectors(Y, local.clone().normalize())
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), new THREE.MeshStandardMaterial({ color: rented ? palette.green : id === 'home' ? palette.red : palette.yellow, roughness: 0.6 }))
      cone.position.y = 0.04
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), new THREE.MeshBasicMaterial({ color: palette.white, toneMapped: false }))
      top.position.y = 0.095
      g.add(cone, top)
      g.visible = !rented
      earth.add(g)
      return { id, local, g, pulse: 0, rented }
    })

    // the ring and the satellite
    const ringMat = new THREE.MeshBasicMaterial({ color: palette.lampHot, toneMapped: false, transparent: true, opacity: 0.85 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.007, 6, 140), ringMat)
    tilt.add(ring)
    const sat = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: palette.yellow, roughness: 0.5 })
    const wingMat = new THREE.MeshStandardMaterial({ color: palette.blue, roughness: 0.3, emissive: new THREE.Color(palette.blue), emissiveIntensity: 0.35 })
    sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), bodyMat))
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.01, 0.06), wingMat)
      wing.position.x = sx * 0.09
      sat.add(wing)
    }
    tilt.add(sat)

    const dotGeo = new THREE.SphereGeometry(1, 8, 6)
    const trail = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.lampHot).multiplyScalar(1.5), toneMapped: false }), TRAIL_DOTS)
    trail.frustumCulled = false
    tilt.add(trail)
    // where it has been over the ground this last day
    const track = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.screenGlow).multiplyScalar(1.2), toneMapped: false, transparent: true, opacity: 0.8 }), TRACK_DOTS)
    track.frustumCulled = false
    earth.add(track)

    // the beam to a dish, and the photos going down it
    const beamMat = new THREE.MeshBasicMaterial({ color: palette.screenGlow, toneMapped: false, transparent: true, opacity: 0.85 })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), beamMat)
    beam.visible = false
    tilt.add(beam)
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.78), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.3), toneMapped: false, side: THREE.DoubleSide }), TILES)
    tiles.frustumCulled = false
    tilt.add(tiles)

    // stars
    const rnd = seeded(77)
    const pos = new Float32Array(420 * 3)
    for (let i = 0; i < 420; i++) {
      const u = rnd() * Math.PI * 2
      const v = Math.acos(1 - rnd() * 2)
      pos[i * 3] = Math.sin(v) * Math.cos(u) * 40
      pos[i * 3 + 1] = Math.cos(v) * 40
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 40
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false }))

    // ---- things that only show during an event, each where it happens
    const blob = new THREE.IcosahedronGeometry(1, 1)
    // rain: a cloud parked over a dish
    const cloud = new THREE.Group()
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#b4bfcc', roughness: 1 })
    for (const [x, y, z, k] of [[0, 0, 0, 0.09], [0.09, 0.01, 0.02, 0.07], [-0.09, 0, -0.01, 0.065], [0.02, 0.035, -0.05, 0.065], [-0.02, 0.03, 0.05, 0.06]]) {
      const puff = new THREE.Mesh(blob, cloudMat)
      puff.position.set(x, y + 0.17, z)
      puff.scale.set(k, k * 0.7, k)
      cloud.add(puff)
    }
    const dropMat = new THREE.MeshBasicMaterial({ color: '#a8dcff', toneMapped: false })
    const drops = Array.from({ length: 8 }, (_, i) => {
      const drop = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.045, 0.007), dropMat)
      drop.position.set(((i * 37) % 17) / 100 - 0.08, 0.1, ((i * 53) % 13) / 100 - 0.06)
      cloud.add(drop)
      return drop
    })
    cloud.visible = false
    earth.add(cloud)
    // fire: smoke rising over the target
    const smoke = new THREE.Group()
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#6f6a66', roughness: 1, transparent: true, opacity: 0.9 })
    const plumes = Array.from({ length: 6 }, () => {
      const puff = new THREE.Mesh(blob, smokeMat)
      smoke.add(puff)
      return puff
    })
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a').multiplyScalar(2), toneMapped: false }))
    ember.position.z = 0.003
    smoke.add(ember)
    smoke.position.copy(spotAt)
    smoke.quaternion.copy(spot.quaternion)
    smoke.visible = false
    earth.add(smoke)
    // a solar storm: a wave of glowing particles from the Sun's side
    const N_STORM = 120
    const stormPos = new Float32Array(N_STORM * 3)
    const rs = seeded(31)
    for (let i = 0; i < N_STORM; i++) {
      const a = rs() * Math.PI * 2
      const rad = Math.sqrt(rs()) * 1.7
      stormPos[i * 3] = Math.cos(a) * rad
      stormPos[i * 3 + 1] = (rs() - 0.5) * 0.7
      stormPos[i * 3 + 2] = Math.sin(a) * rad
    }
    const stormGeo = new THREE.BufferGeometry()
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3))
    const storm = new THREE.Points(stormGeo, new THREE.PointsMaterial({ color: new THREE.Color('#ffb347').multiplyScalar(1.8), size: 5, sizeAttenuation: false, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }))
    storm.quaternion.setFromUnitVectors(Y, SUN)
    storm.visible = false
    root.add(storm)
    // trouble at the satellite itself: a halo round it, and debris coming along the ring
    const haloMat = new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false })
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), haloMat)
    halo.visible = false
    tilt.add(halo)
    const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#b98a7a', roughness: 0.8 }), 7)
    debris.frustumCulled = false
    debris.visible = false
    tilt.add(debris)
    // extra places the client would like photographed
    const extras = new THREE.Group()
    for (const [dx, dy] of [[0.32, 0.12], [-0.28, 0.2], [0.1, -0.34]]) {
      const ringlet = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.068, 24), edgeMat)
      ringlet.position.set(dx, dy, 0.002)
      extras.add(ringlet)
    }
    extras.visible = false
    spot.add(extras)
    const fx = { cloud, drops, smoke, plumes, storm, halo, haloMat, debris, extras }

    return { root, tilt, earth, spot, spotAt, glowMat, edgeMat, flashMat, stations, ring, sat, wingMat, bodyMat, trail, track, beam, beamMat, tiles, stars, fx, tex, dotGeo }
  }, [orbitId, stationIds, target, r])

  useEffect(
    () => () => {
      o.tex.dispose()
      o.root.traverse((x) => {
        const mesh = x as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          ;(mesh.material as THREE.Material).dispose()
        }
      })
    },
    [o],
  )

  const st = useRef({
    born: 0,
    day: -1,
    made: 0,
    kept: 0,
    shotT: 0,
    sendT: 0,
    flash: 0,
    trackI: 0,
    trackAt: -1,
    trackAge: new Float32Array(TRACK_DOTS).fill(9),
    // photos on their way down the beam
    down: [] as { t: number; station: number }[],
    lastDays: 0,
    contact: -1,
    yaw: 0,
    zoom: 0,
    fxAt: null as THREE.Vector3 | null,
    storm: 0,
    hit: 0,
    hitSeen: 0,
  })
  const tmp = useMemo(() => ({ s: new THREE.Vector3(), w: new THREE.Vector3(), v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3(), inv: new THREE.Quaternion(), ring: ringQuat(orbitId), face: new THREE.Quaternion(), path: new THREE.Quaternion() }), [orbitId])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    s.born += dt
    const days = view.days
    const step = Math.max(0, days - s.lastDays)
    const jumped = step > 0.3
    s.lastDays = days

    // ---- framing: the globe sits in the room the gauges leave, and glides there from where the launch left it
    const glide = Math.min(1, s.born / 1.4)
    const e = glide * glide * (3 - 2 * glide)
    const freeW = Math.max(200, size.width - view.insetRight)
    const freeH = Math.max(200, size.height - view.insetBottom)
    const radiusPx = Math.min(freeH * 0.4, freeW * 0.34)
    const dFinal = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * radiusPx)
    const dStart = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * size.height * 0.29)
    const d = dStart + (dFinal - dStart) * e
    // while a decision is open the camera comes round to where it is happening, and a little closer
    s.zoom += ((view.focus ? 1 : 0) - s.zoom) * Math.min(1, dt * 2.2)
    let yawGoal = 0
    if (view.focus && s.fxAt) yawGoal = THREE.MathUtils.clamp(Math.atan2(s.fxAt.x, s.fxAt.z), -2.5, 2.5) * (view.effect?.kind === 'storm' ? 0.55 : 1)
    s.yaw += (yawGoal - s.yaw) * Math.min(1, dt * 1.8)
    const dist = d * (1 - 0.07 * s.zoom)
    camera.position.set(Math.sin(s.yaw) * dist, dist * 0.16, Math.cos(s.yaw) * dist)
    camera.lookAt(0, 0, 0)
    const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(15))) / size.height
    const across = -view.insetRight * 0.5 * worldPerPx * e
    o.root.position.set(Math.cos(s.yaw) * across, view.insetBottom * 0.42 * worldPerPx * e, -Math.sin(s.yaw) * across)
    // the ring starts face on, as the launch drew it, and leans into its real tilt
    tmp.face.setFromUnitVectors(Y, tmp.v.set(0, 0.16, 1).normalize()).premultiply(tmp.inv.copy(TILT).invert())
    const ringQ = tmp.path.copy(tmp.face).slerp(tmp.ring, e)
    // the torus lies in its own XY plane; the path lies in the ring's XZ plane
    o.ring.quaternion.copy(ringQ)
    o.ring.rotateX(Math.PI / 2)

    // ---- the planet turns once a day; the satellite laps it
    o.earth.rotation.y = days * Math.PI * 2 + phi0
    const alpha = alpha0 + days * Math.PI * 2 * LAPS_PER_DAY
    tmp.s.set(Math.cos(alpha) * r, 0, Math.sin(alpha) * r).applyQuaternion(ringQ)
    o.sat.position.copy(tmp.s)
    o.sat.lookAt(o.root.position)
    const satDir = tmp.v.copy(tmp.s).normalize().clone()

    // trail behind it
    for (let i = 0; i < TRAIL_DOTS; i++) {
      const a = alpha - (i + 1) * 0.045
      tmp.w.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyQuaternion(ringQ)
      tmp.sc.setScalar(0.016 * (1 - i / TRAIL_DOTS))
      o.trail.setMatrixAt(i, tmp.m.compose(tmp.w, tmp.q.identity(), tmp.sc))
    }
    o.trail.instanceMatrix.needsUpdate = true

    // its path over the ground, in the planet's own frame, fading over a day
    tmp.inv.copy(o.earth.quaternion).invert()
    if (jumped) s.trackAge.fill(9)
    for (let i = 0; i < TRACK_DOTS; i++) s.trackAge[i] += step
    if (step > 0 && Math.abs(days - s.trackAt) > 0.0085) {
      s.trackAt = days
      const i = s.trackI
      s.trackI = (s.trackI + 1) % TRACK_DOTS
      s.trackAge[i] = 0
      tmp.w.copy(satDir).applyQuaternion(tmp.inv).multiplyScalar(1.004)
      tmp.sc.setScalar(0.011)
      o.track.setMatrixAt(i, tmp.m.compose(tmp.w, tmp.q.identity(), tmp.sc))
    }
    for (let i = 0; i < TRACK_DOTS; i++) {
      if (s.trackAge[i] > 0.92 && s.trackAge[i] < 8) {
        s.trackAge[i] = 9
        o.track.getMatrixAt(i, tmp.m)
        tmp.m.decompose(tmp.w, tmp.q, tmp.sc)
        tmp.sc.setScalar(0.00001)
        o.track.setMatrixAt(i, tmp.m.compose(tmp.w, tmp.q, tmp.sc))
      }
    }
    o.track.instanceMatrix.needsUpdate = true

    // ---- sunlight and shadow
    const sunLocal = tmp.w.copy(SUN).applyQuaternion(tmp.q.copy(TILT).invert())
    const along = satDir.dot(sunLocal)
    const offAxis = tmp.v.copy(tmp.s).addScaledVector(sunLocal, -tmp.s.dot(sunLocal)).length()
    const shadow = along < 0 && offAxis < 1
    view.shadow = shadow
    const safe = days < view.safeUntil
    const dark = shadow || safe
    o.wingMat.emissiveIntensity += ((dark ? 0 : 0.45) - o.wingMat.emissiveIntensity) * Math.min(1, dt * 8)
    o.wingMat.color.set(palette.blue).multiplyScalar(dark ? 0.35 : 1)
    o.bodyMat.color.set(palette.yellow).multiplyScalar(safe ? 0.4 : 1)
    // one pass through the shadow uses `depth` of the battery; sunlight puts it back twice as fast
    const shadowDays = 0.34 / LAPS_PER_DAY
    view.battery = Math.min(1, Math.max(0, view.battery + (shadow ? -view.depth / shadowDays : (view.depth * 2) / shadowDays) * step))

    // ---- over the target: the camera flashes and photos pop into storage
    const targetDir = tmp.w.copy(o.spot.position).normalize().applyQuaternion(o.earth.quaternion)
    const over = satDir.angleTo(targetDir) < 0.62
    view.overTarget = over
    const dayIndex = Math.min(view.nDays - 1, Math.max(0, Math.floor(days + 1e-6)))
    if (dayIndex !== s.day) {
      // a new day: whatever the last one still owed is settled quietly
      if (s.day >= 0 && !jumped) {
        const q = view.quota(s.day)
        const owed = Math.max(0, Math.min(q.make, q.keep) - s.kept)
        view.held += owed
      }
      if (jumped) {
        view.held = 0
        view.battery = 1
        s.down.length = 0
      }
      s.day = dayIndex
      s.made = 0
      s.kept = 0
    }
    const quota = view.quota(dayIndex)
    const pace = Math.max(0.05, view.speed)
    if (over && !safe && step > 0 && s.made < quota.make && days < view.nDays) {
      s.shotT -= dt * pace
      if (s.shotT <= 0) {
        s.shotT = 0.5 / Math.max(4, quota.make)
        s.made++
        s.flash = 1
        if (s.kept < quota.keep) {
          s.kept++
          view.held++
          view.pops++
        } else view.spills++
      }
    }
    s.flash = Math.max(0, s.flash - dt * 7)
    o.flashMat.opacity = s.flash * 0.9
    const breathe = 0.5 + 0.5 * Math.sin(s.born * 2.6)
    o.glowMat.opacity = 0.2 + breathe * 0.16 + (over ? 0.2 : 0)
    o.spot.scale.setScalar(1 + breathe * 0.04)

    // ---- over a dish: the beam connects and the photos stream down it
    let best = -1
    let bestDot = view.contact && s.contact >= 0 ? 0.6 : 0.86
    o.stations.forEach((station, i) => {
      station.g.visible = !station.rented || view.backup
      if (station.rented && !view.backup) return
      if (view.effect?.kind === 'rain' && view.effect.station === station.id) return
      tmp.v.copy(station.local).normalize().applyQuaternion(o.earth.quaternion)
      const dot = tmp.v.dot(satDir)
      if (dot > bestDot && (i === s.contact || dot > 0.86)) {
        bestDot = dot
        best = i
      }
    })
    if (over && s.made < quota.make) best = -1 // photos first, then the downlink
    if (safe || days >= view.nDays) best = -1
    s.contact = best
    view.contact = best >= 0 ? o.stations[best].id : null
    o.beam.visible = best >= 0
    if (best >= 0) {
      const dish = tmp.v.copy(o.stations[best].local).applyQuaternion(o.earth.quaternion)
      const mid = tmp.w.copy(dish).add(tmp.s).multiplyScalar(0.5)
      const len = dish.distanceTo(tmp.s)
      o.beam.position.copy(mid)
      o.beam.quaternion.setFromUnitVectors(Y, tmp.sc.copy(tmp.s).sub(dish).normalize())
      const wide = (0.005 + 0.024 * view.beam) * (1 + Math.sin(s.born * 14) * 0.12)
      o.beam.scale.set(wide, len, wide)
      if (view.held > 0 && step > 0) {
        s.sendT -= dt * pace
        if (s.sendT <= 0) {
          // a faster radio sends faster; a backlog is worked off faster still, so storage never lags behind the rules
          s.sendT = (0.17 - 0.115 * view.beam) / Math.max(1, view.held / 4)
          view.held--
          s.down.push({ t: 0, station: best })
        }
      }
    }
    // the mission is over: whatever is still on board comes down on the last pass
    if (days >= view.nDays && view.held > 0) {
      s.sendT -= dt
      if (s.sendT <= 0) {
        s.sendT = 0.06
        view.held--
        view.arrivals++
      }
    }
    // photos in flight
    for (let i = s.down.length - 1; i >= 0; i--) {
      const p = s.down[i]
      p.t += dt * 3.2 * Math.max(0.35, pace)
      if (p.t >= 1) {
        s.down.splice(i, 1)
        view.arrivals++
        o.stations[p.station].pulse = 1
      }
    }
    tmp.q.copy(camera.quaternion).premultiply(tmp.inv.copy(TILT).invert())
    for (let i = 0; i < TILES; i++) {
      const p = s.down[i]
      if (!p) {
        tmp.sc.setScalar(0.00001)
        o.tiles.setMatrixAt(i, tmp.m.compose(tmp.w.set(0, 0, 0), tmp.q, tmp.sc))
        continue
      }
      const dish = tmp.v.copy(o.stations[p.station].local).applyQuaternion(o.earth.quaternion)
      tmp.w.copy(tmp.s).lerp(dish, p.t)
      tmp.sc.setScalar(0.062)
      o.tiles.setMatrixAt(i, tmp.m.compose(tmp.w, tmp.q, tmp.sc))
    }
    o.tiles.instanceMatrix.needsUpdate = true
    for (const station of o.stations) {
      station.pulse = Math.max(0, station.pulse - dt * 5)
      station.g.scale.setScalar(1 + station.pulse * 0.6)
    }

    // ---- an event, drawn where it happens
    const kind = view.effect?.kind ?? null
    const f = o.fx
    f.cloud.visible = kind === 'rain'
    f.smoke.visible = kind === 'fire'
    f.extras.visible = kind === 'bonus'
    f.debris.visible = kind === 'debris'
    f.storm.visible = kind === 'storm'
    if (view.hit !== s.hitSeen) {
      s.hitSeen = view.hit
      s.hit = 1
    }
    s.hit = Math.max(0, s.hit - dt * 1.6)
    f.halo.visible = kind === 'cold' || s.hit > 0.02
    f.halo.position.copy(tmp.s)
    f.haloMat.color.set(s.hit > 0.02 ? '#ff6b55' : '#8fd3ff')
    f.haloMat.opacity = s.hit > 0.02 ? s.hit * 0.7 : 0.28 + 0.14 * Math.sin(s.born * 5)
    if (kind === 'wobble') o.sat.rotateZ(Math.sin(s.born * 11) * 0.5)
    let at: THREE.Vector3 | null = null
    if (kind === 'rain') {
      const station = o.stations.find((x) => x.id === view.effect?.station) ?? o.stations[0]
      f.cloud.position.copy(station.local)
      f.cloud.quaternion.setFromUnitVectors(Y, tmp.v.copy(station.local).normalize())
      f.drops.forEach((drop, i) => {
        drop.position.y = 0.13 - ((s.born * 0.22 + i * 0.031) % 0.11)
      })
      at = o.earth.localToWorld(tmp.v.copy(station.local).multiplyScalar(1.12)).clone()
    } else if (kind === 'fire' || kind === 'bonus') {
      f.plumes.forEach((puff, i) => {
        const k = (s.born * 0.35 + i / f.plumes.length) % 1
        puff.position.set(Math.sin(i * 2.1) * 0.03 + k * 0.05, Math.cos(i * 1.7) * 0.03, 0.03 + k * 0.3)
        puff.scale.setScalar(0.03 + k * 0.06)
      })
      at = o.earth.localToWorld(tmp.v.copy(o.spotAt).multiplyScalar(1.1)).clone()
      // retasked: the satellite turns to the fire and keeps shooting
      if (view.sweep && kind === 'fire') {
        o.sat.lookAt(at)
        s.flash = Math.max(s.flash, 0.5 + 0.5 * Math.sin(s.born * 18))
      }
    } else if (kind === 'storm') {
      // it waits out on the Sun's side while the decision is open, then sweeps across
      s.storm = view.sweep ? Math.min(1, s.storm + dt * 0.55) : Math.min(0.3, s.storm + dt * 0.05)
      const out = 1.8 - s.storm * 3.6
      f.storm.position.copy(o.root.position).addScaledVector(SUN, out)
      f.storm.rotateY(dt * 0.25)
      at = f.storm.position.clone().addScaledVector(SUN, -0.5)
    } else {
      s.storm = 0
      if (kind === 'debris') {
        for (let i = 0; i < 7; i++) {
          const a = alpha + 0.5 + i * 0.07 - ((s.born * 0.05) % 0.2)
          tmp.w.set(Math.cos(a) * (r + Math.sin(i * 3.3) * 0.03), Math.cos(i * 2.2) * 0.03, Math.sin(a) * (r + Math.sin(i * 3.3) * 0.03)).applyQuaternion(ringQ)
          tmp.sc.setScalar(0.014 + (i % 3) * 0.006)
          f.debris.setMatrixAt(i, tmp.m.compose(tmp.w, tmp.q.setFromAxisAngle(Y, s.born + i), tmp.sc))
        }
        f.debris.instanceMatrix.needsUpdate = true
      }
      if (kind) at = o.tilt.localToWorld(tmp.v.copy(tmp.s)).clone()
    }
    s.fxAt = at ? at.sub(o.root.position) : null
    if (at) {
      tmp.v.copy(at).add(o.root.position).project(camera)
      view.fxX = (tmp.v.x + 1) / 2
      view.fxY = (1 - tmp.v.y) / 2
    }

    // ---- where the satellite is on screen, for the tank and the battery drawn beside it
    o.root.updateMatrixWorld()
    const world = o.tilt.localToWorld(tmp.v.copy(tmp.s))
    // hidden when the planet is in the way
    const out = tmp.w.copy(world).sub(o.root.position)
    const toCam = tmp.sc.copy(camera.position).sub(o.root.position).normalize()
    const depth = out.dot(toCam)
    view.satShown = depth > 0 || out.addScaledVector(toCam, -depth).length() > 1.02
    world.project(camera)
    view.satX = (world.x + 1) / 2
    view.satY = (1 - world.y) / 2
  })

  return (
    <>
      <hemisphereLight args={[palette.hemiSky, palette.navyDark, 0.32]} />
      <directionalLight color={palette.sun} intensity={3} position={[SUN.x * 6, SUN.y * 6, SUN.z * 6]} />
      <primitive object={o.stars} />
      <primitive object={o.root} />
    </>
  )
}

export function OpsGlobe(props: { orbitId: OrbitId; stationIds: StationId[]; contractId: string; view: OpsView }) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} camera={{ fov: 30, near: 0.5, far: 120, position: [0, 1, 12] }}>
      <Stage {...props} />
    </Canvas>
  )
}
