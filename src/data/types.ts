/**
 * Shared data types. Everything the game balances lives in `src/data/*.ts`
 * as typed tables; logic in `src/sim` only ever reads them.
 */

export type PartCategory = 'bus' | 'power' | 'comms' | 'instrument' | 'computer' | 'pointing' | 'propulsion'

export type PartId = string

/** Raw data a satellite sends home; the Science Lab turns it into products. */
export type RawDataType = 'rawImage' | 'rawHiRes' | 'rawThermal'

export type PointingLevel = 'none' | 'coarse' | 'fine'

export interface PartDef {
  id: PartId
  name: string
  category: PartCategory
  /** one friendly line for the market card */
  blurb: string
  massKg: number
  /** continuous electrical load in watts (0 for passive parts) */
  loadW: number
  /** order price in coins; buying from stock costs STOCK_MARKUP more */
  cost: number
  /** delivery time when ordered, in seconds (before TIME_SCALE) */
  deliverySec: number
  /** months this part adds to the build schedule */
  buildMonths: number
  /** player level needed to see it in the market */
  unlockLevel: number
  /** how many of this part one satellite may carry (default 1) */
  maxPerSat?: number

  // ---- category-specific numbers (only the relevant ones are set) ----
  /** bus: number of part slots */
  slots?: number
  /** power: generation in sunlight, watts */
  solarW?: number
  /** power: battery capacity, watt-hours */
  batteryWh?: number
  /** comms: megabytes brought down per ground-station pass */
  mbPerPass?: number
  /** computer: onboard storage, megabytes */
  storageMb?: number
  /** computer: survives solar storms */
  stormProof?: boolean
  /** pointing: what this part provides */
  pointing?: PointingLevel
  /** some radios and cameras only work with this pointing level */
  needsPointing?: PointingLevel
  /** instrument: data made per day, megabytes */
  mbPerDay?: number
  /** instrument: kind of raw data produced */
  produces?: RawDataType
  /** propulsion: extra years of orbital lifetime */
  extraLifeYears?: number
}
