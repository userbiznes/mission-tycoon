import { DREAM_SEAT_BONUS, MAX_SKILL, SEAT_BY_ID, SEAT_IDS, TRAITS } from '../data/crew'
import { RULES } from '../data/rules'
import type { CrewDef, SeatId } from '../data/types'
import { round } from './format'

/** A hired crew member. Same shape as a candidate; `skills` holds their current skills. */
export type CrewMember = Pick<CrewDef, 'id' | 'name' | 'salary' | 'skills' | 'dreamSeat' | 'trait'>

/** Who sits where for a mission. Empty seats simply give no bonus. */
export type CrewAssignment = Partial<Record<SeatId, CrewMember | null>>

export interface SeatStatus {
  seat: SeatId
  filled: boolean
  name: string | null
  /** skill after dream-seat and trait bonuses */
  effectiveSkill: number
  /** e.g. "+10% science" */
  bonus: string | null
}

export interface CrewMods {
  /** multiplies science (Science seat) */
  scienceMult: number
  /** multiplies the mass of every part (Spacecraft seat) */
  massMult: number
  /** multiplies megabytes per pass (Ground seat) */
  downlinkMult: number
  /** multiplies the width of the launch timing window (Launch seat) */
  launchWindowMult: number
  /** multiplies parts and launch cost (Thrifty) */
  costMult: number
  /** multiplies orbital lifetime (Perfectionist) */
  lifetimeMult: number
  /** months added to the build (Perfectionist) */
  buildMonths: number
  /** total salaries for this mission */
  salaries: number
  /** Spacecraft seat is empty or held by a Rookie: the wobbly-wheel card can come up */
  rookieOrNoEngineer: boolean
  seats: Record<SeatId, SeatStatus>
}

/** Skill used in a seat: base skill, +2 in the dream seat, plus the trait's bonus. Never below 0. */
export function effectiveSkill(member: CrewMember, seat: SeatId): number {
  const base = member.skills[seat] ?? 0
  const dream = member.dreamSeat === seat ? DREAM_SEAT_BONUS : 0
  return Math.max(0, base + dream + TRAITS[member.trait].skillBonus)
}

function signedPct(fraction: number): string {
  const p = Math.round(fraction * 100)
  return `${p >= 0 ? '+' : '−'}${Math.abs(p)}%`
}

/** Turn a seat assignment into the numbers the rest of the engine uses. */
export function crewModifiers(assignment: CrewAssignment = {}): CrewMods {
  const mods: CrewMods = {
    scienceMult: 1,
    massMult: 1,
    downlinkMult: 1,
    launchWindowMult: 1,
    costMult: 1,
    lifetimeMult: 1,
    buildMonths: 0,
    salaries: 0,
    rookieOrNoEngineer: true,
    seats: {} as Record<SeatId, SeatStatus>,
  }
  const paid = new Set<string>()
  for (const seat of SEAT_IDS) {
    const member = assignment[seat] ?? null
    const status: SeatStatus = { seat, filled: !!member, name: member?.name ?? null, effectiveSkill: 0, bonus: null }
    mods.seats[seat] = status
    if (!member) continue
    const skill = effectiveSkill(member, seat)
    status.effectiveSkill = skill
    const def = SEAT_BY_ID[seat]
    const points = Math.max(0, skill - def.baseline)
    const amount = points * def.perPoint
    if (seat === 'science') {
      mods.scienceMult = round(1 + amount, 4)
      status.bonus = `${signedPct(amount)} science`
    } else if (seat === 'spacecraft') {
      mods.massMult = round(Math.max(0.5, 1 - amount), 4)
      status.bonus = `${signedPct(-(1 - mods.massMult))} mass`
      mods.rookieOrNoEngineer = member.trait === 'rookie'
    } else if (seat === 'ground') {
      mods.downlinkMult = round(1 + amount, 4)
      status.bonus = `${signedPct(amount)} downlink`
    } else {
      mods.launchWindowMult = round(1 + points * RULES.launchWindowPerPoint, 4)
      status.bonus = `${signedPct(mods.launchWindowMult - 1)} launch window`
    }
    if (!paid.has(member.id)) {
      paid.add(member.id)
      const trait = TRAITS[member.trait]
      mods.salaries += member.salary
      mods.costMult = round(mods.costMult * trait.costMult, 4)
      mods.lifetimeMult = round(mods.lifetimeMult * trait.lifetimeMult, 4)
      mods.buildMonths += trait.buildMonths
    }
  }
  return mods
}

export interface SkillUp {
  crewId: string
  name: string
  seat: SeatId
  from: number
  to: number
}

/** After a mission everyone gains skill in the seat they flew (Rookies gain double), up to 9. */
export function skillUps(assignment: CrewAssignment = {}): SkillUp[] {
  const out: SkillUp[] = []
  for (const seat of SEAT_IDS) {
    const member = assignment[seat]
    if (!member) continue
    const from = member.skills[seat] ?? 0
    const to = Math.min(MAX_SKILL, from + TRAITS[member.trait].growth)
    if (to > from) out.push({ crewId: member.id, name: member.name, seat, from, to })
  }
  return out
}

/** Apply skill-ups to a crew member, returning a new object. */
export function applySkillUps<T extends CrewMember>(member: T, ups: SkillUp[]): T {
  const mine = ups.filter((u) => u.crewId === member.id)
  if (!mine.length) return member
  const skills = { ...member.skills }
  for (const u of mine) skills[u.seat] = u.to
  return { ...member, skills }
}
