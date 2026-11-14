import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Kit, seeded } from '../art/kit'
import { palette } from '../art/palette'
import { createModel, disposeModel, type ModelUserData } from '../art/registry'
import '../art/models'
import { ZONES } from '../data/layout'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { useUi } from '../state/ui'
import { sfx } from '../ui/sound'
import { CELL, DOCK, DOCK_SIZE, JETTY, zoneOfCell } from './grid'
import { Instances, treePine, treeRound, type Spot } from './Props'
import { ISLAND_U, ISLAND_V, PLATEAU_D, coastUv, uvToWorld, worldToUv } from './world'

const DECK_Y = 0.1

/**
 * The dock: a plank deck on posts over the shallows, ringed with rope posts,
 * with a jetty where the delivery boat ties up. The Parts Market stands on it.
 */
export function Dock() {
  const object = useMemo(() => {
    const kit = new Kit()
    const x0 = DOCK.i * CELL
    const z0 = DOCK.j * CELL
    const size = DOCK_SIZE * CELL
    const deck = (x: number, z: number, w: number, d: number) => {
      kit.box(w, 0.22, d, { color: palette.woodDark, top: palette.wood, at: [x + w / 2, DECK_Y - 0.17, z + d / 2], r: 0.05 })
      // planks run across the short way, with small gaps
      const n = Math.round(d / 0.62)
      for (let p = 0; p < n; p++) {
        const shade = p % 3 === 0 ? palette.wood : palette.woodLight
        kit.box(w + 0.16, 0.08, d / n - 0.07, { color: palette.wood, top: shade, at: [x + w / 2, DECK_Y - 0.03, z + (p + 0.5) * (d / n)], r: 0.025, shade: 0.05 })
      }
      // legs down into the water
      for (let px = x + 0.3; px <= x + w - 0.2; px += Math.max(2.4, (w - 0.6) / Math.round((w - 0.6) / 2.6))) {
        for (const pz of [z + 0.3, z + d - 0.3]) kit.cyl(0.19, 0.23, 3.2, { color: palette.trunkDark, top: palette.woodDark, at: [px, DECK_Y - 1.7, pz], bevel: 0.04, seg: 8 })
      }
    }
    deck(x0, z0, size, size)
    const jx = JETTY.i * CELL
    const jz = JETTY.j * CELL
    deck(jx - 0.1, jz, JETTY.len * CELL, JETTY.wide * CELL)

    // rope posts round the seaward sides (the landward corner is left open)
    const posts: [number, number][] = []
    const step = 1.5
    for (let t = step * 2; t <= size + 0.01; t += step) posts.push([x0 + t, z0 + size]) // front-left edge
    for (let t = size - step; t >= JETTY.wide * CELL + (jz - z0) + 0.5; t -= step) posts.push([x0 + size, z0 + t]) // front-right edge, down to the jetty
    for (let t = 0; t < posts.length; t++) {
      const [px, pz] = posts[t]
      kit.cyl(0.13, 0.15, 1.0, { color: palette.woodDark, top: palette.woodLight, at: [px, DECK_Y + 0.5, pz], bevel: 0.04, seg: 8 })
      kit.sphere(0.16, { color: palette.woodLight, at: [px, DECK_Y + 1.04, pz], seg: 8 })
      if (t > 0) {
        const [qx, qz] = posts[t - 1]
        if (Math.hypot(px - qx, pz - qz) < step * 1.6) {
          const mid: [number, number, number] = [(px + qx) / 2, DECK_Y + 0.58, (pz + qz) / 2]
          kit.pipe([[qx, DECK_Y + 0.82, qz], mid, [px, DECK_Y + 0.82, pz]], 0.045, { color: palette.dirtDark, top: palette.dirt, radial: 6, tension: 0.5 })
        }
      }
    }
    // jetty bollards, a lamp, a lifebuoy and waiting cargo
    for (const t of [1.5, 4.5, 7.5]) kit.cyl(0.16, 0.2, 0.4, { color: palette.steel, top: palette.metal, at: [jx + t, DECK_Y + 0.2, jz + 0.3], bevel: 0.06, seg: 10, mat: 'metal' })
    kit.cyl(0.07, 0.09, 2.6, { color: palette.metalDark, top: palette.metalLight, at: [x0 + size - 0.5, DECK_Y + 1.3, z0 + 0.6], bevel: 0.02, seg: 8 })
    kit.sphere(0.24, { color: palette.lampWarm, top: palette.lampHot, at: [x0 + size - 0.5, DECK_Y + 2.7, z0 + 0.6], seg: 10, mat: 'glow', shade: 0 })
    kit.torus(0.3, 0.1, { color: palette.red, top: palette.white, at: [x0 + size - 0.02, DECK_Y + 0.75, z0 + 3.0], rot: [0, 0, Math.PI / 2], tube: 8, seg: 16 })
    for (const [cx, cz, s, r] of [
      [x0 + 1.0, z0 + size - 1.2, 0.8, 0.2],
      [x0 + 1.9, z0 + size - 0.9, 0.6, -0.4],
      [x0 + 1.2, z0 + size - 2.1, 0.55, 0.6],
      [x0 + size - 1.1, z0 + size - 1.3, 0.7, 0.3],
    ] as const) {
      kit.box(s, s, s, { color: palette.woodDark, top: palette.wood, at: [cx, DECK_Y + s / 2, cz], rot: [0, r, 0], r: 0.05 })
      kit.box(s * 1.06, 0.09, s * 1.06, { color: palette.wood, top: palette.woodLight, at: [cx, DECK_Y + s * 0.8, cz], rot: [0, r, 0], r: 0.02 })
    }
    for (const [bx, bz, c1, c2] of [
      [x0 + size - 1.9, z0 + size - 0.8, palette.blueDark, palette.blue],
      [x0 + size - 0.9, z0 + size - 2.3, palette.tealDark, palette.teal],
    ] as const)
      kit.cyl(0.26, 0.26, 0.66, { color: c1, top: c2, at: [bx, DECK_Y + 0.33, bz], bevel: 0.06, seg: 12 })
    return kit.build('dock')
  }, [])
  return <primitive object={object} />
}

