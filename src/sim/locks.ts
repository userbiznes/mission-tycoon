import { CONTRACT_BY_ID } from '../data/contracts'
import { PART_BY_ID } from '../data/parts'
import { RAW_DATA_WORDS } from '../data/rules'
import type { PartId } from '../data/types'
import { countOf, slotsTotal, slotsUsed, type Design } from './design'

export interface LockContext {
  design: Design
  /** the contract being built for; instruments it can't use are locked */
  contractId?: string
  /** player level; parts above it are locked */
  level?: number
}

/**
 * Why a part can't be added to this design right now, as one short line for the
 * part tray. Returns null when the part can be added.
 */
export function partLock(partId: PartId, ctx: LockContext): string | null {
  const part = PART_BY_ID[partId]
  if (!part) return 'Unknown part.'
  if (ctx.level !== undefined && part.unlockLevel > ctx.level) return `Unlocks at level ${part.unlockLevel}.`

  const contract = ctx.contractId ? CONTRACT_BY_ID[ctx.contractId] : undefined
  if (contract && part.category === 'instrument' && part.produces && !contract.acceptedData.includes(part.produces)) {
    const wants = RAW_DATA_WORDS[contract.acceptedData[0]].kind
    const makes = RAW_DATA_WORDS[part.produces].kind
    return `${contract.client} wants ${wants}, not ${makes}.`
  }

  if (part.category === 'bus') {
    if (ctx.design.busId === partId) return 'Already fitted.'
    if ((part.slots ?? 0) < slotsUsed(ctx.design)) return 'Too small for the parts already fitted.'
    return null
  }
  if (!ctx.design.busId) return 'Pick a bus first.'
  const max = part.maxPerSat ?? 1
  if (countOf(ctx.design, partId) >= max) return max === 1 ? 'Already fitted.' : `Only ${max} fit on one satellite.`
  if (slotsUsed(ctx.design) >= slotsTotal(ctx.design)) return 'No free slots. Remove a part or use a bigger bus.'
  return null
}

/** Locks for a whole list of parts at once: `{ partId: reason | null }`. */
export function partLocks(partIds: PartId[], ctx: LockContext): Record<PartId, string | null> {
  return Object.fromEntries(partIds.map((id) => [id, partLock(id, ctx)]))
}
