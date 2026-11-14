import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { palette } from '../art/palette'
import { Kit, seeded } from '../art/kit'
import { FWD, RIGHT } from './world'

/** Direction towards the sun: from screen-left and a little towards the camera, so the left faces of
 * buildings are lit, right faces sit in soft shade and shadows fall up-right. */
export const SUN_DIR = new THREE.Vector3(-0.26, 1.1, 0.96).normalize()

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
    gl_Position = p.xyww;
  }
`
const skyFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunGlow;
  varying vec3 vDir;
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
    col = mix(col, uTop, smoothstep(0.2, 0.85, h));
    col = mix(col, uHorizon, 1.0 - smoothstep(-0.25, 0.02, h));
    float s = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunGlow * (pow(s, 24.0) * 0.35 + pow(s, 400.0) * 1.2);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function SkyDome() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(palette.skyTop) },
      uMid: { value: new THREE.Color(palette.skyMid) },
      uHorizon: { value: new THREE.Color(palette.skyHorizon) },
      uSunDir: { value: SUN_DIR.clone() },
      uSunGlow: { value: new THREE.Color(palette.sunGlow) },
    }),
    [],
  )
  return (
    <mesh renderOrder={-10} frustumCulled={false} name="sky">
      <sphereGeometry args={[1, 24, 16]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={skyVert}
        fragmentShader={skyFrag}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

function makeCloud(seed: number): THREE.Group {
  const rnd = seeded(seed)
  const kit = new Kit()
  const n = 4 + Math.floor(rnd() * 3)
  let x = -n * 0.55
  for (let i = 0; i < n; i++) {
    const edge = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)
    const r = 1.25 - edge * 0.5 + rnd() * 0.25
    kit.blob(r, {
      color: palette.cloudShade,
      top: palette.cloud,
      at: [x, r * 0.55, (rnd() - 0.5) * 0.7],
      scale: [1.15, 0.78, 1],
      shade: 0.05,
      detail: 2,
    })
    x += r * 0.95
  }
  // flat-ish base puff
  kit.blob(1.0, { color: palette.cloudShade, top: palette.cloud, at: [0, 0.35, 0], scale: [n * 0.62, 0.42, 1.05], shade: 0.04 })
  const g = kit.build('cloud')
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = false
    }
  })
  return g
}

interface CloudSpec {
  u: number
  v: number
  y: number
  scale: number
  speed: number
  seed: number
}

/** Puffy low-poly clouds that drift across the sea and drop soft shadows on the island. */
export function Clouds() {
  const group = useRef<THREE.Group>(null)
  const specs = useMemo<CloudSpec[]>(() => {
    const rnd = seeded(77)
    const list: CloudSpec[] = []
    for (let i = 0; i < 7; i++) {
      list.push({
        u: -60 + rnd() * 120,
        // rows are kept clear of the base so clouds never hide buildings
        v: i < 5 ? 15 + i * 7 + rnd() * 4 : -62 - (i - 5) * 9,
        y: 13 + rnd() * 5,
        scale: 0.85 + rnd() * 0.7,
        speed: 0.35 + rnd() * 0.3,
        seed: 100 + i * 13,
      })
    }
    return list
  }, [])
  const clouds = useMemo(() => specs.map((s) => makeCloud(s.seed)), [specs])

  useFrame((_, dt) => {
    specs.forEach((s, i) => {
      s.u += s.speed * dt
      if (s.u > 62) s.u = -62
      const c = clouds[i]
      c.position.set(RIGHT.x * s.u + FWD.x * s.v, s.y, RIGHT.y * s.u + FWD.y * s.v)
    })
  })

  return (
    <group ref={group} name="clouds">
      {clouds.map((c, i) => (
        <primitive key={i} object={c} scale={specs[i].scale} rotation-y={Math.atan2(-RIGHT.y, RIGHT.x)} />
      ))}
    </group>
  )
}
