/**
 * Buildings and camera framing. Buildings are placed freely on the island's
 * build grid (see `src/scene/grid.ts`); nothing has a fixed plot.
 */

export type BuildingId =
  | 'missionControl'
  | 'partsMarket'
  | 'integrationBay'
  | 'commsCenter'
  | 'launchPad'
  | 'scienceLab'
  | 'engineeringLab'
  | 'crewQuarters'

export const BUILDING_IDS: BuildingId[] = [
  'missionControl',
  'partsMarket',
  'integrationBay',
  'commsCenter',
  'launchPad',
  'scienceLab',
  'engineeringLab',
  'crewQuarters',
]

/** The only buildings standing when a new game starts: just enough to fly the first mission. */
export const STARTING_BUILDINGS: BuildingId[] = ['missionControl', 'partsMarket', 'integrationBay', 'commsCenter', 'launchPad']

/** Side length of each building's footprint, in grid cells. */
export const FOOTPRINT: Record<BuildingId, number> = {
  launchPad: 5,
  missionControl: 4,
  partsMarket: 4,
  integrationBay: 4,
  commsCenter: 4,
  scienceLab: 3,
  engineeringLab: 3,
  crewQuarters: 3,
}

/** Camera zoom (visible world width) when a building is focused. */
export const FOCUS_WIDTH: Record<BuildingId, number> = {
  launchPad: 26,
  missionControl: 22,
  partsMarket: 22,
  integrationBay: 22,
  commsCenter: 22,
  scienceLab: 20,
  engineeringLab: 20,
  crewQuarters: 20,
}

/**
 * Where the old spaceport stands when the game begins, in island-frame
 * coordinates (v = along the island, u = across it, positive towards the camera).
 */
export const START_SPOTS: Record<string, [number, number]> = {
  commsCenter: [-3, -37],
  missionControl: [-5, -25.5],
  launchPad: [-6, -12],
  integrationBay: [9, -16.5],
}

/** Which way each starting building faces: 0 = door down-left, 1 = door down-right. */
export const START_FACING: Partial<Record<BuildingId, number>> = {
  commsCenter: 1,
  missionControl: 1,
  integrationBay: 0,
  launchPad: 0,
  partsMarket: 1,
}

/** Centre of the dock on the south shore. The Parts Market stands on it and deliveries arrive by boat. */
export const DOCK_SPOT: [number, number] = [24.5, -27.5]

/**
 * The island opens up from west to east. Land beyond a boundary is fenced off
 * and wild until the agency is big enough to take it on.
 */
export interface ZoneDef {
  name: string
  /** land with island-frame v at or beyond this belongs to the zone */
  fromV: number
  needsLevel: number
  cost: number
}
export const ZONES: ZoneDef[] = [
  { name: 'Old Spaceport', fromV: -100, needsLevel: 1, cost: 0 },
  { name: 'East Meadow', fromV: -3.5, needsLevel: 2, cost: 600 },
  { name: 'Far Point', fromV: 20, needsLevel: 3, cost: 1500 },
]

/** Where the camera rests by default, and how far it may roam (island frame). */
export const CAMERA_HOME = { u: 9.5, v: -24, width: 60 }
export const CAMERA_BOUNDS = { uMin: -17, uMax: 24, vMin: -40, vMax: 40, widthMin: 14, widthMax: 96 }
