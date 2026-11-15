import { describe, expect, it } from 'vitest'
import { XP_PER_STAR } from '../data/economy'
import { RECIPE_BY_ID } from '../data/lab'
import { RULES } from '../data/rules'
import type { OrbitId, RocketId, StationId } from '../data/types'
import {
  addPart,
  canStart,
  closestNasaMission,
  consumeInputs,
  crewModifiers,
  dailyRawUnits,
  evaluateDesign,
  goNoGo,
  orderValue,
  partLock,
  planMission,
  profileOf,
  removePart,
  simulateMission,
  storeRaw,
  testRun,
  type Design,
  type EvalInput,
} from './index'

const first = (parts: string[], extra: Partial<EvalInput> = {}): EvalInput => ({
  design: { busId: 'bus3u', parts },
  contractId: 'firstLight',
  orbitId: 'leo' as OrbitId,
  rocketId: 'rideshare' as RocketId,
  stationIds: ['home'] as StationId[],
  bank: 2000,
  ...extra,
})
const CORE = ['radioUhf', 'cpuBasic', 'magnetorquers', 'camWide']
const NAIVE = ['deployPanels', 'batterySmall', ...CORE]

describe('mission 1 check numbers', () => {
  const ev = evaluateDesign(first(NAIVE))
  it('camera + UHF + basic computer + magnetorquers draw 7 W', () => {
    expect(ev.power.loadW).toBeCloseTo(7)
  })
  it('needs 11.2 W in sunlight (load × 1.6)', () => {
    expect(ev.power.needSunW).toBeCloseTo(11.2)
  })
  it('needs at least 4.2 Wh of battery for the shadow', () => {
    expect(ev.power.minBatteryWh).toBeCloseTo(4.2)
  })
  it('makes 200 MB a day but one home dish brings down only 100', () => {
    expect(ev.pipeline.madePerDay).toBeCloseTo(200)
    expect(ev.pipeline.downlinkPerDay).toBeCloseTo(100)
    expect(ev.pipeline.deliveredPerDay).toBeCloseTo(100)
    expect(ev.pipeline.deliveredFraction).toBeCloseTo(0.5)
  })
})

describe('power', () => {
  it('body cells alone fail the sunlight check', () => {
    const ev = evaluateDesign(first(['bodyCells', 'batterySmall', ...CORE]))
    expect(ev.bars.power.status).toBe('bad')
    expect(ev.pipeline.powerDuty).toBeLessThan(1)
  })
  it('deployable panels pass', () => {
    expect(evaluateDesign(first(NAIVE)).bars.power.status).toBe('ok')
  })
  it('no battery fails the shadow check with a plain reason', () => {
    const ev = evaluateDesign(first(['deployPanels', ...CORE]))
    expect(ev.bars.power.status).toBe('bad')
    expect(ev.bars.power.reason).toBeTruthy()
  })
  it('a battery under 1.2 Wh per watt wears out and shortens life', () => {
    const healthy = evaluateDesign(first(NAIVE))
    expect(healthy.power.wear).toBe(false)
    // 20 Wh against a 21 W load: survives the shadow (12.6 Wh) but below comfort (25.2 Wh)
    const hungry = evaluateDesign(
      first(['deployPanels', 'deployPanels', 'batterySmall', 'radioSband', 'reactionWheels', 'cpuBasic', 'camHiRes'], {
        design: { busId: 'bus6u', parts: ['deployPanels', 'deployPanels', 'batterySmall', 'radioSband', 'reactionWheels', 'cpuBasic', 'camHiRes'] },
        contractId: 'stormChaser',
        rocketId: 'small',
        bank: 20000,
      }),
    )
    expect(hungry.power.loadW).toBeCloseTo(21)
    expect(hungry.power.wear).toBe(true)
    expect(hungry.lifetime.years).toBeLessThan(hungry.lifetime.baseYears)
  })
})

