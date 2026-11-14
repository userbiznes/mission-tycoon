/**
 * Debrief sentences. The rules engine picks which ones apply and fills the
 * {placeholders}; the wording lives here so it can be tuned without touching logic.
 */

export type ReasonId =
  | 'noInstrument'
  | 'instrumentPointing'
  | 'noSolar'
  | 'powerShort'
  | 'noBattery'
  | 'batterySmall'
  | 'batteryWear'
  | 'noComputer'
  | 'storageFull'
  | 'noRadio'
  | 'radioPointing'
  | 'noPasses'
  | 'downlinkShort'
  | 'dishSlow'
  | 'eventLoss'
  | 'eventBonus'
  | 'late'
  | 'loss'
  | 'thinReserve'
  | 'thinMargin'
  | 'overbuilt'
  | 'sloppyLaunch'
  | 'scienceMissed'
  | 'scienceMet'
  | 'scienceMetBarely'
  | 'allHome'
  | 'profit'
  | 'efficient'

export type ReasonTone = 'bad' | 'warn' | 'good'

export interface ReasonTemplate {
  tone: ReasonTone
  /** what happened */
  text: string
  /** what would fix it (optional) */
  fix?: string
}

export const REASONS: Record<ReasonId, ReasonTemplate> = {
  noInstrument: {
    tone: 'bad',
    text: 'Nothing on board could make the {kind} this client asked for.',
    fix: 'Add the right instrument.',
  },
  instrumentPointing: {
    tone: 'bad',
    text: 'The {part} never held steady on its target, so its data was useless.',
    fix: 'It needs {need}.',
  },
  noSolar: {
    tone: 'bad',
    text: 'With no solar panels, the satellite ran flat within hours.',
    fix: 'Add solar cells.',
  },
  powerShort: {
    tone: 'bad',
    text: 'The panels could only run the satellite {pct}% of the time: {have} W in sunlight against {need} W needed.',
    fix: 'More panel power or fewer hungry parts would fix that.',
  },
  noBattery: {
    tone: 'bad',
    text: 'With no battery, the satellite went dark in Earth\'s shadow and never woke up.',
    fix: 'Add a battery: shadow lasts about 35 minutes of every orbit.',
  },
  batterySmall: {
    tone: 'bad',
    text: 'The battery was too small for 35 minutes of shadow each orbit, so the satellite kept browning out.',
    fix: 'It needs at least {need} Wh.',
  },
  batteryWear: {
    tone: 'warn',
    text: 'The battery drained deep on every orbit, so it will wear out early: orbital life is down to {years}.',
    fix: 'A bigger battery would last.',
  },
  noComputer: {
    tone: 'bad',
    text: 'There was no computer on board, so there was nowhere to keep the data.',
    fix: 'Add a computer.',
  },
  storageFull: {
    tone: 'bad',
    text: 'The computer filled up and {fraction} of your {kind} were overwritten before they could be sent.',
    fix: 'More storage would fix that.',
  },
  noRadio: {
    tone: 'bad',
    text: 'There was no working radio, so nothing could be sent home.',
    fix: 'Add a radio.',
  },
  radioPointing: {
    tone: 'bad',
    text: 'The {part} couldn\'t aim its narrow beam at the ground.',
    fix: 'It needs reaction wheels.',
  },
  noPasses: {
    tone: 'bad',
    text: 'Your ground stations never saw this orbit, so nothing came home.',
    fix: 'Pick a station that sees it.',
  },
  downlinkShort: {
    tone: 'bad',
    text: 'Your radio sent only {fraction} of your {kind} home.',
    fix: 'A faster radio or a second dish would fix that.',
  },
  dishSlow: {
    tone: 'bad',
    text: 'The ground couldn\'t keep up: only {fraction} of your {kind} came home.',
    fix: 'A bigger dish or another station would fix that.',
  },
  eventLoss: {
    tone: 'warn',
    text: '{event}: "{choice}" cost about {amount}.',
  },
  eventBonus: {
    tone: 'good',
    text: '{event}: "{choice}" earned about {amount} of extra science.',
  },
  late: {
    tone: 'bad',
    text: 'The satellite was {months} late, so the client cut the fee by {pct}%.',
    fix: 'Fewer or simpler parts build faster.',
  },
  loss: {
    tone: 'bad',
    text: 'The mission cost {cost} coins and earned {income}. {biggest} was the biggest bill.',
    fix: 'A leaner design would turn a profit.',
  },
  thinReserve: {
    tone: 'warn',
    text: 'Less than 10% of the budget was left in reserve.',
    fix: 'Real teams keep a cushion for surprises.',
  },
  thinMargin: {
    tone: 'warn',
    text: '{bar} had only {pct}% to spare.',
    fix: 'One bad day would have sunk it.',
  },
  overbuilt: {
    tone: 'warn',
    text: '{note}',
    fix: 'Spare capacity you never use is money left on the pad.',
  },
  sloppyLaunch: {
    tone: 'warn',
    text: 'A rough ride to orbit cost about {amount} of orbital life.',
    fix: 'Nail the timing, or let the autopilot fly.',
  },
  scienceMissed: {
    tone: 'bad',
    text: 'Only {pct}% of the science target came home.',
  },
  scienceMet: {
    tone: 'good',
    text: 'Science target met with {pct}% to spare.',
  },
  scienceMetBarely: {
    tone: 'good',
    text: 'Science target met, with almost nothing to spare.',
  },
  allHome: {
    tone: 'good',
    text: 'The data chain kept up: {fraction} of your {kind} reached the ground.',
  },
  profit: {
    tone: 'good',
    text: 'The mission earned {income} coins and cost {cost}: a profit of {profit}.',
  },
  efficient: {
    tone: 'good',
    text: 'Every margin sat in the sweet spot: enough to be safe, nothing wasted.',
  },
}

/** Plain names for the six bars, used inside sentences. */
export const BAR_NAMES = {
  mass: 'Mass',
  power: 'Power',
  powerSun: 'Sunlight power',
  powerShadow: 'The battery',
  budget: 'Budget',
  data: 'Data',
  comms: 'Comms',
  time: 'Time',
} as const
