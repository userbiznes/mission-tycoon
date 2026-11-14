import { useSettings } from '../state/settings'

/**
 * Tiny synthesized sound effects (Web Audio, no files).
 * Every tap gets a little blip; rewards get a rising chime.
 */

type Sfx =
  | 'tap'
  | 'pop'
  | 'open'
  | 'close'
  | 'coin'
  | 'buy'
  | 'error'
  | 'success'
  | 'star'
  | 'snap'
  | 'whoosh'
  | 'talk'
  | 'build'
  | 'tick'
  | 'rumble'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): AudioContext | null {
  if (!useSettings.getState().sound) return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; to?: number; gain?: number; delay?: number; attack?: number } = {},
) {
  const ac = audio()
  if (!ac || !master) return
  const t0 = ac.currentTime + (opts.delay ?? 0)
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur)
  const peak = opts.gain ?? 0.25
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.008))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(dur: number, opts: { gain?: number; from?: number; to?: number; delay?: number; q?: number } = {}) {
  const ac = audio()
  if (!ac || !master) return
  const t0 = ac.currentTime + (opts.delay ?? 0)
  const len = Math.max(1, Math.floor(ac.sampleRate * dur))
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = opts.q ?? 0.8
  filter.frequency.setValueAtTime(opts.from ?? 800, t0)
  filter.frequency.exponentialRampToValueAtTime(opts.to ?? 300, t0 + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + Math.min(0.05, dur * 0.3))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

export function sfx(name: Sfx): void {
  switch (name) {
    case 'tap':
      tone(620, 0.07, { type: 'triangle', to: 880, gain: 0.16 })
      break
    case 'pop':
      tone(360, 0.12, { type: 'sine', to: 940, gain: 0.24 })
      break
    case 'open':
      tone(420, 0.14, { type: 'triangle', to: 760, gain: 0.16 })
      noise(0.12, { gain: 0.05, from: 600, to: 1800 })
      break
    case 'close':
      tone(700, 0.11, { type: 'triangle', to: 380, gain: 0.14 })
      break
    case 'coin':
      tone(1245, 0.07, { type: 'square', gain: 0.09 })
      tone(1660, 0.16, { type: 'square', gain: 0.09, delay: 0.06 })
      break
    case 'buy':
      tone(520, 0.08, { type: 'triangle', gain: 0.18 })
      tone(780, 0.1, { type: 'triangle', gain: 0.18, delay: 0.07 })
      tone(1040, 0.16, { type: 'triangle', gain: 0.16, delay: 0.14 })
      break
    case 'error':
      tone(240, 0.14, { type: 'sawtooth', to: 170, gain: 0.12 })
      tone(190, 0.18, { type: 'sawtooth', to: 130, gain: 0.12, delay: 0.1 })
      break
    case 'success':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.18, delay: i * 0.09 }))
      break
    case 'star':
      tone(880, 0.1, { type: 'triangle', gain: 0.2 })
      tone(1320, 0.3, { type: 'sine', gain: 0.2, delay: 0.08 })
      break
    case 'snap':
      noise(0.05, { gain: 0.16, from: 2400, to: 900, q: 2 })
      tone(300, 0.09, { type: 'sine', to: 620, gain: 0.2, delay: 0.01 })
      break
    case 'whoosh':
      noise(0.4, { gain: 0.1, from: 300, to: 2200, q: 1.2 })
      break
    case 'talk':
      tone(300 + Math.random() * 120, 0.05, { type: 'square', gain: 0.045 })
      break
    case 'build':
      noise(0.08, { gain: 0.2, from: 1800, to: 500, q: 3 })
      tone(180, 0.1, { type: 'square', to: 120, gain: 0.1 })
      break
    case 'tick':
      tone(980, 0.035, { type: 'square', gain: 0.06 })
      break
    case 'rumble':
      noise(1.6, { gain: 0.35, from: 90, to: 60, q: 0.5 })
      break
  }
}

/** Long engine roar for the launch; returns a stop function. */
export function startRoar(): () => void {
  const ac = audio()
  if (!ac || !master) return () => {}
  const len = ac.sampleRate * 2
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    // brown-ish noise
    last = (last + (Math.random() * 2 - 1) * 0.08) * 0.985
    data[i] = last * 4
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.6)
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start()
  return () => {
    try {
      g.gain.cancelScheduledValues(ac.currentTime)
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2)
      src.stop(ac.currentTime + 1.3)
    } catch {
      /* already stopped */
    }
  }
}
