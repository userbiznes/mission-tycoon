import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Kit, seeded, type V3 } from '../art/kit'
import { palette } from '../art/palette'
import { createModel, disposeModel, type ModelUserData } from '../art/registry'
import '../art/models'
import { DECK_TOP, LOAD_DROP, buildBuoy, buildCrane, buildDock, buildFloat, buildLandedCrate } from '../art/models/dock'
import { useGame } from '../state/game'
import { BERTH, DECK, DECK_LEFT, DOCK_CENTER, DOCK_YAW, PIER, PIER_END, dockWorld } from './grid'
import { WATER_Y } from './world'

// ------------------------------------------------------------------ the harbour
/** What the boat and the crane tell each other. */
const harbour = {
  /** the boat is tied up at the pier head */
  moored: true,
  /** crates that have landed and still have to be swung ashore */
  unload: 0,
  /** the crane is in the middle of a lift */
  busy: false,
}

const BOAT_SCALE = 0.85
/** Height of the boat's keel line: it sits a little down in the water. */
const BOAT_Y = -1.2
/** The spot on the boat's foredeck the crane lifts from (dock-local). */
const PICK: [number, number] = [BERTH[0], BERTH[1] + 0.55]

/**
 * Soft foam on the water: rings that spread from every piling and from the
 * boat's hull, plus the shade the deck throws on the sea. One transparent
 * shader, drawn just above the water plane.
 */
