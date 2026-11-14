import { XP_PER_STAR } from '../data/economy'
import { BAR_NAMES, REASONS, type ReasonId, type ReasonTone } from '../data/reasons'
import { RAW_DATA_WORDS, RULES } from '../data/rules'
import type { EventDef, EventEffect, RawDataType, ResourceKey } from '../data/types'
import { skillUps, type SkillUp } from './crew'
import { evaluateDesign, type EvalInput, type Evaluation, type StageId } from './evaluate'
import { effectPreviews, scheduleEvents, type PlannedEvent } from './events'
import { clamp, fill, fractionWords, monthsWords, num, pct, round, yearsWords } from './format'
import { closestNasaMission, profileOf, type MissionMatch } from './match'
import { hashString } from './rng'

/**
 * Mission simulation and debrief. Pure and deterministic: the same design,
 * choices and seed always give the same result, so a free "test run" predicts
 * exactly what a real launch with the same choices would do.
 */

export interface MissionInput extends EvalInput {
  /** fixes which event cards come up; defaults to a hash of the design and contract */
  seed?: number
  /** the player's swipe on each card, by event id; missing cards use their default */
  choices?: Record<string, 'a' | 'b'>
  /** 0–1 from the launch mini-game; leave out for the autopilot */
  flightQuality?: number
}

export interface DayLog {
  /** mission day, starting at 1 */
  day: number
  madeMb: number
  deliveredMb: number
  lostMb: number
  science: number
  /** running total of science on the ground */
  scienceTotal: number
  /** the slowest link that day */
  bottleneck: StageId
  /** false on days the instruments were off */
  working: boolean
  /** false on days with no ground contact */
  contact: boolean
  /** id of the event card that came up this day */
  eventId?: string
}

export interface MissionPlan {
  evaluation: Evaluation
  /** the cards this mission will deal, in day order, with previews for each choice */
  events: PlannedEvent[]
  seed: number
}

export interface Payout {
  baseFee: number
  /** fraction of the base fee kept after lateness and thin science (1 = all of it) */
  feeKept: number
  feePaid: number
  sciencePay: number
  grant: number
  income: number
  parts: number
  launch: number
  stations: number
  salaries: number
  eventCosts: number
  cost: number
  profit: number
}

export interface DebriefReason {
  id: ReasonId
  tone: ReasonTone
  /** what happened */
  text: string
  /** what would fix it */
  fix: string | null
  /** impact used for ranking */
  weight: number
}

export type StarId = 'science' | 'profit' | 'efficiency'

export interface StarResult {
  id: StarId
  earned: boolean
  label: string
  note: string
}

/** Raw data a satellite keeps sending after its mission, for the lab economy. */
export interface OrbitProduction {
  /** megabytes reaching the ground per in-game day, by raw type */
  mbPerDay: Partial<Record<RawDataType, number>>
  /** orbital lifetime in years */
  lifetimeYears: number
}

export interface MissionResult {
  evaluation: Evaluation
  days: DayLog[]
  events: { event: PlannedEvent; choice: 'a' | 'b' }[]
  totals: { madeMb: number; deliveredMb: number; lostMb: number; deliveredFraction: number }
  science: { delivered: number; target: number; pct: number }
  stars: number
  starList: StarResult[]
  /** the top three reasons for the result, most important first */
  reasons: DebriefReason[]
  /** every finding, ranked */
  allReasons: DebriefReason[]
  payout: Payout
  xp: number
  skillUps: SkillUp[]
  lifetimeYears: number
  flightQuality: number
  autopilot: boolean
  match: MissionMatch
  production: OrbitProduction
  seed: number
}

function defaultSeed(input: EvalInput): number {
  return hashString(`${input.contractId}|${input.orbitId}|${input.design.busId}|${[...input.design.parts].sort().join(',')}`)
}

function plannedFrom(ev: Evaluation, stationCount: number, seed: number): PlannedEvent[] {
  const days = ev.contract.missionDays
  const cleanDelivered = ev.pipeline.deliveredPerDay * days
  return scheduleEvents(ev, stationCount, seed).map(({ day, event }) => {
    const ctx = {
      missionDays: days,
      day,
      bufferMb: Math.min(ev.pipeline.storageMb, ev.pipeline.madePerDay),
      cleanDeliveredMb: cleanDelivered,
      funds: ev.cost.funds,
    }
    return {
      id: event.id,
      day,
      title: event.title,
      text: event.text,
      basis: event.basis,
      choices: [
        { ...event.choices[0], previews: effectPreviews(event.choices[0].effect, ctx) },
        { ...event.choices[1], previews: effectPreviews(event.choices[1].effect, ctx) },
      ],
      defaultChoice: event.defaultChoice,
      filler: !!event.filler,
    }
  })
}

