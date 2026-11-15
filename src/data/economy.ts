import type { LevelDef } from './types'

/** All real-time timers are multiplied by this one number. */
export const TIME_SCALE = 1
/** "Fast mode" for judges: every timer runs four times quicker. */
export const FAST_MODE_FACTOR = 0.25
/** Buying from stock is instant but costs this much more than ordering. */
export const STOCK_MARKUP = 1.3
/** Coins in the bank when a new agency starts. */
export const STARTING_BANK = 2000
/** XP = stars × difficulty × this. */
export const XP_PER_STAR = 10

/** Total XP needed for each level, and what the player is told they unlocked. */
export const LEVELS: LevelDef[] = [
  { level: 1, xp: 0, unlocks: ['Rideshare launches', 'Low orbit', 'Camera satellites', 'Science Lab plot'] },
  {
    level: 2,
    xp: 20,
    unlocks: ['Fire Watch contract', 'Thermal sensor', 'Polar and mid orbits', 'Small rocket', 'Polar stations', 'Crew Quarters', 'Cold-gas thruster'],
  },
  {
    level: 3,
    xp: 70,
    unlocks: ['Expedition: Old Tracking Station', 'Storm Chaser contract', 'High-res camera', 'S-band radio', 'Reaction wheels', 'Hardened computer', 'Medium bus (6U)'],
  },
  { level: 4, xp: 160, unlocks: ['Deep-space dish', 'Ion thruster'] },
  { level: 5, xp: 280, unlocks: ['Expedition: Science Annex ruins'] },
  { level: 6, xp: 440, unlocks: ['Sandbox bragging rights'] },
  { level: 7, xp: 640, unlocks: ['Expedition: Heavy Launch Complex'] },
  { level: 8, xp: 900, unlocks: ['Mars Weather contract'] },
]

/** Player level needed before each building can be built on its plot. */
export const BUILDING_UNLOCK_LEVEL: Record<string, number> = {
  scienceLab: 1,
  crewQuarters: 2,
  engineeringLab: 5,
}

/**
 * Comms Center levels. A bigger dish takes more data per pass, the barn holds
 * more raw data, and a second dish catches passes the first one misses.
 */
export const COMMS_LEVELS: { level: number; dishMbPerPass: number; rawStorage: number; passBonus: number }[] = [
  { level: 1, dishMbPerPass: 150, rawStorage: 20, passBonus: 0 },
  { level: 2, dishMbPerPass: 400, rawStorage: 40, passBonus: 0 },
  { level: 3, dishMbPerPass: 1000, rawStorage: 80, passBonus: 0.5 },
]

// ---- satellites that stay in orbit after their mission ----
/** Real seconds for one in-game "day" of passes from an orbiting satellite (before TIME_SCALE). */
export const ORBIT_DAY_SEC = 60
/** In-game days a satellite keeps working per year of orbital lifetime. */
export const LIFE_DAYS_PER_YEAR = 12

/**
 * The restored Old Tracking Station: a second, bigger dish on the hill. It
 * catches the passes the home dish misses, and takes far more data on each.
 */
export const TRACKING_DISH = { passMult: 2, mbPerPass: 600 }
