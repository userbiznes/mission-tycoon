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

// ---------------------------------------------------------------------------
// Everything below was added for the rules engine (src/sim). Additive only.
// ---------------------------------------------------------------------------

export type OrbitId = 'leo' | 'mid' | 'polar' | 'moon' | 'mars'
export type RocketId = 'rideshare' | 'small' | 'medium'
export type StationId = 'home' | 'north' | 'equator' | 'south' | 'deepSpace'
export type SeatId = 'science' | 'spacecraft' | 'launch' | 'ground'
export type ResourceKey = 'mass' | 'power' | 'budget' | 'data' | 'comms' | 'time'
export type Destination = 'earth' | 'moon' | 'mars'
/** Broad orbit family, used to match against real missions. */
export type OrbitType = 'low' | 'mid' | 'polar' | 'lunar' | 'mars'
export type MassClass = 'cubesat' | 'small' | 'large'
/** What a mission looks at; used for the closest-real-mission match. */
export type ScienceTag = 'camera' | 'hires' | 'thermal' | 'weather' | 'ice' | 'tech'
export type TraitId = 'veteran' | 'rookie' | 'perfectionist' | 'thrifty'

export interface OrbitDef {
  id: OrbitId
  name: string
  altitudeKm: number
  destination: Destination
  orbitType: OrbitType
  /** fraction of the rocket's capacity that reaches this orbit */
  capacityFactor: number
  /** how long a satellite lasts here before it comes down or wears out */
  lifetimeYears: number
  periodMin: number
  sunMin: number
  shadowMin: number
  /** science per megabyte: lower orbits see sharper detail */
  sharpness: number
  /** one-phrase coverage, e.g. "the whole planet" */
  coverage: string
  /** plain-language text for the orbit card */
  card: string
  /** real-world delta-v figure quoted in the "Why?" tip, km/s */
  deltaVKmS: number
  unlockLevel: number
  /** solar panels must make this many times the average load (default: RULES.sunFactor) */
  sunFactor?: number
  /** battery watt-hours needed per watt of load to cross the shadow (default: RULES.shadowWhPerW) */
  shadowWhPerW?: number
  stretch?: boolean
}

export interface RocketDef {
  id: RocketId
  name: string
  /** payload to low orbit, kg (multiplied by the orbit's capacityFactor) */
  capacityKg: number
  price: number
  /** orbits this rocket can reach */
  orbits: OrbitId[]
  unlockLevel: number
  blurb: string
}

export interface StationDef {
  id: StationId
  name: string
  /** where on Earth, in plain words */
  region: string
  /** contacts per day for each orbit (0 = never sees it) */
  passes: Record<OrbitId, number>
  /** coins per mission; the home dish is free */
  rent: number
  /** megabytes the dish can take per pass (the home dish uses COMMS_LEVELS instead) */
  dishMbPerPass: number
  unlockLevel: number
  blurb: string
}

export interface ContractDef {
  id: string
  /** position in the campaign, starting at 1 */
  order: number
  title: string
  client: string
  /** one line: what the client wants */
  objective: string
  region: string
  /** two or three friendly sentences for the contract card */
  brief: string
  /** raw data types the client accepts */
  acceptedData: RawDataType[]
  tags: ScienceTag[]
  /** science to deliver (megabytes × quality) for the first star */
  scienceTarget: number
  /** length of the operations time-lapse, days */
  missionDays: number
  baseFee: number
  /** coins per unit of science delivered */
  payPerScience: number
  /** seed money paid when the contract is accepted */
  grant: number
  /** months allowed for the build */
  deadlineMonths: number
  difficulty: 1 | 2 | 3
  allowedOrbits: OrbitId[]
  unlockLevel: number
  /** what this mission is designed to teach */
  lessons: string[]
  stretch?: boolean
}

// ---- events (swipe cards) ----
export interface EventTrigger {
  /** a card that can always come up, used to make sure every mission gets two */
  always?: boolean
  computerNotStormProof?: boolean
  /** exactly one ground station in use */
  singleStation?: boolean
  /** battery under the healthy 1.2 Wh per watt */
  batteryBelowComfort?: boolean
  /** an instrument on board makes this kind of data */
  hasData?: RawDataType
  /** fine pointing hardware on board */
  hasFinePointing?: boolean
  /** Spacecraft seat is empty or held by a Rookie */
  rookieOrNoEngineer?: boolean
}

export interface EventEffect {
  /** days of data not made, starting on the event day (0.5 = half a day) */
  dataDaysLost?: number
  /** days with no ground contact, starting on the event day */
  downlinkDaysLost?: number
  /** data waiting in onboard storage is erased */
  wipeStorage?: boolean
  /** multiplies science from the event day to the end of the mission */
  scienceMult?: number
  /** multiplies orbital lifetime */
  lifetimeMult?: number
  /** coins spent */
  cost?: number
}

export interface EventChoice {
  id: 'a' | 'b'
  label: string
  blurb: string
  effect: EventEffect
}

export interface EventDef {
  id: string
  title: string
  /** the situation, one or two short sentences */
  text: string
  trigger: EventTrigger
  /** swipe left = choices[0], swipe right = choices[1] */
  choices: [EventChoice, EventChoice]
  /** used by the test run and when the player doesn't choose */
  defaultChoice: 'a' | 'b'
  /** the real-world basis, one sentence */
  basis: string
  filler?: boolean
}

// ---- closest real mission ----
export interface NasaMissionDef {
  id: string
  name: string
  /** launch year */
  year: number
  orbitType: OrbitType
  massClass: MassClass
  tags: ScienceTag[]
  destination: Destination
  /** one plain, accurate sentence */
  about: string
}

// ---- crew ----
export interface CrewDef {
  id: string
  name: string
  /** coins per mission */
  salary: number
  skills: Record<SeatId, number>
  dreamSeat: SeatId
  trait: TraitId
  bio: string
  unlockLevel: number
}

export interface TraitDef {
  id: TraitId
  name: string
  blurb: string
  /** added to effective skill in any seat */
  skillBonus: number
  /** skill gained after each mission (default 1) */
  growth: number
  /** multiplies the orbital lifetime of satellites they work on (1 = none) */
  lifetimeMult: number
  /** months added to the build */
  buildMonths: number
  /** multiplies parts + launch cost when seated */
  costMult: number
}

export interface SeatDef {
  id: SeatId
  name: string
  /** what the seat watches */
  watches: string
  /** plain-language effect line */
  effect: string
  /** size of the effect per skill point */
  perPoint: number
  /** points at or below this give nothing (Science counts points above 5) */
  baseline: number
}

// ---- lab ----
export type ProductId = 'calImage' | 'landMap' | 'calThermal' | 'fireMap' | 'sharpImage' | 'cloudMap'
export type ItemId = RawDataType | ProductId

export interface RecipeDef {
  id: ProductId
  name: string
  /** NASA data processing level of the product */
  dataLevel: 1 | 2 | 3
  inputs: { item: ItemId; qty: number }[]
  /** processing time in seconds (before TIME_SCALE) */
  seconds: number
  sellsFor: number
  unlockLevel: number
  blurb: string
}

export interface OrderTemplate {
  id: string
  client: string
  wants: { item: ProductId; qty: number }[]
  unlockLevel: number
}

export interface LevelDef {
  level: number
  /** total XP needed to reach this level */
  xp: number
  /** what the player is told they unlocked */
  unlocks: string[]
}