const foamUniforms = {
  uTime: { value: 0 },
  uFoam: { value: new THREE.Color(palette.foam) },
  uShade: { value: new THREE.Color(palette.oceanDeep).lerp(new THREE.Color(palette.navyDark), 0.55) },
}
const foamMaterial = new THREE.ShaderMaterial({
  uniforms: foamUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    attribute vec4 aFoam; // phase, kind (0 ring round a post, 1 shade, 2 ring round a hull), soft edge x, soft edge y
    varying vec2 vUv;
    varying vec4 vFoam;
    void main() {
      vUv = uv;
      vFoam = aFoam;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uFoam;
    uniform vec3 uShade;
    varying vec2 vUv;
    varying vec4 vFoam;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      vec3 col;
      float a;
      if (vFoam.y > 0.5 && vFoam.y < 1.5) {
        // shade under the deck: a rectangle with soft edges
        vec2 f = 1.0 - smoothstep(vec2(1.0) - vFoam.zw, vec2(1.0), abs(p));
        col = uShade;
        a = 0.4 * f.x * f.y;
      } else {
        float inner = vFoam.y > 1.5 ? 0.6 : 0.3;
        float ang = atan(p.y, p.x);
        float r = length(p) + 0.03 * sin(ang * 5.0 + vFoam.x * 40.0 + uTime * 0.8) + 0.02 * sin(ang * 9.0 - uTime * 1.1);
        a = 0.0;
        // rings that swell outwards and fade
        for (int k = 0; k < 2; k++) {
          float t = fract(uTime * 0.26 + vFoam.x + float(k) * 0.5);
          float rr = mix(inner + 0.02, 0.92, t);
          float w = mix(0.05, 0.11, t);
          a += (1.0 - smoothstep(0.0, w, abs(r - rr))) * pow(1.0 - t, 1.3) * smoothstep(0.0, 0.14, t);
        }
        // a steady collar hugging the wood
        float collar = inner + 0.03 + 0.025 * sin(uTime * 1.4 + vFoam.x * 9.0);
        a += (1.0 - smoothstep(0.0, 0.085, abs(r - collar))) * 0.85;
        col = uFoam;
        a = clamp(a, 0.0, 1.0) * 0.8;
      }
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
})

interface FoamQuad {
  x: number
  z: number
  /** half size along x and z */
  hx: number
  hz: number
  kind: 0 | 1 | 2
  phase?: number
  /** soft edge width, world units (shade only) */
  soft?: number
}
function foamGeometry(quads: FoamQuad[], y: number): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const info: number[] = []
  const index: number[] = []
  quads.forEach((q, n) => {
    const yy = y + (q.kind === 1 ? 0 : 0.012)
    pos.push(q.x - q.hx, yy, q.z - q.hz, q.x + q.hx, yy, q.z - q.hz, q.x + q.hx, yy, q.z + q.hz, q.x - q.hx, yy, q.z + q.hz)
    uv.push(0, 0, 1, 0, 1, 1, 0, 1)
    const soft = q.soft ?? 0.5
    for (let i = 0; i < 4; i++) info.push(q.phase ?? 0, q.kind, soft / q.hx, soft / q.hz)
    index.push(n * 4, n * 4 + 2, n * 4 + 1, n * 4, n * 4 + 3, n * 4 + 2)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aFoam', new THREE.Float32BufferAttribute(info, 4))
  g.setIndex(index)
  return g
}

const ease = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

/** One lift, start to finish: how long each move takes, in seconds. */
const LIFT = { swingOut: 1.0, lower: 0.7, grab: 0.25, raise: 0.8, swingIn: 1.4, set: 0.7, release: 0.2, clear: 0.7 }
const LIFT_TOTAL = Object.values(LIFT).reduce((a, b) => a + b, 0)
/** A delivered crate waits on the pallet this long before it is carried up to the market. */
const CRATE_STAYS = 9

/**
 * The dock: a plank deck on pilings along the shore, a pier running west to a
 * wider head, lanterns, rope rails, tidy stacks of cargo, buoys bobbing off the
 * pier and foam round every post. The crane on the pier head swings a crate
 * ashore each time a delivery lands. The Parts Market stands on the deck.
 */
export function Dock() {
  const built = useMemo(() => {
    const layout = { left: DECK_LEFT, right: DECK.x + DECK.w / 2, back: -DECK.d / 2, front: DECK.d / 2, pier: PIER }
    const dock = buildDock(layout)
    // the crane reaches the boat's foredeck one way and the pallet the other
    const d = (p: [number, number]) => Math.hypot(p[0] - dock.crane[0], p[1] - dock.crane[1])
    const yawTo = (p: [number, number]) => Math.atan2(p[0] - dock.crane[0], p[1] - dock.crane[1])
    const crane = buildCrane((d(PICK) + d(dock.drop)) / 2)
    crane.root.position.set(dock.crane[0], DECK_TOP, dock.crane[1])
    const landed = buildLandedCrate(crane.crate)
    landed.position.set(dock.drop[0], dock.dropY, dock.drop[1])
    landed.visible = false

    // buoys: two channel markers and a mooring float
    const buoys = [
      { obj: buildBuoy(palette.red, palette.redDark), x: PIER_END + 2.1, z: PIER.z + PIER.headW / 2 + 2.3, phase: 0.3 },
      { obj: buildBuoy(palette.green, palette.roofGreenDark), x: PIER_END - 3.6, z: PIER.z - 3.6, phase: 2.1 },
      { obj: buildFloat(palette.orange, palette.orangeDark), x: DECK.x + 1.6, z: DECK.d / 2 + 1.7, phase: 4.2 },
    ]

    // the bow line, shown while the boat is tied up
    const kr = new Kit()
    const a: V3 = [dock.bollard[0], dock.bollard[1] + 0.3, dock.bollard[2]]
    const b: V3 = [BERTH[0] + 0.25, BOAT_Y + 0.72 * BOAT_SCALE, BERTH[1] + 1.75]
    kr.pipe(
      [0, 0.25, 0.5, 0.75, 1].map((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 0.22, a[2] + (b[2] - a[2]) * t] as V3),
      0.035,
      { color: palette.rope, top: palette.ropeLight, radial: 5, tension: 0.5 },
    )
    const line = kr.build('bow-line')

    // foam: the deck's shade first (drawn under), then a ring round every post and buoy
    const rnd = seeded(9)
    const sun: [number, number] = [1.14, -0.66]
    const quads: FoamQuad[] = [
      { x: DECK.x + sun[0], z: sun[1], hx: DECK.w / 2, hz: DECK.d / 2, kind: 1, soft: 0.7 },
      { x: (DECK_LEFT + PIER_END + PIER.headLen) / 2 + sun[0], z: PIER.z + sun[1], hx: (PIER.len - PIER.headLen) / 2 + 0.4, hz: PIER.w / 2, kind: 1, soft: 0.6 },
      { x: PIER_END + PIER.headLen / 2 + sun[0], z: PIER.z + sun[1], hx: PIER.headLen / 2, hz: PIER.headW / 2, kind: 1, soft: 0.6 },
    ]
    for (const [x, z, r] of dock.posts) quads.push({ x, z, hx: r / 0.3, hz: r / 0.3, kind: 0, phase: rnd() })
    for (const q of buoys) quads.push({ x: q.x, z: q.z, hx: 1.05, hz: 1.05, kind: 0, phase: rnd() })
    const foam = new THREE.Mesh(foamGeometry(quads, WATER_Y + 0.02), foamMaterial)
    foam.name = 'dock-foam'
    foam.renderOrder = 1
    foam.frustumCulled = false

    return { dock, crane, landed, buoys, line, foam, pickYaw: yawTo(PICK), dropYaw: yawTo(dock.drop) }
  }, [])

  useEffect(
    () => () => {
      built.foam.geometry.dispose()
      for (const o of [built.dock.group, built.crane.root, built.landed, built.line, ...built.buoys.map((q) => q.obj)]) {
        o.traverse((m) => (m as THREE.Mesh).geometry?.dispose())
      }
    },
    [built],
  )

  const st = useRef({ lift: -1, landedAt: -1 })
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    foamUniforms.uTime.value = t
    for (const q of built.buoys) {
      q.obj.position.set(q.x, WATER_Y + 0.02 + Math.sin(t * 1.5 + q.phase) * 0.05, q.z)
      q.obj.rotation.set(Math.sin(t * 1.2 + q.phase) * 0.09, 0, Math.sin(t * 0.9 + q.phase * 2) * 0.09)
    }
    built.line.visible = harbour.moored

    // ---- the crane
    const s = st.current
    const c = built.crane
    if (s.lift < 0 && harbour.unload > 0 && harbour.moored) {
      harbour.unload--
      harbour.busy = true
      s.lift = 0
    }
    const up = c.tipY - 0.36
    // hook heights, measured from the crane's root: over the boat's cargo, and with the crate standing on the pallet
    const atBoat = BOAT_Y + 1.05 * BOAT_SCALE - c.root.position.y + LOAD_DROP
    const atPallet = built.dock.dropY - c.root.position.y + LOAD_DROP
    let yaw = built.dropYaw
    let hookY = up
    let carrying = false
    let sway = 0
    if (s.lift >= 0) {
      s.lift += Math.min(dt, 0.05)
      let k = s.lift
      const step = (len: number) => {
        const f = k / len
        k -= len
        return f
      }
      let f = step(LIFT.swingOut)
      if (f < 1) yaw = built.dropYaw + (built.pickYaw - built.dropYaw) * ease(f)
      else if ((f = step(LIFT.lower)) < 1) {
        yaw = built.pickYaw
        hookY = up + (atBoat - up) * ease(f)
      } else if ((f = step(LIFT.grab)) < 1) {
        yaw = built.pickYaw
        hookY = atBoat
        carrying = f > 0.4
      } else if ((f = step(LIFT.raise)) < 1) {
        yaw = built.pickYaw
        hookY = atBoat + (up - atBoat) * ease(f)
        carrying = true
      } else if ((f = step(LIFT.swingIn)) < 1) {
        yaw = built.pickYaw + (built.dropYaw - built.pickYaw) * ease(f)
        carrying = true
        sway = Math.sin(f * Math.PI) * Math.sin(f * 11) * 0.13
      } else if ((f = step(LIFT.set)) < 1) {
        hookY = up + (atPallet - up) * ease(f)
        carrying = true
        sway = Math.sin(f * 9) * 0.05 * (1 - f)
      } else if ((f = step(LIFT.release)) < 1) {
        hookY = atPallet
        carrying = f < 0.4
        if (!carrying && s.landedAt < 0) s.landedAt = t
      } else if ((f = step(LIFT.clear)) < 1) {
        hookY = atPallet + (up - atPallet) * ease(f)
        if (s.landedAt < 0) s.landedAt = t
      }
      if (s.lift >= LIFT_TOTAL) {
        s.lift = -1
        harbour.busy = false
      }
      // the next crate is on its way down: the last one has gone up to the market
      if (carrying && s.landedAt >= 0) s.landedAt = -1
    }
    c.arm.rotation.y = yaw
    c.hook.position.y = hookY
    c.cable.scale.y = Math.max(0.05, c.tipY - hookY)
    c.hook.rotation.z = sway
    c.load.visible = carrying
    // the crate on the pallet lands with a little squash, waits, then is carried off
    const age = s.landedAt < 0 ? -1 : t - s.landedAt
    const shown = age >= 0 && age < CRATE_STAYS
    built.landed.visible = shown
    if (shown) {
      const pop = age < 0.3 ? 1 + Math.sin((age / 0.3) * Math.PI) * 0.12 : 1
      const out = age > CRATE_STAYS - 0.35 ? (CRATE_STAYS - age) / 0.35 : 1
      built.landed.scale.set(pop * out, (2 - pop) * out, pop * out)
    } else if (age >= CRATE_STAYS) s.landedAt = -1
  })

  return (
    <group position={[DOCK_CENTER[0], 0, DOCK_CENTER[1]]} rotation-y={DOCK_YAW}>
      <primitive object={built.dock.group} />
      <primitive object={built.crane.root} />
      <primitive object={built.landed} />
      <primitive object={built.line} />
      <primitive object={built.foam} />
      {built.buoys.map((q, i) => (
        <primitive key={i} object={q.obj} />
      ))}
    </group>
  )
}

