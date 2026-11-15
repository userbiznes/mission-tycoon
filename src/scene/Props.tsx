import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Kit, seeded } from '../art/kit'
import { palette } from '../art/palette'
import { materials } from '../art/materials'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { usePlacement } from '../state/placement'
import { sfx } from '../ui/sound'
import { landOpen } from '../state/regionGate'
import { CELL, nearDock, allObstacles, cellKey, isLand, occupancy, worldToCell, type Obstacle, type ObstacleKind } from './grid'
import { creekDepth, terrainHeightUv } from './relief'
import { BEACH_W, PLATEAU_D, coastUv, uvToWorld, vnoise } from './world'

// ------------------------------------------------------------------ prop geometry
function treeRound(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.13, 0.19, 0.95, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.47, 0], bevel: 0.04, seg: 8 })
  k.blob(0.78, { color: palette.leafDark, top: palette.leafLight, at: [0, 1.5, 0], scale: [1, 0.92, 1], shade: 0.24 })
  k.blob(0.52, { color: palette.leafDark, top: palette.leaf, at: [0.5, 1.12, 0.12], shade: 0.2 })
  k.blob(0.48, { color: palette.leafDark, top: palette.leaf, at: [-0.44, 1.2, -0.2], shade: 0.2 })
  k.blob(0.4, { color: palette.leaf, top: palette.leafLight, at: [0.1, 1.95, 0.05], shade: 0.12 })
  return k.geometry()
}
function treePine(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.11, 0.16, 0.6, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.3, 0], bevel: 0.03, seg: 8 })
  const tiers: [number, number, number][] = [
    [0.78, 0.95, 0.85],
    [0.62, 0.85, 1.4],
    [0.44, 0.8, 1.95],
  ]
  for (const [r, h, y] of tiers) {
    k.lathe(
      [
        [0, -h / 2],
        [r * 0.8, -h / 2],
        [r, -h / 2 + 0.1],
        [r * 0.9, -h / 2 + 0.22],
        [r * 0.34, h / 2 - 0.16],
        [r * 0.12, h / 2 - 0.03],
        [0, h / 2],
      ],
      { color: palette.pineDark, top: palette.pine, at: [0, y, 0], seg: 10, shade: 0.22 },
    )
  }
  return k.geometry()
}
function palm(): THREE.BufferGeometry {
  const k = new Kit()
  k.pipe(
    [
      [0, 0, 0],
      [0.08, 0.6, 0],
      [0.26, 1.25, 0],
      [0.52, 1.85, 0],
    ],
    0.1,
    { color: palette.trunkDark, top: palette.trunk, radial: 7, tension: 0.4 },
  )
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3
    const droop = 0.42 + (i % 2) * 0.16
    k.at([0.52, 1.88, 0], [0, a, 0], () => {
      k.sphere(0.5, {
        color: palette.leafDark,
        top: palette.leafLight,
        at: [0.42, -0.06, 0],
        rot: [0, 0, -droop],
        scale: [1.25, 0.1, 0.36],
        seg: 8,
        shade: 0.1,
      })
    })
  }
  k.sphere(0.1, { color: palette.trunkDark, at: [0.6, 1.76, 0.08], seg: 6 })
  k.sphere(0.1, { color: palette.trunk, at: [0.44, 1.75, -0.08], seg: 6 })
  return k.geometry()
}
function bush(): THREE.BufferGeometry {
  const k = new Kit()
  k.blob(0.42, { color: palette.leafDark, top: palette.leafLight, at: [0, 0.3, 0], scale: [1.1, 0.85, 1], shade: 0.2 })
  k.blob(0.3, { color: palette.leafDark, top: palette.leaf, at: [0.36, 0.22, 0.1], shade: 0.18 })
  k.blob(0.27, { color: palette.leafDark, top: palette.leaf, at: [-0.32, 0.2, -0.08], shade: 0.18 })
  return k.geometry()
}
function rock(): THREE.BufferGeometry {
  const k = new Kit()
  k.blob(0.42, { color: palette.rockDark, top: palette.rock, at: [0, 0.2, 0], scale: [1.2, 0.7, 0.95], detail: 1, shade: 0.2 })
  k.blob(0.24, { color: palette.rockDark, top: palette.rock, at: [0.38, 0.1, 0.16], scale: [1, 0.7, 1], detail: 1, shade: 0.2 })
  return k.geometry()
}
function tuft(): THREE.BufferGeometry {
  const k = new Kit()
  const blades: [number, number, number, number][] = [
    [0, 0, 0.34, 0],
    [0.09, 0.03, 0.26, 0.5],
    [-0.08, 0.05, 0.28, -0.45],
    [0.02, -0.09, 0.22, 0.2],
  ]
  for (const [x, z, h, lean] of blades) {
    k.cone(0.06, h, { color: palette.grassShade, top: palette.grassLight, at: [x, h / 2 - 0.02, z], rot: [lean * 0.4, 0, lean], seg: 5, shade: 0.1 })
  }
  return k.geometry()
}
function flower(color: string): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.018, 0.022, 0.26, { color: palette.leafDark, top: palette.leaf, at: [0, 0.13, 0], bevel: 0.005, seg: 5 })
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    k.sphere(0.06, { color, at: [Math.cos(a) * 0.065, 0.28, Math.sin(a) * 0.065], scale: [1, 0.5, 1], seg: 6, shade: 0.05 })
  }
  k.sphere(0.045, { color: palette.flowerYellow, at: [0, 0.3, 0], seg: 6, shade: 0 })
  return k.geometry()
}

