import { isRegionActive, regionLock } from './regionGate'
import { create } from 'zustand'
import type { RocketKind } from '../art/models/rocket'
import { CAMPAIGN, CONTRACT_BY_ID } from '../data/contracts'
import { CREW_BY_ID, MAX_SKILL } from '../data/crew'
import { ORBIT_DAY_SEC } from '../data/economy'
import { ORBIT_BY_ID } from '../data/orbits'
import { PART_BY_ID } from '../data/parts'
import { ROCKETS } from '../data/rockets'
import type { OrbitId, RocketId, SeatId, StationId } from '../data/types'
import { rig } from '../scene/cameraRig'
import {
  evaluateDesign,
  lifeDays,
  partCounts,
  planMission,
  simulateMission,
  type CrewAssignment,
  type CrewMember,
  type EvalInput,
  type Evaluation,
  type MissionPlan,
  type MissionResult,
} from '../sim'
import { sfx } from '../ui/sound'
import { focusBuilding } from './actions'
import { useGame, type Draft } from './game'
import { useLaunch } from './launch'
import { toMs } from './time'
import { useUi } from './ui'

/** Mission flow: contract → builder → launch prep → launch → operations → debrief. */

interface MissionStore {
  /** set when a mission is in flight / being replayed */
  plan: MissionPlan | null
  input: EvalInput | null
  flightQuality: number | undefined
  choices: Record<string, 'a' | 'b'>
  result: MissionResult | null
  set: (patch: Partial<MissionStore>) => void
}

export const useMission = create<MissionStore>((set) => ({
  plan: null,
  input: null,
  flightQuality: undefined,
  choices: {},
  result: null,
  set: (patch) => set(patch),
}))

/** Crew currently seated, with the skill they have earned so far. */
export function seatedCrew(): CrewAssignment {
  const { seats, crewXp } = useGame.getState()
  const out: CrewAssignment = {}
  for (const seat of Object.keys(seats) as SeatId[]) {
    const def = CREW_BY_ID[seats[seat]!]
    if (!def) continue
    const skills = { ...def.skills }
    for (const s of Object.keys(skills) as SeatId[]) skills[s] = Math.min(MAX_SKILL, skills[s] + (crewXp[`${def.id}:${s}`] ?? 0))
    out[seat] = { id: def.id, name: def.name, salary: def.salary, skills, dreamSeat: def.dreamSeat, trait: def.trait } as CrewMember
  }
  return out
}

/** Everything the rules engine needs to judge the current draft. */
export function evalInputFor(draft: Draft): EvalInput {
  const g = useGame.getState()
  return {
    design: draft.design,
    contractId: draft.contractId,
    orbitId: draft.orbitId,
    rocketId: draft.rocketId,
    stationIds: draft.stationIds,
    bank: g.coins,
    ownedParts: g.inventory,
    crew: seatedCrew(),
    commsLevel: g.buildings.commsCenter.level,
    secondDish: isRegionActive('tracking'),
    level: g.level,
  }
}

export function evaluateDraft(draft: Draft): Evaluation {
  return evaluateDesign(evalInputFor(draft))
}

/** Rockets the pad can fly at its current level. */
export function rocketsAvailable(): RocketId[] {
  const g = useGame.getState()
  return ROCKETS.filter((r) => g.level >= r.unlockLevel && !regionLock(r.needsRegion)).map((r) => r.id)
}

function cheapestRocketFor(orbitId: OrbitId): RocketId {
  const ok = ROCKETS.filter((r) => r.orbits.includes(orbitId))
  const unlocked = ok.filter((r) => useGame.getState().level >= r.unlockLevel && !regionLock(r.needsRegion))
  return (unlocked[0] ?? ok[0] ?? ROCKETS[0]).id
}

/** Contracts on the board: the next unfinished campaign missions plus replays. */
export function boardContracts() {
  const g = useGame.getState()
  return CAMPAIGN.map((c) => ({ contract: c, stars: g.bestStars[c.id] ?? null, locked: g.level < c.unlockLevel || !!regionLock(c.needsRegion), why: g.level < c.unlockLevel ? `Agency level ${c.unlockLevel}` : regionLock(c.needsRegion) }))
}

export function setDraft(patch: Partial<Draft>) {
  const g = useGame.getState()
  if (!g.draft) return
  useGame.setState({ draft: { ...g.draft, ...patch } })
}

/** Take a contract and open the Integration Bay. */
export function acceptContract(contractId: string) {
  const g = useGame.getState()
  const c = CONTRACT_BY_ID[contractId]
  const keep = g.draft?.contractId === contractId ? g.draft : null
  const orbitId = keep?.orbitId ?? c.allowedOrbits[0]
  const draft: Draft = keep ?? {
    contractId,
    design: { busId: 'bus3u', parts: [] },
    orbitId,
    rocketId: cheapestRocketFor(orbitId),
    stationIds: ['home'] as StationId[],
  }
  useGame.setState({ draft })
  useUi.getState().setPrepStep(0)
  useLaunch.getState().setKind(draft.rocketId as RocketKind)
  sfx('success')
  focusBuilding('integrationBay', 0, 22)
  useUi.getState().setScreen('builder')
}

