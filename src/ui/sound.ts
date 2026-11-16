import { useSettings } from '../state/settings'

/**
 * All of the game's sound, synthesized in Web Audio (no files):
 * soft sound effects, the launch, and a quiet generative piece of music.
 *
 *   effects ─► soft low-pass ─┐
 *                             ├─► compressor ─► soft clip ─► output ─► meter ─► speakers
 *   music ─► fade ─► duck ────┘
 *
 * Browsers keep audio locked until the player does something, so the context is
 * only ever created and woken inside a real gesture (any press or key), and a
 * sound asked for before that is dropped rather than queued.
 */

const SFX = ['tap', 'pop', 'open', 'close', 'coin', 'buy', 'error', 'success', 'star', 'snap', 'whoosh', 'talk', 'build', 'tick', 'rumble', 'clunk', 'chime', 'stamp', 'beep'] as const
type Sfx = (typeof SFX)[number]

// ------------------------------------------------------------------ levels (measured at the output, see window.__sound)
const OUT_LEVEL = 0.9
const MUSIC_LEVEL = 0.28
const FX_LEVEL = 0.7
const MUSIC_UNDER_ROAR = 0.22
const CLIP_DRIVE = 1.2

interface Bus {
  ac: AudioContext
  /** effects go in here */
  fx: GainNode
  /** music notes go in here; `fade` is the music switch, `duck` pulls it down under the launch */
  tune: GainNode
  echo: GainNode
  fade: GainNode
  duck: GainNode
  out: GainNode
  meter: AnalyserNode
  white: AudioBuffer
}

let bus: Bus | null = null
/** when a gesture last woke the context (performance.now) */
let woken = -1e9

function build(): Bus | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ac = new AC()

    // the master bus: a gentle compressor so stacked sounds don't jump, then a soft clip that can never pass full scale
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 14
    comp.ratio.value = 6
    comp.attack.value = 0.004
    comp.release.value = 0.22
    const clip = ac.createWaveShaper()
    const curve = new Float32Array(1025)
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 512) - 1) * CLIP_DRIVE) / CLIP_DRIVE
    clip.curve = curve
    const out = ac.createGain()
    out.gain.value = OUT_LEVEL
    const meter = ac.createAnalyser()
    meter.fftSize = 4096
    comp.connect(clip)
    clip.connect(out)
    out.connect(meter)
    meter.connect(ac.destination)

    // effects: one soft low-pass takes the edge off every top end
    const fx = ac.createGain()
    fx.gain.value = useSettings.getState().sound ? FX_LEVEL : 0
    const soft = ac.createBiquadFilter()
    soft.type = 'lowpass'
    soft.frequency.value = 6500
    soft.Q.value = 0.5
    fx.connect(soft)
    soft.connect(comp)

    // music: notes ─► (a soft echo) ─► fade ─► duck
    const tune = ac.createGain()
    const fade = ac.createGain()
    fade.gain.value = 0
    const duck = ac.createGain()
    const echo = ac.createGain()
    const delay = ac.createDelay(1.5)
    delay.delayTime.value = STEP * 1.5
    const back = ac.createGain()
    back.gain.value = 0.3
    const dull = ac.createBiquadFilter()
    dull.type = 'lowpass'
    dull.frequency.value = 1500
    const wet = ac.createGain()
    wet.gain.value = 0.4
    echo.connect(delay)
    delay.connect(dull)
    dull.connect(back)
    back.connect(delay)
    dull.connect(wet)
    wet.connect(tune)
    tune.connect(fade)
    fade.connect(duck)
    duck.connect(comp)

    const white = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const d = white.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

    return { ac, fx, tune, echo, fade, duck, out, meter, white }
  } catch {
    return null
  }
}

function wake(ac: AudioContext) {
  try {
    const p = ac.resume() as Promise<void> | undefined
    p?.catch?.(() => {})
  } catch {
    /* not allowed yet: the next gesture tries again */
  }
}

