import * as THREE from 'three'
import { palette } from './palette'

/**
 * Shared materials. Everything is vertex-coloured, so a handful of materials
 * covers the whole game: high roughness, near-zero metalness, plus a soft
 * sky-tinted rim so chunky shapes read like painted toys.
 */

export type MatKey = 'matte' | 'gloss' | 'metal' | 'glass' | 'glow' | 'glowSoft'

function withRim<T extends THREE.MeshStandardMaterial>(mat: T, strength: number): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: new THREE.Color(palette.hemiSky) }
    shader.uniforms.uRimStrength = { value: strength }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uRimColor;
        uniform float uRimStrength;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float rimDot = 1.0 - saturate(dot(normalize(vViewPosition), normal));
          vec3 worldN = inverseTransformDirection(normal, viewMatrix);
          float rim = pow(rimDot, 2.6) * (0.35 + 0.65 * saturate(worldN.y * 0.5 + 0.5));
          outgoingLight += uRimColor * rim * uRimStrength * (0.35 + 0.65 * diffuseColor.rgb);
        }
        #include <opaque_fragment>`,
      )
  }
  mat.customProgramCacheKey = () => `rim-${strength}`
  return mat
}

export const materials: Record<MatKey, THREE.Material> = {
  matte: withRim(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0,
    }),
    0.5,
  ),
  gloss: withRim(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0,
    }),
    0.6,
  ),
  metal: withRim(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.25,
    }),
    0.6,
  ),
  glass: withRim(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.1,
      emissive: new THREE.Color(palette.glassDark),
      emissiveIntensity: 0.25,
    }),
    0.9,
  ),
  // bright enough to trip the bloom threshold
  glow: new THREE.MeshBasicMaterial({
    vertexColors: true,
    color: new THREE.Color(2.6, 2.6, 2.6),
    toneMapped: false,
    fog: false,
  }),
  glowSoft: new THREE.MeshBasicMaterial({
    vertexColors: true,
    color: new THREE.Color(1.35, 1.35, 1.35),
    toneMapped: false,
    fog: false,
  }),
}

/** A fresh vertex-coloured matte material (for meshes that need their own uniforms). */
export function makeMatte(opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return withRim(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, ...opts }),
    0.45,
  )
}
