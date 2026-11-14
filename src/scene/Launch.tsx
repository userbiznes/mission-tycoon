import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PAD_TABLE_Y } from '../art/models/launchPad'
import { palette } from '../art/palette'
import { createModel, disposeModel, type ModelUserData } from '../art/registry'
import '../art/models'
import { seeded } from '../art/kit'
import { useGame } from '../state/game'
import { buildingCenter } from './grid'
import { GAUGE, flight, scoreTiming, useLaunch, verdictFor } from '../state/launch'
import { sfx, startRoar } from '../ui/sound'
import { rig } from './cameraRig'
import { makeCloud, skyState } from './Sky'
import { usePlacement } from '../state/placement'
import { CAMERA_YAW, FWD, RIGHT } from './world'

/**
 * The rocket on the pad and everything that happens when it flies:
 * flame, smoke, stage separation, the follow camera and the timing gauges.
 * This component is the single clock of the launch cinematic.
 */

const UP = new THREE.Vector3(0, 1, 0)
/** Downrange direction of the gravity turn: out over the sea, away from the camera. */
const DOWNRANGE = new THREE.Vector3(FWD.x * 0.75 + RIGHT.x * 0.66, 0, FWD.y * 0.75 + RIGHT.y * 0.66).normalize()
const LEAN_AXIS = new THREE.Vector3().crossVectors(UP, DOWNRANGE).normalize()

const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _look = new THREE.Vector3()
const _c = new THREE.Color()

// ------------------------------------------------------------------ smoke puffs
class Puffs {
  mesh: THREE.InstancedMesh
  private n: number
  private pos: Float32Array
  private vel: Float32Array
  private age: Float32Array
  private life: Float32Array
  private size: Float32Array
  private next = 0
  private dummy = new THREE.Object3D()
  floorY = -1000

  constructor(n: number) {
    this.n = n
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const mat = new THREE.MeshStandardMaterial({
      color: palette.smoke,
      roughness: 1,
      metalness: 0,
      emissive: new THREE.Color(palette.smoke),
      emissiveIntensity: 0.28,
    })
    this.mesh = new THREE.InstancedMesh(geo, mat, n)
    this.mesh.frustumCulled = false
    this.mesh.castShadow = false
    this.mesh.receiveShadow = false
    this.pos = new Float32Array(n * 3)
    this.vel = new Float32Array(n * 3)
    this.age = new Float32Array(n)
    this.life = new Float32Array(n).fill(0)
    this.size = new Float32Array(n)
    this.dummy.scale.setScalar(0.0001)
    this.dummy.updateMatrix()
    for (let i = 0; i < n; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix)
      this.mesh.setColorAt(i, _c.set(palette.smoke))
    }
  }

  spawn(p: THREE.Vector3, v: THREE.Vector3, life: number, size: number, tint = 1) {
    const i = this.next
    this.next = (this.next + 1) % this.n
    this.pos.set([p.x, p.y, p.z], i * 3)
    this.vel.set([v.x, v.y, v.z], i * 3)
    this.age[i] = 0
    this.life[i] = life
    this.size[i] = size
    this.mesh.setColorAt(i, _c.set(palette.smoke).multiplyScalar(tint))
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  update(dt: number) {
    const d = this.dummy
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue
      this.age[i] += dt
      const k = this.age[i] / this.life[i]
      if (k >= 1) {
        this.life[i] = 0
        d.scale.setScalar(0.0001)
        d.position.set(0, -500, 0)
        d.updateMatrix()
        this.mesh.setMatrixAt(i, d.matrix)
        continue
      }
      const j = i * 3
      const drag = Math.exp(-dt * 1.7)
      this.vel[j] *= drag
      this.vel[j + 1] = this.vel[j + 1] * drag + 0.9 * dt
      this.vel[j + 2] *= drag
      this.pos[j] += this.vel[j] * dt
      this.pos[j + 1] += this.vel[j + 1] * dt
      this.pos[j + 2] += this.vel[j + 2] * dt
      // hit the pad: turn the downward blast into a rolling ground cloud
      if (this.pos[j + 1] < this.floorY) {
        this.pos[j + 1] = this.floorY
        const vy = Math.abs(this.vel[j + 1])
        const h = Math.hypot(this.vel[j], this.vel[j + 2]) || 1
        const out = h + vy * 0.75
        this.vel[j] = (this.vel[j] / h) * out
        this.vel[j + 2] = (this.vel[j + 2] / h) * out
        this.vel[j + 1] = vy * 0.08
      }
      // swell quickly, linger, then melt away
      const grow = Math.min(1, k * 5) * (1 - Math.pow(k, 2.4))
      d.position.set(this.pos[j], this.pos[j + 1], this.pos[j + 2])
      d.scale.setScalar(Math.max(0.0001, this.size[i] * (0.45 + k * 1.3) * grow))
      d.rotation.set(i * 1.3, i * 0.7 + k, 0)
      d.updateMatrix()
      this.mesh.setMatrixAt(i, d.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }

  clear() {
    this.life.fill(0)
    this.dummy.scale.setScalar(0.0001)
    this.dummy.position.set(0, -500, 0)
    this.dummy.updateMatrix()
    for (let i = 0; i < this.n; i++) this.mesh.setMatrixAt(i, this.dummy.matrix)
    this.mesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}

// ------------------------------------------------------------------ flame
function makeFlame(): THREE.Group {
  const g = new THREE.Group()
  const profile = (r: number, len: number) =>
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0.12),
        new THREE.Vector2(r * 0.8, 0),
        new THREE.Vector2(r, -len * 0.18),
        new THREE.Vector2(r * 0.72, -len * 0.5),
        new THREE.Vector2(r * 0.3, -len * 0.85),
        new THREE.Vector2(0.001, -len),
      ],
      14,
    )
  const outer = new THREE.Mesh(
    profile(0.42, 2.6),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.flame).multiplyScalar(2.4), toneMapped: false }),
  )
  const inner = new THREE.Mesh(
    profile(0.24, 1.7),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.flameHot).multiplyScalar(3.2), toneMapped: false }),
  )
  inner.position.y = -0.02
  outer.name = 'outer'
  inner.name = 'inner'
  g.add(outer, inner)
  g.visible = false
  return g
}

