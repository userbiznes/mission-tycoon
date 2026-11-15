import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Kit, seeded } from '../art/kit'
import { materials } from '../art/materials'
import { createModel, disposeModel, type ModelUserData } from '../art/registry'
import '../art/models'
import { buildDozer, buildFootbridge, buildScaffold, buildSignpost, creekStone, fallenLog, fern, forestGiant, forestPine, forestRound, forestScrub, logPile, mossBoulder, reeds } from '../art/models/wilds'
import { palette } from '../art/palette'
import { REGIONS, REGION_IDS, type RegionId, type RegionState } from '../data/regions'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { focusRegion, regionProgress } from '../state/regions'
import { useUi } from '../state/ui'
import { sfx } from '../ui/sound'
import { Juicy } from './Base'
import { CLEAR_REACH, PLANT_KINDS, plantForest, type Plant, type PlantKind } from './forest'
import { Model } from './Model'
import { deadTree } from './Props'
import { regionTint } from './regionTint'
import { creekV, regionAt, terrainHeightUv } from './relief'
import { PLATEAU_D, WATER_Y, coastUv, uvToWorld, worldToUv } from './world'

/**
 * The lost regions beyond the creek: the forest (instanced, and felled tree by
 * tree when a region is cleared), the creek itself, mist and birds over land
 * that isn't the player's yet, the three landmarks, their signposts, and the
 * expedition crew at work.
 */

const ease = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

/** How wild each region still is right now, 0–1: drives the muted colours, the mist and the birds. */
const wild: Record<RegionId, number> = { tracking: 1, annex: 1, heavy: 1 }

function wildTarget(state: RegionState, progress: number): number {
  if (state === 'locked' || state === 'available') return 1
  if (state === 'clearing') return 1 - ease(progress * 1.05)
  return 0
}

// ------------------------------------------------------------------ puffs of dust and leaves
const PUFFS = 36
const puffs = { pos: new Float32Array(PUFFS * 3), born: new Float32Array(PUFFS).fill(-10), size: new Float32Array(PUFFS), next: 0, now: 0 }
function puff(x: number, y: number, z: number, size = 1) {
  const i = puffs.next
  puffs.next = (i + 1) % PUFFS
  puffs.pos.set([x, y, z], i * 3)
  puffs.born[i] = puffs.now
  puffs.size[i] = size
}

function Puffs() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 1), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: palette.smoke, roughness: 1, emissive: new THREE.Color(palette.smoke), emissiveIntensity: 0.3 }), [])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    puffs.now = state.clock.elapsedTime
    for (let i = 0; i < PUFFS; i++) {
      const age = (puffs.now - puffs.born[i]) / 0.8
      if (age < 0 || age >= 1) o.scale.setScalar(0.0001)
      else {
        const s = Math.sin(Math.min(1, age * 1.6) * Math.PI * 0.5) * (1 - age * age) * puffs.size[i]
        o.position.set(puffs.pos[i * 3] + Math.sin(i * 2.3) * age * 0.5, puffs.pos[i * 3 + 1] + age * 1.1, puffs.pos[i * 3 + 2] + Math.cos(i * 1.7) * age * 0.5)
        o.scale.setScalar(Math.max(0.0001, s))
        o.rotation.set(i, age * 2 + i, 0)
      }
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, PUFFS]} frustumCulled={false} />
}

// ------------------------------------------------------------------ the forest
const TOPPLE = 0.95
const IS_TREE: Record<PlantKind, boolean> = { round: true, pine: true, giant: true, scrub: true, dead: true, fern: false, log: false, boulder: false }

interface Entry {
  plant: Plant
  /** index in its kind's instanced mesh */
  i: number
  /** −1 not drawn yet, 0 standing, 1 falling, 2 gone */
  st: number
  /** index among the log piles, or −1 */
  pile: number
}

