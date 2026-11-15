import type { WhyDef } from './why'

/**
 * The lost spaceport. Decades ago an old agency ran this whole island; when the
 * money ran out the jungle took it back. Three regions lie beyond the creek,
 * each hiding a ruin that the player reclaims in two steps: clear the way, then
 * restore what is found there.
 *
 * Coordinates are in the island frame (u towards the camera, v along the island).
 */

export type RegionId = 'tracking' | 'annex' | 'heavy'
export const REGION_IDS: RegionId[] = ['tracking', 'annex', 'heavy']

/** locked → available → clearing → ruins → restoring → active */
export type RegionState = 'locked' | 'available' | 'clearing' | 'ruins' | 'restoring' | 'active'

export interface MaterialDef {
  id: string
  name: string
  blurb: string
  /** order price in coins; buying from stock costs the usual mark-up */
  cost: number
  deliverySec: number
}

/** Building materials sold at the Parts Market: what a restoration is made of. */
export const MATERIALS: MaterialDef[] = [
  { id: 'cableSpool', name: 'Cable spool', blurb: 'A drum of signal and power cable. Every ruin needs rewiring.', cost: 120, deliverySec: 20 },
  { id: 'steelBeam', name: 'Steel beam', blurb: 'Structural steel for towers, mounts and frames.', cost: 180, deliverySec: 30 },
  { id: 'controlPanel', name: 'Control panel', blurb: 'A console of switches, dials and screens.', cost: 320, deliverySec: 40 },
]
export const MATERIAL_BY_ID: Record<string, MaterialDef> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

export interface RegionDef {
  id: RegionId
  /** what stands there */
  name: string
  /** where it is, in a few words */
  place: string
  needsLevel: number
  /** what can be made out from the base */
  teaser: string
  /** the reward in one line, for the card */
  reward: string
  /** what restoring it changes, spelled out */
  rewardDetail: string
  clearCost: number
  clearSeconds: number
  crew: number
  restoreCost: number
  restoreSeconds: number
  materials: { id: string; qty: number }[]
  /** Rocco's line when the agency is big enough to go */
  rocco: string
  /** Rocco's memory of the place, said when it is working again */
  memory: string
  why?: WhyDef
  /** model registry id; level 0 is the ruin, 1 the restored building */
  model: string
  /** where the landmark stands */
  site: [number, number]
  /** which way it faces (radians about Y, world frame) */
  yaw: number
  /** where the expedition signpost stands, on the reclaimed side of the border */
  sign: [number, number]
  /** camera framing when the region is looked at: centre and view width */
  view: [number, number, number]
  /** how tall the landmark is, for pins */
  height: number
}

export const REGIONS: Record<RegionId, RegionDef> = {
  tracking: {
    id: 'tracking',
    name: 'Old Tracking Station',
    place: 'North forest, on the hill',
    needsLevel: 3,
    teaser: 'The rim of a giant rusty dish pokes above the canopy, wrapped in vines.',
    reward: 'Second dish: about double the data per day',
    rewardDetail: 'A second, bigger dish at home: twice the passes a day, and each pass carries far more.',
    clearCost: 400,
    clearSeconds: 30,
    crew: 2,
    restoreCost: 900,
    restoreSeconds: 45,
    materials: [
      { id: 'cableSpool', qty: 2 },
      { id: 'steelBeam', qty: 1 },
      { id: 'controlPanel', qty: 1 },
    ],
    rocco: "See that rusty rim above the trees? That's the old tracking station. We're big enough to go and get her now.",
    memory: "When I was a rookie, that dish was the best ear on the coast. Now she's listening again.",
    why: {
      title: 'Why is the dish on a hill?',
      rule: 'A dish can only hear a satellite that is above its horizon.',
      basis:
        'Trees, buildings and hills block radio signals near the ground. From high ground a dish sees the sky right down to the horizon, so it picks a satellite up earlier and holds it longer on every pass. That is why tracking stations sit on hilltops and open plains.',
      source: 'Ground-station siting practice: clear line of sight to the horizon.',
    },
    model: 'trackingStation',
    site: [-3.2, 3.6],
    yaw: 0,
    sign: [-4.2, -3.6],
    view: [-1.5, 2, 32],
    height: 8.6,
  },
  annex: {
    id: 'annex',
    name: 'Science Annex ruins',
    place: 'Central forest, past the creek',
    needsLevel: 5,
    teaser: 'A collapsed glass dome and an old radio mast stand in the trees.',
    reward: 'Fire Map, Cloud Map and the Engineering Lab',
    rewardDetail: 'The advanced lab chains open (Fire Map and Cloud Map), and the Engineering Lab can be built.',
    clearCost: 900,
    clearSeconds: 40,
    crew: 2,
    restoreCost: 2000,
    restoreSeconds: 60,
    materials: [
      { id: 'cableSpool', qty: 2 },
      { id: 'steelBeam', qty: 2 },
      { id: 'controlPanel', qty: 2 },
    ],
    rocco: "The old science annex is down past the creek. Half the dome's gone, but the benches are still in there. Let's clear a way in.",
    memory: 'We made the first fire maps under that dome, on a machine the size of a wardrobe. Good to see the lights on.',
    model: 'scienceAnnex',
    site: [10.5, 6.2],
    yaw: 0,
    sign: [11.5, -6.2],
    view: [9, 2.5, 34],
    height: 7.4,
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy Launch Complex',
    place: 'Far east tip of the island',
    needsLevel: 7,
    teaser: 'The top of a tipped-over launch tower, and a cracked flame trench.',
    reward: 'Medium rocket and the Moon contract',
    rewardDetail: 'The Medium rocket flies from here, and the Moon Ice Mapper contract opens.',
    clearCost: 1800,
    clearSeconds: 50,
    crew: 2,
    restoreCost: 4500,
    restoreSeconds: 75,
    materials: [
      { id: 'cableSpool', qty: 3 },
      { id: 'steelBeam', qty: 4 },
      { id: 'controlPanel', qty: 2 },
    ],
    rocco: "The heavy pad is out on the east tip, tower flat on its side. If we stand her up again, we can fly the big rockets.",
    memory: 'I watched the last big one go up from that pad. Shook the fillings out of my teeth. Time she shook the island again.',
    why: {
      title: 'Why launch from the far east tip?',
      rule: 'Big rockets launch far from everything else, eastward over open ocean.',
      basis:
        'A rocket that fails falls back along its path, so launch sites point their rockets over empty sea, well away from people and buildings. Launching east also adds the speed of Earth\'s spin, about 465 m/s at the equator, so the same rocket can lift more.',
      source: 'Launch-site safety and Earth\'s rotation: why most launch sites are on an east coast.',
    },
    model: 'heavyLaunch',
    site: [-3, 38],
    yaw: 0,
    sign: [-4, 22.2],
    view: [0, 33, 46],
    height: 9.5,
  },
}

/** How a state reads in a chip or a toast. */
export const REGION_STATE_WORDS: Record<RegionState, string> = {
  locked: 'Locked',
  available: 'Ready to explore',
  clearing: 'Clearing the way',
  ruins: 'Ruins found',
  restoring: 'Being restored',
  active: 'Restored',
}