describe('mass, rockets and orbits', () => {
  it('compares mass with rocket capacity × orbit factor', () => {
    const leo = evaluateDesign(first(NAIVE))
    expect(leo.mass.capacityKg).toBeCloseTo(12)
    expect(leo.mass.kg).toBeCloseTo(3.3)
    const polar = evaluateDesign(first(NAIVE, { orbitId: 'polar', rocketId: 'small', contractId: 'fireWatch', bank: 9000 }))
    expect(polar.mass.capacityKg).toBeCloseTo(200 * 0.75)
  })
  it('a rideshare cannot reach polar orbit', () => {
    const ev = evaluateDesign(first(NAIVE, { orbitId: 'polar', contractId: 'fireWatch' }))
    expect(ev.canLaunch).toBe(false)
    expect(ev.blockers.length).toBeGreaterThan(0)
  })
  it('higher orbits last longer', () => {
    const leo = evaluateDesign(first(NAIVE))
    const mid = evaluateDesign(first(NAIVE, { orbitId: 'mid', rocketId: 'small', bank: 9000 }))
    expect(mid.lifetime.years).toBeGreaterThan(leo.lifetime.years)
  })
  it('refuses more parts than the bus has slots', () => {
    const ev = evaluateDesign(first([...NAIVE, 'batteryLarge']))
    expect(ev.slots.used).toBeGreaterThan(ev.slots.total)
    expect(ev.canLaunch).toBe(false)
  })
})

describe('data pipeline bottlenecks', () => {
  it('names the radio when the downlink is the slowest link', () => {
    expect(evaluateDesign(first(NAIVE)).pipeline.bottleneck).toBe('radio')
  })
  it('a second station lifts the downlink', () => {
    const one = evaluateDesign(first(NAIVE))
    const two = evaluateDesign(first(NAIVE, { stationIds: ['home', 'equator'] }))
    expect(two.pipeline.downlinkPerDay).toBeGreaterThan(one.pipeline.downlinkPerDay)
    expect(two.cost.stations).toBeGreaterThan(0)
  })
  it('delivered is the minimum of made, storage and downlink', () => {
    const p = evaluateDesign(first(NAIVE, { stationIds: ['home', 'equator'] })).pipeline
    expect(p.deliveredPerDay).toBeCloseTo(Math.min(p.madePerDay, p.storageMb, p.downlinkPerDay))
  })
  it('names storage when the computer is the slowest link', () => {
    const parts = ['deployPanels', 'deployPanels', 'batteryLarge', 'radioSband', 'reactionWheels', 'cpuBasic', 'camHiRes']
    const ev = evaluateDesign({
      design: { busId: 'bus6u', parts },
      contractId: 'stormChaser',
      orbitId: 'leo',
      rocketId: 'small',
      stationIds: ['home', 'equator'],
      bank: 30000,
      commsLevel: 3,
    })
    expect(ev.pipeline.madePerDay).toBeCloseTo(1500)
    expect(ev.pipeline.storageMb).toBe(1000)
    expect(ev.pipeline.bottleneck).toBe('storage')
  })
  it('the restored tracking station doubles what the home dish brings down', () => {
    const one = evaluateDesign(first(NAIVE))
    const two = evaluateDesign(first(NAIVE, { secondDish: true }))
    const home = (ev: typeof one) => ev.links.find((l) => l.station.id === 'home')!
    expect(home(two).passesPerDay).toBe(home(one).passesPerDay * 2)
    expect(home(two).dishMbPerPass).toBeGreaterThan(home(one).dishMbPerPass)
    expect(two.pipeline.downlinkPerDay).toBeCloseTo(one.pipeline.downlinkPerDay * 2)
    // mission 1's first design falls short on one dish and clears the bar with two
    expect(two.pipeline.deliveredPerDay).toBeGreaterThan(one.pipeline.deliveredPerDay)
  })
  it('no stations in view means nothing comes home', () => {
    const ev = evaluateDesign(first(NAIVE, { stationIds: [] }))
    expect(ev.pipeline.deliveredPerDay).toBe(0)
  })
})

