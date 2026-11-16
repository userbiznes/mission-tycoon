import type { BuildingId } from '../data/layout'

/**
 * Where the game asks the tutorial "is this yours?". Each hook is null (or
 * answers no) when the tutorial is not running, and the game carries on as
 * usual.
 */
export const tourHooks: {
  /** a building was clicked: true means the tutorial has dealt with it */
  onBuildingTap: ((id: BuildingId) => boolean) | null
  /** the "take the job" button was pressed: true means the tutorial took it from here */
  onTakeJob: ((contractId: string) => boolean) | null
  /** how long an order should take, in seconds, or undefined for the usual time */
  orderSeconds: ((partId: string) => number | undefined) | null
  /** hold the operations time-lapse while Rocco is talking */
  opsPaused: (() => boolean) | null
  /** contextual tips wait until the tutorial is over */
  tipsMuted: (() => boolean) | null
} = { onBuildingTap: null, onTakeJob: null, orderSeconds: null, opsPaused: null, tipsMuted: null }