function Forest() {
  const data = useMemo(() => {
    const plants = plantForest()
    const count = Object.fromEntries(PLANT_KINDS.map((k) => [k, 0])) as Record<PlantKind, number>
    let piles = 0
    const entries: Entry[] = plants.map((plant) => ({ plant, i: count[plant.kind]++, st: -1, pile: plant.pile && plant.removeAt >= 0 ? piles++ : -1 }))
    const byRegion = Object.fromEntries(REGION_IDS.map((id) => [id, entries.filter((e) => e.plant.region === id)])) as Record<RegionId, Entry[]>
    return { count, piles, byRegion }
  }, [])
  const geo = useMemo(
    () => ({ round: forestRound(), pine: forestPine(), giant: forestGiant(), scrub: forestScrub(), dead: deadTree(), fern: fern(), log: fallenLog(), boulder: mossBoulder(), pile: logPile() }),
    [],
  )
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])
  const meshes = useRef<Partial<Record<PlantKind, THREE.InstancedMesh | null>>>({})
  const pileMesh = useRef<THREE.InstancedMesh>(null)
  const last = useRef<Partial<Record<RegionId, number>>>({})
  const o = useMemo(() => new THREE.Object3D(), [])
  const tmp = useMemo(() => ({ axis: new THREE.Vector3(), q: new THREE.Quaternion(), qy: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) }), [])

  useFrame(() => {
    const g = useGame.getState()
    const now = Date.now()
    const dirty = new Set<PlantKind>()
    let pilesDirty = false
    for (const id of REGION_IDS) {
      const rec = g.regions[id]
      const clearing = rec.state === 'clearing'
      const p = clearing ? regionProgress(rec, now) : rec.state === 'locked' || rec.state === 'available' ? 0 : 1
      // a region that isn't being cleared only needs drawing when its state changes
      const key = clearing ? -1 : p * 10 + (rec.state === 'active' ? 1 : 0)
      if (!clearing && last.current[id] === key) continue
      last.current[id] = key
      const total = clearing && rec.start && rec.end ? (rec.end - rec.start) / 1000 : 0
      for (const e of data.byRegion[id]) {
        const pl = e.plant
        let st = 0
        let k = 0
        if (pl.removeAt >= 0 && p > pl.removeAt) {
          const tau = total > 0 ? (p - pl.removeAt) * total : Infinity
          const dur = IS_TREE[pl.kind] ? TOPPLE : 0.4
          if (tau < dur) {
            st = 1
            k = tau / dur
          } else st = 2
        }
        // log piles stay until the land has joined the base
        if (e.pile >= 0 && pileMesh.current) {
          const show = st === 2 && rec.state !== 'active'
          o.position.set(pl.x, pl.y, pl.z)
          o.rotation.set(0, pl.rot, 0)
          o.scale.setScalar(show ? 0.95 + (e.pile % 3) * 0.12 : 0.0001)
          o.updateMatrix()
          pileMesh.current.setMatrixAt(e.pile, o.matrix)
          pilesDirty = true
        }
        if (st === e.st && st !== 1) continue
        const mesh = meshes.current[pl.kind]
        if (!mesh) continue
        o.position.set(pl.x, pl.y, pl.z)
        if (st === 0) {
          o.rotation.set(0, pl.rot, 0)
          o.scale.setScalar(pl.s)
        } else if (st === 2) {
          o.rotation.set(0, pl.rot, 0)
          o.scale.setScalar(0.0001)
          if (e.st === 1) puff(pl.x, pl.y + 0.3, pl.z, IS_TREE[pl.kind] ? 1.5 : 0.8)
        } else if (IS_TREE[pl.kind]) {
          // a wind-up the wrong way, the fall, a squash where it lands, then it is gone
          const lean = k < 0.14 ? -0.12 * Math.sin((k / 0.14) * Math.PI) : 1.5 * Math.pow(Math.min(1, (k - 0.14) / 0.56), 2.2)
          const stretch = k < 0.14 ? 0.1 * Math.sin((k / 0.14) * Math.PI) : 0
          const squash = k > 0.7 ? Math.sin(((k - 0.7) / 0.3) * Math.PI) : 0
          const vanish = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1
          tmp.axis.set(pl.fz, 0, -pl.fx)
          tmp.q.setFromAxisAngle(tmp.axis, lean)
          tmp.qy.setFromAxisAngle(tmp.up, pl.rot)
          o.quaternion.copy(tmp.q).multiply(tmp.qy)
          const wide = pl.s * (1 + 0.18 * squash - stretch * 0.5) * vanish
          o.scale.set(Math.max(0.0001, wide), Math.max(0.0001, pl.s * (1 + stretch - 0.3 * squash) * vanish), Math.max(0.0001, wide))
        } else {
          const s = pl.s * (1 - k) * (1 + 0.25 * Math.sin(k * Math.PI))
          o.rotation.set(0, pl.rot, 0)
          o.scale.set(Math.max(0.0001, s * 1.1), Math.max(0.0001, s * 0.8), Math.max(0.0001, s * 1.1))
        }
        o.updateMatrix()
        mesh.setMatrixAt(e.i, o.matrix)
        dirty.add(pl.kind)
        e.st = st
      }
    }
    for (const k of dirty) meshes.current[k]!.instanceMatrix.needsUpdate = true
    if (pilesDirty && pileMesh.current) pileMesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group name="forest">
      {PLANT_KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            meshes.current[k] = m
          }}
          args={[geo[k], materials.matte, Math.max(1, data.count[k])]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
      <instancedMesh ref={pileMesh} args={[geo.pile, materials.matte, Math.max(1, data.piles)]} castShadow receiveShadow frustumCulled={false} />
    </group>
  )
}