/** Pay for the mission and light the engines. Returns blocking reasons, or null when the launch is on. */
export function commitLaunch(): string[] | null {
  const g = useGame.getState()
  const draft = g.draft
  if (!draft) return ['No mission selected']
  const input = evalInputFor(draft)
  const ev = evaluateDesign(input)
  if (!ev.canLaunch) return ev.blockers.length ? ev.blockers : ['This design cannot launch yet']
  const contract = CONTRACT_BY_ID[draft.contractId]

  // money: the grant arrives, the bills leave
  g.addCoins(contract.grant - ev.cost.cashNeeded)
  // owned parts leave the shelf and go on the satellite
  const used = partCounts(draft.design)
  for (const id of Object.keys(used)) {
    const have = Math.min(used[id], useGame.getState().inventory[id] ?? 0)
    if (have > 0) useGame.getState().removeParts(id, have)
  }

  const seed = (Date.now() % 100000) + g.missionsFlown * 7
  // the snapshot is taken before paying, so the debrief shows the budget as it was planned
  const frozen = { ...input, seed }
  useMission.getState().set({ plan: planMission(frozen), input: frozen, choices: {}, result: null, flightQuality: undefined })

  const ui = useUi.getState()
  ui.setScreen('launch')
  const launch = useLaunch.getState()
  launch.setKind(draft.rocketId as RocketKind)
  // give React a beat to build the right rocket before the countdown
  setTimeout(() => {
    useLaunch.getState().start({
      kind: draft.rocketId as RocketKind,
      orbitKm: ORBIT_BY_ID[draft.orbitId].altitudeKm,
      windowScale: ev.mods.launchWindowMult,
      onDone: (quality) => {
        const autopilot = useLaunch.getState().autopilot
        useMission.getState().set({ flightQuality: autopilot ? undefined : quality })
        useUi.getState().setScreen('ops')
      },
    })
  }, 60)
  return null
}

/** Re-run the mission with the choices made so far (later cards use their defaults). */
export function currentResult(): MissionResult | null {
  const m = useMission.getState()
  if (!m.input) return null
  return simulateMission({ ...m.input, choices: m.choices, flightQuality: m.flightQuality })
}

/** Bank the result: pay out, award XP, put the satellite into service. */
export function settleMission(result: MissionResult) {
  const g = useGame.getState()
  const draft = g.draft
  const c = result.evaluation.contract
  const earned = result.payout.feePaid + result.payout.sciencePay - result.payout.eventCosts
  g.addCoins(earned)
  g.addXp(result.xp)
  const best = Math.max(g.bestStars[c.id] ?? 0, result.stars)
  // crew grow with every flight
  const crewXp = { ...g.crewXp }
  for (const up of result.skillUps) {
    const key = `${up.crewId}:${up.seat}`
    crewXp[key] = (crewXp[key] ?? 0) + (up.to - up.from)
  }
  const days = lifeDays(result.lifetimeYears)
  const makes = Object.values(result.production.mbPerDay).some((v) => (v ?? 0) > 0)
  const now = Date.now()
  const n = g.missionsFlown + 1
  useGame.setState({
    bestStars: { ...g.bestStars, [c.id]: best },
    missionsFlown: n,
    crewXp,
    satellites: makes
      ? [
          ...g.satellites,
          {
            id: `sat${now}`,
            name: `${c.title} ${n}`,
            contractId: c.id,
            orbitId: draft?.orbitId ?? 'leo',
            mbPerDay: result.production.mbPerDay,
            carry: {},
            daysLeft: days,
            daysTotal: days,
            nextAt: now + toMs(ORBIT_DAY_SEC),
          },
        ]
      : g.satellites,
  })
  useMission.getState().set({ result })
}

/** Leave the mission screens and go home. `keepDesign` returns to the builder with the same satellite. */
export function endMission(keepDesign: boolean) {
  const ui = useUi.getState()
  useLaunch.getState().reset()
  rig.stopCinematic(0)
  rig.locked = false
  useMission.getState().set({ plan: null, input: null, result: null, choices: {} })
  ui.setPrepStep(0)
  if (keepDesign && useGame.getState().draft) {
    focusBuilding('integrationBay', 0, 22)
    ui.setScreen('builder')
  } else {
    useGame.setState({ draft: null })
    ui.setScreen(null)
    rig.home()
  }
}

/** Parts the draft uses that are not on the shelf, with what they will cost at launch. */
export function partName(id: string): string {
  return PART_BY_ID[id]?.name ?? id
}
