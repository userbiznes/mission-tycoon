import type { ItemId, OrderTemplate, ProductId, RawDataType, RecipeDef } from './types'

/**
 * Science Lab production chains, modelled on NASA's data processing levels:
 * Level 0 raw → Level 1 calibrated → Level 2 derived → Level 3 mapped on a grid.
 */
export const RECIPES: RecipeDef[] = [
  {
    id: 'calImage',
    name: 'Calibrated Image',
    dataLevel: 1,
    inputs: [{ item: 'rawImage', qty: 2 }],
    seconds: 20,
    sellsFor: 15,
    unlockLevel: 1,
    blurb: 'Raw photos cleaned up and tagged with time and place.',
  },
  {
    id: 'landMap',
    name: 'Land Map',
    dataLevel: 3,
    inputs: [{ item: 'calImage', qty: 3 }],
    seconds: 45,
    sellsFor: 60,
    unlockLevel: 1,
    blurb: 'Calibrated images stitched onto an even map grid.',
  },
  {
    id: 'calThermal',
    name: 'Calibrated Thermal',
    dataLevel: 1,
    inputs: [{ item: 'rawThermal', qty: 2 }],
    seconds: 25,
    sellsFor: 20,
    unlockLevel: 2,
    blurb: 'Raw heat readings turned into true temperatures.',
  },
  {
    id: 'fireMap',
    name: 'Fire Map',
    dataLevel: 3,
    inputs: [
      { item: 'calThermal', qty: 2 },
      { item: 'calImage', qty: 1 },
    ],
    seconds: 60,
    sellsFor: 90,
    unlockLevel: 2,
    blurb: 'Hot spots laid over a photo map so crews know where to go.',
  },
  {
    id: 'sharpImage',
    name: 'Calibrated Sharp Image',
    dataLevel: 1,
    inputs: [{ item: 'rawHiRes', qty: 2 }],
    seconds: 30,
    sellsFor: 25,
    unlockLevel: 3,
    blurb: 'High-res camera frames, calibrated.',
  },
  {
    id: 'cloudMap',
    name: 'Cloud Map',
    dataLevel: 3,
    inputs: [{ item: 'sharpImage', qty: 3 }],
    seconds: 60,
    sellsFor: 80,
    unlockLevel: 3,
    blurb: 'Sharp calibrated images mapped into a storm-tracking chart.',
  },
]

export const RECIPE_BY_ID: Record<ProductId, RecipeDef> = Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<
  ProductId,
  RecipeDef
>

/** Display names for everything that can sit in storage. */
export const ITEM_NAMES: Record<ItemId, string> = {
  rawImage: 'Raw Image',
  rawHiRes: 'Raw Sharp Image',
  rawThermal: 'Raw Thermal',
  calImage: 'Calibrated Image',
  landMap: 'Land Map',
  calThermal: 'Calibrated Thermal',
  fireMap: 'Fire Map',
  sharpImage: 'Calibrated Sharp Image',
  cloudMap: 'Cloud Map',
}

export const RAW_TYPES: RawDataType[] = ['rawImage', 'rawHiRes', 'rawThermal']

/** Megabytes of delivered data that make one raw item at the Comms Center. */
export const RAW_UNIT_MB: Record<RawDataType, number> = {
  rawImage: 25,
  rawThermal: 50,
  rawHiRes: 150,
}

/** Science Lab levels: more slots and faster processing. */
export const LAB_LEVELS: { level: number; slots: number; speed: number }[] = [
  { level: 1, slots: 2, speed: 1 },
  { level: 2, slots: 3, speed: 1.25 },
  { level: 3, slots: 4, speed: 1.6 },
]

/** Small orders pay this much more than selling the products one by one. */
export const ORDER_BONUS = 1.25
/** XP for each product delivered in an order. */
export const ORDER_XP_PER_ITEM = 1
/** Seconds before a filled order slot offers a new order (before TIME_SCALE). */
export const ORDER_REFILL_SEC = 45

/** Small truck-style orders, filled from lab products. */
export const ORDER_TEMPLATES: OrderTemplate[] = [
  { id: 'harborPhotos', client: 'Harbor Master', wants: [{ item: 'calImage', qty: 2 }], unlockLevel: 1 },
  { id: 'schoolPoster', client: 'Coast School', wants: [{ item: 'calImage', qty: 3 }], unlockLevel: 1 },
  { id: 'townMap', client: 'Town Planner', wants: [{ item: 'landMap', qty: 1 }], unlockLevel: 1 },
  {
    id: 'farmSurvey',
    client: 'Farm Co-op',
    wants: [
      { item: 'landMap', qty: 1 },
      { item: 'calImage', qty: 2 },
    ],
    unlockLevel: 1,
  },
  { id: 'atlas', client: 'Atlas Press', wants: [{ item: 'landMap', qty: 2 }], unlockLevel: 1 },
  { id: 'rangerHeat', client: 'Park Rangers', wants: [{ item: 'calThermal', qty: 2 }], unlockLevel: 2 },
  { id: 'fireCrew', client: 'Fire Crew 7', wants: [{ item: 'fireMap', qty: 1 }], unlockLevel: 2 },
  {
    id: 'forestService',
    client: 'Forest Service',
    wants: [
      { item: 'fireMap', qty: 3 },
      { item: 'calImage', qty: 2 },
    ],
    unlockLevel: 2,
  },
  {
    id: 'insurer',
    client: 'Hillside Insurance',
    wants: [
      { item: 'fireMap', qty: 1 },
      { item: 'landMap', qty: 1 },
    ],
    unlockLevel: 2,
  },
  { id: 'weatherDesk', client: 'Weather Desk', wants: [{ item: 'cloudMap', qty: 1 }], unlockLevel: 3 },
  {
    id: 'ferryLine',
    client: 'Ferry Line',
    wants: [
      { item: 'cloudMap', qty: 2 },
      { item: 'sharpImage', qty: 1 },
    ],
    unlockLevel: 3,
  },
  {
    id: 'newsroom',
    client: 'Evening News',
    wants: [
      { item: 'cloudMap', qty: 1 },
      { item: 'landMap', qty: 1 },
    ],
    unlockLevel: 3,
  },
]
