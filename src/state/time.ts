import { FAST_MODE_FACTOR, TIME_SCALE } from '../data/economy'
import { useSettings } from './settings'

/**
 * All timers are real-time but short. Every duration in the data tables is in
 * "design seconds"; this is the single place they become real milliseconds.
 */

export function toMs(designSeconds: number): number {
  const fast = useSettings.getState().fastMode ? FAST_MODE_FACTOR : 1
  return Math.max(400, designSeconds * TIME_SCALE * fast * 1000)
}
