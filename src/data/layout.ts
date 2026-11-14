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
  missionControl: [-7, -8],
  partsMarket: [-6, -21],
  integrationBay: [6, -15],
  commsCenter: [7, -2],
  launchPad: [-3, 9],
}

/** Where the pier meets the island: deliveries arrive here. */
export const GATE_SPOT: [number, number] = [1, -36.5]

/** Where the camera rests by default, and how far it may roam (island frame). */
export const CAMERA_HOME = { u: 0.5, v: -6, width: 58 }
export const CAMERA_BOUNDS = { uMin: -17, uMax: 17, vMin: -38, vMax: 40, widthMin: 14, widthMax: 92 }