// ------------------------------------------------------------------ the creek
const creekVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const creekFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uLagoon;
  uniform vec3 uFoam;
  varying vec2 vUv;
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    float edge = abs(vUv.x - 0.5) * 2.0;
    float flow = noise(vec2(vUv.x * 3.0, vUv.y * 0.9 - uTime * 0.55));
    float streak = smoothstep(0.6, 0.78, noise(vec2(vUv.x * 5.0 + 3.0, vUv.y * 1.5 - uTime * 0.95)));
    vec3 col = mix(uShallow, uLagoon, smoothstep(0.15, 1.0, edge) * 0.75 + flow * 0.2);
    col = mix(col, uFoam, streak * 0.5 * (1.0 - edge));
    col = mix(col, uFoam, smoothstep(0.8, 1.0, edge + (flow - 0.5) * 0.2) * 0.85);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function Creek() {
  const built = useMemo(() => {
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const rnd = seeded(808)
    const stones: { x: number; y: number; z: number; s: number; rot: number }[] = []
    const reedSpots: { x: number; y: number; z: number; s: number; rot: number }[] = []
    let n = 0
    let along = 0
    let prev: [number, number] | null = null
    for (let u = -34; u <= 34; u += 0.3) {
      const v = creekV(u)
      const d = coastUv(u, v)
      if (d > 0.5) {
        prev = null
        continue
      }
      const dv = (creekV(u + 0.05) - creekV(u - 0.05)) / 0.1
      const len = Math.hypot(1, dv)
      const nu = -dv / len
      const nv = 1 / len
      const hw = 0.66 + 0.1 * Math.sin(u * 1.7)
      const y = Math.max(WATER_Y + 0.03, terrainHeightUv(u, v) + 0.17)
      if (prev) along += Math.hypot(u - prev[0], v - prev[1])
      for (const s of [-1, 1]) {
        const [x, z] = uvToWorld(u + nu * hw * s, v + nv * hw * s)
        pos.push(x, y, z)
        uv.push(s < 0 ? 0 : 1, along)
      }
      if (prev) idx.push(n - 2, n - 1, n, n - 1, n + 1, n)
      n += 2
      prev = [u, v]
      // stones in the stream and reeds along its banks, only up on the meadow
      if (d < PLATEAU_D) {
        if (rnd() < 0.2) {
          const off = (rnd() - 0.5) * 1.1
          const [x, z] = uvToWorld(u + nu * off, v + nv * off)
          stones.push({ x, z, y: y - 0.05, s: 0.6 + rnd() * 0.8, rot: rnd() * 6.3 })
        }
        if (rnd() < 0.3) {
          const off = (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.45)
          const [x, z] = uvToWorld(u + nu * off, v + nv * off)
          reedSpots.push({ x, z, y: terrainHeightUv(u + nu * off, v + nv * off) - 0.02, s: 0.8 + rnd() * 0.7, rot: rnd() * 6.3 })
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    return { g, stones, reedSpots }
  }, [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(palette.oceanShallow) },
      uLagoon: { value: new THREE.Color(palette.oceanLagoon) },
      uFoam: { value: new THREE.Color(palette.foam) },
    }),
    [],
  )
  const mat = useRef<THREE.ShaderMaterial>(null)
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt
  })
  const geo = useMemo(() => ({ stone: creekStone(), reeds: reeds() }), [])
  return (
    <group name="creek">
      <mesh geometry={built.g} frustumCulled={false}>
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={creekVertex} fragmentShader={creekFragment} side={THREE.DoubleSide} />
      </mesh>
      <Scatter geometry={geo.stone} spots={built.stones} />
      <Scatter geometry={geo.reeds} spots={built.reedSpots} />
    </group>
  )
}

