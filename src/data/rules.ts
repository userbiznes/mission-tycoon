/**
 * The numbers behind the six resource bars. Game values, tuned in playtests;
 * each has a real-world basis explained in `why.ts`.
 */
export const RULES = {
  /**
   * Solar panels must make this many times the average load.
   * A ~95-minute low orbit has ~60 min of sun and ~35 min of shadow: 95 / 60 ≈ 1.6.
   */
  sunFactor: 1.6,
  /** Battery watt-hours per watt of load to get through ~35 minutes of shadow (35 / 60 ≈ 0.6). */
  shadowWhPerW: 0.6,
  /** Under this many Wh per watt the battery drains deep every orbit and wears out sooner. */
  comfortWhPerW: 1.2,
  /** Lifetime multiplier when the battery sits between the two thresholds above. */
  batteryWearLifeMult: 0.6,
  /** Lifetime multiplier when the battery can't cover the shadow at all. */
  batteryFailLifeMult: 0.25,

  /** A margin under this is "thin": amber bar, no efficiency star. */
  marginMin: 0.1,
  /** A margin over this is "overbuilt", but only if a smaller or cheaper choice would still work. */
  marginMax: 0.5,
  /** Warn when less than this fraction of the mission's funds is left in reserve. */
  reserveMin: 0.1,

  /** Months of integration and testing on top of the parts' own build months. */
  baseBuildMonths: 2,
  /** Fraction of the base fee lost per month past the deadline. */
  latePenaltyPerMonth: 0.1,
  /** The fee never drops below this fraction for lateness alone. */
  lateFeeFloor: 0.5,
  /** Below this share of the science target the client starts cutting the base fee. */
  fullFeeSciencePct: 0.5,
  /** Science pay stops growing past this multiple of the target. */
  sciencePayCap: 1.5,

  /** Science multiplier when the satellite has fine pointing ("sharper images"). */
  finePointingScienceMult: 1.2,

  /** Flight quality used when the player lets the autopilot fly the launch. */
  autopilotQuality: 0.8,
  /** Lifetime kept after the worst possible manual launch (quality 0). A perfect flight keeps 100%. */
  sloppyLaunchLifeFloor: 0.6,
  /** Launch timing window is this much wider per Launch-seat skill point. */
  launchWindowPerPoint: 0.06,

  /** Satellites lighter than this are CubeSat-class; lighter than `smallSatKg`, small-sat class. */
  cubesatKg: 30,
  smallSatKg: 500,

  /** How many event cards a mission deals. */
  minEvents: 2,
  maxEvents: 3,
} as const

/** Plain names for the raw data types, as used in sentences. */
export const RAW_DATA_WORDS = {
  rawImage: { item: 'Raw Image', plural: 'photos', kind: 'photos' },
  rawHiRes: { item: 'Raw Sharp Image', plural: 'sharp photos', kind: 'sharp photos' },
  rawThermal: { item: 'Raw Thermal', plural: 'heat readings', kind: 'heat readings' },
} as const
