import type { ContractDef } from './types'

/**
 * The campaign. Science targets are megabytes of useful data delivered, times
 * quality (orbit sharpness, pointing, crew). Each mission is tuned so the
 * obvious first design falls short for one clear reason and a fixed design
 * can earn all three stars.
 */
export const CONTRACTS: ContractDef[] = [
  {
    id: 'firstLight',
    order: 1,
    title: 'First Light',
    client: 'Harbor Town Council',
    objective: 'Photograph the home coast from orbit for a week.',
    region: 'Home coast',
    brief:
      'The town wants fresh photos of the coastline. A small camera satellite in low orbit will do. Just make sure the pictures actually get home.',
    acceptedData: ['rawImage', 'rawHiRes'],
    tags: ['camera'],
    // 1,000 over 7 days ≈ 143 MB a day. One dish brings home 100; two bring 175.
    scienceTarget: 1000,
    missionDays: 7,
    baseFee: 1800,
    payPerScience: 0.6,
    grant: 500,
    deadlineMonths: 12,
    difficulty: 1,
    allowedOrbits: ['leo', 'mid'],
    unlockLevel: 1,
    lessons: [
      'Solar panels must cover sunlight and shadow',
      'No battery, no satellite',
      'Data only counts when it reaches the ground',
    ],
  },
  {
    id: 'fireWatch',
    order: 2,
    title: 'Fire Watch',
    client: 'Northern Forest Service',
    objective: 'Scan the northern forests for wildfire heat every day.',
    region: 'Northern forests',
    brief:
      'Fires start anywhere, so the satellite must see the whole planet: that means a polar orbit. Pick a ground station that actually sees it.',
    acceptedData: ['rawThermal'],
    tags: ['thermal'],
    // 2,400 over 10 days at polar sharpness 0.8 = 300 MB a day brought home.
    scienceTarget: 2400,
    missionDays: 10,
    baseFee: 3600,
    payPerScience: 0.5,
    grant: 1200,
    deadlineMonths: 12,
    difficulty: 2,
    allowedOrbits: ['polar'],
    unlockLevel: 2,
    lessons: [
      'Polar orbits cover the whole planet but cost rocket capacity',
      'A station near the pole sees a polar satellite on almost every lap',
      'Heat sensors need more power than cameras',
    ],
  },
  {
    id: 'stormChaser',
    order: 3,
    title: 'Storm Chaser',
    client: 'Coastal Weather Bureau',
    objective: 'Track tropical storms in sharp detail before they reach land.',
    region: 'Tropical ocean',
    brief:
      'Sharp storm images mean a flood of data: 1.5 GB a day. The camera needs steady pointing, the computer needs room, and the ground needs to keep up.',
    acceptedData: ['rawHiRes'],
    tags: ['weather', 'hires'],
    // 15,800 over 12 days with fine pointing (×1.2) ≈ 1,100 MB a day brought home.
    scienceTarget: 15800,
    missionDays: 12,
    baseFee: 8000,
    payPerScience: 0.25,
    grant: 2500,
    deadlineMonths: 16,
    difficulty: 3,
    allowedOrbits: ['leo', 'mid'],
    unlockLevel: 3,
    lessons: [
      'Big instruments need fine pointing',
      'Onboard storage can overflow',
      'The slowest link sets how much data gets home',
    ],
  },
  {
    id: 'moonIce',
    order: 4,
    title: 'Moon Ice Mapper',
    client: 'Lunar Survey Office',
    objective: 'Map cold craters near the Moon\'s south pole that could hide water ice.',
    region: 'Lunar south pole',
    brief:
      'Going to the Moon takes about 3.2 km/s more than low orbit, and 0.9 km/s to stop there. Only a deep-space dish can hear a signal that faint.',
    acceptedData: ['rawThermal'],
    tags: ['ice', 'thermal', 'camera'],
    scienceTarget: 9000,
    missionDays: 30,
    baseFee: 20000,
    payPerScience: 0.6,
    grant: 6000,
    deadlineMonths: 20,
    difficulty: 3,
    allowedOrbits: ['moon'],
    unlockLevel: 7,
    needsRegion: 'heavy',
    lessons: ['Every extra km/s shrinks the payload', 'Deep space needs a deep-space dish'],
  },
  {
    id: 'marsWeather',
    order: 5,
    title: 'Mars Weather',
    client: 'Planetary Weather Network',
    objective: 'Send home a daily weather picture of Mars.',
    region: 'Mars',
    brief:
      'Sunlight at Mars is less than half as strong as at Earth, and the signal home is very faint. Pack extra panels and patience.',
    acceptedData: ['rawImage', 'rawHiRes'],
    tags: ['weather', 'camera'],
    scienceTarget: 4000,
    missionDays: 30,
    baseFee: 30000,
    payPerScience: 1.5,
    grant: 8000,
    deadlineMonths: 24,
    difficulty: 3,
    allowedOrbits: ['mars'],
    unlockLevel: 8,
    needsRegion: 'heavy',
    lessons: ['Weaker sunlight means bigger panels', 'Far away means a slow trickle of data'],
    stretch: true,
  },
]

export const CONTRACT_BY_ID: Record<string, ContractDef> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]))

/** The main campaign without the stretch missions. */
export const CAMPAIGN: ContractDef[] = CONTRACTS.filter((c) => !c.stretch)
