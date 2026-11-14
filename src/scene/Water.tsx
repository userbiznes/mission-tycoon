import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { palette } from '../art/palette'
import { FWD, RIGHT, SDF_REGION, WATER_Y, coastUv } from './world'

/** Bake the coast distance into a texture so the water shader can draw foam and shallows. */
function bakeCoastTexture(): THREE.DataTexture {
  const W = 256
  const H = 320
  const data = new Uint16Array(W * H)
  for (let j = 0; j < H; j++) {
    const v = SDF_REGION.v0 + ((j + 0.5) / H) * SDF_REGION.h
    for (let i = 0; i < W; i++) {
      const u = SDF_REGION.u0 + ((i + 0.5) / W) * SDF_REGION.w
      data[j * W + i] = THREE.DataUtils.toHalfFloat(Math.max(-8, Math.min(60, coastUv(u, v))))
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.HalfFloatType)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uCoast;
  uniform vec4 uRegion;
  uniform vec2 uRight;
  uniform vec2 uFwd;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uShallow;
  uniform vec3 uLagoon;
  uniform vec3 uFoam;
  uniform vec3 uHorizon;
  varying vec3 vWorld;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 p = vWorld.xz;
    vec2 uv = vec2(dot(p, uRight), dot(p, uFwd));
    vec2 st = (uv - uRegion.xy) / uRegion.zw;
    float inside = step(0.0, st.x) * step(st.x, 1.0) * step(0.0, st.y) * step(st.y, 1.0);
    float d = mix(40.0, texture2D(uCoast, clamp(st, 0.0, 1.0)).r, inside);

    float t = uTime;
    float n = noise(p * 0.55 + vec2(t * 0.12, -t * 0.09));
    float n2 = noise(p * 1.6 - vec2(t * 0.2, t * 0.14));

    // depth colour: lagoon → shallow → mid → deep
    float dd = d + (n - 0.5) * 1.2;
    vec3 col = mix(uLagoon, uShallow, smoothstep(0.1, 2.2, dd));
    col = mix(col, uMid, smoothstep(1.8, 7.5, dd));
    col = mix(col, uDeep, smoothstep(7.0, 26.0, dd));

    // soft drifting light patches
    float patches = noise(p * 0.16 + vec2(t * 0.05, t * 0.03));
    col *= 0.94 + 0.12 * patches;

    // little stylised wave glints, gathered in loose drifting clusters
    float g = noise(vec2(p.x * 0.7 + t * 0.22, p.y * 2.3 - t * 0.08));
    float g2 = noise(vec2(p.x * 0.9 - t * 0.16, p.y * 2.9 + t * 0.06) + 31.7);
    float cluster = smoothstep(0.42, 0.75, noise(p * 0.11 + vec2(-t * 0.03, t * 0.02) + 7.3));
    float glint = smoothstep(0.75, 0.8, g * 0.58 + g2 * 0.5) * cluster;
    col = mix(col, uFoam, glint * 0.2 * smoothstep(2.0, 6.0, d));

    // shore foam: a solid lip that breathes in and out, plus bands rolling in
    float breathe = 0.22 + 0.16 * sin(t * 1.1 + p.x * 0.35 + p.y * 0.27);
    float lip = 1.0 - smoothstep(breathe, breathe + 0.14, d + (n2 - 0.5) * 0.32);
    float wave = sin((d + (n - 0.5) * 1.1) * 2.6 + t * 1.25);
    float bands = smoothstep(0.78, 0.9, wave) * (1.0 - smoothstep(0.7, 3.3, d)) * smoothstep(0.1, 0.5, d);
    bands *= 0.55 + 0.45 * n2;
    float foam = clamp(max(lip, bands * 0.85), 0.0, 1.0);
    col = mix(col, uFoam, foam);

    // fade to the horizon far away so the sea melts into the sky
    float far = smoothstep(90.0, 330.0, length(p));
    col = mix(col, uHorizon, far);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Water() {
  const ref = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCoast: { value: bakeCoastTexture() },
      uRegion: { value: new THREE.Vector4(SDF_REGION.u0, SDF_REGION.v0, SDF_REGION.w, SDF_REGION.h) },
      uRight: { value: RIGHT.clone() },
      uFwd: { value: FWD.clone() },
      uDeep: { value: new THREE.Color(palette.oceanDeep) },
      uMid: { value: new THREE.Color(palette.oceanMid) },
      uShallow: { value: new THREE.Color(palette.oceanShallow) },
      uLagoon: { value: new THREE.Color(palette.oceanLagoon) },
      uFoam: { value: new THREE.Color(palette.foam) },
      uHorizon: { value: new THREE.Color(palette.skyHorizon) },
    }),
    [],
  )
  useFrame((_, dt) => {
    if (ref.current) ref.current.uniforms.uTime.value += dt
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={WATER_Y} name="water">
      <planeGeometry args={[1400, 1400, 1, 1]} />
      <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  )
}
