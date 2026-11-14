import { create } from 'zustand'
import { DEFAULT_LOGO, setAgencyLogo, type LogoSpec } from '../art/logo'
import { LEVELS, STARTING_BANK } from '../data/economy'
import { PLOTS, STARTING_BUILDINGS, type BuildingId } from '../data/layout'

/**
 * The saved game. Everything here is plain JSON and is written to localStorage
 * (guarded by try/catch) a moment after any change.
 */

const SAVE_KEY = 'mission-tycoon:save'
const SAVE_VERSION = 1

export type Phase = 'title' | 'onboarding' | 'arrival' | 'play'

export interface BuildingState {
  /** 0 = empty plot */
  level: number
  /** set while a build or upgrade is running (epoch ms) */
  buildStart?: number
  buildEnd?: number
  /** level it will have when the timer finishes */
  buildTo?: number
}

export interface Delivery {
  id: string
  partId: string
  qty: number
  start: number
  end: number
}

export interface Player {
  name: string
  agency: string
  logo: LogoSpec
}

export interface SaveData {
  version: number
  started: boolean
  player: Player
  coins: number
  xp: number
  level: number
  buildings: Record<BuildingId, BuildingState>
  inventory: Record<string, number>
  deliveries: Delivery[]
  /** index of the next tour step; -1 once the tour is finished */
  tourStep: number
  tipsSeen: string[]
  /** free-form bag for systems added by later milestones (lab, satellites, crew, campaign…) */
  ext: Record<string, unknown>
}

function freshBuildings(): Record<BuildingId, BuildingState> {
  const out = {} as Record<BuildingId, BuildingState>
  for (const id of Object.keys(PLOTS) as BuildingId[]) {
    out[id] = { level: STARTING_BUILDINGS.includes(id) ? 1 : 0 }
  }
  return out
}

export function freshSave(): SaveData {
  return {
    version: SAVE_VERSION,
    started: false,
    player: { name: '', agency: '', logo: DEFAULT_LOGO },
    coins: STARTING_BANK,
    xp: 0,
    level: 1,
    buildings: freshBuildings(),
    inventory: {},
    deliveries: [],
    tourStep: 0,
    tipsSeen: [],
    ext: {},
  }
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return freshSave()
    const data = JSON.parse(raw) as SaveData
    if (!data || data.version !== SAVE_VERSION) return freshSave()
    // tolerate saves from earlier builds that lack newer fields
    return { ...freshSave(), ...data, buildings: { ...freshBuildings(), ...data.buildings } }
  } catch {
    return freshSave()
  }
}

/** `?fresh=1` starts from a clean save without touching storage (used by screenshots and judges). */
const FRESH = (() => {
  try {
    return new URLSearchParams(window.location.search).has('fresh')
  } catch {
    return false
  }
})()

export interface GameState extends SaveData {
  phase: Phase
  setPhase: (phase: Phase) => void
  setPlayer: (patch: Partial<Player>) => void
  begin: () => void
  addCoins: (n: number) => void
  /** returns false (and changes nothing) if the bank can't cover it */
  spend: (n: number) => boolean
  addXp: (n: number) => void
  addParts: (partId: string, qty: number) => void
  removeParts: (partId: string, qty: number) => boolean
  setTourStep: (n: number) => void
  markTip: (id: string) => boolean
  setExt: (key: string, value: unknown) => void
  patch: (fn: (s: SaveData) => Partial<SaveData>) => void
  reset: () => void
}

/** XP needed to reach each level (index = level − 1). */
export const LEVEL_XP = LEVELS.map((l) => l.xp)

export function levelForXp(xp: number): number {
  let level = 1
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1
  return level
}

/** Progress within the current level, 0–1. */
export function levelProgress(xp: number): number {
  const level = levelForXp(xp)
  const lo = LEVEL_XP[level - 1]
  const hi = LEVEL_XP[level] ?? lo + 200
  return Math.min(1, (xp - lo) / (hi - lo))
}

const initial = FRESH ? freshSave() : loadSave()
setAgencyLogo(initial.player.logo)

export const useGame = create<GameState>((set, get) => ({
  ...initial,
  phase: initial.started ? 'play' : 'title',
  setPhase: (phase) => set({ phase }),
  setPlayer: (patch) => {
    const player = { ...get().player, ...patch }
    if (patch.logo) setAgencyLogo(patch.logo)
    set({ player })
  },
  begin: () => set({ started: true }),
  addCoins: (n) => set({ coins: Math.max(0, Math.round(get().coins + n)) }),
  spend: (n) => {
    if (get().coins < n) return false
    set({ coins: Math.round(get().coins - n) })
    return true
  },
  addXp: (n) => {
    const xp = get().xp + n
    set({ xp, level: levelForXp(xp) })
  },
  addParts: (partId, qty) => {
    const inventory = { ...get().inventory }
    inventory[partId] = (inventory[partId] ?? 0) + qty
    set({ inventory })
  },
  removeParts: (partId, qty) => {
    const have = get().inventory[partId] ?? 0
    if (have < qty) return false
    const inventory = { ...get().inventory }
    inventory[partId] = have - qty
    if (inventory[partId] <= 0) delete inventory[partId]
    set({ inventory })
    return true
  },
  setTourStep: (tourStep) => set({ tourStep }),
  markTip: (id) => {
    if (get().tipsSeen.includes(id)) return false
    set({ tipsSeen: [...get().tipsSeen, id] })
    return true
  },
  setExt: (key, value) => set({ ext: { ...get().ext, [key]: value } }),
  patch: (fn) => set(fn(get())),
  reset: () => {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      /* ignore */
    }
    const fresh = freshSave()
    setAgencyLogo(fresh.player.logo)
    set({ ...fresh, phase: 'title' })
  },
}))

// ---- persistence: write a moment after any change ----
let saveTimer: ReturnType<typeof setTimeout> | null = null
function snapshot(s: GameState): SaveData {
  return {
    version: SAVE_VERSION,
    started: s.started,
    player: s.player,
    coins: s.coins,
    xp: s.xp,
    level: s.level,
    buildings: s.buildings,
    inventory: s.inventory,
    deliveries: s.deliveries,
    tourStep: s.tourStep,
    tipsSeen: s.tipsSeen,
    ext: s.ext,
  }
}
export function saveNow(): void {
  if (FRESH) return
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot(useGame.getState())))
  } catch {
    /* storage full or blocked: the game keeps running, it just won't persist */
  }
}
useGame.subscribe(() => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 400)
})
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow)
}
