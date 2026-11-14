/**
 * Juice: tiny transient animations requested by game code and played by the
 * 3D scene. "pop" = squash-and-stretch entrance (0 → 1.15 → 0.95 → 1),
 * "wobble" = the jiggle a building does when tapped.
 */
type Kind = 'pop' | 'wobble'

interface Anim {
  kind: Kind
  start: number
}

const anims = new Map<string, Anim>()

export function juice(id: string, kind: Kind): void {
  anims.set(id, { kind, start: performance.now() })
}

const POP_MS = 620
const WOBBLE_MS = 520

/** Scale (x, y, z) and tilt for an object right now. Returns null when idle. */
export function sampleJuice(id: string, out: { sx: number; sy: number; rot: number }): boolean {
  const a = anims.get(id)
  if (!a) return false
  const t = performance.now() - a.start
  if (a.kind === 'pop') {
    const k = t / POP_MS
    if (k >= 1) {
      anims.delete(id)
      return false
    }
    // 0 → 1.15 → 0.95 → 1
    let s: number
    if (k < 0.45) s = 1.15 * easeOut(k / 0.45)
    else if (k < 0.72) s = 1.15 + (0.95 - 1.15) * ease((k - 0.45) / 0.27)
    else s = 0.95 + 0.05 * ease((k - 0.72) / 0.28)
    // stretch tall on the way up, squash wide when landing
    const stretch = k < 0.45 ? 1 + 0.12 * (1 - k / 0.45) : 1 - 0.06 * Math.sin(((k - 0.45) / 0.55) * Math.PI)
    out.sx = s / Math.sqrt(stretch)
    out.sy = s * stretch
    out.rot = 0
    return true
  }
  const k = t / WOBBLE_MS
  if (k >= 1) {
    anims.delete(id)
    return false
  }
  const decay = 1 - k
  const w = Math.sin(k * Math.PI * 4) * decay
  out.sx = 1 + w * 0.06
  out.sy = 1 - w * 0.07
  out.rot = Math.sin(k * Math.PI * 5) * decay * 0.035
  return true
}

function ease(x: number): number {
  return x * x * (3 - 2 * x)
}
function easeOut(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}
