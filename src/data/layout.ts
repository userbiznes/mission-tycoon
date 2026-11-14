/**
 * Level design: fixed plots on the plateau, in island-frame coordinates
 * (v = along the island, screen-right, launch pad at the far right; u = across it,
 * positive towards the camera). Buildings are never freely placed.
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
   * rotation of the building around Y, radians. Models are built with their front door on +Z,
   * which at 0 is the sunny face turned towards the camera.
   */
  rotY: number
  /** camera zoom (visible world width, screen-horizontal) when focused */
  focusWidth: number
  /** where paths connect, relative to the plot centre in (u, v) */
  door: [number, number]
}

/**
 * Front yards. With rotY 0 a model's door (+Z) faces the camera's sunny side, which
 * is roughly (+0.79, -0.62) in the island frame. Plots on the far side of the road
 * (u < 0) open straight onto it; plots on the near side are reached round their flank.
 */
const FAR: [number, number] = [2.7, -2.1]
const NEAR: [number, number] = [-2.6, -2.4]

export const PLOTS: Record<BuildingId, Plot> = {
  launchPad: { id: 'launchPad', u: 2.4, v: 18.8, radius: 5.2, rotY: 0, focusWidth: 24, door: [-1.2, -5.4] },
  missionControl: { id: 'missionControl', u: -4.4, v: 6.8, radius: 4.1, rotY: 0, focusWidth: 20, door: FAR },
  commsCenter: { id: 'commsCenter', u: 4.6, v: 3.4, radius: 4.0, rotY: 0, focusWidth: 20, door: NEAR },
  integrationBay: { id: 'integrationBay', u: 4.5, v: -7.0, radius: 4.1, rotY: 0, focusWidth: 20, door: NEAR },
  partsMarket: { id: 'partsMarket', u: -4.5, v: -4.4, radius: 4.1, rotY: 0, focusWidth: 20, door: FAR },
  scienceLab: { id: 'scienceLab', u: -5.6, v: 17.0, radius: 3.4, rotY: 0, focusWidth: 19, door: [2.6, -2.4] },
  engineeringLab: { id: 'engineeringLab', u: -4.5, v: -15.6, radius: 3.6, rotY: 0, focusWidth: 19, door: FAR },
  crewQuarters: { id: 'crewQuarters', u: 4.5, v: -17.6, radius: 3.6, rotY: 0, focusWidth: 19, door: NEAR },
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
export const CAMERA_HOME = { u: 0.5, v: 1.5, width: 52 }
export const CAMERA_BOUNDS = { uMin: -7, uMax: 7, vMin: -21, vMax: 22, widthMin: 14, widthMax: 66 }