function Scatter({ geometry, spots }: { geometry: THREE.BufferGeometry; spots: { x: number; y: number; z: number; s: number; rot: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    spots.forEach((s, i) => {
      o.position.set(s.x, s.y, s.z)
      o.rotation.set(0, s.rot, 0)
      o.scale.setScalar(s.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [spots])
  return <instancedMesh ref={ref} args={[geometry, materials.matte, Math.max(1, spots.length)]} castShadow receiveShadow frustumCulled={false} />
}

// ------------------------------------------------------------------ mist
const mistVertex = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vPhase;
  void main() {
    vUv = uv;
    vPhase = aPhase;
    vec3 p = position;
    p.x += sin(uTime * 0.07 + aPhase * 6.28) * 1.7;
    p.z += cos(uTime * 0.05 + aPhase * 4.1) * 1.3;
    p.y += sin(uTime * 0.11 + aPhase * 9.0) * 0.15;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const mistFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vPhase;
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float n = noise(p * 1.6 + vPhase * 17.0 + vec2(uTime * 0.03, -uTime * 0.02));
    float a = (1.0 - smoothstep(0.1, 1.0, length(p) + (n - 0.5) * 0.55)) * uOpacity;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Soft patches of mist lying over a region that isn't the player's yet; they thin away as it is cleared. */
function Mist({ id }: { id: RegionId }) {
  const geometry = useMemo(() => {
    const rnd = seeded(600 + REGION_IDS.indexOf(id) * 31)
    const pos: number[] = []
    const uv: number[] = []
    const phase: number[] = []
    const idx: number[] = []
    let n = 0
    let tries = 0
    const want = id === 'heavy' ? 20 : 14
    while (n < want && tries++ < 4000) {
      const u = -26 + rnd() * 50
      const v = -4 + rnd() * 56
      if (regionAt(u, v) !== id || coastUv(u, v) > PLATEAU_D + 1 || v - creekV(u) < 3) continue
      // keep each patch over its own region, so a neighbour's mist never drifts across reclaimed land
      if ([[-3.4, 0], [3.4, 0], [0, -3.4], [0, 3.4]].some(([du, dv]) => regionAt(u + du, v + dv) !== id)) continue
      const [x, z] = uvToWorld(u, v)
      // some lie low among the trunks, some hang in the canopy
      const y = terrainHeightUv(u, v) + (n % 4 === 0 ? 1.0 : 3.9 + rnd() * 1.4)
      const hs = 2.8 + rnd() * 2.6
      const ph = rnd()
      pos.push(x - hs, y, z - hs, x + hs, y, z - hs, x + hs, y, z + hs, x - hs, y, z + hs)
      uv.push(0, 0, 1, 0, 1, 1, 0, 1)
      phase.push(ph, ph, ph, ph)
      idx.push(n * 4, n * 4 + 2, n * 4 + 1, n * 4, n * 4 + 3, n * 4 + 2)
      n++
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1))
    g.setIndex(idx)
    return g
  }, [id])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#e6f4f2') } }), [])
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  useFrame((state) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime
      mat.current.uniforms.uOpacity.value = 0.32 * wild[id]
    }
    if (ref.current) ref.current.visible = wild[id] > 0.01
  })
  return (
    <mesh ref={ref} geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={mistVertex} fragmentShader={mistFragment} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ------------------------------------------------------------------ birds
const FLOCK = 7

/** A few birds wheeling over each wild region's landmark; they leave when the crew moves in. */
function Birds() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => {
    const k = new Kit()
    for (const s of [-1, 1]) k.box(0.46, 0.035, 0.2, { color: palette.creamShade, top: palette.white, at: [s * 0.22, 0.05, 0], rot: [0, s * 0.25, s * 0.42], r: 0.015, seg: 1, shade: 0.04 })
    k.sphere(0.07, { color: palette.creamShade, top: palette.white, scale: [0.8, 0.8, 1.9], seg: 6 })
    return k.geometry()
  }, [])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    REGION_IDS.forEach((id, f) => {
      const def = REGIONS[id]
      const [cx, cz] = uvToWorld(def.site[0], def.site[1])
      const base = terrainHeightUv(def.site[0], def.site[1])
      for (let b = 0; b < FLOCK; b++) {
        const ph = b * 2.4 + f * 1.3
        const R = 3.2 + (b % 3) * 1.5
        const dir = b % 2 ? 1 : -1
        const a = t * (0.34 + (b % 3) * 0.06) * dir + ph
        o.position.set(cx + Math.cos(a) * R, base + def.height * 0.72 + 1.6 + Math.sin(t * 0.6 + ph) * 0.7 + (b % 3) * 0.5, cz + Math.sin(a) * R)
        o.rotation.set(0, -a + (dir > 0 ? 0 : Math.PI), Math.sin(t * 0.9 + ph) * 0.25)
        const flap = 0.72 + 0.28 * Math.abs(Math.sin(t * 7 + ph))
        const s = 0.8 * wild[id]
        o.scale.set(Math.max(0.0001, s * flap), Math.max(0.0001, s), Math.max(0.0001, s))
        o.updateMatrix()
        mesh.setMatrixAt(f * FLOCK + b, o.matrix)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geometry, materials.matte, REGION_IDS.length * FLOCK]} frustumCulled={false} />
}

// ------------------------------------------------------------------ landmarks, signposts, the expedition
const SCAFFOLD: Record<RegionId, [number, number, number]> = { tracking: [7.2, 6.4, 7.0], annex: [8.2, 4.6, 6.2], heavy: [10.6, 6.2, 8.4] }
const SIGN_YAW = Math.PI / 4

function tapRegion(e: ThreeEvent<MouseEvent>, id: RegionId) {
  if (e.delta > 8) return
  const g = useGame.getState()
  if (usePlacement.getState().id || g.phase !== 'play' || g.tourStep >= 0) return
  e.stopPropagation()
  sfx('pop')
  focusRegion(id)
  useUi.getState().openRegion(id)
}

/**
 * The level badge over a locked region stays out of sight until the pointer
 * rests on its ruin. The signpost that points the way shows nothing on hover.
 * A finger has no hover: there a tap opens the card, which says what the
 * region needs.
 */
function hoverIn(e: ThreeEvent<PointerEvent>, id: RegionId) {
  if (e.nativeEvent.pointerType === 'touch') return
  useUi.getState().setHoverRegion(id)
}
function hoverOut(id: RegionId) {
  const ui = useUi.getState()
  if (ui.hoverRegion === id) ui.setHoverRegion(null)
}

function Site({ id }: { id: RegionId }) {
  const def = REGIONS[id]
  const state = useGame((s) => s.regions[id].state)
  const [x, z] = uvToWorld(def.site[0], def.site[1])
  const y = terrainHeightUv(def.site[0], def.site[1])
  const [sx, sz] = uvToWorld(def.sign[0], def.sign[1])
  const sign = useMemo(() => buildSignpost(id), [id])
  const scaffold = useMemo(() => buildScaffold(...SCAFFOLD[id]), [id])
  const bridge = useMemo(() => (id === 'heavy' ? null : buildFootbridge(3.6)), [id])
  useEffect(
    () => () => {
      for (const obj of [sign, scaffold, bridge]) obj?.traverse((m) => (m as THREE.Mesh).geometry?.dispose())
    },
    [sign, scaffold, bridge],
  )
  const [bx, bz] = uvToWorld(def.sign[0], creekV(def.sign[0]))
  const cleared = state !== 'locked' && state !== 'available'
  // the signpost goes away with its region: do not leave its hover behind
  useEffect(() => () => hoverOut(id), [id])
  // the bridge and the scaffold pop into being; the signpost bobs when it has news
  const pop = useRef({ bridge: 0, scaffold: 0 })
  const signRef = useRef<THREE.Group>(null)
  const bridgeRef = useRef<THREE.Group>(null)
  const scaffoldRef = useRef<THREE.Group>(null)
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime
    const grow = (key: 'bridge' | 'scaffold', on: boolean, ref: THREE.Group | null) => {
      pop.current[key] = Math.min(1, Math.max(0, pop.current[key] + (on ? dt : -dt) / 0.45))
      if (!ref) return
      const k = pop.current[key]
      const s = k <= 0 ? 0.0001 : k < 0.7 ? 1.12 * ease(k / 0.7) : 1.12 - 0.12 * ease((k - 0.7) / 0.3)
      ref.visible = k > 0
      ref.scale.set(s, k <= 0 ? 0.0001 : s * (k < 0.7 ? 1.1 : 1), s)
    }
    grow('bridge', cleared, bridgeRef.current)
    grow('scaffold', state === 'restoring', scaffoldRef.current)
    if (signRef.current) signRef.current.position.y = state === 'available' ? Math.abs(Math.sin(t * 2.4)) * 0.16 : 0
  })
  return (
    <group name={`region-${id}`}>
      <group position={[x, y, z]} rotation-y={def.yaw} onClick={(e) => tapRegion(e, id)} onPointerOver={(e) => hoverIn(e, id)} onPointerOut={() => hoverOut(id)}>
        <Juicy id={`region:${id}`}>
          <Model model={def.model} options={{ level: state === 'active' ? 1 : 0 }} />
        </Juicy>
        <group ref={scaffoldRef} visible={false}>
          <primitive object={scaffold} />
        </group>
      </group>
      {state !== 'active' && (
        <group
          position={[sx, terrainHeightUv(def.sign[0], def.sign[1]), sz]}
          rotation-y={SIGN_YAW}
          onClick={(e) => tapRegion(e, id)}
        >
          <group ref={signRef}>
            <primitive object={sign} />
          </group>
        </group>
      )}
      {bridge && (
        <group ref={bridgeRef} position={[bx, 0.02, bz]} rotation-y={SIGN_YAW} visible={false}>
          <primitive object={bridge} />
        </group>
      )}
    </group>
  )
}

/** Two of the crew and a little bulldozer: they work in from the signpost while a region is cleared, and stand by the scaffold while it is restored. */
function Expedition({ id }: { id: RegionId }) {
  const def = REGIONS[id]
  const state = useGame((s) => s.regions[id].state)
  const busy = state === 'clearing' || state === 'restoring'
  const actors = useMemo(() => {
    if (!busy) return null
    return {
      crew: [createModel('crew', { role: 'builder', variant: 1, skin: 0 }), createModel('crew', { role: 'builder', variant: 2, skin: 2 })],
      dozer: buildDozer(),
    }
  }, [busy])
  useEffect(
    () => () => {
      if (!actors) return
      actors.crew.forEach(disposeModel)
      actors.dozer.traverse((m) => (m as THREE.Mesh).geometry?.dispose())
    },
    [actors],
  )
  const dust = useRef(0)
  useFrame((st, dt) => {
    if (!actors) return
    const t = st.clock.elapsedTime
    const rec = useGame.getState().regions[id]
    const p = regionProgress(rec)
    const [ax, az] = uvToWorld(def.sign[0], def.sign[1])
    const [bx, bz] = uvToWorld(def.site[0], def.site[1])
    const dx = bx - ax
    const dz = bz - az
    const len = Math.hypot(dx, dz) || 1
    const ux = dx / len
    const uz = dz / len
    const heading = Math.atan2(ux, uz)
    const place = (obj: THREE.Object3D, along: number, side: number, yaw: number, scale = 1) => {
      const x = ax + ux * along - uz * side
      const z = az + uz * along + ux * side
      const [u, v] = worldToUv(x, z)
      obj.position.set(x, terrainHeightUv(u, v) + (Math.abs(v - creekV(u)) < 1.3 ? 0.3 : 0), z)
      obj.rotation.y = yaw
      obj.scale.setScalar(scale)
    }
    if (rec.state === 'clearing') {
      // the work front moves out from the signpost at the pace the trees fall
      const reach = Math.min(len - SCAFFOLD[id][0] * 0.35, CLEAR_REACH[id] * 0.8)
      const front = 1.2 + ease(p) * (reach - 1.2)
      const sway = Math.sin(t * 1.4) * 0.9
      actors.dozer.visible = true
      place(actors.dozer, front + 0.6 + sway, 0.2, heading, 1.15)
      actors.crew.forEach((c, i) => {
        const walking = p < 0.97
        const wob = Math.sin(t * 0.8 + i * 2) * 0.5
        place(c, Math.max(0.4, front - 0.9 - i * 0.8 + wob), i ? 1.5 : -1.5, heading + (i ? -0.5 : 0.5) + Math.sin(t * 0.7 + i) * 0.4, 1.5)
        const data = c.userData as ModelUserData & { setWalk: (ph: number | null) => void }
        data.setWalk(walking ? t * 7 + i : null)
        data.tick?.(t, dt)
      })
      // dust where the blade bites
      dust.current += dt
      if (dust.current > 0.35) {
        dust.current = 0
        puff(actors.dozer.position.x + ux * 1.1, actors.dozer.position.y + 0.3, actors.dozer.position.z + uz * 1.1, 0.7)
      }
    } else {
      actors.dozer.visible = false
      actors.crew.forEach((c, i) => {
        const r = SCAFFOLD[id][0] * 0.5 + 0.9
        const a = heading + Math.PI + (i ? 0.5 : -0.5)
        c.position.set(bx + Math.sin(a) * r, terrainHeightUv(def.site[0], def.site[1]), bz + Math.cos(a) * r)
        c.rotation.y = a + Math.PI
        c.scale.setScalar(1.5)
        const data = c.userData as ModelUserData & { setWalk: (ph: number | null) => void }
        // a hammering bob
        data.setWalk(null)
        data.tick?.(t, dt)
        c.position.y += Math.abs(Math.sin(t * 5 + i * 1.5)) * 0.06
      })
    }
  })
  if (!actors) return null
  return (
    <group name={`expedition-${id}`}>
      {actors.crew.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
      <primitive object={actors.dozer} />
    </group>
  )
}

// ------------------------------------------------------------------ confetti
const CONFETTI = 90
function Confetti() {
  const party = useUi((s) => s.party)
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.PlaneGeometry(0.22, 0.14), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), [])
  const sim = useRef({ t: -1, p: new Float32Array(CONFETTI * 3), v: new Float32Array(CONFETTI * 3) })
  const o = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    const mesh = ref.current
    if (!party || !mesh) return
    const def = REGIONS[party.id]
    const [x, z] = uvToWorld(def.site[0], def.site[1])
    const y = terrainHeightUv(def.site[0], def.site[1]) + def.height * 0.55
    const colors = [palette.red, palette.yellow, palette.teal, palette.blue, palette.pink, palette.purple, palette.white, palette.orange]
    const c = new THREE.Color()
    for (let i = 0; i < CONFETTI; i++) {
      sim.current.p.set([x + (Math.random() - 0.5) * 2, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 2], i * 3)
      const a = Math.random() * Math.PI * 2
      const sp = 2.5 + Math.random() * 4.5
      sim.current.v.set([Math.cos(a) * sp, 6 + Math.random() * 6, Math.sin(a) * sp], i * 3)
      mesh.setColorAt(i, c.set(colors[i % colors.length]))
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    sim.current.t = 0
  }, [party])
  useFrame((_, dtRaw) => {
    const mesh = ref.current
    const s = sim.current
    if (!mesh) return
    mesh.visible = s.t >= 0
    if (s.t < 0) return
    const dt = Math.min(dtRaw, 0.05)
    s.t += dt
    const fade = s.t > 2.4 ? Math.max(0, 1 - (s.t - 2.4) / 0.6) : 1
    for (let i = 0; i < CONFETTI; i++) {
      s.v[i * 3 + 1] -= 9 * dt
      // paper flutters: it stops falling fast
      if (s.v[i * 3 + 1] < -2.2) s.v[i * 3 + 1] = -2.2
      s.v[i * 3] *= 1 - dt * 1.2
      s.v[i * 3 + 2] *= 1 - dt * 1.2
      for (let k = 0; k < 3; k++) s.p[i * 3 + k] += s.v[i * 3 + k] * dt
      o.position.set(s.p[i * 3] + Math.sin(s.t * 5 + i) * 0.08, s.p[i * 3 + 1], s.p[i * 3 + 2])
      o.rotation.set(s.t * (3 + (i % 5)) + i, s.t * (2 + (i % 3)) + i * 2, i)
      o.scale.setScalar(Math.max(0.0001, fade))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (s.t > 3) s.t = -1
  })
  return <instancedMesh ref={ref} args={[geo, mat, CONFETTI]} frustumCulled={false} visible={false} />
}

// ------------------------------------------------------------------ everything together
/** Keeps "how wild is each region" up to date, and switches the region tint on for this scene. */
function WildState() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.onBeforeRender = () => {
      regionTint.uRegionOn.value = 1
    }
    return () => {
      scene.onBeforeRender = () => {}
    }
  }, [scene])
  useFrame((_, dt) => {
    const g = useGame.getState()
    const now = Date.now()
    REGION_IDS.forEach((id, i) => {
      const rec = g.regions[id]
      const target = wildTarget(rec.state, rec.state === 'clearing' ? regionProgress(rec, now) : 1)
      // ease towards the target so a state change never snaps
      wild[id] += (target - wild[id]) * Math.min(1, dt * 3)
      regionTint.uRegionMute.value.setComponent(i, wild[id])
    })
  }, -1)
  return null
}

export function Regions() {
  return (
    <group name="regions">
      <WildState />
      <Creek />
      <Forest />
      <Puffs />
      <Birds />
      <Confetti />
      {REGION_IDS.map((id) => (
        <group key={id}>
          <Mist id={id} />
          <Site id={id} />
          <Expedition id={id} />
        </group>
      ))}
    </group>
  )
}