/** Where the delivery boat ties up, and which way it faces when moored. */
const MOOR = new THREE.Vector3((JETTY.i + JETTY.len / 2) * CELL, -1.02, (JETTY.j + JETTY.wide) * CELL + 1.35)

const SAIL_IN_MS = 8000
const WAIT_MS = 1600
const SAIL_OUT_MS = 6000

/** The delivery boat: sails in so it reaches the jetty just as an order is due, then heads back out. */
export function DeliveryBoat() {
  const boat = useMemo(() => createModel('boat', {}), [])
  useEffect(() => () => disposeModel(boat), [boat])
  // from out at sea (down-left of the dock), curving in alongside the jetty
  const path = useMemo(() => {
    const out = (right: number, down: number) => new THREE.Vector3(MOOR.x + ISLAND_V.x * right + ISLAND_U.x * down, MOOR.y, MOOR.z + ISLAND_V.y * right + ISLAND_U.y * down)
    return new THREE.CatmullRomCurve3([out(-46, 26), out(-24, 15), out(-9, 5), new THREE.Vector3(MOOR.x - 3.5, MOOR.y, MOOR.z + 0.4), MOOR.clone()], false, 'catmullrom', 0.5)
  }, [])
  const st = useRef({ arrivedAt: 0, lastCount: 0 })
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const now = Date.now()
    const deliveries = useGame.getState().deliveries
    const s = st.current
    const next = deliveries.reduce((m, d) => Math.min(m, d.end), Infinity)
    if (deliveries.length < s.lastCount) s.arrivedAt = now
    s.lastCount = deliveries.length

    let k = -1
    let forward = true
    if (next - now < SAIL_IN_MS) k = 1 - Math.max(0, next - now) / SAIL_IN_MS
    else if (s.arrivedAt && now - s.arrivedAt < WAIT_MS) k = 1
    else if (s.arrivedAt && now - s.arrivedAt < WAIT_MS + SAIL_OUT_MS) {
      k = 1 - (now - s.arrivedAt - WAIT_MS) / SAIL_OUT_MS
      forward = false
    }
    boat.visible = k >= 0
    if (k < 0) return
    // glide to a stop rather than ram the jetty
    const e = forward ? 1 - Math.pow(1 - k, 2.2) : k * k
    path.getPoint(Math.min(1, e), boat.position)
    path.getTangent(Math.min(0.999, e), tmp)
    const yaw = Math.atan2(tmp.x, tmp.z) + (forward ? 0 : Math.PI)
    let d = yaw - boat.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    boat.rotation.y += d * Math.min(1, dt * 5)
    ;(boat.userData as ModelUserData).tick?.(state.clock.elapsedTime, dt)
  })
  return <primitive object={boat} visible={false} />
}

/** World position of the sign on a zone's fence. */
export function zoneSignWorld(zone: number): [number, number] {
  return uvToWorld(6, ZONES[zone].fromV)
}

