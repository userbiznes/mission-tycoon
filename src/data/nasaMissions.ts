import type { NasaMissionDef } from './types'

/**
 * Real missions for the debrief's "closest real NASA mission" line. Matched by
 * destination, orbit family, mass class and what the mission looks at.
 * Facts are public and kept to one plain sentence each.
 */
export const NASA_MISSIONS: NasaMissionDef[] = [
  {
    id: 'harp',
    name: 'HARP CubeSat',
    year: 2019,
    orbitType: 'low',
    massClass: 'cubesat',
    tags: ['camera'],
    destination: 'earth',
    about:
      'A NASA-funded CubeSat the size of a loaf of bread that photographed clouds and airborne particles from low Earth orbit.',
  },
  {
    id: 'tropics',
    name: 'TROPICS',
    year: 2023,
    orbitType: 'low',
    massClass: 'cubesat',
    tags: ['weather'],
    destination: 'earth',
    about: 'A team of small NASA CubeSats in low orbit that scans tropical storms about once an hour.',
  },
  {
    id: 'prefire',
    name: 'PREFIRE',
    year: 2024,
    orbitType: 'polar',
    massClass: 'cubesat',
    tags: ['thermal'],
    destination: 'earth',
    about:
      'Two shoebox-size NASA CubeSats in near-polar orbits that measure the heat Earth\'s polar regions give off to space.',
  },
  {
    id: 'landsat9',
    name: 'Landsat 9',
    year: 2021,
    orbitType: 'polar',
    massClass: 'large',
    tags: ['camera', 'hires', 'thermal'],
    destination: 'earth',
    about:
      'A NASA and USGS satellite that circles pole to pole about 705 km up, imaging all of Earth\'s land in visible light and heat.',
  },
  {
    id: 'suomiNpp',
    name: 'Suomi NPP',
    year: 2011,
    orbitType: 'polar',
    massClass: 'large',
    tags: ['weather', 'thermal'],
    destination: 'earth',
    about: 'A NASA and NOAA weather and climate satellite that views the whole planet from polar orbit every day.',
  },
  {
    id: 'gpm',
    name: 'GPM Core Observatory',
    year: 2014,
    orbitType: 'low',
    massClass: 'large',
    tags: ['weather'],
    destination: 'earth',
    about: 'A NASA and JAXA satellite about 400 km up that measures rain and snow around the world.',
  },
  {
    id: 'lro',
    name: 'Lunar Reconnaissance Orbiter',
    year: 2009,
    orbitType: 'lunar',
    massClass: 'large',
    tags: ['camera', 'hires', 'thermal', 'ice'],
    destination: 'moon',
    about:
      'A NASA orbiter that has circled the Moon since 2009, mapping it in detail and searching cold polar craters for signs of water ice.',
  },
  {
    id: 'capstone',
    name: 'CAPSTONE',
    year: 2022,
    orbitType: 'lunar',
    massClass: 'cubesat',
    tags: ['tech'],
    destination: 'moon',
    about: 'A microwave-oven-size CubeSat that tested a special Moon orbit for NASA ahead of future crewed missions.',
  },
  {
    id: 'mro',
    name: 'Mars Reconnaissance Orbiter',
    year: 2005,
    orbitType: 'mars',
    massClass: 'large',
    tags: ['camera', 'hires', 'weather'],
    destination: 'mars',
    about: 'A NASA orbiter that has circled Mars since 2006, taking sharp photos and a daily weather map of the planet.',
  },
  {
    id: 'marco',
    name: 'MarCO',
    year: 2018,
    orbitType: 'mars',
    massClass: 'cubesat',
    tags: ['tech'],
    destination: 'mars',
    about:
      'Two briefcase-size NASA CubeSats that flew past Mars and relayed news of the InSight landing: the first CubeSats in deep space.',
  },
]

/** How much each attribute counts in the nearest-neighbour match. */
export const MATCH_WEIGHTS = { destination: 4, tags: 3, orbitType: 2, massClass: 2 } as const

/** What each kind of raw data says about a mission, for the match. */
export const RAW_TAGS = {
  rawImage: ['camera'],
  rawHiRes: ['hires'],
  rawThermal: ['thermal'],
} as const