/** Deal the event cards for a mission before it runs, so the UI can show them. */
export function planMission(input: MissionInput): MissionPlan {
  const evaluation = evaluateDesign(input)
  const seed = input.seed ?? defaultSeed(input)
  return { evaluation, events: plannedFrom(evaluation, input.stationIds.length, seed), seed }
}

function effectOf(event: PlannedEvent, choice: 'a' | 'b'): EventEffect {
  return (choice === 'a' ? event.choices[0] : event.choices[1]).effect
}

/** Fly the mission day by day and write the debrief. */
export function simulateMission(input: MissionInput): MissionResult {
  const seed = input.seed ?? defaultSeed(input)
  const ev = evaluateDesign(input)
  const planned = plannedFrom(ev, input.stationIds.length, seed)
  const autopilot = input.flightQuality === undefined
  const flightQuality = clamp(input.flightQuality ?? RULES.autopilotQuality, 0, 1)
  const p = ev.pipeline
  const nDays = ev.contract.missionDays

  // ---- lay the chosen event effects onto the calendar ----
  const dataOff = new Array<number>(nDays + 2).fill(0) // fraction of each day with instruments off
  const linkOff = new Array<number>(nDays + 2).fill(0) // fraction of each day with no contact
  const wipeDay = new Set<number>()
  const sciMult = new Array<number>(nDays + 2).fill(1)
  let lifeMult = 1
  let eventCosts = 0
  const chosen = planned.map((event) => ({ event, choice: input.choices?.[event.id] ?? event.defaultChoice }))
  const spread = (arr: number[], from: number, amount: number) => {
    let left = amount
    for (let d = from; d <= nDays && left > 0; d++) {
      const take = Math.min(1 - arr[d], left)
      arr[d] += take
      left -= take
    }
  }
  for (const { event, choice } of chosen) {
    const e = effectOf(event, choice)
    if (e.dataDaysLost) spread(dataOff, event.day, e.dataDaysLost)
    if (e.downlinkDaysLost) spread(linkOff, event.day, e.downlinkDaysLost)
    if (e.wipeStorage) wipeDay.add(event.day)
    if (e.scienceMult) for (let d = event.day; d <= nDays; d++) sciMult[d] *= e.scienceMult
    if (e.lifetimeMult) lifeMult *= e.lifetimeMult
    if (e.cost) eventCosts += e.cost
  }

  // ---- day by day: delivered = min(made, storage, downlink); the rest is lost ----
  const days: DayLog[] = []
  let made = 0
  let delivered = 0
  let science = 0
  for (let d = 1; d <= nDays; d++) {
    const madeToday = p.madePerDay * (1 - dataOff[d])
    const held = wipeDay.has(d) ? 0 : Math.min(madeToday, p.storageMb)
    const linkToday = p.downlinkPerDay * (1 - linkOff[d])
    const sent = Math.min(held, linkToday)
    const sci = sent * ev.science.quality * sciMult[d]
    made += madeToday
    delivered += sent
    science += sci
    let bottleneck: StageId = p.bottleneck
    if (madeToday <= 0) bottleneck = 'instruments'
    else if (sent >= madeToday - 1e-6) bottleneck = 'instruments'
    else if (wipeDay.has(d) || p.storageMb < Math.min(madeToday, linkToday)) bottleneck = 'storage'
    else if (linkOff[d] >= 1) bottleneck = 'ground'
    else bottleneck = p.bottleneck === 'instruments' || p.bottleneck === 'storage' ? 'radio' : p.bottleneck
    days.push({
      day: d,
      madeMb: round(madeToday, 1),
      deliveredMb: round(sent, 1),
      lostMb: round(Math.max(0, madeToday - sent), 1),
      science: round(sci, 1),
      scienceTotal: round(science, 1),
      bottleneck,
      working: dataOff[d] < 1,
      contact: linkOff[d] < 1,
      eventId: chosen.find((c) => c.event.day === d)?.event.id,
    })
  }
  science = round(science, 1)
  const target = ev.contract.scienceTarget
  const sciencePct = target > 0 ? science / target : 1
  const deliveredFraction = p.madeIdealPerDay > 0 ? delivered / (p.madeIdealPerDay * nDays) : 0

  // ---- lifetime: a sloppy ride to orbit and some event choices shorten it ----
  const launchLife = RULES.sloppyLaunchLifeFloor + (1 - RULES.sloppyLaunchLifeFloor) * flightQuality
  const lifetimeYears = round(ev.lifetime.years * lifeMult * launchLife, 2)

  // ---- money ----
  const c = ev.contract
  const lateCut = Math.min(1 - RULES.lateFeeFloor, ev.lateMonths * RULES.latePenaltyPerMonth)
  const scienceKeep = sciencePct >= RULES.fullFeeSciencePct ? 1 : sciencePct / RULES.fullFeeSciencePct
  const feeKept = round((1 - lateCut) * scienceKeep, 3)
  const feePaid = Math.round(c.baseFee * feeKept)
  const sciencePay = Math.round(c.payPerScience * Math.min(science, target * RULES.sciencePayCap))
  const income = feePaid + sciencePay + c.grant
  const cost = ev.cost.parts + ev.cost.launch + ev.cost.stations + ev.cost.salaries + eventCosts
  const payout: Payout = {
    baseFee: c.baseFee,
    feeKept,
    feePaid,
    sciencePay,
    grant: c.grant,
    income,
    parts: ev.cost.parts,
    launch: ev.cost.launch,
    stations: ev.cost.stations,
    salaries: ev.cost.salaries,
    eventCosts,
    cost,
    profit: income - cost,
  }

  // ---- stars ----
  const starList: StarResult[] = [
    {
      id: 'science',
      earned: science >= target,
      label: 'Science target met',
      note: `${num(Math.round(science))} of ${num(target)} science`,
    },
    {
      id: 'profit',
      earned: payout.profit >= 0,
      label: 'Made a profit',
      note: `${payout.profit >= 0 ? '+' : '−'}${num(Math.abs(payout.profit))} coins`,
    },
    {
      id: 'efficiency',
      earned: ev.efficient,
      label: 'Efficient design',
      note: ev.efficient ? 'Every margin between 10% and 50%' : 'Some margins too thin or too fat',
    },
  ]
  const stars = starList.filter((s) => s.earned).length

  // ---- reasons ----
  const allReasons = rankReasons(ev, {
    chosen,
    sciencePct,
    science,
    deliveredFraction,
    payout,
    lateCut,
    flightQuality,
    autopilot,
    lifetimeYears,
    stars,
    nDays,
  })
  const reasons = pickTopThree(allReasons, stars)

  return {
    evaluation: ev,
    days,
    events: chosen,
    totals: {
      madeMb: round(made, 1),
      deliveredMb: round(delivered, 1),
      lostMb: round(Math.max(0, made - delivered), 1),
      deliveredFraction: round(deliveredFraction, 3),
    },
    science: { delivered: science, target, pct: round(sciencePct, 3) },
    stars,
    starList,
    reasons,
    allReasons,
    payout,
    xp: stars * c.difficulty * XP_PER_STAR,
    skillUps: skillUps(input.crew),
    lifetimeYears,
    flightQuality,
    autopilot,
    match: closestNasaMission(profileOf(ev)),
    production: orbitProduction(ev, lifetimeYears),
    seed,
  }
}