/** Every real gesture: make the context if there isn't one, wake it if it isn't running, and start the music. */
function unlock() {
  const s = useSettings.getState()
  if (!s.sound && !s.music) return
  if (!bus) bus = build()
  if (!bus) return
  if (bus.ac.state !== 'running' && !document.hidden) {
    woken = performance.now()
    wake(bus.ac)
  }
  syncMusic()
}

/** The bus, when a sound may be scheduled right now; otherwise the sound is dropped. */
function live(): Bus | null {
  if (typeof document === 'undefined' || document.hidden) return null
  if (!bus && navigator.userActivation?.isActive) unlock()
  if (!bus) return null
  // never queue onto a stopped clock (it would all play at once later); a context a gesture has just woken is about to run
  if (bus.ac.state === 'running' || performance.now() - woken < 1500) return bus
  return null
}

function audio(): Bus | null {
  return useSettings.getState().sound ? live() : null
}

// ------------------------------------------------------------------ building blocks
function tone(freq: number, dur: number, opts: { type?: OscillatorType; to?: number; gain?: number; delay?: number; attack?: number } = {}) {
  const b = audio()
  if (!b) return
  const { ac } = b
  const t0 = ac.currentTime + 0.004 + (opts.delay ?? 0)
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur)
  // a soft start (never a click), then a natural ring-off
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.2, t0 + Math.min(dur * 0.4, Math.max(0.008, opts.attack ?? 0.012)))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(b.fx)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

function noise(dur: number, opts: { gain?: number; from?: number; to?: number; delay?: number; q?: number } = {}) {
  const b = audio()
  if (!b) return
  const { ac } = b
  const t0 = ac.currentTime + 0.004 + (opts.delay ?? 0)
  const src = ac.createBufferSource()
  src.buffer = b.white
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = opts.q ?? 0.8
  filter.frequency.setValueAtTime(opts.from ?? 800, t0)
  filter.frequency.exponentialRampToValueAtTime(opts.to ?? 300, t0 + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.15, t0 + Math.min(0.06, Math.max(0.01, dur * 0.3)))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(b.fx)
  src.start(t0, Math.random() * Math.max(0, 1.9 - dur))
  src.stop(t0 + dur + 0.03)
}

// ------------------------------------------------------------------ sound effects: sines and triangles in the music's key (D), soft starts
let lastSfx = -1
let lastTalk = -1e9

