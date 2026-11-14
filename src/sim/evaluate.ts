import { CONTRACT_BY_ID } from '../data/contracts'
import { COMMS_LEVELS, STOCK_MARKUP } from '../data/economy'
import { ORBIT_BY_ID } from '../data/orbits'
import { PARTS, PART_BY_ID } from '../data/parts'
import { ROCKETS, ROCKET_BY_ID } from '../data/rockets'
import { RAW_DATA_WORDS, RULES } from '../data/rules'
import { STATION_BY_ID } from '../data/stations'
import type {
  ContractDef,
  OrbitDef,
  OrbitId,
  PartDef,
  PartId,
  ResourceKey,
  RocketDef,
  RocketId,
  StationDef,
  StationId,
} from '../data/types'
import { crewModifiers, type CrewAssignment, type CrewMods } from './crew'
import { allPartIds, pointingMeets, pointingNeedWords, summarize, type Design, type DesignSummary } from './design'
import { clamp, monthsWords, num, pct, round, yearsWords } from './format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Everything needed to judge a design before launch. */
export interface EvalInput {
  design: Design
  contractId: string
  orbitId: OrbitId
  rocketId: RocketId
  stationIds: StationId[]
  /** coins on hand right now */
  bank: number
  /** grant not yet paid into the bank (default: the contract's grant; pass 0 if already credited) */
  grantPending?: number
  /** parts already bought and sitting in inventory; anything else is priced at the stock mark-up */
  ownedParts?: Record<PartId, number>
  crew?: CrewAssignment
  /** Comms Center level: sets the home dish's size (default 1) */
  commsLevel?: number
  /** player level; when given, locked parts / rockets / orbits / stations block the launch */
  level?: number
}

export type BarKey = ResourceKey | 'powerSun' | 'powerShadow'
export type BarStatus = 'ok' | 'warn' | 'bad'

/** One resource bar. `value` is the demand, `limit` the supply; the bar is full when they meet. */
export interface ResourceBar {
  key: BarKey
  label: string
  /** what the design needs */
  value: number
  /** what the design has */
  limit: number
  unit: string
  /** value / limit: above 1 means the demand isn't met */
  fill: number
  /** 1 − fill: the spare fraction (negative when short) */
  margin: number
  status: BarStatus
  /** one plain line when the bar isn't green */
  reason: string | null
  /** numbers for display, e.g. "3.3 / 12 kg" */
  detail: string
  /** in the efficiency sweet spot: at least 10% spare, and not overbuilt */
  sweet: boolean
  /** why the bar isn't in the sweet spot */
  sweetNote: string | null
  /** Power only: the sunlight and shadow checks */
  sub?: ResourceBar[]
}

export type StageId = 'instruments' | 'storage' | 'radio' | 'ground'

export interface PipelineStage {
  id: StageId
  label: string
  /** megabytes per day this link can handle */
  mbPerDay: number
  detail: string
}

/** The data chain: Instruments → Storage → Radio → Ground. */
export interface Pipeline {
  stages: PipelineStage[]
  /** nameplate output of the instruments this client accepts */
  madeIdealPerDay: number
  /** what they really make, after pointing and power */
  madePerDay: number
  storageMb: number
  downlinkPerDay: number
  /** min(made, storage, downlink) */
  deliveredPerDay: number
  /** megabytes per day the science target needs on the ground */
  neededPerDay: number
  /** the slowest link */
  bottleneck: StageId
  /** true when some data never gets home */
  losing: boolean
  /** delivered ÷ nameplate output */
  deliveredFraction: number
  /** fraction of the time the satellite has power to work (1 = always) */
  powerDuty: number
}

export interface StationLink {
  station: StationDef
  passesPerDay: number
  dishMbPerPass: number
  /** megabytes actually moved per pass: the smaller of radio and dish */
  mbPerPass: number
  mbPerDay: number
}

export interface CostBreakdown {
  /** list value of parts already in inventory */
  partsOwned: number
  /** parts still to buy, at the stock price */
  partsToBuy: number
  parts: number
  launch: number
  stations: number
  salaries: number
  total: number
  /** coins that must still leave the bank to launch */
  cashNeeded: number
  /** bank + pending grant */
  cash: number
  /** cash + value of owned parts: the whole mission budget */
  funds: number
  /** parts the design uses that aren't in inventory */
  missing: { partId: PartId; qty: number; priceEach: number }[]
}

