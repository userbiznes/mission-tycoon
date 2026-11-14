import type { ResourceKey } from './types'

/** The "Why?" button on each resource bar: the rule in one line, then the real basis. */
export interface WhyDef {
  title: string
  /** the game rule, one short sentence */
  rule: string
  /** the real-world reason, two or three short sentences */
  basis: string
  /** where the figure comes from */
  source: string
}

export const WHY: Record<ResourceKey, WhyDef> = {
  mass: {
    title: 'Why does mass matter?',
    rule: 'The satellite must weigh less than the rocket can lift to that orbit.',
    basis:
      'Reaching low Earth orbit takes a speed change of about 9.4 km/s. Almost all of a rocket is fuel, so every extra kilogram needs a lot more rocket. Higher orbits and the Moon take even more push, so the same rocket carries less.',
    source: 'Rocket equation; typical delta-v to low Earth orbit.',
  },
  power: {
    title: 'Why two power checks?',
    rule: 'Panels must make 1.6× the average load, and the battery must hold 0.6 Wh for every watt.',
    basis:
      'A low orbit takes about 95 minutes: roughly 60 in sunlight and 35 in Earth\'s shadow. The panels have to run the satellite and refill the battery in the sunny part, so they need 95 ÷ 60 ≈ 1.6 times the average load. Sunlight in space delivers about 1,361 watts per square metre. A battery that drains deep every orbit wears out sooner.',
    source: 'NASA solar irradiance figure (about 1,361 W/m²); orbit geometry at 400 km.',
  },
  budget: {
    title: 'Why keep money in reserve?',
    rule: 'Parts, launch and salaries come out of your funds. Keep at least 10% spare.',
    basis:
      'Something always costs more than planned: a failed test, a late part, a launch slip. NASA\'s CubeSat 101 guide tells new teams to plan a budget reserve for exactly that.',
    source: 'NASA CubeSat 101: Basic Concepts and Processes for First-Time CubeSat Developers.',
  },
  data: {
    title: 'Why isn\'t all my data delivered?',
    rule: 'Data home per day = the smallest of: data made, onboard storage, and what the passes can carry.',
    basis:
      'Data flows through a chain: instrument, onboard storage, radio, ground station. The slowest link sets the pace, and anything that doesn\'t fit is overwritten and lost. Real teams size every link so none of them chokes the rest.',
    source: 'Standard data-budget practice for small satellites.',
  },
  comms: {
    title: 'Why only a few passes a day?',
    rule: 'A dish can only hear the satellite while it is overhead. Passes depend on the orbit and where the dish is.',
    basis:
      'A low satellite crosses a ground station\'s sky in about ten minutes. A dish near the poles sees a polar orbiter on almost every lap; a dish there never sees a low orbit that stays near the equator. Fast radios use narrow beams, so the satellite must point precisely.',
    source: 'Ground-station visibility geometry; polar stations such as those in the Arctic.',
  },
  time: {
    title: 'Why watch the calendar?',
    rule: 'Every part adds build months. Finish before the client\'s deadline, and remember the orbit sets how long the satellite lasts.',
    basis:
      'Complex parts take longer to build and test, and launches don\'t wait. Once in orbit, thin air slowly drags a low satellite down: about a year at 400 km, several years higher up.',
    source: 'NASA CubeSat 101 schedules; atmospheric drag at low altitudes.',
  },
}

/** The lab's one-line "Why?" tip about data processing levels. */
export const WHY_LAB: WhyDef = {
  title: 'Why process data?',
  rule: 'Raw data becomes calibrated data, then maps that clients pay for.',
  basis:
    'NASA sorts Earth data into levels. Level 0 is raw instrument data. Level 1 is calibrated and tagged with time and place. Level 2 turns it into measurements like temperature. Level 3 lays those on an even map grid.',
  source: 'NASA Earthdata: data processing levels.',
}

/** Shadow tip shown once by the instructor. */
export const SHADOW_TIP = 'We\'re in Earth\'s shadow about 35 minutes every orbit. No battery, no satellite.'
