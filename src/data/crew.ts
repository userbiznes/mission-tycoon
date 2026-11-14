import type { CrewDef, SeatDef, SeatId, TraitDef, TraitId } from './types'

/** The four mission seats and what a good person in each one does. */
export const SEATS: SeatDef[] = [
  {
    id: 'science',
    name: 'Science',
    watches: 'Data and the science target',
    effect: '+5% science for each skill point above 5',
    perPoint: 0.05,
    baseline: 5,
  },
  {
    id: 'spacecraft',
    name: 'Spacecraft',
    watches: 'Power, pointing and the build',
    effect: '−3% part mass for each skill point',
    perPoint: 0.03,
    baseline: 0,
  },
  {
    id: 'launch',
    name: 'Launch',
    watches: 'Mass, the rocket and the budget',
    effect: 'Wider launch timing window for each skill point',
    perPoint: 0.06,
    baseline: 0,
  },
  {
    id: 'ground',
    name: 'Ground',
    watches: 'Radio passes and the dish',
    effect: '+5% downlink for each skill point',
    perPoint: 0.05,
    baseline: 0,
  },
]

export const SEAT_BY_ID: Record<SeatId, SeatDef> = Object.fromEntries(SEATS.map((s) => [s.id, s])) as Record<
  SeatId,
  SeatDef
>
export const SEAT_IDS: SeatId[] = SEATS.map((s) => s.id)

/** Working in your dream seat counts as this many extra skill points. */
export const DREAM_SEAT_BONUS = 2
/** Skill never grows past this from experience. */
export const MAX_SKILL = 9

export const TRAITS: Record<TraitId, TraitDef> = {
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    blurb: 'Seen it all: +1 skill in any seat.',
    skillBonus: 1,
    growth: 1,
    lifetimeMult: 1,
    buildMonths: 0,
    costMult: 1,
  },
  rookie: {
    id: 'rookie',
    name: 'Rookie',
    blurb: 'Still learning (−1 skill), but improves twice as fast.',
    skillBonus: -1,
    growth: 2,
    lifetimeMult: 1,
    buildMonths: 0,
    costMult: 1,
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    blurb: 'Checks everything twice: satellites last 10% longer, builds take a month more.',
    skillBonus: 0,
    growth: 1,
    lifetimeMult: 1.1,
    buildMonths: 1,
    costMult: 1,
  },
  thrifty: {
    id: 'thrifty',
    name: 'Thrifty',
    blurb: 'Knows a cheaper supplier: −10% on parts and launch.',
    skillBonus: 0,
    growth: 1,
    lifetimeMult: 1,
    buildMonths: 0,
    costMult: 0.9,
  },
}

/** Everyone you can hire. All candidates are visible up front: no random draws. */
export const CREW: CrewDef[] = [
  {
    id: 'imani',
    name: 'Imani Okafor',
    salary: 180,
    skills: { science: 6, spacecraft: 3, launch: 2, ground: 4 },
    dreamSeat: 'science',
    trait: 'perfectionist',
    bio: 'Former weather forecaster. Will not ship a blurry image.',
    unlockLevel: 2,
  },
  {
    id: 'luis',
    name: 'Luis Ortega',
    salary: 120,
    skills: { science: 2, spacecraft: 5, launch: 3, ground: 3 },
    dreamSeat: 'spacecraft',
    trait: 'rookie',
    bio: 'Built his first satellite in a garage. It almost worked.',
    unlockLevel: 2,
  },
  {
    id: 'mei',
    name: 'Mei Tanaka',
    salary: 220,
    skills: { science: 3, spacecraft: 7, launch: 4, ground: 2 },
    dreamSeat: 'spacecraft',
    trait: 'veteran',
    bio: 'Twenty years of shaving grams off spacecraft.',
    unlockLevel: 2,
  },
  {
    id: 'sven',
    name: 'Sven Lindqvist',
    salary: 160,
    skills: { science: 2, spacecraft: 3, launch: 6, ground: 3 },
    dreamSeat: 'launch',
    trait: 'thrifty',
    bio: 'Range officer who always knows a cheaper ride.',
    unlockLevel: 2,
  },
  {
    id: 'priya',
    name: 'Priya Nair',
    salary: 170,
    skills: { science: 4, spacecraft: 2, launch: 2, ground: 6 },
    dreamSeat: 'ground',
    trait: 'veteran',
    bio: 'Ran a ground station through three winters up north.',
    unlockLevel: 2,
  },
  {
    id: 'tomas',
    name: 'Tomás Rivera',
    salary: 100,
    skills: { science: 3, spacecraft: 3, launch: 3, ground: 4 },
    dreamSeat: 'ground',
    trait: 'rookie',
    bio: 'Ham-radio champion, new to the big dishes.',
    unlockLevel: 2,
  },
  {
    id: 'aroha',
    name: 'Aroha Ngata',
    salary: 260,
    skills: { science: 8, spacecraft: 4, launch: 2, ground: 3 },
    dreamSeat: 'science',
    trait: 'veteran',
    bio: 'Remote-sensing scientist with a wall of published maps.',
    unlockLevel: 3,
  },
  {
    id: 'dmitri',
    name: 'Dmitri Volkov',
    salary: 240,
    skills: { science: 2, spacecraft: 5, launch: 8, ground: 3 },
    dreamSeat: 'launch',
    trait: 'perfectionist',
    bio: 'Counts down in his sleep. Never missed a window.',
    unlockLevel: 3,
  },
  {
    id: 'fatima',
    name: 'Fatima Zahra',
    salary: 200,
    skills: { science: 5, spacecraft: 6, launch: 3, ground: 5 },
    dreamSeat: 'spacecraft',
    trait: 'thrifty',
    bio: 'All-rounder who can fix a budget and a solar panel.',
    unlockLevel: 3,
  },
  {
    id: 'callum',
    name: 'Callum Reid',
    salary: 140,
    skills: { science: 5, spacecraft: 2, launch: 4, ground: 5 },
    dreamSeat: 'science',
    trait: 'rookie',
    bio: 'Fresh from university and very keen.',
    unlockLevel: 2,
  },
]

export const CREW_BY_ID: Record<string, CrewDef> = Object.fromEntries(CREW.map((c) => [c.id, c]))