// ------------------------------------------------------------------ overgrowth geometry
function thicket(): THREE.BufferGeometry {
  const k = new Kit()
  const blobs: [number, number, number, number][] = [
    [0, 0.55, 0, 0.95],
    [0.75, 0.4, 0.35, 0.62],
    [-0.7, 0.42, -0.3, 0.66],
    [0.2, 0.36, -0.8, 0.55],
    [-0.35, 0.34, 0.8, 0.56],
    [0.1, 1.1, 0.1, 0.5],
  ]
  for (const [x, y, z, r] of blobs) k.blob(r, { color: palette.leafDark, top: palette.leaf, at: [x, y, z], scale: [1.1, 0.85, 1], shade: 0.24 })
  // brambles poking out
  for (const [x, z, a] of [
    [0.9, -0.5, 0.5],
    [-1.0, 0.4, -0.6],
    [0.3, 1.0, 0.3],
  ] as const)
    k.beam([x, 0, z], [x * 1.25, 1.0, z * 1.25 + a * 0.3], 0.07, { color: palette.trunkDark, top: palette.trunk, round: true })
  for (const [x, y, z] of [
    [0.5, 1.0, 0.6],
    [-0.6, 0.85, 0.1],
    [0.1, 1.45, -0.2],
  ] as const)
    k.sphere(0.09, { color: palette.flowerPink, at: [x, y, z], seg: 6, shade: 0 })
  return k.geometry()
}
function boulder(): THREE.BufferGeometry {
  const k = new Kit()
  k.blob(1.05, { color: palette.rockDark, top: palette.rock, at: [0, 0.55, 0], scale: [1.15, 0.72, 1], detail: 1, shade: 0.22 })
  k.blob(0.6, { color: palette.rockDark, top: palette.rock, at: [0.95, 0.3, 0.45], scale: [1, 0.7, 1], detail: 1, shade: 0.22 })
  k.blob(0.45, { color: palette.rockDark, top: palette.rock, at: [-0.9, 0.24, -0.5], scale: [1, 0.7, 1], detail: 1, shade: 0.2 })
  k.blob(0.3, { color: palette.leafDark, top: palette.leafLight, at: [0.2, 1.1, 0.1], scale: [1.4, 0.4, 1.2], shade: 0.1 })
  return k.geometry()
}
function smallRock(): THREE.BufferGeometry {
  const k = new Kit()
  k.blob(0.5, { color: palette.rockDark, top: palette.rock, at: [0, 0.26, 0], scale: [1.15, 0.7, 1], detail: 1, shade: 0.2 })
  k.blob(0.26, { color: palette.rockDark, top: palette.rock, at: [0.42, 0.13, 0.2], scale: [1, 0.7, 1], detail: 1, shade: 0.2 })
  return k.geometry()
}
function stump(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.36, 0.46, 0.5, { color: palette.trunkDark, top: palette.trunk, at: [0, 0.25, 0], bevel: 0.06, seg: 12 })
  k.cyl(0.3, 0.3, 0.03, { color: palette.woodLight, at: [0, 0.51, 0], bevel: 0.01, seg: 12, shade: 0 })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    k.beam([Math.cos(a) * 0.3, 0.14, Math.sin(a) * 0.3], [Math.cos(a) * 0.68, 0.02, Math.sin(a) * 0.68], 0.16, { color: palette.trunkDark, top: palette.trunk, round: true })
  }
  k.blob(0.16, { color: palette.leaf, top: palette.leafLight, at: [0.2, 0.6, -0.1], shade: 0.1 })
  return k.geometry()
}
function scrap(): THREE.BufferGeometry {
  const k = new Kit()
  // a tipped rusty drum, a tyre, a crate and a bent panel
  k.cyl(0.36, 0.36, 0.9, { color: palette.rustDark, top: palette.rust, at: [-0.5, 0.36, 0.2], rot: [0, 0.4, Math.PI / 2], bevel: 0.06, seg: 14 })
  k.torus(0.36, 0.14, { color: palette.rubber, top: palette.steel, at: [0.65, 0.16, 0.6], tube: 8, seg: 16 })
  k.box(0.7, 0.6, 0.7, { color: palette.woodDark, top: palette.wood, at: [0.55, 0.3, -0.5], rot: [0, 0.5, 0], r: 0.06 })
  k.box(1.1, 0.06, 0.8, { color: palette.rust, top: palette.rustLight, at: [-0.3, 0.5, -0.6], rot: [0.5, 0.3, 0.2], r: 0.03, mat: 'metal' })
  k.cyl(0.3, 0.32, 0.7, { color: palette.tealDark, top: palette.rust, at: [-0.9, 0.35, -0.3], bevel: 0.05, seg: 12 })
  k.blob(0.3, { color: palette.leafDark, top: palette.leaf, at: [0.1, 0.2, 0.1], shade: 0.2 })
  return k.geometry()
}
function deadTree(): THREE.BufferGeometry {
  const k = new Kit()
  k.cyl(0.14, 0.24, 1.9, { color: palette.trunkDark, top: palette.woodLight, at: [0, 0.95, 0], bevel: 0.04, seg: 8 })
  k.beam([0, 1.3, 0], [0.6, 2.0, 0.1], 0.1, { color: palette.trunkDark, top: palette.woodLight, round: true })
  k.beam([0, 1.55, 0], [-0.5, 2.2, -0.15], 0.09, { color: palette.trunkDark, top: palette.woodLight, round: true })
  k.beam([0, 1.8, 0], [0.1, 2.5, 0.35], 0.07, { color: palette.trunkDark, top: palette.woodLight, round: true })
  k.blob(0.2, { color: palette.leafDark, top: palette.leaf, at: [0.25, 0.14, 0.1], shade: 0.2 })
  return k.geometry()
}