const SAIL_IN_MS = 8000
const SAIL_OUT_MS = 6500
/** When a delivery has already landed and the boat is still out, it hurries home in this long. */
const HURRY_IN_MS = 3500

type BoatMode = 'moored' | 'leaving' | 'away' | 'arriving'

/**
 * The cargo boat. It lies tied up at the pier head; when a part is ordered it
 * sails off down the coast to fetch it, comes back round the west shore as the
 * order falls due, and the crane swings the crate ashore.
 */
export function DeliveryBoat() {
  const boat = useMemo(() => {
    const model = createModel('boat', {})
    model.scale.setScalar(BOAT_SCALE)
    // a ring of foam round the hull, lying on the water whatever the boat's bobbing does
    const ring = new THREE.Mesh(foamGeometry([{ x: 0, z: 0.15, hx: 2.05, hz: 3.6, kind: 2, phase: 0.37 }], (WATER_Y + 0.02 - BOAT_Y) / BOAT_SCALE), foamMaterial)
    ring.renderOrder = 1
    ring.frustumCulled = false
    model.add(ring)
    return model
  }, [])
  useEffect(() => () => disposeModel(boat), [boat])
  const paths = useMemo(() => {
    const at = (lx: number, lz: number) => {
      const [x, z] = dockWorld(lx, lz)
      return new THREE.Vector3(x, BOAT_Y, z)
    }
    const [bx, bz] = BERTH
    return {
      // down the west shore and in alongside the pier head, bow to the camera
      arrive: new THREE.CatmullRomCurve3([at(-27, -46), at(-25.5, -30), at(-22, -15), at(-17.5, -6.5), at(bx - 0.6, -2.4), at(bx, bz - 1.6), at(bx, bz)], false, 'catmullrom', 0.5),
      // straight ahead off the berth, then away to the south-west
      depart: new THREE.CatmullRomCurve3([at(bx, bz), at(bx, bz + 1.8), at(bx - 0.9, 8), at(-18, 17), at(-30, 27), at(-46, 34)], false, 'catmullrom', 0.5),
    }
  }, [])
  const st = useRef<{ mode: BoatMode; t0: number; dur: number; lastCount: number } | null>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const now = Date.now()
    const deliveries = useGame.getState().deliveries
    const pending = deliveries.length > 0
    const eta = deliveries.reduce((m, d) => Math.min(m, d.end), Infinity) - now
    if (!st.current) {
      // a game loaded with orders on the way finds the boat already out
      st.current = { mode: pending ? 'away' : 'moored', t0: now, dur: 0, lastCount: deliveries.length }
      boat.rotation.y = DOCK_YAW
    }
    const s = st.current
    if (deliveries.length < s.lastCount) harbour.unload = Math.min(3, harbour.unload + s.lastCount - deliveries.length)
    s.lastCount = deliveries.length

    if (s.mode === 'moored') {
      // set off only when there is time for the round trip and nothing is waiting on deck
      if (pending && eta > SAIL_OUT_MS + SAIL_IN_MS + 1500 && !harbour.unload && !harbour.busy) {
        s.mode = 'leaving'
        s.t0 = now
        s.dur = SAIL_OUT_MS
      }
    } else if (s.mode === 'leaving') {
      if (now - s.t0 >= s.dur) s.mode = 'away'
    } else if (s.mode === 'away') {
      if (harbour.unload > 0 || (pending && eta <= SAIL_IN_MS)) {
        s.mode = 'arriving'
        s.t0 = now
        s.dur = harbour.unload > 0 ? HURRY_IN_MS : Math.max(HURRY_IN_MS, Math.min(SAIL_IN_MS, eta))
      }
    } else if (now - s.t0 >= s.dur) s.mode = 'moored'
    harbour.moored = s.mode === 'moored'

    boat.visible = s.mode !== 'away'
    if (!boat.visible) return
    let yaw = DOCK_YAW
    if (s.mode === 'moored') paths.arrive.getPoint(1, boat.position)
    else {
      const k = Math.min(1, (now - s.t0) / s.dur)
      // glide in to a stop; pull away gently and gather speed
      const path = s.mode === 'arriving' ? paths.arrive : paths.depart
      const e = s.mode === 'arriving' ? 1 - Math.pow(1 - k, 2.2) : k * k
      path.getPoint(e, boat.position)
      path.getTangent(Math.min(0.999, Math.max(0.001, e)), tmp)
      yaw = Math.atan2(tmp.x, tmp.z)
    }
    let d = yaw - boat.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    boat.rotation.y += d * Math.min(1, dt * 5)
    ;(boat.userData as ModelUserData).tick?.(state.clock.elapsedTime, dt)
  })
  return <primitive object={boat} />
}