/**
 * Free rehearsal: the same simulation with default event choices and the
 * autopilot. No side effects; use it to predict the stars before committing.
 */
export function testRun(input: EvalInput & { seed?: number }): MissionResult {
  return simulateMission({ ...input, choices: undefined, flightQuality: undefined })
}

// ------------------------------------------------------------------ reasons
interface ReasonCtx {
  chosen: { event: PlannedEvent; choice: 'a' | 'b' }[]
  sciencePct: number
  science: number
  deliveredFraction: number
  payout: Payout
  lateCut: number
  flightQuality: number
  autopilot: boolean
  lifetimeYears: number
  stars: number
  nDays: number
}

function reason(id: ReasonId, weight: number, values: Record<string, string | number> = {}): DebriefReason {
  const t = REASONS[id]
  return { id, tone: t.tone, text: fill(t.text, values), fix: t.fix ? fill(t.fix, values) : null, weight }
}

function rankReasons(ev: Evaluation, ctx: ReasonCtx): DebriefReason[] {
  const out: DebriefReason[] = []
  const s = ev.summary
  const p = ev.pipeline
  const pw = ev.power
  const accepted = ev.contract.acceptedData
  const mine = s.instruments.filter((i) => accepted.includes(i.produces))
  const kindKey: RawDataType = mine[0]?.produces ?? accepted[0]
  const kind = RAW_DATA_WORDS[kindKey].plural
  // the data chain is judged on a clean day; event losses get their own lines
  const chain = p.deliveredFraction
  const lost = 1 - chain

  // ---- the data chain, link by link ----
  if (mine.length === 0) {
    out.push(reason('noInstrument', 100, { kind: RAW_DATA_WORDS[accepted[0]].kind }))
  } else {
    const blind = mine.find((i) => !i.working)
    if (blind) {
      out.push(
        reason('instrumentPointing', mine.every((i) => !i.working) ? 96 : 55, {
          part: blind.part.name,
          need: blind.part.needsPointing === 'fine' ? 'reaction wheels for fine pointing' : 'magnetorquers at least',
        }),
      )
    }
  }
  if (pw.loadW > 0) {
    if (pw.solarW <= 0) out.push(reason('noSolar', 98))
    else if (p.powerDuty < 0.999)
      out.push(
        reason('powerShort', 60 + (1 - p.powerDuty) * 38, {
          pct: pct(p.powerDuty),
          have: num(pw.solarW),
          need: num(round(pw.needSunW, 1)),
        }),
      )
    if (pw.batteryWh <= 0) out.push(reason('noBattery', 97))
    else if (pw.batteryWh < pw.minBatteryWh) out.push(reason('batterySmall', 82, { need: num(round(pw.minBatteryWh, 1)) }))
    else if (pw.wear) out.push(reason('batteryWear', 30, { years: yearsWords(ctx.lifetimeYears) }))
  }
  if (mine.some((i) => i.working)) {
    if (s.computers.length === 0) out.push(reason('noComputer', 96))
    if (s.radios.length === 0) out.push(reason('noRadio', 96))
    else if (!s.radio) out.push(reason('radioPointing', 94, { part: s.radios[0].name }))
    else if (ev.links.every((l) => l.passesPerDay <= 0)) out.push(reason('noPasses', 93))
    else if (lost > 0.02 && p.madePerDay > 0) {
      const fraction = fractionWords(chain)
      if (p.bottleneck === 'storage') out.push(reason('storageFull', 48 + lost * 42, { fraction: fractionWords(lost), kind }))
      else if (p.bottleneck === 'ground') out.push(reason('dishSlow', 48 + lost * 42, { fraction, kind }))
      else if (p.bottleneck === 'radio') out.push(reason('downlinkShort', 48 + lost * 42, { fraction, kind }))
    }
  }

  // ---- event cards ----
  for (const { event, choice } of ctx.chosen) {
    const picked = choice === 'a' ? event.choices[0] : event.choices[1]
    const dataDelta = picked.previews.filter((x) => x.bar === 'data' || x.bar === 'comms').reduce((a, x) => a + x.delta, 0)
    const worst = [...picked.previews].sort((a, b) => a.delta - b.delta)[0]
    if (dataDelta > 0.01) {
      out.push(reason('eventBonus', 18 + dataDelta * 40, { event: event.title, choice: picked.label, amount: `${pct(dataDelta)}%` }))
    } else if (worst && worst.delta < -0.01) {
      out.push(
        reason('eventLoss', 22 + Math.min(1, -worst.delta) * 50, {
          event: event.title,
          choice: picked.label,
          amount: worst.text.replace(/^−/, '').replace(/^No contact for (.+)$/, '$1 of ground contact'),
        }),
      )
    }
  }

  // ---- schedule, money, margins ----
  if (ev.lateMonths > 0) out.push(reason('late', 42 + ctx.lateCut * 60, { months: monthsWords(ev.lateMonths), pct: pct(ctx.lateCut) }))
  if (ctx.payout.profit < 0) {
    const bills: [string, number][] = [
      ['Parts', ctx.payout.parts],
      ['The launch', ctx.payout.launch],
      ['Ground stations', ctx.payout.stations],
      ['Salaries', ctx.payout.salaries],
    ]
    bills.sort((a, b) => b[1] - a[1])
    out.push(reason('loss', 70, { cost: num(ctx.payout.cost), income: num(ctx.payout.income), biggest: bills[0][0] }))
  }
  if (ev.bars.budget.status !== 'ok' && ctx.payout.profit >= 0) out.push(reason('thinReserve', 26))
  const thin = (Object.keys(ev.bars) as ResourceKey[])
    .flatMap((k) => (ev.bars[k].sub?.length ? ev.bars[k].sub! : [ev.bars[k]]))
    .filter((b) => b.key !== 'budget' && b.status !== 'bad' && b.margin >= 0 && b.margin < RULES.marginMin)
    .sort((a, b) => a.margin - b.margin)[0]
  if (thin) out.push(reason('thinMargin', 21, { bar: BAR_NAMES[thin.key], pct: pct(Math.max(0, thin.margin)) }))
  const fat = (Object.keys(ev.bars) as ResourceKey[])
    .flatMap((k) => (ev.bars[k].sub?.length ? ev.bars[k].sub! : [ev.bars[k]]))
    .filter((b) => !b.sweet && b.sweetNote && b.margin > RULES.marginMax)
    .sort((a, b) => b.margin - a.margin)[0]
  if (fat?.sweetNote) out.push(reason('overbuilt', 16, { note: fat.sweetNote }))
  if (!ctx.autopilot && ctx.flightQuality < 0.75) {
    const cut = 1 - (RULES.sloppyLaunchLifeFloor + (1 - RULES.sloppyLaunchLifeFloor) * ctx.flightQuality)
    out.push(reason('sloppyLaunch', 24 + cut * 40, { amount: `${pct(cut)}%` }))
  }

  // ---- the verdict lines ----
  if (ctx.sciencePct < 1) out.push(reason('scienceMissed', 44, { pct: pct(ctx.sciencePct) }))
  else if (ctx.sciencePct < 1.1) out.push(reason('scienceMetBarely', 13))
  else out.push(reason('scienceMet', 13, { pct: pct(ctx.sciencePct - 1) }))
  if (chain >= 0.95 && p.madePerDay > 0) out.push(reason('allHome', 10, { fraction: chain >= 0.995 ? 'all' : 'nearly all', kind }))
  if (ctx.payout.profit >= 0)
    out.push(reason('profit', 11, { income: num(ctx.payout.income), cost: num(ctx.payout.cost), profit: num(ctx.payout.profit) }))
  if (ev.efficient) out.push(reason('efficient', 14))

  return out.sort((a, b) => b.weight - a.weight)
}

