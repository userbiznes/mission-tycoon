import * as THREE from 'three'
import { palette } from '../art/palette'
import { seeded } from '../art/kit'
import { STATION_AT, earthTexture, onGlobe } from './earth'

/**
 * What the rocket flies over once it is above the clouds: the stylized planet
 * with a thin line of atmosphere, the launch site as a dot on it, the dotted
 * flight path with its highest point marked, and the orbit drawn as a circle.
 *
 * Everything in `planet` is in planet units (radius 1); the launch scene sets
 * its scale and position every frame, so the same objects serve the close view
 * just above the clouds and the pulled-back view of the whole globe.
 */

const PATH_DOTS = 40
const RING_DOTS = 132

const atmoVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmoFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  uniform float uEdge;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // back faces of a shell just bigger than the planet: brightest where the shell meets the planet's edge
    float d = -dot(normalize(vNormal), normalize(vView));
    float k = smoothstep(0.0, uEdge, d) * (1.0 - smoothstep(uEdge, uEdge * 2.6, d));
    gl_FragColor = vec4(uColor * (0.25 + k * 1.5), k * uGlow);
  }
`

/** Soft white blobs with see-through gaps, wrapped around the planet a little above the ground. */
function cloudTexture(): THREE.CanvasTexture {
  const W = 2048
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const rnd = seeded(5150)
  for (let i = 0; i < 900; i++) {
    const lat = (rnd() - 0.5) * 150
    const x = rnd() * W
    const y = ((90 - lat) / 180) * H
    // wider near the poles so blobs stay round on the sphere
    const stretch = 1 / Math.max(0.25, Math.cos((lat * Math.PI) / 180))
    const r = (3 + rnd() * rnd() * 18) * (i % 11 === 0 ? 1.9 : 1)
    const a = 0.2 + rnd() * 0.4
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, r)
    grad.addColorStop(0, `rgba(255,255,255,${a})`)
    grad.addColorStop(0.6, `rgba(255,255,255,${a * 0.55})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    for (const dx of [-W, 0, W]) {
      g.save()
      g.translate(x + dx, y)
      g.scale(stretch * (1.3 + rnd() * 0.8), 1)
      g.beginPath()
      g.arc(0, 0, r, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

export interface SpaceStage {
  /** the planet: position = its centre, scale = its radius */
  planet: THREE.Group
  /** the ground and clouds; turned to slide the surface under the rocket */
  spin: THREE.Group
  /** dots along the path ahead, in world space */
  path: THREE.InstancedMesh
  /** the ring at the highest point of the path, in world space */
  apex: THREE.Mesh
  /** the satellite, on the orbit circle, in planet units */
  sat: THREE.Group
  setGlow: (k: number) => void
  /** place dot i of the path; a scale of 0 hides it */
  setPathDot: (i: number, p: THREE.Vector3 | null, size?: number) => void
  pathDots: number
  /** draw the orbit circle from its top round to `fraction` of a full turn, at `radius` planet units */
  setRing: (fraction: number, radius: number, dot?: number) => void
  dispose: () => void
}

/** `downrange` is the direction of flight and `up` the launch site's vertical, both in world space. */
export function createSpaceStage(up: THREE.Vector3, downrange: THREE.Vector3): SpaceStage {
  const planet = new THREE.Group()
  planet.name = 'planet'
  planet.visible = false
  const spin = new THREE.Group()
  planet.add(spin)

  // the launch site sits at the top of the planet when the flight begins
  // (a few degrees out to sea from the home dish, so the island is a dot of land in open water)
  const site = onGlobe(STATION_AT.home.lat - 5, STATION_AT.home.lon + 7).normalize()
  const turn = new THREE.Quaternion().setFromUnitVectors(site, up)
  // and the flight heads east from it, out over open water
  const lon = THREE.MathUtils.degToRad(STATION_AT.home.lon + 7 + 180)
  const east = new THREE.Vector3(Math.sin(lon), 0, Math.cos(lon)).applyQuaternion(turn).normalize()
  turn.premultiply(new THREE.Quaternion().setFromUnitVectors(east, downrange))

  const tex = earthTexture()
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 80), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }))
  earth.quaternion.copy(turn)
  earth.receiveShadow = false
  earth.castShadow = false
  spin.add(earth)

  const cloudTex = cloudTexture()
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.004, 96, 64),
    new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, roughness: 1, metalness: 0, emissive: new THREE.Color(palette.white), emissiveIntensity: 0.18 }),
  )
  clouds.quaternion.copy(turn)
  clouds.renderOrder = 1
  spin.add(clouds)

  // home: the island as a dot of sand and green
  const dot = new THREE.Group()
  const sand = new THREE.Mesh(new THREE.CircleGeometry(0.02, 28), new THREE.MeshStandardMaterial({ color: palette.sand, roughness: 1 }))
  const green = new THREE.Mesh(new THREE.CircleGeometry(0.0155, 28), new THREE.MeshStandardMaterial({ color: palette.grass, roughness: 1 }))
  sand.rotation.x = -Math.PI / 2
  green.rotation.x = -Math.PI / 2
  sand.position.y = 1.0012
  green.position.y = 1.0018
  dot.add(sand, green)
  dot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
  spin.add(dot)

  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#7fd0ff') }, uGlow: { value: 0 }, uEdge: { value: 0.2 } },
    vertexShader: atmoVert,
    fragmentShader: atmoFrag,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.03, 96, 64), atmoMat)
  atmo.renderOrder = 2
  planet.add(atmo)

  // the orbit, drawn as dots round the planet in the plane of flight
  const dotGeo = new THREE.SphereGeometry(1, 8, 6)
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.lampHot).multiplyScalar(1.5), toneMapped: false })
  const ring = new THREE.InstancedMesh(dotGeo, ringMat, RING_DOTS)
  ring.frustumCulled = false
  planet.add(ring)
  const m = new THREE.Matrix4()
  const p = new THREE.Vector3()
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3()
  const setRing = (fraction: number, radius: number, dot = 0.0075) => {
    const size = dot * radius
    for (let i = 0; i < RING_DOTS; i++) {
      const on = i / RING_DOTS <= fraction
      const a = (i / RING_DOTS) * Math.PI * 2
      p.copy(up).multiplyScalar(Math.cos(a) * radius).addScaledVector(downrange, Math.sin(a) * radius)
      sc.setScalar(on ? size : 0.00001)
      ring.setMatrixAt(i, m.compose(p, q, sc))
    }
    ring.instanceMatrix.needsUpdate = true
    ring.visible = fraction > 0
  }
  setRing(0, 1.16)

  // the satellite: the same yellow box and blue wings as in operations
  const sat = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.09), new THREE.MeshStandardMaterial({ color: palette.yellow, roughness: 0.5 }))
  sat.add(body)
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.05), new THREE.MeshStandardMaterial({ color: palette.blue, roughness: 0.3 }))
    wing.position.x = sx * 0.075
    sat.add(wing)
  }
  sat.visible = false
  planet.add(sat)

  // the path ahead (world space, placed every frame)
  const pathMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.cream).multiplyScalar(1.5), toneMapped: false })
  const path = new THREE.InstancedMesh(dotGeo, pathMat, PATH_DOTS)
  path.frustumCulled = false
  path.visible = false
  const setPathDot = (i: number, at: THREE.Vector3 | null, size = 0.9) => {
    sc.setScalar(at ? size : 0.00001)
    path.setMatrixAt(i, m.compose(at ?? p.set(0, -9999, 0), q, sc))
    path.instanceMatrix.needsUpdate = true
  }
  for (let i = 0; i < PATH_DOTS; i++) setPathDot(i, null)

  const apex = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.55, 8, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.green).multiplyScalar(1.5), toneMapped: false }),
  )
  apex.visible = false

  return {
    planet,
    spin,
    path,
    apex,
    sat,
    pathDots: PATH_DOTS,
    setGlow: (k) => {
      atmoMat.uniforms.uGlow.value = k
    },
    setPathDot,
    setRing,
    dispose: () => {
      tex.dispose()
      cloudTex.dispose()
      dotGeo.dispose()
      planet.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          ;(mesh.material as THREE.Material).dispose()
        }
      })
      apex.geometry.dispose()
      ;(apex.material as THREE.Material).dispose()
      pathMat.dispose()
    },
  }
}
