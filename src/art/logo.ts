import * as THREE from 'three'
import { palette } from './palette'

/**
 * Agency logo: a shape, an icon and two colours. One definition drives both the
 * HTML UI (SVG layers) and the 3D world (a canvas texture on signs, flags and rockets).
 * All artwork is original and deliberately simple; nothing here resembles a real agency's insignia.
 */

export type LogoShape = 'circle' | 'shield' | 'hexagon' | 'star'
export type LogoIcon = 'rocket' | 'satellite' | 'planet' | 'star' | 'orbit' | 'comet'

export interface LogoSpec {
  shape: LogoShape
  icon: LogoIcon
  /** background colour */
  colorA: string
  /** icon colour */
  colorB: string
}

export const LOGO_SHAPES: LogoShape[] = ['circle', 'shield', 'hexagon', 'star']
export const LOGO_ICONS: LogoIcon[] = ['rocket', 'satellite', 'planet', 'star', 'orbit', 'comet']
export const LOGO_COLORS: string[] = [
  palette.red,
  palette.orange,
  palette.yellow,
  palette.green,
  palette.teal,
  palette.blue,
  palette.navy,
  palette.purple,
  palette.pink,
  palette.cream,
]

export const DEFAULT_LOGO: LogoSpec = { shape: 'shield', icon: 'rocket', colorA: palette.teal, colorB: palette.cream }

/** One drawable layer in a 100×100 box. */
export interface LogoLayer {
  d: string
  fill?: string
  stroke?: string
  width?: number
  opacity?: number
  /** rotation in degrees and uniform scale, both about the centre (50, 50) */
  rotate?: number
  scale?: number
  /** vertical nudge towards the visual centre of the shape */
  shiftY?: number
}

const SHAPES: Record<LogoShape, string> = {
  circle: 'M50 5 A45 45 0 1 1 49.99 5 Z',
  shield: 'M50 5 L89 16 V50 C89 73 72 89 50 96 C28 89 11 73 11 50 V16 Z',
  hexagon: 'M50 4 L90 27 V73 L50 96 L10 73 V27 Z',
  star: 'M50 3 L63.5 31.5 L95 36 L72 58 L77.500 89.500 L50 74.500 L22.500 89.500 L28 58 L5 36 L36.500 31.500 Z',
}

/** How much the icon shrinks to sit comfortably inside each shape. */
const ICON_SCALE: Record<LogoShape, number> = { circle: 1, shield: 0.92, hexagon: 0.95, star: 0.6 }

function iconLayers(icon: LogoIcon, a: string, b: string): LogoLayer[] {
  switch (icon) {
    case 'rocket':
      return [
        { d: 'M38 52 L26 70 L40 65 Z M62 52 L74 70 L60 65 Z', fill: b, rotate: 40 },
        { d: 'M50 18 C62 27 66 44 63 64 L37 64 C34 44 38 27 50 18 Z', fill: b, rotate: 40 },
        { d: 'M43 68 L57 68 L50 82 Z', fill: b, opacity: 0.8, rotate: 40 },
        { d: 'M50 35 A6.5 6.5 0 1 1 49.99 35 Z', fill: a, rotate: 40 },
      ]
    case 'satellite':
      return [
        { d: 'M14 43 h24 v14 h-24 Z M62 43 h24 v14 h-24 Z', fill: b, rotate: -32 },
        { d: 'M26 43 v14 M74 43 v14', stroke: a, width: 2.5, rotate: -32 },
        { d: 'M40 36 h20 v28 h-20 Z', fill: b, rotate: -32 },
        { d: 'M50 36 V25', stroke: b, width: 3.5, rotate: -32 },
        { d: 'M50 19 A4.5 4.5 0 1 1 49.99 19 Z', fill: b, rotate: -32 },
        { d: 'M45 46 h10 v8 h-10 Z', fill: a, rotate: -32 },
      ]
    case 'planet':
      return [
        { d: 'M50 32 A18 18 0 1 1 49.99 32 Z', fill: b },
        { d: 'M18 50 a32 9.500 0 1 0 64 0 a32 9.500 0 1 0 -64 0', stroke: b, width: 5, rotate: -22 },
        { d: 'M39 44 a11 11 0 0 1 11 -7', stroke: a, width: 3, opacity: 0.6 },
      ]
    case 'star':
      return [
        {
          d: 'M50 18 C53 38 62 47 82 50 C62 53 53 62 50 82 C47 62 38 53 18 50 C38 47 47 38 50 18 Z',
          fill: b,
        },
        {
          d: 'M74 20 C75 26 77 28 83 29 C77 30 75 32 74 38 C73 32 71 30 65 29 C71 28 73 26 74 20 Z',
          fill: b,
          opacity: 0.85,
        },
      ]
    case 'orbit':
      return [
        { d: 'M50 40 A10 10 0 1 1 49.99 40 Z', fill: b },
        { d: 'M19 50 a31 13 0 1 0 62 0 a31 13 0 1 0 -62 0', stroke: b, width: 4.5, rotate: -32 },
        { d: 'M77 28 A5.500 5.500 0 1 1 76.990 28 Z', fill: b },
      ]
    case 'comet':
      return [
        { d: 'M56 30 C42 38 28 54 18 80 C40 70 58 62 74 48 Z', fill: b, opacity: 0.75 },
        { d: 'M64 26 A13 13 0 1 1 63.990 26 Z', fill: b },
        { d: 'M58 36 a7 7 0 0 1 7 -5', stroke: a, width: 3, opacity: 0.6 },
      ]
  }
}

