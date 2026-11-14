import { create } from 'zustand'
import type { BuildingId } from '../data/layout'

/** Transient interface state: what is open right now. Never saved. */

export type Sheet =
  | { kind: 'building'; id: BuildingId }
  | { kind: 'settings' }
  | { kind: 'market' }
  | { kind: 'contracts' }
  | { kind: 'lab' }
  | { kind: 'crew' }
  | { kind: 'build'; id: BuildingId }
  | { kind: 'comms' }
  | { kind: 'inventory' }

/** Full-screen flows layered over the base. */
export type Screen = null | 'builder' | 'launchPrep' | 'launch' | 'ops' | 'debrief'

export interface Toast {
  id: number
  text: string
  tone?: 'good' | 'bad'
}

export interface Flyer {
  id: number
  kind: 'coin' | 'xp' | 'star'
  /** start position in px relative to the phone frame */
  x: number
  y: number
  delay: number
}

interface UiState {
  sheet: Sheet | null
  screen: Screen
  toasts: Toast[]
  flyers: Flyer[]
  /** which HUD counter is bumping right now */
  bump: { coins: number; xp: number }
  open: (sheet: Sheet) => void
  close: () => void
  setScreen: (screen: Screen) => void
  toast: (text: string, tone?: 'good' | 'bad') => void
  /** spray reward icons from a point towards the HUD */
  fly: (kind: Flyer['kind'], count: number, x: number, y: number) => void
  removeFlyer: (id: number) => void
  bumpHud: (which: 'coins' | 'xp') => void
}

let nextId = 1

export const useUi = create<UiState>((set, get) => ({
  sheet: null,
  screen: null,
  toasts: [],
  flyers: [],
  bump: { coins: 0, xp: 0 },
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
  setScreen: (screen) => set({ screen, sheet: null }),
  toast: (text, tone) => {
    const id = nextId++
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600)
  },
  fly: (kind, count, x, y) => {
    const add: Flyer[] = []
    for (let i = 0; i < Math.min(count, 10); i++) {
      add.push({ id: nextId++, kind, x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 36, delay: i * 55 })
    }
    set({ flyers: [...get().flyers, ...add] })
  },
  removeFlyer: (id) => set({ flyers: get().flyers.filter((f) => f.id !== id) }),
  bumpHud: (which) => set({ bump: { ...get().bump, [which]: get().bump[which] + 1 } }),
}))