/**
 * The debrief shows three reasons. Problems come first, most damaging on top;
 * a clean mission is explained by what went right.
 */
function pickTopThree(all: DebriefReason[], stars: number): DebriefReason[] {
  const problems = all.filter((r) => r.tone !== 'good')
  const good = all.filter((r) => r.tone === 'good')
  // the generic "science missed" line only earns a slot when nothing more specific explains it
  const specific = problems.filter((r) => r.id !== 'scienceMissed')
  const generic = problems.filter((r) => r.id === 'scienceMissed')
  const picked = stars === 3 ? [...good, ...problems] : [...specific, ...generic, ...good]
  return picked.slice(0, 3)
}

// ------------------------------------------------------------------ after the mission
/**
 * What a satellite keeps sending home once its mission is over. Every working
 * instrument counts (not just the ones the client asked for), squeezed through
 * the same storage and downlink limits.
 */
export function orbitProduction(ev: Evaluation, lifetimeYears: number): OrbitProduction {
  const p = ev.pipeline
  const working = ev.summary.instruments.filter((i) => i.working)
  const made: Partial<Record<RawDataType, number>> = {}
  let total = 0
  for (const i of working) {
    const mb = i.mbPerDay * p.powerDuty
    made[i.produces] = (made[i.produces] ?? 0) + mb
    total += mb
  }
  const through = Math.min(total, p.storageMb, p.downlinkPerDay)
  const share = total > 0 ? through / total : 0
  const mbPerDay: Partial<Record<RawDataType, number>> = {}
  for (const k of Object.keys(made) as RawDataType[]) mbPerDay[k] = round((made[k] ?? 0) * share, 1)
  return { mbPerDay, lifetimeYears }
}

/** The event definition behind a planned card. */
export type { EventDef }
