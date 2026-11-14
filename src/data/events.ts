import type { EventDef } from './types'

/**
 * Swipe-card events. Each card only comes up when its trigger fits the design,
 * so the surprises are consequences of the player's own choices. Effects are
 * explicit and fixed, so the card can preview exactly what each swipe does.
 */
export const EVENTS: EventDef[] = [
  {
    id: 'solarStorm',
    title: 'Solar storm',
    text: 'A burst of radiation from the Sun is on its way. The basic computer isn\'t shielded.',
    trigger: { computerNotStormProof: true },
    choices: [
      {
        id: 'a',
        label: 'Safe mode',
        blurb: 'Switch off for a day and wait it out.',
        effect: { dataDaysLost: 1 },
      },
      {
        id: 'b',
        label: 'Keep working',
        blurb: 'The computer resets: stored data is wiped and the hardware takes a hit.',
        effect: { wipeStorage: true, lifetimeMult: 0.9 },
      },
    ],
    defaultChoice: 'a',
    basis: 'Charged particles from solar storms can flip bits and reset unshielded electronics.',
  },
  {
    id: 'stationRain',
    title: 'Rain at the station',
    text: 'A storm is parked over your only dish. It can\'t hear the satellite through the downpour.',
    trigger: { singleStation: true },
    choices: [
      {
        id: 'a',
        label: 'Wait it out',
        blurb: 'No contact for 2 days. Data piles up on board.',
        effect: { downlinkDaysLost: 2 },
      },
      {
        id: 'b',
        label: 'Rent a backup',
        blurb: 'Pay another station to listen this week.',
        effect: { cost: 150 },
      },
    ],
    defaultChoice: 'a',
    basis: 'Heavy rain soaks up radio signals ("rain fade"), which is why missions use more than one station.',
  },
  {
    id: 'coldBattery',
    title: 'Cold battery',
    text: 'The battery is draining deep every orbit and getting cold. It won\'t like that for long.',
    trigger: { batteryBelowComfort: true },
    choices: [
      {
        id: 'a',
        label: 'Run the heaters',
        blurb: 'The instrument rests for a day while the battery warms up.',
        effect: { dataDaysLost: 1 },
      },
      {
        id: 'b',
        label: 'Tough it out',
        blurb: 'Keep working. The battery wears out sooner.',
        effect: { lifetimeMult: 0.7 },
      },
    ],
    defaultChoice: 'a',
    basis: 'Batteries lose capacity when cold and when drained deeply, so satellites carry heaters and spare capacity.',
  },
  {
    id: 'wildfire',
    title: 'Wildfire spotted',
    text: 'Your thermal sensor just caught a new fire. Firefighters would love extra looks at it.',
    trigger: { hasData: 'rawThermal' },
    choices: [
      {
        id: 'a',
        label: 'Retask',
        blurb: 'Extra scans mean bonus science, but the battery works harder.',
        effect: { scienceMult: 1.2, lifetimeMult: 0.9 },
      },
      {
        id: 'b',
        label: 'Stay on plan',
        blurb: 'Keep the normal schedule.',
        effect: {},
      },
    ],
    defaultChoice: 'b',
    basis: 'Real fire-watching satellites are retasked to give crews fresh maps of active fires.',
  },
  {
    id: 'wobblyWheel',
    title: 'Wobbly wheel',
    text: 'One reaction wheel is vibrating. Nobody on the team has seen this before.',
    trigger: { hasFinePointing: true, rookieOrNoEngineer: true },
    choices: [
      {
        id: 'a',
        label: 'Recalibrate',
        blurb: 'Stop for a day and rebalance the wheels.',
        effect: { dataDaysLost: 1 },
      },
      {
        id: 'b',
        label: 'Push on',
        blurb: 'Keep shooting. Images come out a little blurred.',
        effect: { scienceMult: 0.85 },
      },
    ],
    defaultChoice: 'a',
    basis: 'Reaction wheels wear and vibrate; several real space telescopes have lost wheels in flight.',
  },
  {
    id: 'debrisAlert',
    title: 'Debris alert',
    text: 'Tracking says a piece of old rocket will pass close by tomorrow.',
    trigger: { always: true },
    choices: [
      {
        id: 'a',
        label: 'Hunker down',
        blurb: 'Turn edge-on and pause the instrument for half a day.',
        effect: { dataDaysLost: 0.5 },
      },
      {
        id: 'b',
        label: 'Hold steady',
        blurb: 'Keep working and accept a small risk to the hardware.',
        effect: { lifetimeMult: 0.9 },
      },
    ],
    defaultChoice: 'b',
    basis: 'Thousands of tracked debris objects share low orbit; operators get close-approach warnings.',
    filler: true,
  },
  {
    id: 'bonusRequest',
    title: 'Bonus request',
    text: 'The client asks for a few extra targets "if it\'s no trouble".',
    trigger: { always: true },
    choices: [
      {
        id: 'a',
        label: 'Squeeze it in',
        blurb: 'More science, a little more wear.',
        effect: { scienceMult: 1.1, lifetimeMult: 0.95 },
      },
      {
        id: 'b',
        label: 'Stick to the plan',
        blurb: 'Politely decline.',
        effect: {},
      },
    ],
    defaultChoice: 'b',
    basis: 'Mission teams trade extra observations against wear on the spacecraft all the time.',
    filler: true,
  },
]

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]))