// ------------------------------------------------------------------ stars and high clouds
function Stars() {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const rnd = seeded(404)
    const n = 500
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      // upper hemisphere shell
      const u = rnd() * Math.PI * 2
      const v = Math.acos(1 - rnd() * 1.25)
      const r = 900
      pos[i * 3] = Math.sin(v) * Math.cos(u) * r
      pos[i * 3 + 1] = Math.cos(v) * r
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(palette.white).multiplyScalar(1.6),
        size: 2.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useFrame(({ camera }) => {
    if (!ref.current) return
    mat.opacity = skyState.space
    ref.current.visible = skyState.space > 0.01
    ref.current.position.copy(camera.position)
  })
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-9} />
}

function HighClouds({ origin }: { origin: THREE.Vector3 }) {
  const active = useLaunch((s) => s.active)
  const clouds = useMemo(() => {
    const rnd = seeded(909)
    const list: THREE.Object3D[] = []
    for (let i = 0; i < 12; i++) {
      const c = makeCloud(300 + i * 7)
      const a = rnd() * Math.PI * 2
      const dist = 9 + rnd() * 20
      c.position.set(Math.cos(a) * dist, 26 + i * 11 + rnd() * 6, Math.sin(a) * dist)
      c.rotation.y = rnd() * Math.PI
      c.scale.setScalar(1.6 + rnd() * 1.8)
      c.traverse((o) => {
        o.castShadow = false
      })
      list.push(c)
    }
    return list
  }, [])
  if (!active) return null
  return (
    <group position={origin}>
      {clouds.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
    </group>
  )
}

// ------------------------------------------------------------------ the rocket and the flight
export function PadRocket({ visible = true }: { visible?: boolean }) {
  const kind = useLaunch((s) => s.kind)
  const serial = useLaunch((s) => s.rocketSerial)
  const scene = useThree((s) => s.scene)

  const padAt = useGame((s) => s.placed.launchPad)
  const padMoving = usePlacement((s) => s.id === 'launchPad')
  const origin = useMemo(() => {
    const [x, z] = padAt ? buildingCenter('launchPad', padAt) : [0, 0]
    return new THREE.Vector3(x, PAD_TABLE_Y + 0.06, z)
  }, [padAt])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rocket = useMemo(() => createModel('rocket', { kind }), [kind, serial])
  const anchors = (rocket.userData as ModelUserData).anchors!
  const stageLower = anchors.stageLower
  const height = rocket.userData.height as number
  const radius = rocket.userData.radius as number

  const flame = useMemo(makeFlame, [])
  const puffs = useMemo(() => new Puffs(170), [])
  const light = useRef<THREE.PointLight>(null)
  const st = useRef({
    pos: new THREE.Vector3(),
    stageVel: new THREE.Vector3(),
    stageSpin: new THREE.Vector3(),
    stageT: 0,
    lastCount: 4,
    emit: 0,
    camPos: new THREE.Vector3(),
    camLook: new THREE.Vector3(),
    camReady: false,
    stopRoar: null as null | (() => void),
    karman: false,
  })

  useEffect(() => {
    puffs.floorY = PAD_TABLE_Y - 0.1
    return () => {
      puffs.dispose()
    }
  }, [puffs])

  // a fresh rocket: put everything back on the pad
  useEffect(() => {
    const s = st.current
    s.pos.set(0, 0, 0)
    rocket.position.copy(origin)
    rocket.quaternion.identity()
    flame.visible = false
    s.camReady = false
    s.karman = false
    return () => {
      // the dropped stage may have been re-parented to the scene
      if (stageLower.parent && stageLower.parent !== rocket) stageLower.parent.remove(stageLower)
      disposeModel(rocket)
      disposeModel(stageLower)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rocket])

  // the launch camera: low and heroic on the pad, then a chase view up into the dark
  useEffect(() => {
    return useLaunch.subscribe((state, prev) => {
      if (state.active && !prev.active) {
        const s = st.current
        s.camReady = false
        rig.locked = true
        rig.startCinematic((camera, dt) => {
          const f = flight
          const yaw = CAMERA_YAW - 0.12
          const rocketPos = _v.copy(origin).add(s.pos)
          const desiredPos = _v2
          const look = _look
          if (f.phase === 'countdown' || f.phase === 'hold') {
            const push = f.phase === 'hold' ? 2 : Math.min(3, f.t) * 0.9
            const dist = 34 - push
            const tilt = THREE.MathUtils.degToRad(9)
            desiredPos.set(
              origin.x + Math.sin(yaw) * Math.cos(tilt) * dist,
              origin.y + 0.6 + Math.sin(tilt) * dist,
              origin.z + Math.cos(yaw) * Math.cos(tilt) * dist,
            )
            look.set(origin.x, origin.y + height * 0.62, origin.z)
          } else if (f.phase === 'ascent') {
            const dist = 36 + s.pos.y * 0.9
            desiredPos.set(
              origin.x + Math.sin(yaw) * dist,
              origin.y + 4 + s.pos.y * 0.22,
              origin.z + Math.cos(yaw) * dist,
            )
            look.copy(rocketPos)
            look.y += height * 0.4
          } else {
            // chase camera: a little below and beside the rocket, looking up at it
            const dist = 30
            desiredPos.set(
              rocketPos.x + Math.sin(yaw) * dist,
              rocketPos.y - 9,
              rocketPos.z + Math.cos(yaw) * dist,
            )
            look.copy(rocketPos)
            look.y += height * 0.45
          }
          if (!s.camReady) {
            s.camPos.copy(camera.position)
            // start by looking where the diorama camera was looking
            camera.getWorldDirection(s.camLook).multiplyScalar(60).add(camera.position)
            s.camReady = true
          }
          const fast = f.phase === 'countdown' || f.phase === 'hold' ? 2.2 : f.phase === 'ascent' ? 3.2 : 6
          const k = 1 - Math.exp(-dt * fast)
          s.camPos.lerp(desiredPos, k)
          s.camLook.lerp(look, 1 - Math.exp(-dt * (fast + 1.5)))
          camera.position.copy(s.camPos)
          camera.lookAt(s.camLook)
        })
      }
    })
  }, [origin, height])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const f = flight
    const s = st.current
    const launch = useLaunch.getState()

    if (f.phase !== 'idle' && f.phase !== 'done') {
      f.t += dt
      const ws = f.windowScale
      switch (f.phase) {
        case 'countdown': {
          const c = 3 - Math.floor(f.t)
          if (c !== s.lastCount && c >= 1) {
            s.lastCount = c
            launch.setCount(c)
            sfx('tick')
          }
          if (f.t >= 3) {
            s.lastCount = 4
            launch.setPhase('hold')
            f.gauge = 0
            f.gaugeDir = 1
            f.holding = false
            f.heldFor = 0
            f.releaseQueued = false
          }
          break
        }
        case 'hold': {
          if (f.autopilot && !f.holding && f.t > 0.5) f.holding = true
          if (f.holding) {
            if (f.heldFor === 0) s.stopRoar = startRoar()
            f.heldFor += dt
            f.gauge += (f.gaugeDir * dt) / 1.7
            if (f.gauge >= 1) {
              f.gauge = 1
              f.gaugeDir = -1
            } else if (f.gauge <= 0) {
              f.gauge = 0
              f.gaugeDir = 1
            }
            f.engine = 0.3 + f.gauge * 0.5
            rig.shake = Math.max(rig.shake, 0.04 + f.gauge * 0.1)
          }
          const auto = f.autopilot && f.holding && f.gaugeDir > 0 && f.gauge >= GAUGE.hold.center
          if ((f.releaseQueued && f.heldFor > 0.1) || auto) {
            const score = scoreTiming(f.gauge, GAUGE.hold.center, GAUGE.hold.half * ws)
            f.scores[0] = score
            launch.setVerdict(0, verdictFor(score))
            sfx(score > 0.7 ? 'success' : 'pop')
            // a weak light-off still flies, just less cleanly
            f.engine = 1
            f.vy = 0.5
            rig.shake = 0.5
            launch.setPhase('ascent')
          }
          f.releaseQueued = false
          break
        }
        case 'ascent': {
          f.vy += 5.2 * dt
          rig.shake = Math.max(rig.shake, 0.22 * Math.max(0, 1 - f.t / 2.4))
          if (f.t >= 2.4) {
            launch.setPhase('staging')
            f.gauge = 0
            f.tapQueued = false
          }
          break
        }
        case 'staging': {
          f.vy += 9 * dt
          f.gauge = f.t / 2.8
          const auto = f.autopilot && f.gauge >= GAUGE.staging.center
          if (f.tapQueued || auto || f.gauge >= 1) {
            const score = f.gauge >= 1 ? 0.15 : scoreTiming(f.gauge, GAUGE.staging.center, GAUGE.staging.half * ws)
            f.scores[1] = score
            launch.setVerdict(1, f.gauge >= 1 ? 'Too late!' : verdictFor(score))
            sfx('snap')
            // drop the first stage
            f.staged = true
            scene.attach(stageLower)
            s.stageVel.copy(DOWNRANGE).multiplyScalar(f.vy * Math.sin(f.tilt) * 0.5)
            s.stageVel.y = f.vy * Math.cos(f.tilt) * 0.55
            s.stageSpin.set(0.5, 0.25, 0.9)
            s.stageT = 0
            for (let i = 0; i < 16; i++) {
              const a = (i / 16) * Math.PI * 2
              _v.copy(origin).add(s.pos)
              _v.y += (rocket.userData.stageY as number) * 0.9
              _v2.set(Math.cos(a) * 5, f.vy * 0.6, Math.sin(a) * 5)
              puffs.spawn(_v, _v2, 0.9, 0.5)
            }
            rig.shake = 0.3
            launch.setPhase('coast')
            f.gauge = 0
          }
          f.tapQueued = false
          break
        }
        case 'coast': {
          f.vy += 13 * dt
          f.gauge = f.t / 3.2
          const auto = f.autopilot && f.gauge >= GAUGE.coast.center
          if (f.tapQueued || auto || f.gauge >= 1) {
            const score = f.gauge >= 1 ? 0.15 : scoreTiming(f.gauge, GAUGE.coast.center, GAUGE.coast.half * ws)
            f.scores[2] = score
            launch.setVerdict(2, f.gauge >= 1 ? 'Too late!' : verdictFor(score))
            sfx(score > 0.7 ? 'success' : 'pop')
            rig.shake = 0.2
            launch.setPhase('insert')
          }
          f.tapQueued = false
          break
        }
        case 'insert': {
          f.vy += 24 * dt
          if (f.t >= 1.6) {
            f.engine = 0
            s.stopRoar?.()
            s.stopRoar = null
            sfx('star')
            launch.setPhase('orbit')
          }
          break
        }
        case 'orbit': {
          if (f.t >= 2.1) launch.finish()
          break
        }
      }

      // ---- motion ----
      const flying = f.phase !== 'countdown' && f.phase !== 'hold'
      if (flying) {
        const tiltGoal = f.phase === 'ascent' ? 0.04 : f.phase === 'staging' ? 0.3 : f.phase === 'coast' ? 0.72 : 1.05
        f.tilt += (tiltGoal - f.tilt) * (1 - Math.exp(-dt * 0.9))
        _v.copy(UP).multiplyScalar(Math.cos(f.tilt)).addScaledVector(DOWNRANGE, Math.sin(f.tilt))
        s.pos.addScaledVector(_v, f.vy * dt)
        f.y = s.pos.y
      }
      rocket.position.copy(origin).add(s.pos)
      rocket.quaternion.setFromAxisAngle(LEAN_AXIS, f.tilt)

      // ---- readouts: real numbers on a compressed timeline ----
      const vOrbit = Math.sqrt(398600 / (6371 + f.orbitKm))
      const seg = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, Math.max(0, k))
      if (f.phase === 'ascent') {
        f.altKm = seg(0, 9, f.t / 2.4)
        f.speedKms = seg(0, 0.5, f.t / 2.4)
      } else if (f.phase === 'staging') {
        f.altKm = seg(9, 70, f.t / 2.8)
        f.speedKms = seg(0.5, 2.4, f.t / 2.8)
      } else if (f.phase === 'coast') {
        f.altKm = seg(70, f.orbitKm * 0.93, f.t / 3.2)
        f.speedKms = seg(2.4, vOrbit * 0.72, f.t / 3.2)
      } else if (f.phase === 'insert') {
        f.altKm = seg(f.altKm, f.orbitKm, f.t / 1.6)
        f.speedKms = seg(f.speedKms, vOrbit, f.t / 1.6)
      } else if (f.phase === 'orbit') {
        f.altKm = f.orbitKm
        f.speedKms = vOrbit
      }
      // the sky goes dark through the upper atmosphere; 100 km is the edge of space
      f.space = Math.min(1, Math.max(0, (f.altKm - 12) / 88))
      skyState.space = f.space
    } else {
      if (skyState.space !== 0 && f.phase === 'idle') skyState.space = 0
      if (f.phase === 'idle') rocket.position.copy(origin)
    }

    // ---- flame ----
    const power = f.engine
    flame.visible = power > 0.02
    if (flame.visible) {
      const anchor = f.staged ? anchors.exhaustUpper : anchors.exhaust
      anchor.getWorldPosition(flame.position)
      flame.quaternion.copy(rocket.quaternion)
      const flick = 0.85 + Math.random() * 0.3
      const size = (f.staged ? 0.62 : 1) * (radius / 0.7)
      flame.scale.set(size * (0.75 + power * 0.35), size * power * flick * 1.25, size * (0.75 + power * 0.35))
      if (light.current) {
        light.current.position.copy(flame.position)
        light.current.position.y -= 0.6
        light.current.intensity = power * 60 * flick
      }
    } else if (light.current) light.current.intensity = 0

    // ---- smoke ----
    if (power > 0.05) {
      s.emit += dt * (f.staged ? 22 : 34 + power * 46)
      const anchor = f.staged ? anchors.exhaustUpper : anchors.exhaust
      while (s.emit >= 1) {
        s.emit -= 1
        anchor.getWorldPosition(_v)
        const a = Math.random() * Math.PI * 2
        const spread = 1.2 + Math.random() * 2.2
        // blast straight down the rocket's axis
        _v2.set(0, -1, 0).applyQuaternion(rocket.quaternion).multiplyScalar(7 + Math.random() * 7 + f.vy * 0.25)
        _v2.x += Math.cos(a) * spread
        _v2.z += Math.sin(a) * spread
        _v.y -= 0.5
        puffs.spawn(_v, _v2, 1.1 + Math.random() * 1.5, (f.staged ? 0.5 : 0.75) + Math.random() * 0.55, 0.9 + Math.random() * 0.14)
      }
    }
    puffs.update(dt)

    // ---- the dropped stage tumbles away ----
    if (f.staged && stageLower.parent === scene) {
      s.stageT += dt
      s.stageVel.y -= 16 * dt
      stageLower.position.addScaledVector(s.stageVel, dt)
      stageLower.rotation.x += s.stageSpin.x * dt
      stageLower.rotation.z += s.stageSpin.z * dt
      if (s.stageT > 5) stageLower.visible = false
    }
  })

  // tidy up when a flight is reset
  useEffect(() => {
    return useLaunch.subscribe((state, prev) => {
      if (!state.active && prev.active) {
        st.current.stopRoar?.()
        st.current.stopRoar = null
        puffs.clear()
        flame.visible = false
      }
    })
  }, [puffs, flame])

  return (
    <>
      <primitive object={rocket} visible={visible && !padMoving} />
      <primitive object={flame} />
      <primitive object={puffs.mesh} />
      <pointLight ref={light} color={palette.flame} intensity={0} distance={26} decay={1.6} />
      <Stars />
      <HighClouds origin={origin} />
    </>
  )
}