export function sfx(name: Sfx): void {
  const at = performance.now()
  if (name !== 'talk') lastSfx = at
  switch (name) {
    case 'tap':
      tone(660, 0.09, { to: 880, gain: 0.2 })
      break
    case 'pop':
      tone(370, 0.13, { to: 740, gain: 0.24 })
      break
    case 'open':
      tone(440, 0.16, { to: 660, gain: 0.18, attack: 0.02 })
      noise(0.14, { gain: 0.035, from: 600, to: 1500 })
      break
    case 'close':
      tone(660, 0.14, { to: 440, gain: 0.16, attack: 0.015 })
      break
    case 'coin':
      tone(988, 0.1, { gain: 0.13 })
      tone(1319, 0.26, { gain: 0.13, delay: 0.07 })
      break
    case 'buy':
      tone(587, 0.1, { type: 'triangle', gain: 0.15 })
      tone(740, 0.12, { type: 'triangle', gain: 0.15, delay: 0.07 })
      tone(880, 0.22, { type: 'triangle', gain: 0.14, delay: 0.14 })
      break
    case 'error':
      // a soft "nope": two round notes stepping down
      tone(392, 0.12, { to: 349, gain: 0.2, attack: 0.02 })
      tone(294, 0.2, { to: 262, gain: 0.2, attack: 0.02, delay: 0.11 })
      break
    case 'success':
      ;[587, 740, 880, 1175].forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.14, delay: i * 0.09 }))
      break
    case 'star':
      tone(880, 0.14, { type: 'triangle', gain: 0.14 })
      tone(1319, 0.36, { gain: 0.14, delay: 0.08 })
      break
    case 'snap':
      noise(0.045, { gain: 0.07, from: 1800, to: 900, q: 1.5 })
      tone(330, 0.1, { to: 587, gain: 0.2 })
      break
    case 'whoosh':
      noise(0.42, { gain: 0.3, from: 300, to: 1700, q: 1.1 })
      break
    case 'talk': {
      // Rocco's typing: a very quiet murmur, never faster than about six a second
      if (at - lastTalk < 160) break
      lastTalk = at
      const f = 392 + Math.random() * 150
      tone(f, 0.07, { to: f * 0.94, gain: 0.032, attack: 0.012 })
      break
    }
    case 'build':
      noise(0.07, { gain: 0.08, from: 1400, to: 500, q: 2 })
      tone(220, 0.13, { to: 165, gain: 0.24 })
      tone(440, 0.07, { type: 'triangle', gain: 0.06, delay: 0.01 })
      break
    case 'tick':
      tone(1047, 0.045, { gain: 0.07 })
      break
    case 'rumble':
      noise(1.6, { gain: 0.3, from: 260, to: 150, q: 0.6 })
      noise(1.4, { gain: 0.08, from: 700, to: 380, q: 0.7 })
      break
    case 'clunk':
      // metal letting go: a round thud with a short rattle on top
      tone(196, 0.24, { to: 98, gain: 0.3 })
      noise(0.09, { gain: 0.12, from: 1200, to: 400, q: 2 })
      tone(294, 0.09, { type: 'triangle', to: 196, gain: 0.1, delay: 0.05 })
      break
    case 'chime':
      // bright and open: we made orbit
      ;[587, 880, 1175, 1480].forEach((f, i) => tone(f, 0.8, { gain: 0.12, delay: i * 0.08, attack: 0.015 }))
      tone(1760, 0.9, { gain: 0.045, delay: 0.34, attack: 0.02 })
      break
    case 'stamp':
      noise(0.06, { gain: 0.12, from: 600, to: 220, q: 1 })
      tone(196, 0.14, { to: 110, gain: 0.28 })
      break
    case 'beep':
      tone(660, 0.14, { gain: 0.16, attack: 0.015 })
      break
  }
}

// ------------------------------------------------------------------ the launch
interface Roar {
  ac: AudioContext
  g: GainNode
  filter: BiquadFilterNode
  stop: () => void
}
let roar: Roar | null = null

/** Long engine roar for the launch; returns a stop function. The music steps back while it runs. */
export function startRoar(): () => void {
  roar?.stop()
  const b = audio()
  if (!b) return () => {}
  const { ac } = b
  // a warm noise with its weight in the low mids (120 Hz–1.5 kHz), where laptop speakers can still play it
  const len = ac.sampleRate * 2
  const lap = 4096
  const raw = new Float32Array(len + lap)
  let last = 0
  let sum = 0
  for (let i = 0; i < raw.length; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.1) * 0.97
    raw[i] = last
    sum += last * last
  }
  const norm = 0.25 / Math.sqrt(sum / raw.length || 1)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  // the loop's first samples fade in from what would have followed its last ones: no tick at the seam
  for (let i = 0; i < len; i++) data[i] = (i < lap ? raw[i] * (i / lap) + raw[len + i] * (1 - i / lap) : raw[i]) * norm
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  const low = ac.createBiquadFilter()
  low.type = 'highpass'
  low.frequency.value = 110
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  filter.Q.value = 0.6
  const g = ac.createGain()
  const t = ac.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(ROAR_BASE + ROAR_SPAN * 0.6, t + 0.7)
  src.connect(low)
  low.connect(filter)
  filter.connect(g)
  g.connect(b.fx)
  src.start()
  b.duck.gain.cancelScheduledValues(t)
  b.duck.gain.setTargetAtTime(MUSIC_UNDER_ROAR, t, 0.5)
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    if (roar === mine) roar = null
    try {
      const now = ac.currentTime
      g.gain.cancelScheduledValues(now)
      g.gain.setTargetAtTime(0.0001, now, 0.35)
      src.stop(now + 1.8)
      // the music comes back as the engine dies away
      b.duck.gain.cancelScheduledValues(now)
      b.duck.gain.setTargetAtTime(1, now + 0.6, 1.4)
    } catch {
      /* already stopped */
    }
  }
  const mine: Roar = { ac, g, filter, stop }
  roar = mine
  return stop
}
const ROAR_BASE = 0.07
const ROAR_SPAN = 0.4

