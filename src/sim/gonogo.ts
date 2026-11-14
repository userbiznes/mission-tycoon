import { SEAT_BY_ID, SEAT_IDS } from '../data/crew'
import type { ResourceKey, SeatId } from '../data/types'
import type { Evaluation, ResourceBar } from './evaluate'

/** Which bars each mission seat watches. */
export const SEAT_BARS: Record<SeatId, ResourceKey[]> = {
  science: ['data', 'time'],
  spacecraft: ['power'],
  launch: ['mass', 'budget'],
  ground: ['comms'],
}

const ALL_CLEAR: Record<SeatId, string> = {
  science: 'The data plan meets the target.',
  spacecraft: 'Power is healthy in sun and shadow.',
  launch: 'Mass and budget are within limits.',
  ground: 'The dishes can bring it all home.',
}

export interface SeatCall {
  seat: SeatId
  seatName: string
  /** the crew member in the seat, if any */
  crewName: string | null
  go: boolean
  /** GO, but with a thin margin worth a second look */
  caution: boolean
  /** the bar that drove the call, if any */
  bar: ResourceKey | null
  reason: string
}

const RANK = { ok: 0, warn: 1, bad: 2 } as const

/**
 * Each seat calls GO or NO-GO from the bars it watches. A red bar is NO-GO, an
 * amber bar is a cautious GO. The player may launch over a NO-GO and own the result.
 */
export function goNoGo(evaluation: Evaluation): SeatCall[] {
  return SEAT_IDS.map((seat) => {
    const bars: ResourceBar[] = SEAT_BARS[seat].map((key) => evaluation.bars[key])
    const lead = [...bars].sort((a, b) => RANK[b.status] - RANK[a.status])[0]
    const go = lead.status !== 'bad'
    return {
      seat,
      seatName: SEAT_BY_ID[seat].name,
      crewName: evaluation.mods.seats[seat].name,
      go,
      caution: lead.status === 'warn',
      bar: lead.status === 'ok' ? null : (lead.key as ResourceKey),
      reason: lead.status === 'ok' ? ALL_CLEAR[seat] : `${lead.reason}.`.replace(/\.\.$/, '.'),
    }
  })
}
