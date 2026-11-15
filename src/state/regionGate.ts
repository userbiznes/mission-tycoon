import { REGIONS, type RegionId } from '../data/regions'
import { useGame } from './game'

/** Read-only questions about the lost regions. (The verbs live in `regions.ts`.) */

export function isRegionActive(id: RegionId): boolean {
  return useGame.getState().regions[id]?.state === 'active'
}

/** Land the player may build on and tidy: the old spaceport, and any region that has been restored. */
export function landOpen(region: RegionId | null): boolean {
  return region === null || isRegionActive(region)
}

/** Why something that needs a restored region is still locked, as one short line; null when it is free. */
export function regionLock(needs: RegionId | undefined): string | null {
  if (!needs || isRegionActive(needs)) return null
  return `Restore the ${REGIONS[needs].name} first`
}