/** How hard the engine is working, 0–1: the roar swells and opens up with it. */
export function roarLevel(level: number): void {
  if (!roar) return
  const v = Math.min(1, Math.max(0, level))
  roar.g.gain.setTargetAtTime(ROAR_BASE + v * ROAR_SPAN, roar.ac.currentTime, 0.12)
  roar.filter.frequency.setTargetAtTime(420 + v * 1100, roar.ac.currentTime, 0.12)
}

let wind: { ac: AudioContext; g: GainNode; src: AudioBufferSourceNode } | null = null
/** Air rushing past the rocket: set its level every frame; it starts itself and stops at zero. */
export function windLevel(level: number): void {
  const v = Math.min(1, Math.max(0, level))
  if (!wind) {
    if (v < 0.02) return
    const b = audio()
    if (!b) return
    const { ac } = b
    const src = ac.createBufferSource()
    src.buffer = b.white
    src.loop = true
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 750
    filter.Q.value = 0.5
    const g = ac.createGain()
    g.gain.value = 0.0001
    src.connect(filter)
    filter.connect(g)
    g.connect(b.fx)
    src.start()
    wind = { ac, g, src }
  }
  wind.g.gain.setTargetAtTime(v * 0.14, wind.ac.currentTime, 0.15)
}
export function stopWind(): void {
  if (!wind) return
  const w = wind
  wind = null
  try {
    w.g.gain.setTargetAtTime(0.0001, w.ac.currentTime, 0.1)
    w.src.stop(w.ac.currentTime + 0.6)
  } catch {
    /* already stopped */
  }
}

// ------------------------------------------------------------------ music: a slow generative piece, never the same twice
/**
 * Soft bell-like plucks wander over a warm pad. The notes come from a
 * five-note scale in D, so nothing can clash; the chords drift from one to the
 * next by chance rather than round a fixed loop, and whole bars are left empty
 * so it breathes.
 */
const STEP = 0.46 // an eighth note at about 65 beats a minute
const D3 = 146.83
const semi = (n: number) => D3 * Math.pow(2, n / 12)
const PENTA = [0, 2, 4, 7, 9]
/** the melody's notes: two octaves of the scale from D4 */
const scaleNote = (i: number) => semi(12 + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5])

interface Chord {
  root: number
  pad: number[]
  /** scale steps that sit well on this chord */
  tones: number[]
  next: number[]
}
const CHORDS: Chord[] = [
  { root: 0, pad: [7, 12, 16], tones: [0, 2, 3], next: [1, 2, 3, 4] }, // D
  { root: 9, pad: [12, 16, 19], tones: [4, 0, 2], next: [2, 4, 0] }, // B minor
  { root: 5, pad: [9, 12, 17], tones: [4, 0, 3], next: [0, 3, 4] }, // G
  { root: 7, pad: [9, 14, 19], tones: [3, 1, 4], next: [0, 1, 2] }, // A, open
  { root: 2, pad: [5, 9, 12], tones: [1, 4, 0], next: [2, 3, 0] }, // E minor
]
const WEIGHT = [1, 0.3, 0.7, 0.35, 0.9, 0.3, 0.6, 0.25]