describe('pointing and part locks', () => {
  const empty: Design = { busId: 'bus3u', parts: [] }
  it('locks instruments the client cannot use', () => {
    expect(partLock('thermalSensor', { design: empty, contractId: 'firstLight', level: 9 })).toBeTruthy()
    expect(partLock('camWide', { design: empty, contractId: 'firstLight', level: 9 })).toBeNull()
  })
  it('locks parts above the player level', () => {
    expect(partLock('radioSband', { design: empty, contractId: 'firstLight', level: 1 })).toBeTruthy()
  })
  it('an S-band radio without reaction wheels cannot aim', () => {
    const ev = evaluateDesign(first(['deployPanels', 'batterySmall', 'radioSband', 'cpuBasic', 'magnetorquers', 'camWide']))
    expect(ev.summary.radio).toBeNull()
    expect(ev.pipeline.deliveredPerDay).toBe(0)
  })
  it('a high-res camera without fine pointing makes nothing useful', () => {
    const ev = evaluateDesign(first(['deployPanels', 'batterySmall', 'radioUhf', 'cpuBasic', 'magnetorquers', 'camHiRes']))
    expect(ev.summary.instruments[0].working).toBe(false)
  })
  it('addPart and removePart keep the design consistent', () => {
    const d = addPart(addPart(empty, 'camWide'), 'radioUhf')
    expect(d.parts).toEqual(['camWide', 'radioUhf'])
    expect(removePart(d, 'camWide').parts).toEqual(['radioUhf'])
  })
})

describe('budget', () => {
  it('blocks the launch when the bank cannot cover it', () => {
    const ev = evaluateDesign(first(NAIVE, { bank: 100, grantPending: 0 }))
    expect(ev.bars.budget.status).toBe('bad')
    expect(ev.canLaunch).toBe(false)
  })
  it('warns when less than 10% is left in reserve', () => {
    const cost = evaluateDesign(first(NAIVE, { grantPending: 0 })).cost.cashNeeded
    const ev = evaluateDesign(first(NAIVE, { bank: Math.round(cost * 1.05), grantPending: 0 }))
    expect(ev.bars.budget.status).toBe('warn')
    expect(ev.canLaunch).toBe(true)
  })
  it('parts already in inventory are not bought again', () => {
    const owned = evaluateDesign(first(NAIVE, { ownedParts: { camWide: 1, bus3u: 1 } }))
    const none = evaluateDesign(first(NAIVE))
    expect(owned.cost.cashNeeded).toBeLessThan(none.cost.cashNeeded)
  })
})

describe('go / no-go', () => {
  it('gives one call per seat with a reason', () => {
    const calls = goNoGo(evaluateDesign(first(NAIVE)))
    expect(calls.map((c) => c.seat).sort()).toEqual(['ground', 'launch', 'science', 'spacecraft'])
    expect(calls.some((c) => !c.go)).toBe(true) // the downlink is short
    for (const c of calls) expect(c.reason.length).toBeGreaterThan(0)
  })
})

