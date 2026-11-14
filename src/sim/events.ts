import { EVENTS } from '../data/events'
import { RULES } from '../data/rules'
import type { EventChoice, EventDef, EventEffect, EventTrigger, ResourceKey } from '../data/types'
import type { Evaluation } from './evaluate'
import { num, pct } from './format'
import { makeRng, shuffled } from './rng'

/** How one choice will move a bar, for the tilt preview on a swipe card. */
export interface EffectPreview {
  bar: ResourceKey
  /** change as a fraction of the mission total (negative = worse) */
  delta: number
  /** short label, e.g. "−1 day of data" */
  text: string
}

export interface PlannedChoice extends EventChoice {
  previews: EffectPreview[]
}

/** An event card scheduled for a mission day. */
export interface PlannedEvent {
  id: string
  /** mission day (1-based) the card comes up */
  day: number
  title: string
  text: string
  basis: string
  /** swipe left = choices[0], swipe right = choices[1] */
  choices: [PlannedChoice, PlannedChoice]
  defaultChoice: 'a' | 'b'
  filler: boolean
}

/** Does this design set off this card? */
export function eventTriggers(trigger: EventTrigger, ev: Evaluation, stationCount: number): boolean {
  const s = ev.summary
  if (trigger.always) return true
  if (trigger.computerNotStormProof && !(s.computers.length > 0 && !s.stormProof)) return false
  if (trigger.singleStation && stationCount !== 1) return false
  if (trigger.batteryBelowComfort && !(ev.power.wear && ev.power.loadW > 0)) return false
  if (trigger.hasData && !s.instruments.some((i) => i.produces === trigger.hasData)) return false
  if (trigger.hasFinePointing && s.pointing !== 'fine') return false
  if (trigger.rookieOrNoEngineer && !ev.mods.rookieOrNoEngineer) return false
  return true
}

/** Design-driven cards that apply, in table order (fillers excluded). */
export function eligibleEvents(ev: Evaluation, stationCount: number): EventDef[] {
  return EVENTS.filter((e) => !e.filler && eventTriggers(e.trigger, ev, stationCount))
}

export interface ScheduledEvent {
  day: number
  event: EventDef
}

/**
 * Pick which cards a mission deals and on which days. Cards the design
 * triggers come first; filler cards top it up to two. Same seed, same deal.
 */
export function scheduleEvents(ev: Evaluation, stationCount: number, seed: number): ScheduledEvent[] {
  const rng = makeRng(seed)
  const triggered = shuffled(eligibleEvents(ev, stationCount), rng).slice(0, RULES.maxEvents)
  const fillers = shuffled(
    EVENTS.filter((e) => e.filler && eventTriggers(e.trigger, ev, stationCount)),
    rng,
  )
  const picked = [...triggered]
  while (picked.length < RULES.minEvents && fillers.length) picked.push(fillers.shift()!)

  const days = ev.contract.missionDays
  const n = picked.length
  const out: ScheduledEvent[] = []
  let last = 1
  picked.forEach((event, i) => {
    let day = Math.round((days * (i + 1)) / (n + 1))
    day = Math.max(last + 1, Math.min(days - 1, day))
    day = Math.min(days, Math.max(2, day))
    last = day
    out.push({ day, event })
  })
  return out
}

export interface PreviewContext {
  missionDays: number
  /** mission day the card comes up */
  day: number
  /** megabytes waiting on board when the card comes up */
  bufferMb: number
  /** megabytes delivered over a clean mission */
  cleanDeliveredMb: number
  /** the mission budget, for showing costs as a share */
  funds: number
}

/** Turn a choice's effect into bar previews. */
export function effectPreviews(effect: EventEffect, ctx: PreviewContext): EffectPreview[] {
  const out: EffectPreview[] = []
  const days = Math.max(1, ctx.missionDays)
  if (effect.dataDaysLost) {
    const d = effect.dataDaysLost
    out.push({
      bar: 'data',
      delta: -d / days,
      text: d === 1 ? '−1 day of data' : d < 1 ? '−half a day of data' : `−${num(d)} days of data`,
    })
  }
  if (effect.wipeStorage) {
    const share = ctx.cleanDeliveredMb > 0 ? Math.min(1, ctx.bufferMb / ctx.cleanDeliveredMb) : 0
    out.push({ bar: 'data', delta: -share, text: `−${num(Math.round(ctx.bufferMb))} MB waiting on board` })
  }
  if (effect.downlinkDaysLost) {
    const d = effect.downlinkDaysLost
    out.push({ bar: 'comms', delta: -d / days, text: `No contact for ${num(d)} day${d === 1 ? '' : 's'}` })
  }
  if (effect.scienceMult && effect.scienceMult !== 1) {
    const remaining = (days - ctx.day + 1) / days
    const change = effect.scienceMult - 1
    out.push({
      bar: 'data',
      delta: change * remaining,
      text: `${change > 0 ? '+' : '−'}${pct(Math.abs(change))}% science from here`,
    })
  }
  if (effect.lifetimeMult && effect.lifetimeMult !== 1) {
    const change = effect.lifetimeMult - 1
    out.push({ bar: 'time', delta: change, text: `${change > 0 ? '+' : '−'}${pct(Math.abs(change))}% orbital life` })
  }
  if (effect.cost) {
    out.push({
      bar: 'budget',
      delta: ctx.funds > 0 ? -effect.cost / ctx.funds : 0,
      text: `−${num(effect.cost)} coins`,
    })
  }
  return out
}