let music: { timer: number; next: number; step: number; chord: number; prev: number; density: number; at: number } | null = null

function pluck(b: Bus, t: number, freq: number, vel: number) {
  const { ac } = b
  const g = ac.createGain()
  const ring = 1.5 + Math.random() * 0.9
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.014)
  g.gain.exponentialRampToValueAtTime(0.0001, t + ring)
  const o = ac.createOscillator()
  o.frequency.value = freq
  o.connect(g)
  // a short octave on top gives the start of the note its "pluck"
  const o2 = ac.createOscillator()
  o2.type = 'triangle'
  o2.frequency.value = freq * 2
  const g2 = ac.createGain()
  g2.gain.setValueAtTime(0.0001, t)
  g2.gain.linearRampToValueAtTime(0.16, t + 0.012)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
  o2.connect(g2)
  g2.connect(g)
  g.connect(b.tune)
  g.connect(b.echo)
  o.start(t)
  o2.start(t)
  o.stop(t + ring + 0.05)
  o2.stop(t + 0.35)
}

function pad(b: Bus, t: number, chord: Chord, dur: number) {
  const { ac } = b
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  filter.Q.value = 0.3
  filter.connect(b.tune)
  const end = t + dur
  const voice = (freq: number, gain: number, type: OscillatorType, detune: number) => {
    const o = ac.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    const g = ac.createGain()
    // breathes in over two seconds and out under the next chord
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(gain, t + 2.2)
    g.gain.setTargetAtTime(0.0001, end, 1.1)
    o.connect(g)
    g.connect(filter)
    o.start(t)
    o.stop(end + 6)
  }
  voice(semi(chord.root), 0.07, 'sine', 0)
  chord.pad.forEach((n, i) => voice(semi(n), 0.045, 'triangle', (i - 1) * 5))
}

function playStep(b: Bus, m: NonNullable<typeof music>, t: number) {
  const s = m.step % 8
  if (m.step % 16 === 0) {
    // a new chord every two bars, chosen by chance from the ones that follow well (and never straight back)
    if (m.step > 0) {
      const options = CHORDS[m.chord].next.filter((c) => c !== m.prev)
      m.prev = m.chord
      m.chord = options[Math.floor(Math.random() * options.length)]
    }
    pad(b, t, CHORDS[m.chord], STEP * 16)
  }
  if (s === 0) m.density = m.step === 0 ? 0.7 : [0, 0.45, 0.6, 0.6, 0.8][Math.floor(Math.random() * 5)]
  if (Math.random() >= m.density * WEIGHT[s]) return
  const chord = CHORDS[m.chord]
  if (s === 0 || Math.random() < 0.3) {
    // land on a note of the chord, the nearest one to where the tune is
    const tone = chord.tones[Math.floor(Math.random() * chord.tones.length)]
    m.at = [tone, tone + 5].reduce((a, c) => (Math.abs(c - m.at) < Math.abs(a - m.at) ? c : a))
  } else {
    m.at += [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]
    if (m.at < 0) m.at = 1
    if (m.at > 9) m.at = 8
  }
  const vel = (0.1 + Math.random() * 0.05) * (1 - m.at * 0.035)
  const when = t + Math.random() * 0.015
  pluck(b, when, scaleNote(m.at), vel)
  if (Math.random() < 0.12 && m.at <= 7) pluck(b, when + 0.02, scaleNote(m.at + 2), vel * 0.55)
}

function musicTick() {
  if (!bus || !music || bus.ac.state !== 'running') return
  const now = bus.ac.currentTime
  // first run, or the clock stood still (a hidden tab, a long stall): pick up from now
  if (music.next < now + 0.03) music.next = now + 0.1
  while (music.next < now + 0.9) {
    playStep(bus, music, music.next)
    music.step++
    music.next += STEP
  }
}