describe('mission simulation and debrief', () => {
  const naive = simulateMission(first(NAIVE, { seed: 7 } as Partial<EvalInput>))
  const fixed = simulateMission(first(NAIVE, { stationIds: ['home', 'equator'], seed: 7 } as Partial<EvalInput>))

  it('logs every mission day', () => {
    expect(naive.days).toHaveLength(7)
    expect(naive.days[0].madeMb).toBeGreaterThan(0)
  })
  it('never delivers more than was made', () => {
    for (const d of naive.days) expect(d.deliveredMb).toBeLessThanOrEqual(d.madeMb + 1e-6)
    expect(naive.totals.deliveredMb).toBeLessThanOrEqual(naive.totals.madeMb)
  })
  it('the naive design misses the science star and blames the radio', () => {
    expect(naive.starList.find((s) => s.id === 'science')!.earned).toBe(false)
    expect(naive.stars).toBeLessThanOrEqual(2)
    expect(naive.reasons[0].id).toBe('downlinkShort')
    expect(naive.reasons[0].text).toContain('half')
    expect(naive.reasons[0].fix).toContain('second dish')
  })
  it('always explains the result with exactly three reasons', () => {
    expect(naive.reasons).toHaveLength(3)
    expect(fixed.reasons).toHaveLength(3)
  })
  it('renting a second station fixes it', () => {
    expect(fixed.science.delivered).toBeGreaterThan(naive.science.delivered)
    expect(fixed.stars).toBeGreaterThan(naive.stars)
  })
  it('XP is stars × difficulty', () => {
    expect(naive.xp).toBe(naive.stars * 1 * XP_PER_STAR)
  })
  it('profit star follows the payout', () => {
    expect(naive.starList.find((s) => s.id === 'profit')!.earned).toBe(naive.payout.profit >= 0)
    expect(naive.payout.income - naive.payout.cost).toBe(naive.payout.profit)
  })
  it('efficiency star needs every bar in the sweet spot', () => {
    expect(naive.starList.find((s) => s.id === 'efficiency')!.earned).toBe(naive.evaluation.efficient)
    expect(naive.evaluation.efficient).toBe(false)
  })
  it('is deterministic for the same seed', () => {
    const again = simulateMission(first(NAIVE, { seed: 7 } as Partial<EvalInput>))
    expect(again).toEqual(naive)
  })
  it('a test run is the same flight with default choices and autopilot', () => {
    const t = testRun(first(NAIVE, { seed: 7 } as Partial<EvalInput>))
    expect(t.stars).toBe(naive.stars)
    expect(t.autopilot).toBe(true)
    expect(t.flightQuality).toBe(RULES.autopilotQuality)
  })
  it('a dead satellite earns nothing and says why', () => {
    const dead = simulateMission(first(CORE))
    expect(dead.science.delivered).toBe(0)
    expect(dead.stars).toBe(0)
    expect(dead.reasons.map((r) => r.id)).toContain('noSolar')
  })
  it('a missing instrument is the top reason', () => {
    const r = simulateMission(first(['deployPanels', 'batterySmall', 'radioUhf', 'cpuBasic', 'magnetorquers']))
    expect(r.reasons[0].id).toBe('noInstrument')
  })
})

describe('launch quality and lifetime', () => {
  it('a sloppy manual flight costs orbital life', () => {
    const clean = simulateMission({ ...first(NAIVE), flightQuality: 1 })
    const sloppy = simulateMission({ ...first(NAIVE), flightQuality: 0.2 })
    expect(sloppy.lifetimeYears).toBeLessThan(clean.lifetimeYears)
    expect(sloppy.allReasons.map((r) => r.id)).toContain('sloppyLaunch')
  })
  it('a satellite keeps producing raw data after the mission', () => {
    const r = simulateMission(first(NAIVE))
    expect(r.production.mbPerDay.rawImage).toBeCloseTo(100)
    expect(r.production.lifetimeYears).toBe(r.lifetimeYears)
  })
})

describe('event cards', () => {
  it('deals two or three cards on distinct days inside the mission', () => {
    const plan = planMission(first(NAIVE))
    expect(plan.events.length).toBeGreaterThanOrEqual(RULES.minEvents)
    expect(plan.events.length).toBeLessThanOrEqual(RULES.maxEvents)
    const days = plan.events.map((e) => e.day)
    expect(new Set(days).size).toBe(days.length)
    for (const d of days) expect(d).toBeLessThanOrEqual(7)
  })
  it('a basic computer can draw the solar storm; a hardened one cannot', () => {
    const basic = planMission(first(NAIVE)).events.map((e) => e.id)
    expect(basic).toContain('solarStorm')
    const hard = planMission(first(['deployPanels', 'batterySmall', 'radioUhf', 'cpuHardened', 'magnetorquers', 'camWide'])).events.map((e) => e.id)
    expect(hard).not.toContain('solarStorm')
  })
  it('every choice previews how the bars will move', () => {
    for (const e of planMission(first(NAIVE)).events) {
      expect(e.choices).toHaveLength(2)
      expect(e.choices[0].previews.length + e.choices[1].previews.length).toBeGreaterThan(0)
    }
  })
  it('the player\'s choices change the outcome', () => {
    const plan = planMission(first(NAIVE))
    const allA = simulateMission({ ...first(NAIVE), choices: Object.fromEntries(plan.events.map((e) => [e.id, 'a' as const])) })
    const allB = simulateMission({ ...first(NAIVE), choices: Object.fromEntries(plan.events.map((e) => [e.id, 'b' as const])) })
    const same =
      allA.science.delivered === allB.science.delivered &&
      allA.payout.cost === allB.payout.cost &&
      allA.lifetimeYears === allB.lifetimeYears
    expect(same).toBe(false)
  })
})

