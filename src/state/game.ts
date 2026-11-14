import { create } from 'zustand'
import { DEFAULT_LOGO, setAgencyLogo, type LogoSpec } from '../art/logo'
import { LEVELS, STARTING_BANK } from '../data/economy'
import { BUILDING_IDS, START_FACING, STARTING_BUILDINGS, type BuildingId } from '../data/layout'
import { startLayout, type CellPos } from '../scene/grid'
import type { ItemId, OrbitId, RawDataType, RocketId, StationId } from '../data/types'

/**
 * The saved game. Everything here is plain JSON and is written to localStorage
 * (guarded by try/catch) a moment after any change.
 */

const SAVE_KEY = 'mission-tycoon:save'
const SAVE_VERSION = 4

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

/** The mission being designed right now. */
export interface Draft {
  contractId: string
  design: { busId: string | null; parts: string[] }
  orbitId: OrbitId
  rocketId: RocketId
  stationIds: StationId[]
}

/** A satellite that stays in orbit after its mission and keeps sending raw data. */
export interface SatelliteRec {
  id: string
  name: string
  contractId: string
  orbitId: OrbitId
  mbPerDay: Partial<Record<RawDataType, number>>
  carry: Partial<Record<RawDataType, number>>
  daysLeft: number
  daysTotal: number
  /** epoch ms of the next in-game day of passes */
  nextAt: number
}

export interface LabJob {
  id: string
  recipeId: string
  start: number
  end: number
}

export interface OrderRec {
  id: string
  templateId: string
  /** epoch ms when a filled slot offers a new order; 0 = available now */
  readyAt: number
}

export interface SaveData {
  version: number
  started: boolean
  player: Player
  coins: number
  xp: number
  level: number
  buildings: Record<BuildingId, BuildingState>
  /** where each building stands on the build grid (corner cell of its footprint) */
  placed: Partial<Record<BuildingId, CellPos>>
  /** which way each building faces: 0 = door down-left, 1 = door down-right */
  facing: Partial<Record<BuildingId, number>>
  /** how many zones of the island are open (1 = just the old spaceport) */
  zones: number
  /** ids of overgrowth the player has cleared */
  cleared: string[]
  inventory: Record<string, number>
  deliveries: Delivery[]
  /** index of the next tour step; -1 once the tour is finished */
  tourStep: number
  tipsSeen: string[]
  draft: Draft | null
  /** best star count per contract id */
  bestStars: Record<string, number>
  missionsFlown: number
  satellites: SatelliteRec[]
  /** raw data and lab products */
  items: Partial<Record<ItemId, number>>
  labJobs: LabJob[]
  orders: OrderRec[]
  /** hired crew ids and who sits where */
  hired: string[]
  seats: Partial<Record<'science' | 'spacecraft' | 'launch' | 'ground', string>>
  /** extra skill points earned by crew, by crew id and seat */
  crewXp: Record<string, number>
  /** free-form bag for systems added by later milestones (lab, satellites, crew, campaign…) */
  ext: Record<string, unknown>
}

function freshBuildings(): Record<BuildingId, BuildingState> {
  const out = {} as Record<BuildingId, BuildingState>
  for (const id of BUILDING_IDS) {
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
    placed: startLayout(),
    facing: { ...START_FACING },
    zones: 1,
    cleared: [],
    inventory: {},
    deliveries: [],
    tourStep: 0,
    tipsSeen: [],
    draft: null,
    bestStars: {},
    missionsFlown: 0,
    satellites: [],
    items: {},
    labJobs: [],
    orders: [],
    hired: [],
    seats: {},
    crewXp: {},
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

let levelUpHook: ((level: number, unlocks: string[]) => void) | null = null
/** Called when the agency levels up (the UI shows the fanfare). */
export function onLevelUp(fn: (level: number, unlocks: string[]) => void) {
  levelUpHook = fn
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
    const before = get().level
    const xp = get().xp + n
    const level = levelForXp(xp)
    set({ xp, level })
    if (level > before) levelUpHook?.(level, LEVELS.find((l) => l.level === level)?.unlocks ?? [])
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
    placed: s.placed,
    facing: s.facing,
    zones: s.zones,
    cleared: s.cleared,
    inventory: s.inventory,
    deliveries: s.deliveries,
    tourStep: s.tourStep,
    tipsSeen: s.tipsSeen,
    draft: s.draft,
    bestStars: s.bestStars,
    missionsFlown: s.missionsFlown,
    satellites: s.satellites,
    items: s.items,
    labJobs: s.labJobs,
    orders: s.orders,
    hired: s.hired,
    seats: s.seats,
    crewXp: s.crewXp,
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

// contextual tips are shown once per save
import { setTipGate } from './ui'
setTipGate((id) => useGame.getState().markTip(id))
