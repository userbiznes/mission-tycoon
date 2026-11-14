import { useSettings } from './settings'

/**
 * All timers are real-time but short. Every duration in the data tables is in
 * "design seconds"; this is the single place they become real milliseconds.
 */
export const TIME_SCALE = 1
export const FAST_MODE_FACTOR = 0.25

export function toMs(designSeconds: number): number {
  const fast = useSettings.getState().fastMode ? FAST_MODE_FACTOR : 1
  return Math.max(400, designSeconds * TIME_SCALE * fast * 1000)
}
