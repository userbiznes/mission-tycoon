import { MATCH_WEIGHTS, NASA_MISSIONS, RAW_TAGS } from '../data/nasaMissions'
import { RULES } from '../data/rules'
import type { Destination, MassClass, NasaMissionDef, OrbitType, ScienceTag } from '../data/types'
import type { Evaluation } from './evaluate'

/** What a mission looks like for the match. */
export interface MissionProfile {
  destination: Destination
  orbitType: OrbitType
  massClass: MassClass
  tags: ScienceTag[]
}

export interface MissionMatch {
  mission: NasaMissionDef
  score: number
  /** what the two have in common, in plain words */
  shared: string[]
}

export function massClassOf(massKg: number): MassClass {
  return massKg < RULES.cubesatKg ? 'cubesat' : massKg < RULES.smallSatKg ? 'small' : 'large'
}

/** Describe the player's mission for matching. */
export function profileOf(ev: Evaluation): MissionProfile {
  const tags = new Set<ScienceTag>(ev.contract.tags)
  for (const i of ev.summary.instruments) for (const t of RAW_TAGS[i.produces]) tags.add(t)
  return {
    destination: ev.orbit.destination,
    orbitType: ev.orbit.orbitType,
    massClass: massClassOf(ev.summary.rawMassKg),
    tags: [...tags],
  }
}

const DEST_WORDS: Record<Destination, string> = { earth: 'orbits Earth', moon: 'goes to the Moon', mars: 'goes to Mars' }
const ORBIT_WORDS: Record<OrbitType, string> = {
  low: 'low orbit',
  mid: 'mid orbit',
  polar: 'polar orbit',
  lunar: 'lunar orbit',
  mars: 'Mars orbit',
}
const CLASS_WORDS: Record<MassClass, string> = { cubesat: 'CubeSat-size', small: 'small satellite', large: 'large satellite' }
const TAG_WORDS: Record<ScienceTag, string> = {
  camera: 'takes photos',
  hires: 'sharp imaging',
  thermal: 'measures heat',
  weather: 'watches weather',
  ice: 'looks for ice',
  tech: 'tests new technology',
}

/** Nearest real mission by destination, what it looks at, orbit family and size. Ties keep table order. */
export function closestNasaMission(profile: MissionProfile): MissionMatch {
  let best: MissionMatch | null = null
  for (const mission of NASA_MISSIONS) {
    const shared: string[] = []
    let score = 0
    if (mission.destination === profile.destination) {
      score += MATCH_WEIGHTS.destination
      shared.push(DEST_WORDS[mission.destination])
    }
    if (mission.orbitType === profile.orbitType) {
      score += MATCH_WEIGHTS.orbitType
      shared.push(ORBIT_WORDS[mission.orbitType])
    }
    if (mission.massClass === profile.massClass) {
      score += MATCH_WEIGHTS.massClass
      shared.push(CLASS_WORDS[mission.massClass])
    }
    const overlap = profile.tags.filter((t) => mission.tags.includes(t))
    if (overlap.length) {
      score += (MATCH_WEIGHTS.tags * overlap.length) / Math.max(1, profile.tags.length)
      for (const t of overlap) shared.push(TAG_WORDS[t])
    }
    if (!best || score > best.score + 1e-9) best = { mission, score: Math.round(score * 100) / 100, shared }
  }
  return best as MissionMatch
}