// ------------------------------------------------------------------ scatter
interface Spot {
  x: number
  z: number
  y: number
  s: number
  rot: number
}

function scatter(seed: number, count: number, accept: (u: number, v: number, d: number, rnd: () => number) => boolean, scale: [number, number], maxTries = 80): Spot[] {
  const rnd = seeded(seed)
  const out: Spot[] = []
  let tries = 0
  while (out.length < count && tries < count * maxTries) {
    tries++
    const u = -36 + rnd() * 72
    const v = -58 + rnd() * 116
    const d = coastUv(u, v)
    if (!accept(u, v, d, rnd)) continue
    const [x, z] = uvToWorld(u, v)
    // nothing grows through the dock
    if (nearDock(x, z, 2.2)) continue
    out.push({ x, z, y: terrainHeightUv(u, v), s: scale[0] + rnd() * (scale[1] - scale[0]), rot: rnd() * Math.PI * 2 })
  }
  return out
}

function Instances({ geometry, spots, castShadow = true, sink = 0 }: { geometry: THREE.BufferGeometry; spots: Spot[]; castShadow?: boolean; sink?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    spots.forEach((s, i) => {
      o.position.set(s.x, s.y - sink, s.z)
      o.rotation.set(0, s.rot, 0)
      o.scale.setScalar(s.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.count = spots.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots])
  // sized for the largest it will ever be, so filtering never reallocates
  const capacity = useRef(Math.max(1, spots.length)).current
  return <instancedMesh ref={ref} args={[geometry, materials.matte, capacity]} castShadow={castShadow} receiveShadow frustumCulled={false} />
}

/** The wooded rim: trees, palms, bushes and rocks on the bank and the beach, never on buildable ground. */
export function Props() {
  const geo = useMemo(
    () => ({
      treeRound: treeRound(),
      treePine: treePine(),
      palm: palm(),
      bush: bush(),
      rock: rock(),
    }),
    [],
  )
  const spots = useMemo(() => {
    const bank = (d: number) => d > PLATEAU_D - 0.2 && d < -BEACH_W - 0.2
    const trees = scatter(1, 190, (_u, _v, d) => bank(d), [0.85, 1.4])
    return {
      round: trees.filter((_, i) => i % 3 !== 0),
      pines: trees.filter((_, i) => i % 3 === 0),
      palms: scatter(2, 44, (_u, _v, d) => d > -BEACH_W - 0.4 && d < -0.9, [0.85, 1.25]),
      bushes: scatter(3, 120, (_u, _v, d) => d > PLATEAU_D - 0.6 && d < -BEACH_W + 0.4, [0.6, 1.2]),
      rocks: scatter(4, 70, (_u, _v, d) => d > -BEACH_W - 0.2 && d < 1.6, [0.5, 1.3]),
    }
  }, [])
  return (
    <group name="props">
      <Instances geometry={geo.treeRound} spots={spots.round} />
      <Instances geometry={geo.treePine} spots={spots.pines} />
      <Instances geometry={geo.palm} spots={spots.palms} sink={0.05} />
      <Instances geometry={geo.bush} spots={spots.bushes} />
      <Instances geometry={geo.rock} spots={spots.rocks} sink={0.06} />
    </group>
  )
}

/** Tufts and flowers across the meadow; they step aside for buildings, overgrowth and roads. */
export function GroundCover({ blocked }: { blocked: Set<number> }) {
  const geo = useMemo(() => ({ tuft: tuft(), flowers: [palette.flowerPink, palette.flowerWhite, palette.flowerOrange, palette.flowerBlue].map(flower) }), [])
  const all = useMemo(() => {
    const onMeadow = (d: number) => d < PLATEAU_D - 0.2
    const tufts = scatter(5, 620, (u, v, d) => onMeadow(d) && creekDepth(u, v) < 0.02 && vnoise(u * 0.3, v * 0.3) > 0.58, [0.6, 1.3], 60)
    const rnd = seeded(6)
    const flowers: Spot[][] = [[], [], [], []]
    for (let p = 0; p < 110; p++) {
      const cu = -22 + rnd() * 44
      const cv = -44 + rnd() * 88
      const kind = Math.floor(rnd() * 4)
      const n = 4 + Math.floor(rnd() * 7)
      for (let i = 0; i < n; i++) {
        const u = cu + (rnd() - 0.5) * 2
        const v = cv + (rnd() - 0.5) * 2
        if (!onMeadow(coastUv(u, v)) || creekDepth(u, v) > 0.02) continue
        const [x, z] = uvToWorld(u, v)
        flowers[kind].push({ x, z, y: terrainHeightUv(u, v), s: 0.8 + rnd() * 0.6, rot: rnd() * 6 })
      }
    }
    return { tufts, flowers }
  }, [])
  const free = (s: Spot) => {
    const c = worldToCell(s.x, s.z)
    return !blocked.has(cellKey(c.i, c.j))
  }
  const tufts = useMemo(() => all.tufts.filter(free), [all, blocked]) // eslint-disable-line react-hooks/exhaustive-deps
  const flowers = useMemo(() => all.flowers.map((f) => f.filter(free)), [all, blocked]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group name="ground-cover">
      <FilteredInstances geometry={geo.tuft} spots={tufts} capacity={all.tufts.length} />
      {geo.flowers.map((g, i) => (
        <FilteredInstances key={i} geometry={g} spots={flowers[i]} capacity={Math.max(1, all.flowers[i].length)} />
      ))}
    </group>
  )
}

function FilteredInstances({ geometry, spots, capacity }: { geometry: THREE.BufferGeometry; spots: Spot[]; capacity: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
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
    mesh.count = spots.length
    mesh.instanceMatrix.needsUpdate = true
  }, [spots])
  return <instancedMesh ref={ref} args={[geometry, materials.matte, capacity]} receiveShadow frustumCulled={false} />
}

// ------------------------------------------------------------------ overgrowth
const OBSTACLE_GEO: Record<ObstacleKind, () => THREE.BufferGeometry> = { thicket, boulder, rock: smallRock, stump, scrap, deadTree }

function ObstacleKindMesh({ kind, list, cleared }: { kind: ObstacleKind; list: Obstacle[]; cleared: Set<string> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => OBSTACLE_GEO[kind](), [kind])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    list.forEach((ob, i) => {
      o.position.set((ob.i + ob.size / 2) * CELL, 0, (ob.j + ob.size / 2) * CELL)
      o.rotation.set(0, ob.rot, 0)
      o.scale.setScalar(cleared.has(ob.id) ? 0.0001 : ob.scale)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [list, cleared])
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8 || e.instanceId === undefined) return
    const ob = list[e.instanceId]
    if (!ob || cleared.has(ob.id)) return
    const g = useGame.getState()
    if (usePlacement.getState().id || g.phase !== 'play' || g.tourStep >= 0 || !landOpen(ob.region)) return
    e.stopPropagation()
    sfx('pop')
    useUi.getState().setClearTarget(ob.id)
  }
  return <instancedMesh ref={ref} args={[geometry, materials.matte, list.length]} castShadow receiveShadow onClick={onClick} />
}

/** The overgrowth of an abandoned spaceport: tap a piece to clear it and win back the land. */
export function Overgrowth() {
  const clearedList = useGame((s) => s.cleared)
  const cleared = useMemo(() => new Set(clearedList), [clearedList])
  const byKind = useMemo(() => {
    const m = {} as Record<ObstacleKind, Obstacle[]>
    for (const o of allObstacles()) (m[o.kind] ??= []).push(o)
    return m
  }, [])
  return (
    <group name="overgrowth">
      {(Object.keys(byKind) as ObstacleKind[]).map((k) => (
        <ObstacleKindMesh key={k} kind={k} list={byKind[k]} cleared={cleared} />
      ))}
    </group>
  )
}

/** Cells that ground cover must leave bare: buildings, overgrowth and the dock. */
export function useBlockedCells(): Set<number> {
  const placed = useGame((s) => s.placed)
  const cleared = useGame((s) => s.cleared)
  return useMemo(() => occupancy(placed, cleared), [placed, cleared])
}

export { isLand, treeRound, treePine, deadTree, scatter, Instances }
export type { Spot }
