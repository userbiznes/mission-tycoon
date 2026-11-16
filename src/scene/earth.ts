import * as THREE from 'three'
import { palette } from '../art/palette'
import type { OrbitId, StationId } from '../data/types'

/**
 * The stylized Earth shared by the launch (the planet under the rocket), the
 * launch board preview and mission operations: procedural continents (no imagery),
 * where the ground stations sit, and how each orbit is drawn.
 */

/** Land spans [lonStart, lonEnd] for each 10° latitude band, from 85°N down to 85°S. */
export const LAND: [number, number][][] = [
  [[-72, -22]],
  [[-125, -75], [-60, -20], [80, 115]],
  [[-165, -62], [-52, -35], [-23, -14], [5, 180]],
  [[-130, -58], [-10, 0], [5, 140], [155, 163]],
  [[-124, -62], [-5, 140]],
  [[-122, -76], [-8, 10], [27, 120], [126, 129], [132, 140]],
  [[-112, -97], [-15, 58], [62, 120]],
  [[-97, -83], [-17, 40], [43, 52], [74, 81], [97, 109], [120, 124]],
  [[-77, -52], [-8, 46], [97, 104], [110, 118]],
  [[-80, -36], [12, 40], [102, 112], [132, 150]],
  [[-75, -39], [12, 40], [46, 50], [125, 145]],
  [[-70, -48], [15, 33], [44, 47], [114, 153]],
  [[-72, -57], [18, 27], [116, 120], [135, 150], [173, 177]],
  [[-74, -66], [168, 172]],
  [[-70, -66]],
  [[-65, -60], [50, 140]],
  [[-140, -60], [-15, 165]],
  [[-180, 180]],
]

/** Dry belts, drawn sandy: [latBand, lonStart, lonEnd]. */
const DESERT: [number, number, number][] = [
  [6, -14, 56],
  [5, 40, 62],
  [11, 120, 140],
  [5, -116, -104],
  [4, 60, 105],
]

export function earthTexture(): THREE.CanvasTexture {
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const sea = g.createLinearGradient(0, 0, 0, H)
  sea.addColorStop(0, palette.blueDark)
  sea.addColorStop(0.5, palette.oceanMid)
  sea.addColorStop(1, palette.blueDark)
  g.fillStyle = sea
  g.fillRect(0, 0, W, H)
  const px = (lon: number) => ((lon + 180) / 360) * W
  const py = (lat: number) => ((90 - lat) / 180) * H
  const blob = (lon: number, lat: number, r: number) => {
    g.beginPath()
    g.ellipse(px(lon), py(lat), (r / 360) * W, (r / 180) * H, 0, 0, Math.PI * 2)
    g.fill()
  }
  const paint = (color: string, grow: number, pick?: (band: number) => boolean) => {
    g.fillStyle = color
    LAND.forEach((spans, band) => {
      if (pick && !pick(band)) return
      const lat = 85 - band * 10
      for (const [a, b] of spans) {
        for (let lon = a; lon <= b; lon += 3) blob(lon, lat + Math.sin(lon * 0.21 + band) * 2.2, 6.4 + grow)
      }
    })
  }
  // shallow shelf, then land, then lighter highlights
  paint(palette.oceanShallow, 2.2)
  paint(palette.grassDeep, 0)
  paint(palette.grass, -1.6)
  g.fillStyle = palette.sand
  for (const [band, a, b] of DESERT) for (let lon = a; lon <= b; lon += 4) blob(lon, 85 - band * 10 + Math.sin(lon * 0.3) * 1.5, 4.6)
  // ice: Greenland, the far north and Antarctica
  paint(palette.white, -0.8, (band) => band <= 1 || band >= 15)
  g.fillStyle = palette.white
  g.fillRect(0, py(-82), W, H)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Where each ground station sits (real sites of the same kind). */
export const STATION_AT: Record<StationId, { lat: number; lon: number }> = {
  home: { lat: 28, lon: -80 },
  equator: { lat: -3, lon: 40 },
  north: { lat: 78, lon: 15 },
  south: { lat: -72, lon: 3 },
  deepSpace: { lat: 35, lon: -117 },
}

export const INCLINATION: Record<OrbitId, number> = { leo: 51.6, mid: 62, polar: 97, moon: 28, mars: 28 }
export const RADIUS: Record<OrbitId, number> = { leo: 1.13, mid: 1.2, polar: 1.22, moon: 1.3, mars: 1.3 }

export function onGlobe(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

/** Where each contract looks, for the glowing target region on the globe. */
export const TARGET_AT: Record<string, { lat: number; lon: number }> = {
  firstLight: { lat: 24, lon: -70 },
  fireWatch: { lat: 58, lon: -105 },
  stormChaser: { lat: 14, lon: -45 },
  moonIce: { lat: -78, lon: 20 },
  marsWeather: { lat: 12, lon: 60 },
}