describe('closest real mission', () => {
  it('a camera CubeSat in low orbit matches a CubeSat mission', () => {
    const m = closestNasaMission(profileOf(evaluateDesign(first(NAIVE))))
    expect(m.mission.massClass).toBe('cubesat')
    expect(m.mission.destination).toBe('earth')
  })
  it('a lunar profile matches a Moon mission', () => {
    const m = closestNasaMission({ orbitType: 'lunar', massClass: 'large', tags: ['ice'], destination: 'moon' })
    expect(m.mission.destination).toBe('moon')
  })
  it('a Mars profile matches a Mars mission', () => {
    const m = closestNasaMission({ orbitType: 'mars', massClass: 'large', tags: ['weather'], destination: 'mars' })
    expect(m.mission.destination).toBe('mars')
  })
})

describe('crew', () => {
  const member = (seat: 'science' | 'spacecraft' | 'launch' | 'ground', skill: number, dream = false) => ({
    id: 'x',
    name: 'X',
    salary: 100,
    skills: { science: 1, spacecraft: 1, launch: 1, ground: 1, [seat]: skill },
    dreamSeat: dream ? seat : seat === 'science' ? ('ground' as const) : ('science' as const),
    trait: 'veteran' as const,
  })
  it('an empty crew changes nothing', () => {
    const m = crewModifiers({})
    expect(m.scienceMult).toBe(1)
    expect(m.massMult).toBe(1)
    expect(m.downlinkMult).toBe(1)
    expect(m.salaries).toBe(0)
  })
  it('a strong scientist adds science; a strong engineer saves mass', () => {
    const sci = crewModifiers({ science: member('science', 8) })
    expect(sci.scienceMult).toBeGreaterThan(1)
    const eng = crewModifiers({ spacecraft: member('spacecraft', 6) })
    expect(eng.massMult).toBeLessThan(1)
  })
  it('the dream seat is worth more', () => {
    const plain = crewModifiers({ ground: member('ground', 5) })
    const dream = crewModifiers({ ground: member('ground', 5, true) })
    expect(dream.downlinkMult).toBeGreaterThan(plain.downlinkMult)
  })
  it('salaries come out of the mission budget', () => {
    const ev = evaluateDesign(first(NAIVE, { crew: { ground: member('ground', 5) } }))
    expect(ev.cost.salaries).toBe(100)
  })
})

describe('lab and storage', () => {
  const cal = RECIPE_BY_ID.calImage
  it('a recipe starts only with all its inputs', () => {
    expect(canStart(cal, { rawImage: 1 })).toBe(false)
    expect(canStart(cal, { rawImage: 2 })).toBe(true)
  })
  it('starting a recipe consumes the inputs', () => {
    expect(consumeInputs(cal, { rawImage: 3 })).toEqual({ rawImage: 1 })
    expect(consumeInputs(cal, { rawImage: 1 })).toBeNull()
  })
  it('raw data over the storage cap is lost', () => {
    const r = storeRaw({ rawImage: 18 }, { rawImage: 5 }, 20)
    expect(r.stored).toBe(2)
    expect(r.lost).toBe(3)
    expect(r.inventory.rawImage).toBe(20)
  })
  it('orders pay a bonus over selling one by one', () => {
    const order = { wants: [{ item: 'calImage' as const, qty: 2 }] }
    expect(orderValue(order)).toBeGreaterThan(cal.sellsFor * 2)
  })
  it('megabytes become whole raw items and the remainder carries over', () => {
    const prod = { mbPerDay: { rawImage: 60 }, lifetimeYears: 1 }
    const a = dailyRawUnits(prod)
    expect(a.units.rawImage).toBe(2)
    expect(a.carry.rawImage).toBeCloseTo(10)
    const b = dailyRawUnits(prod, { rawImage: 20 })
    expect(b.units.rawImage).toBe(3)
  })
})
