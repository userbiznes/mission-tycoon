import { create } from 'zustand'
import type { RocketKind } from '../art/models/rocket'

/**
 * Launch sequence state.
 *
 * `flight` is a plain mutable object updated every frame by the 3D scene
 * (the single clock for the cinematic); the zustand store only carries the
 * things React needs to re-render for: phase changes, verdicts and the result.
 */

export type LaunchPhase = 'idle' | 'countdown' | 'hold' | 'ascent' | 'staging' | 'coast' | 'insert' | 'orbit' | 'done'

/** Where the sweet spot sits on each timing gauge (0–1) and how wide it is. */
export const GAUGE = {
  hold: { center: 0.84, half: 0.085 },
  staging: { center: 0.66, half: 0.085 },
  coast: { center: 0.8, half: 0.075 },
}

export const flight = {
  phase: 'idle' as LaunchPhase,
  /** seconds spent in the current phase */
  t: 0,
  /** marker position on the current gauge, 0–1 */
  gauge: 0,
  /** direction of travel of the hold gauge (it ping-pongs) */
  gaugeDir: 1,
  holding: false,
  heldFor: 0,
  /** rocket height above the pad, scene units */
  y: 0,
  vy: 0,
  /** gravity-turn lean, radians */
  tilt: 0,
  staged: false,
  /** exhaust strength, 0–1 */
  engine: 0,
  /** how far into space we are, 0–1 (darkens the sky, brings out the stars) */
  space: 0,
  /** readouts */
  altKm: 0,
  speedKms: 0,
  scores: [0, 0, 0],
  autopilot: false,
  /** crew launch skill widens the timing windows */
  windowScale: 1,
  /** target orbit altitude for the readout */
  orbitKm: 400,
  /** taps and releases queued by the UI, consumed by the scene */
  tapQueued: false,
  releaseQueued: false,
}

/** Score a timing input: 1 inside the green band, falling to 0.15 well outside. */
export function scoreTiming(x: number, center: number, half: number): number {
  const d = Math.abs(x - center)
  if (d <= half) return 1
  const over = (d - half) / (half * 3)
  return Math.max(0.15, 1 - over)
}

export function verdictFor(score: number): string {
  if (score >= 0.99) return 'Perfect!'
  if (score >= 0.7) return 'Good'
  if (score >= 0.4) return 'A bit off'
  return 'Sloppy'
}

/** Overall flight quality 0–1; autopilot flies a steady 0.8. */
export const AUTOPILOT_QUALITY = 0.8
export function flightQuality(scores: number[]): number {
  return scores[0] * 0.3 + scores[1] * 0.35 + scores[2] * 0.35
}

interface LaunchStore {
  active: boolean
  phase: LaunchPhase
  kind: RocketKind
  count: number
  autopilot: boolean
  verdicts: (string | null)[]
  quality: number | null
  /** bumped to rebuild the rocket on the pad after a flight */
  rocketSerial: number
  onDone: ((quality: number) => void) | null
  start: (opts: { kind: RocketKind; orbitKm: number; windowScale?: number; onDone: (quality: number) => void }) => void
  setPhase: (phase: LaunchPhase) => void
  setCount: (n: number) => void
  setVerdict: (i: number, v: string) => void
  setAutopilot: (on: boolean) => void
  finish: () => void
  reset: () => void
  setKind: (kind: RocketKind) => void
}

export const useLaunch = create<LaunchStore>((set, get) => ({
  active: false,
  phase: 'idle',
  kind: 'rideshare',
  count: 3,
  autopilot: false,
  verdicts: [null, null, null],
  quality: null,
  rocketSerial: 0,
  onDone: null,
  start: ({ kind, orbitKm, windowScale = 1, onDone }) => {
    Object.assign(flight, {
      phase: 'countdown',
      t: 0,
      gauge: 0,
      gaugeDir: 1,
      holding: false,
      heldFor: 0,
      y: 0,
      vy: 0,
      tilt: 0,
      staged: false,
      engine: 0,
      space: 0,
      altKm: 0,
      speedKms: 0,
      scores: [0, 0, 0],
      autopilot: get().autopilot,
      windowScale,
      orbitKm,
      tapQueued: false,
      releaseQueued: false,
    })
    set({ active: true, phase: 'countdown', kind, count: 3, verdicts: [null, null, null], quality: null, onDone })
  },
  setPhase: (phase) => {
    flight.phase = phase
    flight.t = 0
    set({ phase })
  },
  setCount: (count) => set({ count }),
  setVerdict: (i, v) => {
    const verdicts = [...get().verdicts]
    verdicts[i] = v
    set({ verdicts })
  },
  setAutopilot: (on) => {
    flight.autopilot = on
    set({ autopilot: on })
  },
  finish: () => {
    const quality = flight.autopilot ? AUTOPILOT_QUALITY : flightQuality(flight.scores)
    set({ quality, phase: 'done' })
    flight.phase = 'done'
    get().onDone?.(quality)
  },
  reset: () => {
    flight.phase = 'idle'
    flight.y = 0
    flight.vy = 0
    flight.tilt = 0
    flight.engine = 0
    flight.space = 0
    flight.staged = false
    set({ active: false, phase: 'idle', quality: null, onDone: null, rocketSerial: get().rocketSerial + 1 })
  },
  setKind: (kind) => set({ kind, rocketSerial: get().rocketSerial + 1 }),
}))