/** Start or stop the music to match the setting. */
function syncMusic() {
  if (!bus) return
  const want = useSettings.getState().music
  const { ac, fade } = bus
  const t = ac.currentTime
  if (want && !music) {
    music = { timer: window.setInterval(musicTick, 120), next: 0, step: 0, chord: 0, prev: -1, density: 0.7, at: 3 }
    fade.gain.cancelScheduledValues(t)
    fade.gain.setValueAtTime(Math.min(fade.gain.value, MUSIC_LEVEL), t)
    fade.gain.linearRampToValueAtTime(MUSIC_LEVEL, t + 4)
  } else if (!want && music) {
    window.clearInterval(music.timer)
    music = null
    fade.gain.cancelScheduledValues(t)
    fade.gain.setTargetAtTime(0, t, 0.35)
  }
}

// ------------------------------------------------------------------ wiring: gestures, the hidden tab, the switches
if (typeof window !== 'undefined') {
  /** when the press (or key) behind the current click began */
  let pressAt = 0
  for (const ev of ['pointerdown', 'keydown'] as const) {
    window.addEventListener(
      ev,
      () => {
        pressAt = performance.now()
        unlock()
      },
      { capture: true, passive: true },
    )
  }
  for (const ev of ['pointerup', 'mousedown', 'touchend', 'click'] as const) window.addEventListener(ev, unlock, { capture: true, passive: true })
  // a button whose own code made no sound for this press still gets the soft tap, so no press is ever silent
  window.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, [role="button"], [role="tab"], [role="switch"]')
    if (!el || (el as HTMLButtonElement).disabled || lastSfx >= pressAt) return
    sfx('tap')
  })

  // a hidden tab goes quiet (fade, then stop the clock) and comes back gently
  document.addEventListener('visibilitychange', () => {
    if (!bus) return
    const { ac, out } = bus
    const t = ac.currentTime
    out.gain.cancelScheduledValues(t)
    if (document.hidden) {
      out.gain.setTargetAtTime(0, t, 0.05)
      window.setTimeout(() => {
        if (document.hidden && bus) void bus.ac.suspend().catch(() => {})
      }, 300)
    } else {
      wake(ac)
      out.gain.setTargetAtTime(OUT_LEVEL, t, 0.4)
    }
  })

  useSettings.subscribe((s) => {
    if (!bus) return
    bus.fx.gain.setTargetAtTime(s.sound ? FX_LEVEL : 0, bus.ac.currentTime, 0.05)
    syncMusic()
  })
}

// ------------------------------------------------------------------ for tests and debugging (window.__sound)
export const soundDebug = {
  names: SFX,
  sfx,
  startRoar,
  roarLevel,
  windLevel,
  stopWind,
  state: () => bus?.ac.state ?? 'none',
  time: () => bus?.ac.currentTime ?? 0,
  music: () => (music ? { step: music.step, chord: music.chord } : null),
  /** how far the music is pulled down right now (1 = not at all) */
  duck: () => bus?.duck.gain.value ?? 1,
  /** Peak and RMS (linear, 1 = full scale) at the output over the next `ms`. */
  measure(ms: number): Promise<{ peak: number; rms: number }> {
    return new Promise((done) => {
      const b = bus
      if (!b) return done({ peak: 0, rms: 0 })
      const buf = new Float32Array(b.meter.fftSize)
      const hop = Math.round((b.meter.fftSize / b.ac.sampleRate) * 1000 * 0.9)
      let peak = 0
      let sum = 0
      let n = 0
      const t0 = performance.now()
      const id = window.setInterval(() => {
        b.meter.getFloatTimeDomainData(buf)
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i])
          if (v > peak) peak = v
          sum += v * v
        }
        n += buf.length
        if (performance.now() - t0 >= ms) {
          window.clearInterval(id)
          done({ peak, rms: Math.sqrt(sum / Math.max(1, n)) })
        }
      }, hop)
    })
  },
}
