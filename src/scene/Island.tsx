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
import { DECK, DOCK_CENTER, DOCK_YAW, PIER, dockWorld, zoneOfCell } from './grid'
import { Instances, treePine, treeRound, type Spot } from './Props'
import { PLATEAU_D, coastUv, uvToWorld, worldToUv } from './world'

const TOP = 0.14

/**
 * The quay: a broad plank deck along the shore with a ramp down to the grass,
 * heavy rope posts on the seaward sides, a pier for the delivery boat and a
 * little yellow crane to lift the cargo off. The Parts Market stands on it.
 */
export function Dock() {
  const object = useMemo(() => {
    const kit = new Kit()
    const W = DECK.w
    const D = DECK.d
    const tones = [palette.wood, palette.woodLight, palette.wood, palette.plankWarm, palette.woodLight]

    /** A run of planks lying across `w`, each `d` long, on a dark frame so the gaps read. */
    const planks = (cx: number, cz: number, w: number, d: number, alongX: boolean) => {
      kit.box(w + 0.1, 0.26, d + 0.1, { color: palette.trunkDark, top: palette.woodDark, at: [cx, TOP - 0.2, cz], r: 0.06 })
      const span = alongX ? d : w
      const n = Math.max(1, Math.round(span / 0.6))
      const step = span / n
      for (let p = 0; p < n; p++) {
        const off = -span / 2 + (p + 0.5) * step
        kit.box(alongX ? w : step - 0.07, 0.09, alongX ? step - 0.07 : d, {
          color: palette.wood,
          top: tones[(p * 3 + (alongX ? 1 : 0)) % tones.length],
          at: [alongX ? cx : cx + off, TOP - 0.045, alongX ? cz + off : cz],
          r: 0.03,
          shade: 0.04,
        })
      }
    }
    const post = (x: number, z: number, tall = true) => {
      kit.cyl(0.2, 0.24, 3.4, { color: palette.trunkDark, top: palette.woodDark, at: [x, TOP - 1.55, z], bevel: 0.04, seg: 10 })
      if (tall) {
        kit.cyl(0.19, 0.2, 0.95, { color: palette.woodDark, top: palette.wood, at: [x, TOP + 0.47, z], bevel: 0.04, seg: 10 })
        kit.cyl(0.25, 0.25, 0.12, { color: palette.plankWarm, top: palette.woodLight, at: [x, TOP + 0.98, z], bevel: 0.04, seg: 10 })
        kit.torus(0.2, 0.04, { color: palette.rope, at: [x, TOP + 0.62, z], tube: 6, seg: 10 })
      }
    }
    const rope = (a: [number, number], b: [number, number]) => {
      kit.pipe([[a[0], TOP + 0.62, a[1]], [(a[0] + b[0]) / 2, TOP + 0.36, (a[1] + b[1]) / 2], [b[0], TOP + 0.62, b[1]]], 0.055, { color: palette.rope, top: palette.ropeLight, radial: 6, tension: 0.5 })
    }

    // ---- the deck, its ramp and the pier
    planks(0, 0, W, D, false)
    const pz = D / 2 + PIER.len / 2
    planks(PIER.x, pz, PIER.w, PIER.len, true)
    // two broad steps down to the lawn
    for (let i = 0; i < 2; i++) kit.box(W * 0.5 - i * 0.6, 0.16, 0.7, { color: palette.rockDark, top: palette.rock, at: [-0.6, TOP - 0.16 - i * 0.12, -D / 2 - 0.3 - i * 0.6], r: 0.07 })

    // ---- rope posts round the three seaward sides
    const ring: [number, number][] = []
    const xs = [-W / 2, -W / 2 + 2.2, -W / 2 + 4.4, -W / 2 + 6.6, PIER.x - PIER.w / 2]
    ring.push([-W / 2, -D / 2 + 0.2], [-W / 2, 0])
    for (const x of xs) ring.push([x, D / 2])
    for (let i = 0; i < ring.length; i++) {
      post(ring[i][0], ring[i][1])
      if (i > 0) rope(ring[i - 1], ring[i])
    }
    const right: [number, number][] = [[W / 2, D / 2], [W / 2, 0.6], [W / 2, -D / 2 + 0.2]]
    right.forEach((r, i) => {
      post(r[0], r[1])
      if (i > 0) rope(right[i - 1], r)
    })
    // pier posts: low on the mooring side so cargo can swing over, tall on the outside
    for (let z = D / 2 + 2; z <= D / 2 + PIER.len + 0.01; z += 2.5) {
      post(PIER.x - PIER.w / 2, z, false)
      post(PIER.x + PIER.w / 2, z)
      kit.cyl(0.2, 0.26, 0.42, { color: palette.steel, top: palette.metal, at: [PIER.x - PIER.w / 2 + 0.45, TOP + 0.21, z], bevel: 0.07, seg: 10, mat: 'metal' })
    }
    for (let z = D / 2 + 2; z < D / 2 + PIER.len - 1; z += 2.5) rope([PIER.x + PIER.w / 2, z], [PIER.x + PIER.w / 2, z + 2.5])
    post(PIER.x + PIER.w / 2, D / 2)

    // ---- the cargo crane at the water's edge
    const cx = 1.6
    const cz = D / 2 - 0.9
    kit.cyl(0.5, 0.6, 0.3, { color: palette.steel, top: palette.metal, at: [cx, TOP + 0.15, cz], bevel: 0.08, seg: 14, mat: 'metal' })
    kit.cyl(0.2, 0.26, 3.0, { color: palette.yellowDark, top: palette.yellow, at: [cx, TOP + 1.7, cz], bevel: 0.05, seg: 12 })
    kit.box(0.7, 0.6, 0.7, { color: palette.yellowDark, top: palette.yellow, at: [cx, TOP + 3.3, cz], r: 0.12 })
    kit.box(0.4, 0.3, 0.06, { color: palette.glassDark, top: palette.glass, at: [cx, TOP + 3.34, cz + 0.36], r: 0.03, mat: 'glass' })
    kit.beam([cx, TOP + 3.5, cz + 0.2], [cx - 0.5, TOP + 4.3, cz + 3.4], 0.24, { color: palette.yellowDark, top: palette.yellow })
    kit.beam([cx, TOP + 3.9, cz - 0.3], [cx - 0.5, TOP + 4.36, cz + 3.4], 0.05, { color: palette.steel, round: true })
    kit.box(0.5, 0.5, 0.6, { color: palette.rubber, top: palette.steel, at: [cx, TOP + 3.3, cz - 0.6], r: 0.1 })
    kit.beam([cx - 0.5, TOP + 4.26, cz + 3.4], [cx - 0.5, TOP + 2.5, cz + 3.4], 0.04, { color: palette.steel, round: true })
    kit.box(0.72, 0.72, 0.72, { color: palette.woodDark, top: palette.wood, at: [cx - 0.5, TOP + 2.1, cz + 3.4], rot: [0, 0.4, 0], r: 0.06 })
    kit.box(0.78, 0.1, 0.78, { color: palette.wood, top: palette.woodLight, at: [cx - 0.5, TOP + 2.34, cz + 3.4], rot: [0, 0.4, 0], r: 0.03 })

    // ---- life on the quay: stacked cargo, barrels, a coil of rope, a lamp, a lifebuoy
    const crate = (x: number, y: number, z: number, s: number, r: number, lid: string = palette.woodLight) => {
      kit.box(s, s, s, { color: palette.woodDark, top: palette.wood, at: [x, TOP + y + s / 2, z], rot: [0, r, 0], r: 0.05 })
      kit.box(s * 1.06, s * 0.14, s * 1.06, { color: palette.wood, top: lid, at: [x, TOP + y + s * 0.8, z], rot: [0, r, 0], r: 0.02 })
    }
    crate(4.9, 0, -2.4, 0.95, 0.15)
    crate(5.75, 0, -2.0, 0.8, -0.3)
    crate(5.2, 0.95, -2.3, 0.7, 0.5, palette.yellow)
    crate(4.2, 0, -1.0, 0.7, 0.7)
    crate(5.6, 0, 1.4, 0.85, 0.2, palette.teal)
    for (const [x, z, a, b] of [
      [3.4, -2.7, palette.blueDark, palette.blue],
      [5.9, 0.2, palette.redDark, palette.red],
      [4.6, 2.3, palette.tealDark, palette.teal],
    ] as const) {
      kit.cyl(0.32, 0.32, 0.82, { color: a, top: b, at: [x, TOP + 0.41, z], bevel: 0.07, seg: 14 })
      kit.torus(0.325, 0.03, { color: palette.metalLight, at: [x, TOP + 0.6, z], tube: 6, seg: 14 })
    }
    for (let i = 0; i < 3; i++) kit.torus(0.42 - i * 0.03, 0.075, { color: palette.rope, top: palette.ropeLight, at: [-5.6, TOP + 0.08 + i * 0.13, 2.7], tube: 6, seg: 16 })
    kit.cyl(0.08, 0.1, 3.0, { color: palette.navyDark, top: palette.navy, at: [-W / 2 + 0.5, TOP + 1.5, -D / 2 + 0.6], bevel: 0.02, seg: 8 })
    kit.box(0.5, 0.14, 0.5, { color: palette.navyDark, top: palette.navy, at: [-W / 2 + 0.5, TOP + 3.2, -D / 2 + 0.6], r: 0.05 })
    kit.sphere(0.26, { color: palette.lampWarm, top: palette.lampHot, at: [-W / 2 + 0.5, TOP + 2.96, -D / 2 + 0.6], seg: 10, mat: 'glow', shade: 0 })
    kit.torus(0.34, 0.11, { color: palette.red, top: palette.white, at: [W / 2 + 0.06, TOP + 0.62, 0.6], rot: [0, 0, Math.PI / 2], tube: 8, seg: 16 })
    return kit.build('dock')
  }, [])
  return (
    <group position={[DOCK_CENTER[0], 0, DOCK_CENTER[1]]} rotation-y={DOCK_YAW}>
      <primitive object={object} />
    </group>
  )
}

const SAIL_IN_MS = 8000
const WAIT_MS = 1800
const SAIL_OUT_MS = 6000
const WATER_LINE = -1.02

/** The delivery boat: sails in along the shore to tie up under the crane just as an order is due. */
export function DeliveryBoat() {
  const boat = useMemo(() => createModel('boat', {}), [])
  useEffect(() => () => disposeModel(boat), [boat])
  const path = useMemo(() => {
    const at = (lx: number, lz: number) => {
      const [x, z] = dockWorld(lx, lz)
      return new THREE.Vector3(x, WATER_LINE, z)
    }
    const berth = DECK.d / 2 + 1.55
    return new THREE.CatmullRomCurve3([at(-52, 17), at(-30, 11.5), at(-14, berth + 2.2), at(-5.5, berth + 0.3), at(-1.2, berth)], false, 'catmullrom', 0.5)
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
    // glide to a stop rather than ram the quay; back out the way it came
    const e = forward ? 1 - Math.pow(1 - k, 2.2) : k * k
    path.getPoint(Math.min(1, e), boat.position)
    path.getTangent(Math.min(0.999, Math.max(0.001, e)), tmp)
    const yaw = Math.atan2(tmp.x, tmp.z)
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
