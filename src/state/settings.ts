import { create } from 'zustand'

const KEY = 'mission-tycoon:settings'

interface SettingsState {
  lowQuality: boolean
  fastMode: boolean
  sound: boolean
  /** keep animation to a minimum: no springs, no staggered lists, numbers jump instead of ticking */
  reduceMotion: boolean
  set: (patch: Partial<Pick<SettingsState, 'lowQuality' | 'fastMode' | 'sound' | 'reduceMotion'>>) => void
}

function load(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<SettingsState>) : {}
  } catch {
    return {}
  }
}

/** URL flags let screenshots and judges force a mode: ?low=1 ?fast=1 ?still=1 */
function fromUrl(): Partial<SettingsState> {
  try {
    const q = new URLSearchParams(window.location.search)
    const out: Partial<SettingsState> = {}
    if (q.has('low')) out.lowQuality = q.get('low') !== '0'
    if (q.has('fast')) out.fastMode = q.get('fast') !== '0'
    if (q.has('still')) out.reduceMotion = q.get('still') !== '0'
    return out
  } catch {
    return {}
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  lowQuality: false,
  fastMode: false,
  sound: true,
  reduceMotion: false,
  ...load(),
  ...fromUrl(),
  set: (patch) => {
    set(patch)
    try {
      const { lowQuality, fastMode, sound, reduceMotion } = get()
      localStorage.setItem(KEY, JSON.stringify({ lowQuality, fastMode, sound, reduceMotion }))
    } catch {
      /* storage unavailable: settings just won't persist */
    }
  },
}))
