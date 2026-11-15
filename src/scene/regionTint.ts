import * as THREE from 'three'
import { regionWeights } from './relief'
import { ISLAND_U, ISLAND_V } from './world'

/**
 * "Not yours yet": everything inside a locked region is drawn a little muted
 * and cooler, and brightens as the region is reclaimed. One shader patch,
 * shared by the terrain and the model materials, looks the region up from a
 * small baked map by world position, so trees, rocks, ruins and grass all
 * change together.
 */

const RECT = { u0: -44, v0: -64, w: 88, h: 128 }

function bakeMap(): THREE.DataTexture {
  const W = 176
  const H = 256
  const data = new Uint8Array(W * H * 4)
  for (let j = 0; j < H; j++) {
    const v = RECT.v0 + ((j + 0.5) / H) * RECT.h
    for (let i = 0; i < W; i++) {
      const u = RECT.u0 + ((i + 0.5) / W) * RECT.w
      const [a, b, c] = regionWeights(u, v)
      const k = (j * W + i) * 4
      data[k] = Math.round(a * 255)
      data[k + 1] = Math.round(b * 255)
      data[k + 2] = Math.round(c * 255)
      data[k + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

/** Shared uniforms: `uRegionMute` is how muted each region is right now (tracking, annex, heavy), 0–1. */
export const regionTint = {
  uRegionMap: { value: bakeMap() },
  uRegionRect: { value: new THREE.Vector4(RECT.u0, RECT.v0, RECT.w, RECT.h) },
  uRegionU: { value: ISLAND_U.clone() },
  uRegionV: { value: ISLAND_V.clone() },
  uRegionMute: { value: new THREE.Vector3(1, 1, 1) },
  /** 1 in the island scene; small preview canvases switch it off */
  uRegionOn: { value: 1 },
}

/** Add the region tint to a standard material's shader (call from onBeforeCompile). */
export function patchRegionTint(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }): void {
  Object.assign(shader.uniforms, regionTint)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vRegionP;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        vec4 rtp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          rtp = instanceMatrix * rtp;
        #endif
        vRegionP = (modelMatrix * rtp).xz;
      }`,
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying vec2 vRegionP;
      uniform sampler2D uRegionMap;
      uniform vec4 uRegionRect;
      uniform vec2 uRegionU;
      uniform vec2 uRegionV;
      uniform vec3 uRegionMute;
      uniform float uRegionOn;`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        vec2 rst = (vec2(dot(vRegionP, uRegionU), dot(vRegionP, uRegionV)) - uRegionRect.xy) / uRegionRect.zw;
        float mute = dot(texture2D(uRegionMap, rst).rgb, uRegionMute) * uRegionOn;
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        vec3 hushed = mix(vec3(lum), diffuseColor.rgb, 0.52) * vec3(0.8, 0.93, 1.0) * 0.86;
        diffuseColor.rgb = mix(diffuseColor.rgb, hushed, mute);
      }`,
    )
}
