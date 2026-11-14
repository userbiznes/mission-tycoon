import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Kit, seeded } from '../art/kit'
import { palette } from '../art/palette'
import { materials } from '../art/materials'
import { PATH_SEGS, pathDistance, plotDistance } from './paths'
import { BEACH_W, PLATEAU_D, coastUv, groundHeightUv, uvToWorld, vnoise } from './world'

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

// ------------------------------------------------------------------ scatter
interface Spot {
  u: number
  v: number
  y: number
  s: number
  rot: number
}

function scatter(
  seed: number,
  count: number,
  accept: (u: number, v: number, d: number, rnd: () => number) => boolean,
  scale: [number, number],
  maxTries = 60,
): Spot[] {
  const rnd = seeded(seed)
  const out: Spot[] = []
  let tries = 0
  while (out.length < count && tries < count * maxTries) {
    tries++
    const u = -22 + rnd() * 44
    const v = -40 + rnd() * 74
    const d = coastUv(u, v)
    if (!accept(u, v, d, rnd)) continue
    out.push({ u, v, y: groundHeightUv(u, v), s: scale[0] + rnd() * (scale[1] - scale[0]), rot: rnd() * Math.PI * 2 })
  }
  return out
}

function Instances({
  geometry,
  spots,
  castShadow = true,
  sink = 0,
}: {
  geometry: THREE.BufferGeometry
  spots: Spot[]
  castShadow?: boolean
  sink?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    spots.forEach((s, i) => {
      const [x, z] = uvToWorld(s.u, s.v)
      o.position.set(x, s.y - sink, z)
      o.rotation.set(0, s.rot, 0)
      o.scale.setScalar(s.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots])
  if (!spots.length) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, materials.matte, spots.length]}
      castShadow={castShadow}
      receiveShadow
    />
  )
}

const onPlateau = (d: number) => d < PLATEAU_D - 0.3
const clear = (u: number, v: number, pad: number) => plotDistance(u, v) > pad && pathDistance(u, v) > pad

/** Trees, bushes, rocks, palms, grass tufts and flowers, all instanced. */
export function Props() {
  const geo = useMemo(
    () => ({
      treeRound: treeRound(),
      treePine: treePine(),
      palm: palm(),
      bush: bush(),
      rock: rock(),
      tuft: tuft(),
      flowers: [palette.flowerPink, palette.flowerWhite, palette.flowerOrange, palette.flowerBlue].map(flower),
    }),
    [],
  )

  const spots = useMemo(() => {
    // trees hug the rim of the plateau and fill the gaps between plots
    const trees = scatter(
      1,
      58,
      (u, v, d, rnd) => onPlateau(d) && clear(u, v, 0.9) && (d > PLATEAU_D - 3.2 || rnd() < 0.22) && v < 27,
      [0.8, 1.25],
    )
    const round = trees.filter((_, i) => i % 3 !== 0)
    const pines = trees.filter((_, i) => i % 3 === 0)
    const palms = scatter(2, 16, (_u, _v, d) => d > -BEACH_W - 0.5 && d < -0.9, [0.85, 1.2])
    const bushes = scatter(3, 46, (u, v, d) => d < PLATEAU_D + 0.9 && clear(u, v, 0.35), [0.6, 1.15])
    const rocks = scatter(
      4,
      34,
      (u, v, d, rnd) => (d > -BEACH_W - 0.2 && d < 1.6) || (onPlateau(d) && clear(u, v, 0.5) && rnd() < 0.05),
      [0.5, 1.3],
    )
    const tufts = scatter(
      5,
      520,
      (u, v, d) => d < PLATEAU_D + 1.0 && clear(u, v, 0.15) && vnoise(u * 0.4, v * 0.4) > 0.3,
      [0.6, 1.25],
    )
    // flowers bloom in patches
    const patchRnd = seeded(6)
    const flowers: Spot[][] = [[], [], [], []]
    for (let p = 0; p < 34; p++) {
      const cu = -12 + patchRnd() * 24
      const cv = -30 + patchRnd() * 56
      const kind = Math.floor(patchRnd() * 4)
      const n = 4 + Math.floor(patchRnd() * 6)
      for (let i = 0; i < n; i++) {
        const u = cu + (patchRnd() - 0.5) * 1.7
        const v = cv + (patchRnd() - 0.5) * 1.7
        const d = coastUv(u, v)
        if (!onPlateau(d) || !clear(u, v, 0.2)) continue
        flowers[kind].push({ u, v, y: 0, s: 0.8 + patchRnd() * 0.6, rot: patchRnd() * 6 })
      }
    }
    return { round, pines, palms, bushes, rocks, tufts, flowers }
  }, [])

  return (
    <group name="props">
      <Instances geometry={geo.treeRound} spots={spots.round} />
      <Instances geometry={geo.treePine} spots={spots.pines} />
      <Instances geometry={geo.palm} spots={spots.palms} sink={0.05} />
      <Instances geometry={geo.bush} spots={spots.bushes} />
      <Instances geometry={geo.rock} spots={spots.rocks} sink={0.06} />
      <Instances geometry={geo.tuft} spots={spots.tufts} castShadow={false} />
      {geo.flowers.map((g, i) => (
        <Instances key={i} geometry={g} spots={spots.flowers[i]} castShadow={false} />
      ))}
    </group>
  )
}

/** Sandy paths: a road spine with a branch to every plot, laid as low rounded slabs. */
export function Paths() {
  const object = useMemo(() => {
    const kit = new Kit()
    for (const layer of [0, 1]) {
      for (const s of PATH_SEGS) {
        const [ax, az] = uvToWorld(s.a[0], s.a[1])
        const [bx, bz] = uvToWorld(s.b[0], s.b[1])
        const len = Math.hypot(bx - ax, bz - az)
        const w = s.w + (layer === 0 ? 0.36 : 0)
        const angle = Math.atan2(-(bz - az), bx - ax)
        kit.slab(len + w, w, layer === 0 ? 0.035 : 0.06, w / 2, {
          color: layer === 0 ? palette.pathEdge : palette.path,
          top: layer === 0 ? palette.pathEdge : palette.sandLight,
          at: [(ax + bx) / 2, 0, (az + bz) / 2],
          rot: [0, angle, 0],
          bevel: layer === 0 ? 0.015 : 0.025,
          shade: 0.03,
        })
      }
    }
    const g = kit.build('paths')
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = false
    })
    return g
  }, [])
  return <primitive object={object} />
}