/** All layers of a logo, back to front. */
export function logoLayers(spec: LogoSpec): LogoLayer[] {
  const s = ICON_SCALE[spec.shape]
  const yShift = spec.shape === 'star' ? 4 : spec.shape === 'shield' ? -2 : 0
  return [
    { d: SHAPES[spec.shape], fill: spec.colorA, stroke: palette.ink, width: 5 },
    // soft top-left sheen
    { d: 'M24 34 C30 20 44 14 58 15', stroke: palette.white, width: 4, opacity: 0.28 },
    ...iconLayers(spec.icon, spec.colorA, spec.colorB).map((l) => ({ ...l, scale: s, shiftY: yShift })),
  ]
}

/** SVG transform string for a layer. */
export function layerTransform(l: LogoLayer): string | undefined {
  const parts: string[] = []
  if (l.shiftY) parts.push(`translate(0 ${l.shiftY})`)
  if (l.scale && l.scale !== 1) parts.push(`translate(50 50) scale(${l.scale}) translate(-50 -50)`)
  if (l.rotate) parts.push(`rotate(${l.rotate} 50 50)`)
  return parts.length ? parts.join(' ') : undefined
}

export function drawLogo(ctx: CanvasRenderingContext2D, spec: LogoSpec, size: number): void {
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.scale(size / 100, size / 100)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const layer of logoLayers(spec)) {
    ctx.save()
    ctx.globalAlpha = layer.opacity ?? 1
    if (layer.shiftY) ctx.translate(0, layer.shiftY)
    if (layer.scale && layer.scale !== 1) {
      ctx.translate(50, 50)
      ctx.scale(layer.scale, layer.scale)
      ctx.translate(-50, -50)
    }
    if (layer.rotate) {
      ctx.translate(50, 50)
      ctx.rotate((layer.rotate * Math.PI) / 180)
      ctx.translate(-50, -50)
    }
    const path = new Path2D(layer.d)
    if (layer.fill) {
      ctx.fillStyle = layer.fill
      ctx.fill(path)
    }
    if (layer.stroke) {
      ctx.strokeStyle = layer.stroke
      ctx.lineWidth = layer.width ?? 2
      ctx.stroke(path)
    }
    ctx.restore()
  }
  ctx.restore()
}

export function randomLogo(rnd: () => number = Math.random): LogoSpec {
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)]
  const colorA = pick(LOGO_COLORS)
  let colorB = pick(LOGO_COLORS)
  while (colorB === colorA) colorB = pick(LOGO_COLORS)
  return { shape: pick(LOGO_SHAPES), icon: pick(LOGO_ICONS), colorA, colorB }
}

// ------------------------------------------------------------------ 3D side
const TEX_SIZE = 256
let canvas: HTMLCanvasElement | null = null
let texture: THREE.CanvasTexture | null = null
let material: THREE.MeshStandardMaterial | null = null
let current: LogoSpec = DEFAULT_LOGO

function ensure(): THREE.MeshStandardMaterial {
  if (!material) {
    canvas = document.createElement('canvas')
    canvas.width = canvas.height = TEX_SIZE
    drawLogo(canvas.getContext('2d')!, current, TEX_SIZE)
    texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: false,
      alphaTest: 0.5,
      roughness: 0.75,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  }
  return material
}

/** Change the logo shown everywhere in the 3D world. */
export function setAgencyLogo(spec: LogoSpec): void {
  current = spec
  if (!material) return
  drawLogo(canvas!.getContext('2d')!, spec, TEX_SIZE)
  texture!.needsUpdate = true
}

export function getAgencyLogo(): LogoSpec {
  return current
}

/**
 * A flat square showing the agency logo, facing +Z. Models add it to signs,
 * flags and hulls; it always shows the player's current logo.
 */
export function logoPlate(size: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ensure())
  mesh.name = 'logo'
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

/**
 * The logo wrapped onto a cylinder of the given radius (for rocket hulls and tanks),
 * centred on +Z. `size` is the logo's width and height on the surface.
 */
export function logoDecal(radius: number, size: number): THREE.Mesh {
  const arc = size / radius
  const geo = new THREE.CylinderGeometry(radius, radius, size, 10, 1, true, -arc / 2, arc)
  const mesh = new THREE.Mesh(geo, ensure())
  mesh.name = 'logo'
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}
