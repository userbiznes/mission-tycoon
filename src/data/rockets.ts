import type { RocketDef, RocketId } from './types'

/** Rides to space. Capacity is to low orbit; each orbit's `capacityFactor` scales it down. */
export const ROCKETS: RocketDef[] = [
  {
    id: 'rideshare',
    name: 'Rideshare slot',
    capacityKg: 12,
    price: 400,
    orbits: ['leo'],
    unlockLevel: 1,
    blurb: 'A seat on someone else\'s rocket. Up to 12 kg, low orbit only, and the cheapest way up.',
  },
  {
    id: 'small',
    name: 'Small rocket',
    capacityKg: 200,
    price: 1800,
    orbits: ['leo', 'mid', 'polar'],
    unlockLevel: 2,
    blurb: 'Your own launcher: 200 kg to any Earth orbit you like.',
  },
  {
    id: 'medium',
    name: 'Medium rocket',
    capacityKg: 2000,
    price: 7500,
    orbits: ['leo', 'mid', 'polar', 'moon', 'mars'],
    unlockLevel: 7,
    needsRegion: 'heavy',
    blurb: '2,000 kg to low orbit, with enough push left over to reach the Moon.',
  },
]

export const ROCKET_BY_ID: Record<RocketId, RocketDef> = Object.fromEntries(ROCKETS.map((r) => [r.id, r])) as Record<
  RocketId,
  RocketDef
>
