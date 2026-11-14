import type { BuildingId } from './layout'

/** Building catalogue: names, roles, build and upgrade costs. Pure data. */

export interface UpgradeDef {
  /** level this upgrade takes the building to */
  level: number
  cost: number
  /** seconds, before TIME_SCALE */
  seconds: number
  /** player level required */
  needsLevel: number
  perk: string
}

export interface BuildingDef {
  id: BuildingId
  name: string
  /** one line under the title */
  role: string
  /** what the player does here */
  blurb: string
  /** label of the main button in the building sheet */
  action: string
  /** cost and time to build on an empty plot (later buildings only) */
  buildCost: number
  buildSeconds: number
  needsLevel: number
  upgrades: UpgradeDef[]
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  missionControl: {
    id: 'missionControl',
    name: 'Mission Control',
    role: 'Contracts, orders and operations',
    blurb: 'Clients pin jobs on the board here, and every mission is run from this room.',
    action: 'Open contract board',
    buildCost: 0,
    buildSeconds: 0,
    needsLevel: 1,
    upgrades: [
      { level: 2, cost: 1500, seconds: 40, needsLevel: 2, perk: 'A third order slot and better-paying clients' },
      { level: 3, cost: 4000, seconds: 70, needsLevel: 4, perk: 'A fourth order slot and premium clients' },
    ],
  },
  partsMarket: {
    id: 'partsMarket',
    name: 'Parts Market',
    role: 'Buy now or order for less',
    blurb: 'Stalls for power, comms, instruments, computers, pointing and propulsion.',
    action: 'Go shopping',
    buildCost: 0,
    buildSeconds: 0,
    needsLevel: 1,
    upgrades: [
      { level: 2, cost: 1200, seconds: 35, needsLevel: 2, perk: 'Deliveries arrive 30% faster' },
      { level: 3, cost: 3200, seconds: 60, needsLevel: 4, perk: 'Deliveries arrive 50% faster' },
    ],
  },
  integrationBay: {
    id: 'integrationBay',
    name: 'Integration Bay',
    role: 'Build satellites, part by part',
    blurb: 'Satellites come together on the turntable here. Test before you commit.',
    action: 'Open the bay',
    buildCost: 0,
    buildSeconds: 0,
    needsLevel: 1,
    upgrades: [
      { level: 2, cost: 2000, seconds: 45, needsLevel: 2, perk: 'Room for 6U satellites (10 slots)' },
      { level: 3, cost: 5000, seconds: 80, needsLevel: 4, perk: 'Room for small satellites' },
    ],
  },
  commsCenter: {
    id: 'commsCenter',
    name: 'Comms Center',
    role: 'Brings data down and stores it',
    blurb: 'The dish talks to your satellites. No dish time, no data, no paycheck.',
    action: 'Send data to the lab',
    buildCost: 0,
    buildSeconds: 0,
    needsLevel: 1,
    upgrades: [
      { level: 2, cost: 1800, seconds: 45, needsLevel: 2, perk: 'Bigger dish (+50% data per pass) and more storage' },
      { level: 3, cost: 4500, seconds: 80, needsLevel: 4, perk: 'A second dish and even more storage' },
    ],
  },
  launchPad: {
    id: 'launchPad',
    name: 'Launch Pad',
    role: 'Rockets and launches',
    blurb: "She's rusty, but she'll fly. Pick a rocket and an orbit, then light the candle.",
    action: 'Go to launch prep',
    buildCost: 0,
    buildSeconds: 0,
    needsLevel: 1,
    upgrades: [
      { level: 2, cost: 2500, seconds: 50, needsLevel: 2, perk: 'Small rocket: 200 kg to any Earth orbit' },
      { level: 3, cost: 8000, seconds: 90, needsLevel: 5, perk: 'Medium rocket: 2,000 kg, unlocks the Moon' },
    ],
  },
  scienceLab: {
    id: 'scienceLab',
    name: 'Science Lab',
    role: 'Turns raw data into products',
    blurb: 'Raw photos go in, calibrated images and maps come out. Clients pay for maps.',
    action: 'Open the lab',
    buildCost: 800,
    buildSeconds: 30,
    needsLevel: 1,
    upgrades: [
      { level: 2, cost: 1600, seconds: 40, needsLevel: 3, perk: 'A third production slot' },
      { level: 3, cost: 4000, seconds: 70, needsLevel: 5, perk: 'A fourth slot and 25% faster processing' },
    ],
  },
  engineeringLab: {
    id: 'engineeringLab',
    name: 'Engineering Lab',
    role: 'Research and testing',
    blurb: 'Test campaigns make parts more reliable. Research unlocks better ones.',
    action: 'Open the workshop',
    buildCost: 2200,
    buildSeconds: 50,
    needsLevel: 3,
    upgrades: [{ level: 2, cost: 3500, seconds: 60, needsLevel: 5, perk: 'A second test stand' }],
  },
  crewQuarters: {
    id: 'crewQuarters',
    name: 'Crew Quarters',
    role: 'Hire and house your crew',
    blurb: 'Every candidate is on the board. Pick the right person for each mission seat.',
    action: 'Meet the crew',
    buildCost: 1500,
    buildSeconds: 40,
    needsLevel: 2,
    upgrades: [{ level: 2, cost: 3000, seconds: 60, needsLevel: 4, perk: 'Two more beds' }],
  },
}