function fenceFor(zone: number): THREE.Group {
  const kit = new Kit()
  const v = ZONES[zone].fromV
  let prev: [number, number] | null = null
  let n = 0
  for (let u = -34; u <= 34; u += 1.7) {
    if (coastUv(u, v) > PLATEAU_D - 0.2) {
      prev = null
      continue
    }
    const [x, z] = uvToWorld(u, v)
    kit.cyl(0.13, 0.16, 1.25, { color: palette.trunkDark, top: palette.woodLight, at: [x, 0.62, z], bevel: 0.04, seg: 8 })
    if (prev) {
      for (const y of [0.42, 0.9]) kit.beam([prev[0], y, prev[1]], [x, y, z], 0.1, { color: palette.woodDark, top: palette.wood })
      // a hazard board now and then says "not yet"
      if (n % 5 === 2)
        kit.box(1.5, 0.3, 0.07, {
          color: palette.hazardDark,
          top: palette.hazard,
          at: [(prev[0] + x) / 2, 0.66, (prev[1] + z) / 2],
          rot: [0, Math.atan2(-(z - prev[1]), x - prev[0]), 0],
          r: 0.03,
        })
    }
    prev = [x, z]
    n++
  }
  return kit.build(`fence-${zone}`)
}

function signFor(): THREE.Group {
  const kit = new Kit()
  // a chunky signboard with a padlock, turned to face the camera
  kit.at([0, 0, 0], [0, Math.PI / 4, 0], () => {
    for (const x of [-0.75, 0.75]) kit.cyl(0.1, 0.13, 2.3, { color: palette.trunkDark, top: palette.woodLight, at: [x, 1.15, 0], bevel: 0.03, seg: 8 })
    kit.box(2.2, 1.35, 0.16, { color: palette.woodDark, top: palette.woodLight, at: [0, 1.95, 0.02], r: 0.08 })
    kit.box(1.9, 1.05, 0.06, { color: palette.creamShade, top: palette.cream, at: [0, 1.95, 0.11], r: 0.05 })
    kit.box(0.62, 0.5, 0.2, { color: palette.yellowDark, top: palette.yellow, at: [0, 1.78, 0.2], r: 0.08, mat: 'gloss' })
    kit.torus(0.2, 0.06, { color: palette.steel, top: palette.metalLight, at: [0, 2.06, 0.2], rot: [Math.PI / 2, 0, 0], arc: Math.PI, mat: 'metal', tube: 8, seg: 14 })
    kit.cyl(0.06, 0.06, 0.05, { color: palette.ink, at: [0, 1.78, 0.31], rot: [Math.PI / 2, 0, 0], bevel: 0.01, seg: 10, shade: 0 })
  })
  return kit.build('zone-sign')
}

/** The wild woods on land that is still fenced off. */
function wildSpots(zone: number): { round: Spot[]; pines: Spot[] } {
  const rnd = seeded(500 + zone)
  const round: Spot[] = []
  const pines: Spot[] = []
  let tries = 0
  while (round.length + pines.length < 95 && tries++ < 6000) {
    const u = -26 + rnd() * 52
    const v = ZONES[zone].fromV + 2 + rnd() * ((ZONES[zone + 1]?.fromV ?? 46) - ZONES[zone].fromV - 3)
    if (coastUv(u, v) > PLATEAU_D - 0.6) continue
    const [x, z] = uvToWorld(u, v)
    const spot = { x, z, y: 0, s: 0.95 + rnd() * 0.55, rot: rnd() * 6.3 }
    if (rnd() < 0.42) pines.push(spot)
    else round.push(spot)
  }
  return { round, pines }
}

function LockedZone({ zone, first }: { zone: number; first: boolean }) {
  const fence = useMemo(() => fenceFor(zone), [zone])
  const sign = useMemo(signFor, [])
  const wild = useMemo(() => wildSpots(zone), [zone])
  const geo = useMemo(() => ({ round: treeRound(), pine: treePine() }), [])
  const [sx, sz] = zoneSignWorld(zone)
  const bob = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (bob.current && first) bob.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 2.2)) * 0.12
  })
  return (
    <group>
      <primitive object={fence} />
      <Instances geometry={geo.round} spots={wild.round} />
      <Instances geometry={geo.pine} spots={wild.pines} />
      <group
        position={[sx, 0, sz]}
        onClick={(e) => {
          if (e.delta > 8 || !first) return
          const g = useGame.getState()
          if (usePlacement.getState().id || g.phase !== 'play' || g.tourStep >= 0) return
          e.stopPropagation()
          sfx('pop')
          useUi.getState().setZonePopup(true)
        }}
      >
        <group ref={bob}>
          <primitive object={sign} />
        </group>
      </group>
    </group>
  )
}

/** Fences, signs and wild woods for every part of the island that hasn't been opened yet. */
export function LockedLand() {
  const zones = useGame((s) => s.zones)
  return (
    <group name="locked-land">
      {ZONES.map((_, n) => (n >= zones && n > 0 ? <LockedZone key={n} zone={n} first={n === zones} /> : null))}
    </group>
  )
}

export { zoneOfCell, worldToUv }
