/**
 * Level design: fixed plots on the plateau, in island-frame coordinates
 * (u = screen-right, v = screen-up). Buildings are never freely placed.
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

export interface Plot {
  id: BuildingId
  u: number
  v: number
  /** clearance radius kept free of props */
  radius: number
  /**
   * rotation of the building around Y, radians. Models are built with their front door on +Z;
   * west-side plots turn a quarter so the door faces the road.
   */
  rotY: number
  /** camera zoom (visible world width) when focused */
  focusWidth: number
  /** where paths connect, relative to the plot centre in (u, v) */
  door: [number, number]
}

export const PLOTS: Record<BuildingId, Plot> = {
  launchPad: { id: 'launchPad', u: 2.4, v: 18.8, radius: 5.2, rotY: 0, focusWidth: 16, door: [-2.6, -5.2] },
  missionControl: { id: 'missionControl', u: -4.4, v: 6.8, radius: 4.1, rotY: Math.PI / 2, focusWidth: 13, door: [2.4, -3.6] },
  commsCenter: { id: 'commsCenter', u: 4.6, v: 3.4, radius: 4.0, rotY: 0, focusWidth: 13, door: [-3.2, -2.4] },
  integrationBay: { id: 'integrationBay', u: 4.5, v: -7.0, radius: 4.1, rotY: 0, focusWidth: 13, door: [-3.4, -2.6] },
  partsMarket: { id: 'partsMarket', u: -4.5, v: -4.4, radius: 4.1, rotY: Math.PI / 2, focusWidth: 13, door: [3.0, -3.2] },
  scienceLab: { id: 'scienceLab', u: -5.6, v: 17.0, radius: 3.4, rotY: Math.PI / 2, focusWidth: 12, door: [3.0, -3.0] },
  engineeringLab: { id: 'engineeringLab', u: -4.5, v: -15.6, radius: 3.6, rotY: Math.PI / 2, focusWidth: 12, door: [3.2, -2.2] },
  crewQuarters: { id: 'crewQuarters', u: 4.5, v: -17.6, radius: 3.6, rotY: 0, focusWidth: 12, door: [-3.2, -2.0] },
}

export const STARTING_BUILDINGS: BuildingId[] = [
  'missionControl',
  'partsMarket',
  'integrationBay',
  'commsCenter',
  'launchPad',
]

/** Main road spine, from the bridge at the south end up to the pad. */
export const SPINE: [number, number][] = [
  [0.2, -29],
  [0.0, -22],
  [-0.4, -14],
  [0.2, -6],
  [0.6, 1],
  [0.2, 7.5],
  [0.6, 12.2],
]

/** Width of paths in world units. */
export const PATH_W = 1.5
export const SPINE_W = 2.1

/** Where the camera rests by default, and how far it may roam (island frame). */
export const CAMERA_HOME = { u: 0, v: 3.5, width: 25 }
export const CAMERA_BOUNDS = { uMin: -8, uMax: 8, vMin: -20, vMax: 21, widthMin: 9, widthMax: 32 }
