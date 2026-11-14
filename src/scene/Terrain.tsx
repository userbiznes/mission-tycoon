import { useMemo } from 'react'
import * as THREE from 'three'
import { palette } from '../art/palette'
import {
  BEACH_W,
  PLATEAU_D,
  WATER_Y,
  coastUv,
  fbm,
  heightFromCoast,
  uvToWorld,
  vnoise,
} from './world'

const U0 = -42
const U1 = 42
const V0 = -62
const V1 = 62
const STEP = 0.5

const c = (hex: string) => new THREE.Color(hex)

function buildTerrain(): THREE.BufferGeometry {
  const nu = Math.round((U1 - U0) / STEP) + 1
  const nv = Math.round((V1 - V0) / STEP) + 1
  const pos = new Float32Array(nu * nv * 3)
  const col = new Float32Array(nu * nv * 3)

  const grass = c(palette.grass)
  const grassLight = c(palette.grassLight)
  const grassDeep = c(palette.grassDeep)
  const grassShade = c(palette.grassShade)
  const grassDry = c(palette.grassDry)
  const dirt = c(palette.dirt)
  const sand = c(palette.sand)
  const sandLight = c(palette.sandLight)
  const sandWet = c(palette.sandWet)
  const seabed = c(palette.seabed)
  const tmp = new THREE.Color()

  let i = 0
  for (let iv = 0; iv < nv; iv++) {
    const v = V0 + iv * STEP
    for (let iu = 0; iu < nu; iu++) {
      const u = U0 + iu * STEP
      const d = coastUv(u, v)
      let y = heightFromCoast(d)
      // gentle lumps away from the flat building plateau
      if (d > PLATEAU_D && d < -0.2) y += (vnoise(u * 0.9, v * 0.9) - 0.5) * 0.1
      const [x, z] = uvToWorld(u, v)
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      // ---- colour ----
      const n1 = fbm(u * 0.16 + 3.1, v * 0.16 + 9.7, 3)
      const n2 = vnoise(u * 0.55 + 20, v * 0.55 - 11)
      const n3 = vnoise(u * 1.7 - 5, v * 1.7 + 2)
      // meadow: broad soft patches of light and deep green, with a few dry spots
      tmp.copy(grass)
      tmp.lerp(grassLight, THREE.MathUtils.smoothstep(n1, 0.48, 0.72) * 0.85)
      tmp.lerp(grassDeep, THREE.MathUtils.smoothstep(1 - n1, 0.52, 0.78) * 0.8)
      tmp.lerp(grassDry, THREE.MathUtils.smoothstep(n2, 0.74, 0.92) * 0.35)
      tmp.offsetHSL(0, 0, (n3 - 0.5) * 0.035)

      if (d > PLATEAU_D - 0.6) {
        // bank: deeper green on the slope
        const tb = THREE.MathUtils.smoothstep(d, PLATEAU_D - 0.6, PLATEAU_D + 0.9)
        tmp.lerp(grassShade, tb * 0.75)
        // dirt lip where grass meets sand (wavy)
        const edge = -BEACH_W - 0.35 + (n2 - 0.5) * 0.7
        const td = THREE.MathUtils.smoothstep(d, edge - 0.45, edge)
        tmp.lerp(dirt, td * 0.9)
        const ts = THREE.MathUtils.smoothstep(d, edge, edge + 0.4)
        const dry = sand.clone().lerp(sandLight, n3 * 0.7)
        tmp.lerp(dry, ts)
        // wet sand by the water
        const tw = THREE.MathUtils.smoothstep(d, -0.95 + (n2 - 0.5) * 0.3, -0.25)
        tmp.lerp(sandWet, tw * 0.85)
        if (d > 0) tmp.lerp(seabed, THREE.MathUtils.smoothstep(d, 0, 2.5))
      }
      col[i * 3] = tmp.r
      col[i * 3 + 1] = tmp.g
      col[i * 3 + 2] = tmp.b
      i++
    }
  }

  const idx: number[] = []
  for (let iv = 0; iv < nv - 1; iv++) {
    for (let iu = 0; iu < nu - 1; iu++) {
      const a = iv * nu + iu
      const b = a + 1
      const c2 = a + nu
      const d2 = c2 + 1
      // skip quads that are fully deep under water
      const ya = pos[a * 3 + 1]
      const yd = pos[d2 * 3 + 1]
      if (ya < WATER_Y - 1.4 && yd < WATER_Y - 1.4) continue
      idx.push(a, b, c2, b, d2, c2)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** Vertex-coloured ground with a little procedural mottling so the grass never looks flat. */
function makeTerrainMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos;
        float tHash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        float tNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), f.x),
                     mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec2 p = vWorldPos.xz;
          float isGrass = smoothstep(0.02, 0.14, vColor.g - vColor.r);
          float n1 = tNoise(p * 0.32);
          float n2 = tNoise(p * 3.1 + 17.0);
          float n3 = tNoise(p * 11.0 + 3.0);
          // broad soft brush strokes rather than busy mottling
          float m = (n1 - 0.5) * 0.13 + (n2 - 0.5) * 0.045;
          diffuseColor.rgb *= 1.0 + m * mix(0.45, 1.0, isGrass);
          // lighter flecks: clover in the grass, grains in the sand
          diffuseColor.rgb += smoothstep(0.86, 0.94, n3) * mix(0.03, 0.02, isGrass);
        }`,
      )
  }
  return mat
}

export function Terrain() {
  const geometry = useMemo(buildTerrain, [])
  const material = useMemo(makeTerrainMaterial, [])
  return <mesh geometry={geometry} material={material} receiveShadow name="terrain" />
}
