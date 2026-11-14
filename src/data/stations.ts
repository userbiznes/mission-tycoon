import type { StationDef, StationId } from './types'

/**
 * Ground stations. A dish only hears a satellite while it is overhead, so
 * passes per day depend on where the dish sits and which orbit the satellite
 * flies: a far-north dish sees a polar orbiter on almost every lap, and never
 * sees a low orbit that stays near the equator.
 */
export const STATIONS: StationDef[] = [
  {
    id: 'home',
    name: 'Home dish',
    region: 'your spaceport',
    passes: { leo: 4, mid: 4, polar: 4, moon: 0, mars: 0 },
    rent: 0,
    dishMbPerPass: 150,
    unlockLevel: 1,
    blurb: 'Your own old dish at the Comms Center. Free, and good for about 4 passes a day.',
  },
  {
    id: 'equator',
    name: 'Equator station',
    region: 'near the equator',
    passes: { leo: 3, mid: 3, polar: 2, moon: 0, mars: 0 },
    rent: 200,
    dishMbPerPass: 500,
    unlockLevel: 1,
    blurb: 'A rented dish in the tropics. 3 more passes a day for low orbits.',
  },
  {
    id: 'north',
    name: 'Far-north station',
    region: 'above the Arctic Circle',
    passes: { leo: 0, mid: 2, polar: 12, moon: 0, mars: 0 },
    rent: 250,
    dishMbPerPass: 500,
    unlockLevel: 2,
    blurb: 'Sees a polar orbit 12 times a day, and a low orbit never.',
  },
  {
    id: 'south',
    name: 'Far-south station',
    region: 'at the edge of Antarctica',
    passes: { leo: 1, mid: 3, polar: 8, moon: 0, mars: 0 },
    rent: 250,
    dishMbPerPass: 500,
    unlockLevel: 2,
    blurb: 'A polar dish at the other end of the world: 8 polar passes a day.',
  },
  {
    id: 'deepSpace',
    name: 'Deep-space dish',
    region: 'a quiet desert valley',
    passes: { leo: 0, mid: 0, polar: 0, moon: 2, mars: 1 },
    rent: 800,
    dishMbPerPass: 500,
    unlockLevel: 4,
    blurb: 'A giant dish for faint signals from the Moon and beyond.',
  },
]

export const STATION_BY_ID: Record<StationId, StationDef> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
) as Record<StationId, StationDef>