export interface PowerNumbers {
  loadW: number
  solarW: number
  /** panel output needed in sunlight: load × 1.6 */
  needSunW: number
  batteryWh: number
  /** smallest battery that survives the shadow: 0.6 Wh per watt */
  minBatteryWh: number
  /** battery that stays healthy: 1.2 Wh per watt */
  comfortBatteryWh: number
  /** below `comfortBatteryWh`: the battery wears out early */
  wear: boolean
}

export interface SciencePrediction {
  /** science per megabyte: orbit sharpness × pointing × crew */
  quality: number
  /** clean prediction with no surprises */
  predicted: number
  target: number
  /** predicted ÷ target */
  pct: number
}

export interface LifetimeEstimate {
  years: number
  baseYears: number
  notes: string[]
}

export interface Evaluation {
  /** the six bars, by key */
  bars: Record<ResourceKey, ResourceBar>
  /** the six bars in display order: mass, power, budget, data, comms, time */
  barList: ResourceBar[]
  power: PowerNumbers
  mass: { kg: number; capacityKg: number }
  slots: { used: number; total: number; free: number }
  pipeline: Pipeline
  links: StationLink[]
  cost: CostBreakdown
  science: SciencePrediction
  lifetime: LifetimeEstimate
  buildMonths: number
  deadlineMonths: number
  /** months past the deadline (0 when on time) */
  lateMonths: number
  /** every bar in the sweet spot: earns the efficiency star */
  efficient: boolean
  /** false when the launch is physically or financially impossible */
  canLaunch: boolean
  /** why it can't launch, one short line each */
  blockers: string[]
  /** every amber or red finding, worst first */
  issues: { key: BarKey; status: BarStatus; text: string }[]
  summary: DesignSummary
  mods: CrewMods
  contract: ContractDef
  orbit: OrbitDef
  rocket: RocketDef
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_FILL = 9.99
const EPS = 1e-6
const ENOUGH = 1 / (1 - RULES.marginMin) // supply needed to keep a 10% margin over a demand

function bar(
  key: BarKey,
  label: string,
  value: number,
  limit: number,
  unit: string,
  detail: string,
): ResourceBar {
  const fill = limit > EPS ? Math.min(MAX_FILL, value / limit) : value > EPS ? MAX_FILL : 0
  return {
    key,
    label,
    value: round(value),
    limit: round(limit),
    unit,
    fill: round(fill, 4),
    margin: round(1 - fill, 4),
    status: 'ok',
    reason: null,
    detail,
    sweet: true,
    sweetNote: null,
  }
}

function flag(b: ResourceBar, status: BarStatus, reason: string): void {
  b.status = status
  b.reason = reason
}

/** Apply the shared margin rules: short → red, thin → amber and not sweet. */
function applyMargin(b: ResourceBar, shortReason: string, thinReason: string): void {
  if (b.value > b.limit + EPS) {
    flag(b, 'bad', shortReason)
    b.sweet = false
    b.sweetNote = shortReason
  } else if (b.margin < RULES.marginMin - EPS) {
    flag(b, 'warn', thinReason)
    b.sweet = false
    b.sweetNote = `Thin margin: only ${pct(Math.max(0, b.margin))}% to spare.`
  }
}

function overbuilt(b: ResourceBar, note: string | null): void {
  if (note && b.status !== 'bad' && b.margin > RULES.marginMax + EPS) {
    b.sweet = false
    b.sweetNote = note
  }
}

const worst = (a: BarStatus, b: BarStatus): BarStatus =>
  a === 'bad' || b === 'bad' ? 'bad' : a === 'warn' || b === 'warn' ? 'warn' : 'ok'

/**
 * Could the design get by with less of some supply? Tries removing one unit, or
 * swapping one unit for a cheaper part of the same kind. Returns a sentence, or null.
 */
function downsizeNote(
  parts: PartDef[],
  supplyOf: (p: PartDef) => number | undefined,
  total: number,
  mustKeep: number,
): string | null {
  const units = parts.filter((p) => (supplyOf(p) ?? 0) > 0)
  // most expensive first: that's the saving the player would care about
  const distinct = [...new Set(units)].sort((a, b) => b.cost - a.cost)
  for (const p of distinct) {
    if (total - (supplyOf(p) ?? 0) >= mustKeep - EPS) {
      return `You could drop the ${p.name} and still have plenty.`
    }
  }
  for (const p of distinct) {
    const cheaper = PARTS.filter(
      (q) => q.category === p.category && (supplyOf(q) ?? 0) > 0 && q.cost < p.cost,
    ).sort((a, b) => a.cost - b.cost)
    for (const q of cheaper) {
      const have = units.filter((u) => u.id === q.id).length
      if (have >= (q.maxPerSat ?? 1)) continue
      if (total - (supplyOf(p) ?? 0) + (supplyOf(q) ?? 0) >= mustKeep - EPS) {
        return `A ${q.name} would be enough instead of the ${p.name}.`
      }
    }
  }
  return null
}

function kindWords(contract: ContractDef): string {
  return RAW_DATA_WORDS[contract.acceptedData[0]].kind
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Judge a design against a contract, orbit, rocket and ground stations.
 * Returns the six resource bars with reasons, the data pipeline, costs and
 * whether it can launch. Pure: same input, same answer.
 */
export function evaluateDesign(input: EvalInput): Evaluation {
  const contract = CONTRACT_BY_ID[input.contractId]
  const orbit = ORBIT_BY_ID[input.orbitId]
  const rocket = ROCKET_BY_ID[input.rocketId]
  if (!contract) throw new Error(`Unknown contract "${input.contractId}"`)
  if (!orbit) throw new Error(`Unknown orbit "${input.orbitId}"`)
  if (!rocket) throw new Error(`Unknown rocket "${input.rocketId}"`)
  const stationIds = [...new Set(input.stationIds)].filter((id) => STATION_BY_ID[id])
  const stations = stationIds.map((id) => STATION_BY_ID[id])
  const mods = crewModifiers(input.crew)
  const s = summarize(input.design, mods)
  const comms = COMMS_LEVELS[clamp((input.commsLevel ?? 1) - 1, 0, COMMS_LEVELS.length - 1)]
  const blockers: string[] = []

  // ------------------------------------------------------------------ mass
  const reachable = rocket.orbits.includes(orbit.id)
  const capacityKg = round(rocket.capacityKg * orbit.capacityFactor)
  const mass = bar('mass', 'Mass', s.massKg, reachable ? capacityKg : 0, 'kg', `${num(s.massKg)} / ${num(capacityKg)} kg`)
  if (!reachable) {
    flag(mass, 'bad', `The ${rocket.name} can't reach ${orbit.name.toLowerCase()}`)
    mass.sweet = false
    mass.sweetNote = mass.reason
  } else {
    applyMargin(mass, `Too heavy for the ${rocket.name}`, 'Almost no lift to spare')
    const cheaper = ROCKETS.filter(
      (r) =>
        r.price < rocket.price &&
        r.orbits.includes(orbit.id) &&
        s.massKg * ENOUGH <= r.capacityKg * orbit.capacityFactor + EPS,
    ).sort((a, b) => a.price - b.price)[0]
    overbuilt(
      mass,
      cheaper ? `A ${cheaper.name} would carry this for ${num(rocket.price - cheaper.price)} coins less.` : null,
    )
  }

  // ------------------------------------------------------------------ power
  const sunFactor = orbit.sunFactor ?? RULES.sunFactor
  const shadowWhPerW = orbit.shadowWhPerW ?? RULES.shadowWhPerW
  const comfortWhPerW = shadowWhPerW * (RULES.comfortWhPerW / RULES.shadowWhPerW)
  const needSunW = round(s.loadW * sunFactor)
  const minBatteryWh = round(s.loadW * shadowWhPerW)
  const comfortBatteryWh = round(s.loadW * comfortWhPerW)

  const sun = bar(
    'powerSun',
    'Sunlight',
    needSunW,
    s.solarW,
    'W',
    `${num(s.solarW)} W from panels · needs ${num(needSunW)} W`,
  )
  applyMargin(
    sun,
    s.solarW <= EPS ? 'No solar panels' : 'Not enough solar power in sunlight',
    'Solar power is only just enough',
  )
  overbuilt(sun, downsizeNote(s.parts, (p) => p.solarW, s.solarW, needSunW * ENOUGH))

  const shadow = bar(
    'powerShadow',
    'Shadow',
    comfortBatteryWh,
    s.batteryWh,
    'Wh',
    `${num(s.batteryWh)} Wh battery · shadow needs ${num(minBatteryWh)} Wh`,
  )
  const wear = s.batteryWh < comfortBatteryWh - EPS
  if (s.batteryWh < minBatteryWh - EPS) {
    flag(shadow, 'bad', s.batteryWh <= EPS ? "No battery for Earth's shadow" : 'Battery too small for shadow')
    shadow.sweet = false
    shadow.sweetNote = shadow.reason
  } else if (wear) {
    flag(shadow, 'warn', 'Battery drains deep: it will wear out sooner')
    shadow.sweet = false
    shadow.sweetNote = 'The battery runs too deep every orbit.'
  } else if (shadow.margin < RULES.marginMin - EPS) {
    flag(shadow, 'warn', 'Battery is only just big enough')
    shadow.sweet = false
    shadow.sweetNote = `Thin margin: only ${pct(Math.max(0, shadow.margin))}% to spare.`
  }
  overbuilt(shadow, downsizeNote(s.parts, (p) => p.batteryWh, s.batteryWh, comfortBatteryWh * ENOUGH))

  const power = bar(
    'power',
    'Power',
    needSunW,
    s.solarW,
    'W',
    `${num(s.solarW)} W sun / ${num(needSunW)} W · ${num(s.batteryWh)} Wh / ${num(minBatteryWh)} Wh`,
  )
  power.fill = Math.max(sun.fill, shadow.fill)
  power.margin = Math.min(sun.margin, shadow.margin)
  power.status = worst(sun.status, shadow.status)
  const powerLead = [sun, shadow].sort(
    (a, b) => ['ok', 'warn', 'bad'].indexOf(b.status) - ['ok', 'warn', 'bad'].indexOf(a.status),
  )[0]
  power.reason = powerLead.reason
  power.sweet = sun.sweet && shadow.sweet
  power.sweetNote = sun.sweetNote ?? shadow.sweetNote
  power.sub = [sun, shadow]

  // how much of the time the satellite can actually work
  const sunDuty = needSunW > EPS ? clamp(s.solarW / needSunW, 0, 1) : 1
  const shadowFactor =
    minBatteryWh <= EPS ? 1 : s.batteryWh >= minBatteryWh - EPS ? 1 : s.batteryWh <= EPS ? 0 : (0.5 * s.batteryWh) / minBatteryWh
  const powerDuty = round(sunDuty * shadowFactor, 4)

  // ------------------------------------------------------------------ budget
  const owned: Record<PartId, number> = { ...(input.ownedParts ?? {}) }
  let partsOwned = 0
  let buyList = 0
  const missingCount: Record<PartId, number> = {}
  for (const id of allPartIds(input.design)) {
    const def = PART_BY_ID[id]
    if (!def) continue
    if ((owned[id] ?? 0) > 0) {
      owned[id] -= 1
      partsOwned += def.cost
    } else {
      missingCount[id] = (missingCount[id] ?? 0) + 1
      buyList += Math.round(def.cost * STOCK_MARKUP * mods.costMult)
    }
  }
  const launchCost = Math.round(rocket.price * mods.costMult)
  const stationCost = stations.reduce((n, st) => n + st.rent, 0)
  const totalCost = partsOwned + buyList + launchCost + stationCost + mods.salaries
  const cashNeeded = totalCost - partsOwned
  const cash = input.bank + (input.grantPending ?? contract.grant)
  const funds = cash + partsOwned
  const cost: CostBreakdown = {
    partsOwned,
    partsToBuy: buyList,
    parts: partsOwned + buyList,
    launch: launchCost,
    stations: stationCost,
    salaries: mods.salaries,
    total: totalCost,
    cashNeeded,
    cash,
    funds,
    missing: Object.entries(missingCount).map(([partId, qty]) => ({
      partId,
      qty,
      priceEach: Math.round(PART_BY_ID[partId].cost * STOCK_MARKUP * mods.costMult),
    })),
  }
  const budget = bar('budget', 'Budget', totalCost, funds, 'coins', `${num(totalCost)} of ${num(funds)} coins`)
  if (cashNeeded > cash + EPS) {
    flag(budget, 'bad', `Short by ${num(cashNeeded - cash)} coins`)
    budget.sweet = false
    budget.sweetNote = budget.reason
  } else if (budget.margin < RULES.reserveMin - EPS) {
    flag(budget, 'warn', 'Reserve under 10%')
    budget.sweet = false
    budget.sweetNote = 'Less than 10% of the budget is left in reserve.'
  }

  // ------------------------------------------------------------------ data + comms
  const accepted = s.instruments.filter((i) => contract.acceptedData.includes(i.produces))
  const working = accepted.filter((i) => i.working)
  const madeIdeal = accepted.reduce((n, i) => n + i.mbPerDay, 0)
  const madeNominal = working.reduce((n, i) => n + i.mbPerDay, 0)
  const made = round(madeNominal * powerDuty)
  const onboard = Math.min(made, s.storageMb)
  const quality = round(
    orbit.sharpness * (s.pointing === 'fine' ? RULES.finePointingScienceMult : 1) * mods.scienceMult,
    4,
  )
  const neededPerDay = round(contract.scienceTarget / contract.missionDays / quality)

  const radioMb = s.radio ? (s.radio.mbPerPass ?? 0) * mods.downlinkMult : 0
  const linkFor = (st: StationDef, mb: number): StationLink => {
    const home = st.id === 'home'
    const passes = home ? Math.round((st.passes[orbit.id] ?? 0) * (1 + comms.passBonus)) : (st.passes[orbit.id] ?? 0)
    const dish = home ? comms.dishMbPerPass : st.dishMbPerPass
    const perPass = Math.min(mb, dish)
    return {
      station: st,
      passesPerDay: passes,
      dishMbPerPass: dish,
      mbPerPass: round(perPass),
      mbPerDay: round(passes * perPass * powerDuty),
    }
  }
  const links = stations.map((st) => linkFor(st, radioMb))
  const passesPerDay = links.reduce((n, l) => n + l.passesPerDay, 0)
  const downlinkPerDay = round(links.reduce((n, l) => n + l.mbPerDay, 0))
  const radioRate = round(passesPerDay * radioMb * powerDuty)
  const groundRate = round(links.reduce((n, l) => n + l.passesPerDay * l.dishMbPerPass, 0))
  const deliveredPerDay = round(Math.min(onboard, downlinkPerDay))

  const data = bar(
    'data',
    'Data',
    neededPerDay,
    onboard,
    'MB/day',
    `${num(onboard)} MB/day on board · needs ${num(neededPerDay)}`,
  )
  if (onboard < neededPerDay - EPS) {
    let why: string
    if (!accepted.length) why = `No instrument that makes ${kindWords(contract)}`
    else if (!working.length)
      why = `${accepted[0].part.name} needs ${pointingNeedWords(accepted[0].part.needsPointing ?? 'coarse')}`
    else if (!s.computers.length) why = 'No computer to store the data'
    else if (powerDuty < 1 - EPS && Math.min(madeNominal, s.storageMb) >= neededPerDay) why = 'Not enough power to run the instrument'
    else if (s.storageMb < made && s.storageMb < neededPerDay) why = "Computer too small for a day's data"
    else why = `${working[0].part.name} makes too little for this job`
    flag(data, 'bad', why)
    data.sweet = false
    data.sweetNote = why
  } else if (data.margin < RULES.marginMin - EPS) {
    flag(data, 'warn', 'Barely enough data for the target')
    data.sweet = false
    data.sweetNote = `Thin margin: only ${pct(Math.max(0, data.margin))}% to spare.`
  } else if (s.storageMb < made - EPS) {
    flag(data, 'warn', 'Computer fills up: some data is overwritten')
  } else if (working.length < accepted.length) {
    const idle = accepted.find((i) => !i.working)!
    flag(data, 'warn', `${idle.part.name} needs ${pointingNeedWords(idle.part.needsPointing ?? 'coarse')}`)
  }

  const commsBar = bar(
    'comms',
    'Comms',
    neededPerDay,
    downlinkPerDay,
    'MB/day',
    `${num(downlinkPerDay)} MB/day home · needs ${num(neededPerDay)}`,
  )
  if (downlinkPerDay < neededPerDay - EPS) {
    let why: string
    if (!s.radios.length) why = 'No radio on board'
    else if (!s.radio) why = `${s.radios[0].name} needs reaction wheels to aim`
    else if (!stations.length) why = 'No ground station picked'
    else if (passesPerDay === 0) why = 'No station sees this orbit'
    else if (powerDuty < 1 - EPS && downlinkPerDay / Math.max(powerDuty, EPS) >= neededPerDay) why = 'Not enough power to run the radio'
    else if (radioRate >= neededPerDay && groundRate < radioRate) why = 'The dish is too slow for this radio'
    else why = "Radio can't bring enough data home"
    flag(commsBar, 'bad', why)
    commsBar.sweet = false
    commsBar.sweetNote = why
  } else if (commsBar.margin < RULES.marginMin - EPS) {
    flag(commsBar, 'warn', 'Downlink is only just enough')
    commsBar.sweet = false
    commsBar.sweetNote = `Thin margin: only ${pct(Math.max(0, commsBar.margin))}% to spare.`
  }
  if (commsBar.status !== 'bad' && commsBar.margin > RULES.marginMax + EPS) {
    let note: string | null = null
    const mustKeep = neededPerDay * ENOUGH
    if (links.length > 1) {
      const droppable = [...links]
        .filter((l) => l.station.rent > 0 && downlinkPerDay - l.mbPerDay >= mustKeep - EPS)
        .sort((a, b) => b.station.rent - a.station.rent)[0]
      if (droppable) note = `You could drop the ${droppable.station.name} and save ${num(droppable.station.rent)} coins.`
    }
    if (!note && s.radio) {
      const cheaper = PARTS.filter(
        (q) =>
          q.category === 'comms' &&
          q.cost < s.radio!.cost &&
          pointingMeets(s.pointing, q.needsPointing),
      ).sort((a, b) => a.cost - b.cost)
      for (const q of cheaper) {
        const total = stations.reduce(
          (n, st) => n + linkFor(st, (q.mbPerPass ?? 0) * mods.downlinkMult).mbPerDay,
          0,
        )
        if (total >= mustKeep - EPS) {
          note = `A ${q.name} would be enough instead of the ${s.radio.name}.`
          break
        }
      }
    }
    overbuilt(commsBar, note)
  }

  // the slowest link
  const losing = deliveredPerDay < made - EPS
  let bottleneck: StageId = 'instruments'
  if (losing) {
    if (s.storageMb <= downlinkPerDay) bottleneck = 'storage'
    else if (s.radio && passesPerDay === 0) bottleneck = 'ground'
    else bottleneck = groundRate < radioRate ? 'ground' : 'radio'
  }
  const instrumentNames = working.length
    ? working.map((i) => i.part.name).join(' + ')
    : accepted.length
      ? `${accepted[0].part.name} (can't point)`
      : 'No instrument'
  const pipeline: Pipeline = {
    stages: [
      { id: 'instruments', label: 'Instruments', mbPerDay: made, detail: `${instrumentNames}: ${num(made)} MB a day` },
      {
        id: 'storage',
        label: 'Storage',
        mbPerDay: s.storageMb,
        detail: s.computers.length ? `${s.computers.map((c) => c.name).join(' + ')}: holds ${num(s.storageMb)} MB` : 'No computer',
      },
      {
        id: 'radio',
        label: 'Radio',
        mbPerDay: radioRate,
        detail: s.radio
          ? `${s.radio.name}: ${num(radioMb)} MB × ${passesPerDay} passes`
          : s.radios.length
            ? `${s.radios[0].name} can't aim`
            : 'No radio',
      },
      {
        id: 'ground',
        label: 'Ground',
        mbPerDay: groundRate,
        detail: stations.length
          ? `${stations.length} dish${stations.length === 1 ? '' : 'es'}: ${passesPerDay} passes a day`
          : 'No station',
      },
    ],
    madeIdealPerDay: madeIdeal,
    madePerDay: made,
    storageMb: s.storageMb,
    downlinkPerDay,
    deliveredPerDay,
    neededPerDay,
    bottleneck,
    losing,
    deliveredFraction: madeIdeal > 0 ? round(deliveredPerDay / madeIdeal, 4) : 0,
    powerDuty,
  }

  const predicted = round(deliveredPerDay * contract.missionDays * quality)
  const science: SciencePrediction = {
    quality,
    predicted,
    target: contract.scienceTarget,
    pct: round(predicted / contract.scienceTarget, 4),
  }

  // ------------------------------------------------------------------ time + lifetime
  const buildMonths = round(RULES.baseBuildMonths + s.partBuildMonths + mods.buildMonths)
  const baseYears = orbit.lifetimeYears + s.extraLifeYears
  const lifeNotes: string[] = [`${orbit.name}: about ${yearsWords(orbit.lifetimeYears)}`]
  if (s.extraLifeYears > 0) lifeNotes.push(`Thruster: +${yearsWords(s.extraLifeYears)}`)
  let lifeMult = mods.lifetimeMult
  if (s.batteryWh < minBatteryWh - EPS) {
    lifeMult *= RULES.batteryFailLifeMult
    lifeNotes.push('Battery too small: the satellite keeps browning out')
  } else if (wear) {
    lifeMult *= RULES.batteryWearLifeMult
    lifeNotes.push('Battery drains deep every orbit and wears out early')
  }
  if (mods.lifetimeMult !== 1) lifeNotes.push('A careful crew makes it last longer')
  const lifetime: LifetimeEstimate = { years: round(baseYears * lifeMult), baseYears, notes: lifeNotes }

  const lateMonths = Math.max(0, Math.ceil(buildMonths - contract.deadlineMonths - EPS))
  const time = bar(
    'time',
    'Time',
    buildMonths,
    contract.deadlineMonths,
    'months',
    `${num(buildMonths)} of ${num(contract.deadlineMonths)} months · lasts ${yearsWords(lifetime.years)}`,
  )
  applyMargin(time, `${monthsWords(lateMonths)} past the deadline`, 'Tight schedule')

  // ------------------------------------------------------------------ blockers
  if (!s.bus) blockers.push('Pick a bus first.')
  if (s.bus && s.slotsUsed > s.slotsTotal)
    blockers.push(`Too many parts: ${s.slotsUsed} in ${s.slotsTotal} slots.`)
  const counts: Record<PartId, number> = {}
  for (const p of s.parts) counts[p.id] = (counts[p.id] ?? 0) + 1
  for (const [id, n] of Object.entries(counts)) {
    const def = PART_BY_ID[id]
    const max = def.maxPerSat ?? 1
    if (n > max) blockers.push(`Only ${max} ${def.name} fit${max === 1 ? 's' : ''} on one satellite.`)
  }
  if (!reachable) blockers.push(`The ${rocket.name} can't reach ${orbit.name.toLowerCase()}.`)
  else if (s.massKg > capacityKg + EPS)
    blockers.push(`Too heavy: ${num(s.massKg)} kg, and the ${rocket.name} lifts ${num(capacityKg)} kg.`)
  if (!contract.allowedOrbits.includes(orbit.id)) {
    const names = contract.allowedOrbits.map((id) => ORBIT_BY_ID[id].name.toLowerCase()).join(' or ')
    blockers.push(`${contract.client} needs a ${names}.`)
  }
  if (!stations.length) blockers.push('Pick at least one ground station.')
  if (cashNeeded > cash + EPS) blockers.push(`Not enough coins: short by ${num(cashNeeded - cash)}.`)
  if (input.level !== undefined) {
    const lvl = input.level
    const lockedPart = (s.bus ? [s.bus, ...s.parts] : s.parts).find((p) => p.unlockLevel > lvl)
    if (lockedPart) blockers.push(`${lockedPart.name} unlocks at level ${lockedPart.unlockLevel}.`)
    if (rocket.unlockLevel > lvl) blockers.push(`${rocket.name} unlocks at level ${rocket.unlockLevel}.`)
    if (orbit.unlockLevel > lvl) blockers.push(`${orbit.name} unlocks at level ${orbit.unlockLevel}.`)
    const lockedStation = stations.find((st) => st.unlockLevel > lvl)
    if (lockedStation) blockers.push(`${lockedStation.name} unlocks at level ${lockedStation.unlockLevel}.`)
  }

  const bars: Record<ResourceKey, ResourceBar> = { mass, power, budget, data, comms: commsBar, time }
  const barList = [mass, power, budget, data, commsBar, time]
  const issues = [mass, sun, shadow, budget, data, commsBar, time]
    .filter((b) => b.status !== 'ok' && b.reason)
    .map((b) => ({ key: b.key, status: b.status, text: b.reason as string }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'bad' ? -1 : 1))

  return {
    bars,
    barList,
    power: {
      loadW: s.loadW,
      solarW: s.solarW,
      needSunW,
      batteryWh: s.batteryWh,
      minBatteryWh,
      comfortBatteryWh,
      wear,
    },
    mass: { kg: s.massKg, capacityKg },
    slots: { used: s.slotsUsed, total: s.slotsTotal, free: Math.max(0, s.slotsTotal - s.slotsUsed) },
    pipeline,
    links,
    cost,
    science,
    lifetime,
    buildMonths,
    deadlineMonths: contract.deadlineMonths,
    lateMonths,
    efficient: barList.every((b) => b.sweet),
    canLaunch: blockers.length === 0,
    blockers,
    issues,
    summary: s,
    mods,
    contract,
    orbit,
    rocket,
  }
}
