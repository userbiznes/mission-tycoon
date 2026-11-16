import { AUTOPILOT_QUALITY, lifeKept } from '../state/launch'
import { BUILDINGS } from '../data/buildings'
import { CONTRACT_BY_ID } from '../data/contracts'
import { STARTING_BANK } from '../data/economy'
import type { BuildingId } from '../data/layout'
import { ORBIT_BY_ID } from '../data/orbits'
import { PART_BY_ID } from '../data/parts'
import { REGIONS } from '../data/regions'
import { ROCKETS } from '../data/rockets'
import { RULES } from '../data/rules'
import { STATIONS } from '../data/stations'
import type { GameState } from '../state/game'
import type { Screen } from '../state/ui'

/**
 * Chief Rocco's first-flight tutorial, as data. The director (director.ts)
 * walks this list; nothing here knows how a step is drawn.
 *
 * Every number and label Rocco says is read from the game's own data, so the
 * script cannot drift from the game: part names and watts, the contract's
 * client and fee, how much the rideshare lifts, how often the home dish hears
 * the satellite, the orbital speed.
 *
 * In Rocco's lines, [[Buy now|yellow]] draws "Buy now" as a tiny copy of the
 * real button (tones: yellow, green, blue, red, cream, tab, why).
 */

export type StepType = 'talk' | 'do' | 'wait' | 'cinematic'
export type CameraTarget = 'home' | 'harbour' | { building: BuildingId } | { region: 'tracking' | 'annex' | 'heavy' }
export type Line = string | ((c: Ctx) => string)

/** What a step can read about the game right now. */
export interface Ctx {
  name: string
  agency: string
  game: GameState
  screen: Screen
  sheet: string | null
  /** is this anchor on screen? */
  has: (anchor: string) => boolean
  /** ms since a bus event last fired in this run, or null */
  since: (event: string) => number | null
  /** the player has dragged / zoomed the camera since this step began */
  moved: boolean
  zoomed: boolean
  launchPhase: string
  /** ms since this step began */
  elapsed: number
}

export interface Step {
  id: string
  /** 0 welcome, 1–7 the checklist, 8 graduation */
  chapter: number
  /** talk: Rocco speaks, Next moves on. do: the player does one thing. wait: something plays out. cinematic: the camera shows something. */
  type: StepType
  /** full-size Rocco over a dimmed screen (the welcome and the graduation only) */
  stage?: boolean
  line?: Line
  /** do steps: the one short instruction that ends the bubble */
  instruction?: Line
  /** said instead after 20 idle seconds: the same thing, more specifically */
  idleHint?: Line
  /** what to spotlight; on a do step, what accepts the click */
  target?: string | string[]
  /** kept bright as well, but not clickable */
  highlight?: string[]
  /** if the target is not on screen, this is clicked first (a tab), with this instruction */
  via?: string
  viaHint?: Line
  camera?: CameraTarget
  /** what must be open for this step; restored if the player wanders off or reloads */
  scene?: { screen?: Exclude<Screen, null> | null; sheet?: 'contracts' | 'market' | null; marketTab?: string; /** which step of the launch board is open */ prepStep?: number }
  /** bus events that complete the step */
  done?: string[]
  /** …or a condition, checked a few times a second */
  doneWhen?: (c: Ctx) => boolean
  /** leave the step out when this is true (the battery step, if the shadow bar is already green) */
  skipIf?: (c: Ctx) => boolean
  /** inputs the game accepts during the step: only the target (default for do), nothing (default for talk), the camera, or everything */
  allow?: 'target' | 'none' | 'camera' | 'all'
  /** dim the screen around the target (default: yes for do steps and for talk steps with a target) */
  dim?: boolean
  /** a 3D target was clicked: what the click does during the tutorial */
  onClick?: (c: Ctx) => void
  /** side effects when the step starts, also after a reload */
  enter?: (c: Ctx) => void
  /** where to resume from if this step cannot be restored after a reload */
  resume?: string
  /** show a "Next" way out after this long, so nobody is ever stuck (ms) */
  escapeAfter?: number
  /** hold the operations time-lapse while this step is up */
  holdOps?: boolean
}

// ------------------------------------------------------------------ what the script reads from the game
const FL = CONTRACT_BY_ID.firstLight
const P = PART_BY_ID
const CAM = P.camWide
const PANELS = P.deployPanels
const CELLS = P.bodyCells
const BATTERY = P.batterySmall
const RIDESHARE = ROCKETS.find((r) => r.id === 'rideshare')!
const LEO = ORBIT_BY_ID.leo
const HOME = STATIONS.find((s) => s.id === 'home')!
const EQUATOR = STATIONS.find((s) => s.id === 'equator')!
const num = (n: number) => n.toLocaleString('en-US')
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Orbital speed at a height, in km/s (the same sum the launch screen shows). */
const orbitSpeed = (km: number) => Math.sqrt(398600 / (6371 + km)).toFixed(1)
/** Minutes of Earth's shadow per orbit, from the battery rule (0.6 Wh per watt = about 35 minutes). */
const SHADOW_MIN = Math.round((RULES.shadowWhPerW * 60) / 5) * 5

/** The parts the old crew left: these are in the storeroom when the tutorial starts… */
export const STARTER_STORE: Record<string, number> = { bus3u: 1, cpuBasic: 1, radioUhf: 1, magnetorquers: 1, bodyCells: 2, batterySmall: 1 }
/** …and these are already bolted to the satellite body (a 3U body has six slots: three are left for the camera, the panels and the battery). */
export const STARTER_FITTED = ['cpuBasic', 'radioUhf', 'magnetorquers']
export const STARTER_COINS = STARTING_BANK
/** Seconds the ordered panels take during the tutorial. */
export const TUTORIAL_ORDER_SECONDS = 10
export const TUTORIAL_CONTRACT = FL.id

/** The seven things on the First Flight checklist: chapters 1 to 7. */
export const CHECKLIST = ['Take a job', 'Buy parts', 'Build the satellite', 'Plan the launch', 'Launch', 'Fly the mission', 'Get paid']

const fitted = (c: Ctx, id: string) => !!c.game.draft?.design.parts.includes(id)
const owned = (c: Ctx, id: string) => (c.game.inventory[id] ?? 0) > 0
const onItsWay = (c: Ctx, id: string) => c.game.deliveries.some((d) => d.partId === id)

// ------------------------------------------------------------------ the script
export const STEPS: Step[] = [
  // ============================================================ 0: Welcome
  {
    id: 'c0.welcome',
    chapter: 0,
    type: 'talk',
    stage: true,
    camera: 'home',
    line: (c) => `Hey ${c.name}! Welcome to ${c.agency}. I know, I know, it's pretty old. But everybody starts somewhere.`,
  },
  {
    id: 'c0.rocco',
    chapter: 0,
    type: 'talk',
    stage: true,
    line: "I'm Rocco. I ran missions here back in the day. Let's get your first satellite into orbit.",
  },
  {
    id: 'c0.look',
    chapter: 0,
    type: 'do',
    allow: 'camera',
    dim: false,
    camera: 'home',
    line: 'First, look around. Drag to move the camera, scroll to zoom.',
    instruction: 'Drag the island, then scroll to zoom',
    idleHint: 'Hold the mouse button down on the island and move it. Then roll the wheel, or pinch on a trackpad.',
    doneWhen: (c) => c.moved && c.zoomed,
    escapeAfter: 14000,
  },
  { id: 'c0.coins', chapter: 0, type: 'talk', camera: 'home', target: 'coins', line: 'Parts and launches cost coins. Missions pay them back.' },
  { id: 'c0.level', chapter: 0, type: 'talk', target: 'hud.agency', line: 'Missions earn XP. New levels unlock new parts and places.' },
  { id: 'c0.build', chapter: 0, type: 'talk', target: 'build', line: 'New buildings come from here, later.' },

  // ============================================================ 1: Take a job
  {
    id: 'c1.mc',
    chapter: 1,
    type: 'do',
    scene: { screen: null, sheet: null },
    camera: { building: 'missionControl' },
    target: 'building:missionControl',
    line: `Clients post jobs at ${BUILDINGS.missionControl.name}.`,
    instruction: `Click ${BUILDINGS.missionControl.name}`,
    idleHint: `${BUILDINGS.missionControl.name} is the lit building under the hand. Click anywhere on it.`,
    done: ['sheet.opened:contracts'],
    doneWhen: (c) => c.sheet === 'contracts',
  },
  {
    id: 'c1.note',
    chapter: 1,
    type: 'talk',
    scene: { screen: null, sheet: 'contracts' },
    target: `contracts.note.${FL.id}.job`,
    line: `The ${FL.client} wants photos of our coast. An easy job that pays well.`,
  },
  {
    id: 'c1.science',
    chapter: 1,
    type: 'talk',
    scene: { screen: null, sheet: 'contracts' },
    target: `contracts.note.${FL.id}.science`,
    line: `The science target: how much science we must bring home. This job wants ${num(FL.scienceTarget)}.`,
  },
  {
    id: 'c1.pay',
    chapter: 1,
    type: 'talk',
    scene: { screen: null, sheet: 'contracts' },
    target: `contracts.note.${FL.id}.pay`,
    line: `The payout: ${num(FL.baseFee)} coins, and more for extra science.`,
  },
  {
    id: 'c1.deadline',
    chapter: 1,
    type: 'talk',
    scene: { screen: null, sheet: 'contracts' },
    target: `contracts.note.${FL.id}.deadline`,
    line: `And the deadline: ${FL.deadlineMonths} months.`,
  },
  {
    id: 'c1.accept',
    chapter: 1,
    type: 'do',
    scene: { screen: null, sheet: 'contracts' },
    target: `contracts.accept.${FL.id}`,
    line: "Let's take it.",
    instruction: (c) => `Click the [[${c.game.bestStars[FL.id] !== undefined ? 'Fly again' : 'Take the job'}|green]] button`,
    idleHint: `The green button is at the bottom of the ${FL.title} note.`,
    done: ['contract.accepted'],
    doneWhen: (c) => c.game.draft?.contractId === FL.id,
  },
  {
    id: 'c1.bench',
    chapter: 1,
    type: 'talk',
    scene: { screen: null, sheet: 'contracts' },
    target: 'contracts.active',
    line: "On the bench means we're working on it.",
  },

  // ============================================================ 2: Buy parts
  {
    id: 'c2.go',
    chapter: 2,
    type: 'do',
    scene: { screen: null, sheet: null },
    camera: { building: 'partsMarket' },
    target: 'building:partsMarket',
    line: `We need a camera. To the ${BUILDINGS.partsMarket.name} on the dock!`,
    instruction: `Click the ${BUILDINGS.partsMarket.name}`,
    idleHint: `The ${BUILDINGS.partsMarket.name} is the red-roofed hall on the dock, under the hand.`,
    done: ['sheet.opened:market'],
    doneWhen: (c) => c.sheet === 'market',
  },
  {
    id: 'c2.buy',
    chapter: 2,
    type: 'do',
    scene: { screen: null, sheet: 'market', marketTab: 'instrument' },
    target: `market.buy.${CAM.id}`,
    via: 'market.tab.instrument',
    viaHint: 'Open the [[Instruments|tab]] tab',
    line: '[[Buy now|yellow]] gets it today but costs more.',
    instruction: 'Click the [[Buy now|yellow]] button',
    idleHint: `Find the ${CAM.name} on the shelf, then click its yellow [[Buy now|yellow]] button.`,
    done: [`part.bought:${CAM.id}`],
    doneWhen: (c) => owned(c, CAM.id),
  },
  {
    id: 'c2.power',
    chapter: 2,
    type: 'talk',
    scene: { screen: null, sheet: 'market', marketTab: 'power' },
    target: `market.item.${PANELS.id}`,
    via: 'market.tab.power',
    viaHint: 'Open the [[Power|tab]] tab',
    line: `${CELLS.name} only make ${CELLS.solarW} watts, and the camera needs more. ${PANELS.name} make ${PANELS.solarW} watts in sunlight.`,
  },
  {
    id: 'c2.order',
    chapter: 2,
    type: 'do',
    scene: { screen: null, sheet: 'market', marketTab: 'power' },
    target: `market.order.${PANELS.id}`,
    via: 'market.tab.power',
    viaHint: 'Open the [[Power|tab]] tab',
    line: 'Ordering is cheaper. We just wait for the boat.',
    instruction: 'Click the [[Order|blue]] button',
    idleHint: `The blue [[Order|blue]] button is on the ${PANELS.name} card, next to Buy now.`,
    done: [`part.ordered:${PANELS.id}`],
    doneWhen: (c) => onItsWay(c, PANELS.id) || owned(c, PANELS.id),
  },
  {
    id: 'c2.wait',
    chapter: 2,
    type: 'wait',
    scene: { screen: null, sheet: 'market', marketTab: 'power' },
    target: 'market.deliveries',
    allow: 'none',
    line: "Real missions wait months for parts. That's why engineers order early.",
    // hand over to the harbour a few seconds before the boat ties up
    doneWhen: (c) => owned(c, PANELS.id) || !c.game.deliveries.some((d) => d.partId === PANELS.id && d.end - Date.now() > 3600),
  },
  {
    id: 'c2.dock',
    chapter: 2,
    type: 'cinematic',
    scene: { screen: null, sheet: null },
    camera: 'harbour',
    allow: 'none',
    line: 'Here comes the boat.',
    // the crane swings the crate ashore once the boat is in
    doneWhen: (c) => owned(c, PANELS.id) && (c.since('delivery.arrived') === null || c.since('delivery.arrived')! > 3400),
  },

  // ============================================================ 3: Build the satellite
  {
    id: 'c3.go',
    chapter: 3,
    type: 'do',
    scene: { screen: null, sheet: null },
    camera: { building: 'integrationBay' },
    target: 'building:integrationBay',
    line: `Delivery's here! Off to the ${BUILDINGS.integrationBay.name}.`,
    instruction: `Click the ${BUILDINGS.integrationBay.name}`,
    idleHint: `The ${BUILDINGS.integrationBay.name} is the long hall under the hand.`,
    done: ['screen:builder'],
    doneWhen: (c) => c.screen === 'builder',
  },
  {
    id: 'c3.tiles',
    chapter: 3,
    type: 'talk',
    scene: { screen: 'builder' },
    target: 'builder.bars',
    line: "These are your mission's six limits: mass, power, budget, data, comms and time. Red means trouble.",
  },
  {
    id: 'c3.cam',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: `builder.part.${CAM.id}`,
    via: 'builder.tab.instrument',
    viaHint: 'Open the [[Instruments|tab]] tab',
    line: 'Fit the camera.',
    instruction: `Click the ${CAM.name} card`,
    idleHint: `Click the ${CAM.name} card, or drag it up onto the satellite.`,
    done: [`part.fitted:${CAM.id}`],
    doneWhen: (c) => fitted(c, CAM.id),
  },
  {
    id: 'c3.why',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: 'builder.bar.power',
    line: 'See the red Power tile? The camera is thirsty.',
    instruction: 'Click its [[Why?|why]] tag',
    idleHint: 'The Power tile is the red one at the top. Click it, or its little Why? tag.',
    done: ['why.opened'],
    doneWhen: (c) => c.has('why'),
  },
  {
    id: 'c3.whyRead',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: 'why.ok',
    dim: false,
    line: 'Every tile has a [[Why?|why]] tag. Use it any time.',
    instruction: 'Click [[Got it|green]]',
    idleHint: 'The green [[Got it|green]] button is at the bottom of the explanation.',
    done: ['why.closed'],
    doneWhen: (c) => !c.has('why') && c.elapsed > 400,
  },
  {
    id: 'c3.panels',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: `builder.part.${PANELS.id}`,
    via: 'builder.tab.power',
    viaHint: 'Open the [[Power|tab]] tab',
    line: 'Now the panels the boat brought.',
    instruction: `Click the ${PANELS.name} card`,
    idleHint: `Click the ${PANELS.name} card, or drag it up onto the satellite.`,
    done: [`part.fitted:${PANELS.id}`],
    doneWhen: (c) => fitted(c, PANELS.id),
  },
  {
    id: 'c3.battery',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: `builder.part.${BATTERY.id}`,
    via: 'builder.tab.power',
    viaHint: 'Open the [[Power|tab]] tab',
    line: `About ${SHADOW_MIN} minutes of every orbit are in Earth's shadow. The battery keeps us running there.`,
    instruction: `Click the ${BATTERY.name} card`,
    idleHint: `Click the ${BATTERY.name} card, or drag it up onto the satellite.`,
    // only if the shadow half of Power is still red: here, whenever no battery is fitted
    skipIf: (c) => !!c.game.draft?.design.parts.some((id) => (P[id]?.batteryWh ?? 0) > 0),
    done: [`part.fitted:${BATTERY.id}`],
    doneWhen: (c) => fitted(c, BATTERY.id),
  },
  {
    id: 'c3.test',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: 'builder.test',
    line: '[[Test run|blue]] flies the whole mission in fast-forward, for free.',
    instruction: 'Click the [[Test run|blue]] button',
    idleHint: '[[Test run|blue]] is the blue button under the part tray.',
    done: ['testrun.done'],
    doneWhen: (c) => c.has('testrun'),
  },
  {
    id: 'c3.stars',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: 'testrun.back',
    dim: false,
    line: 'The stars are the predicted result, with the reasons underneath.',
    instruction: 'Click [[Keep building|cream]]',
    idleHint: '[[Keep building|cream]] is at the bottom of the result, on the left.',
    done: ['testrun.closed'],
    doneWhen: (c) => !c.has('testrun') && c.elapsed > 400,
  },
  {
    id: 'c3.comms',
    chapter: 3,
    type: 'talk',
    scene: { screen: 'builder' },
    target: 'builder.bar.comms',
    line: "Our little radio can't send every photo home. Good enough for a first flight. We'll fix it later.",
  },
  {
    id: 'c3.pad',
    chapter: 3,
    type: 'do',
    scene: { screen: 'builder' },
    target: 'builder.pad',
    line: 'She is ready to fly.',
    instruction: 'Click the [[To the pad|yellow]] button',
    idleHint: '[[To the pad|yellow]] is the yellow button at the bottom right.',
    done: ['screen:launchPrep'],
    doneWhen: (c) => c.screen === 'launchPrep',
  },

  // ============================================================ 4: Plan the launch
  {
    id: 'c4.orbit',
    chapter: 4,
    type: 'do',
    scene: { screen: 'launchPrep', prepStep: 0 },
    target: `prep.orbit.${LEO.id}`,
    line: `${LEO.name} is closest and cheapest, and it takes the sharpest photos.`,
    instruction: `Pick ${LEO.name}`,
    idleHint: `Click the ${LEO.name} card.`,
    done: [`orbit.selected:${LEO.id}`],
  },
  {
    id: 'c4.rocket',
    chapter: 4,
    type: 'do',
    scene: { screen: 'launchPrep', prepStep: 1 },
    target: `prep.rocket.${RIDESHARE.id}`,
    line: `A ${lower(RIDESHARE.name)} puts our satellite on someone else's rocket. It's cheap, and it lifts ${Math.round(RIDESHARE.capacityKg * LEO.capacityFactor)} kg, plenty for ours.`,
    instruction: 'Pick it',
    idleHint: `Click the ${RIDESHARE.name} card.`,
    done: [`rocket.selected:${RIDESHARE.id}`],
  },
  { id: 'c4.capacity', chapter: 4, type: 'talk', scene: { screen: 'launchPrep', prepStep: 1 }, target: 'prep.capacity', line: 'The satellite sits on this scale. Above the line, the rocket can lift it.' },
  {
    id: 'c4.stations',
    chapter: 4,
    type: 'talk',
    scene: { screen: 'launchPrep', prepStep: 2 },
    target: `prep.station.${HOME.id}`,
    line: `Our ${lower(HOME.name)} hears the satellite ${HOME.passes[LEO.id]} times a day.`,
  },
  { id: 'c4.poll', chapter: 4, type: 'talk', scene: { screen: 'launchPrep', prepStep: 2 }, target: 'prep.col.poll', line: 'Each crew seat checks the plan.' },
  {
    id: 'c4.ground',
    chapter: 4,
    type: 'do',
    scene: { screen: 'launchPrep', prepStep: 2 },
    target: [`prep.station.${EQUATOR.id}`, 'prep.launch'],
    highlight: ['prep.call.ground'],
    line: `Ground says the radio can't bring everything home. Your call: add the ${EQUATOR.name} for more passes, or launch anyway and learn.`,
    instruction: `Add the ${EQUATOR.name}, or launch`,
    idleHint: `Either is fine. The ${EQUATOR.name} is in the list on the right; the launch button is at the bottom right.`,
    done: [`station.toggled:${EQUATOR.id}`, 'launch.pressed', 'launch.started'],
    doneWhen: (c) => c.screen === 'launch',
  },
  {
    id: 'c4.launch',
    chapter: 4,
    type: 'do',
    scene: { screen: 'launchPrep' },
    target: 'prep.launch',
    line: 'Everyone has had their say.',
    instruction: 'Click the big launch button',
    idleHint: 'The launch button is the big one at the bottom right. If it counts the NO-GOs, click it, then [[Launch anyway|red]].',
    done: ['launch.started'],
    doneWhen: (c) => c.screen === 'launch',
  },

  // ============================================================ 5: Launch
  {
    id: 'c5.watch',
    chapter: 5,
    type: 'wait',
    scene: { screen: 'launch' },
    resume: 'c4.launch',
    target: 'launch.readout',
    allow: 'none',
    dim: false,
    line: `Autopilot's flying this one. Watch the speed: orbit needs ${orbitSpeed(LEO.altitudeKm)} km/s.`,
    done: ['orbit.reached'],
    doneWhen: (c) => c.launchPhase === 'orbit' || c.launchPhase === 'done' || c.screen === 'ops',
  },
  {
    id: 'c5.up',
    chapter: 5,
    type: 'talk',
    resume: 'c4.launch',
    target: 'launch.card',
    dim: false,
    holdOps: true,
    line: `We're up! Autopilot kept ${Math.round(lifeKept(AUTOPILOT_QUALITY) * 100)}% of the orbit life. Fly it yourself next time for up to 100%.`,
  },

  // (the launch screen hands over to operations by itself: nothing to say while it does)
  { id: 'c5.arrive', chapter: 5, type: 'wait', resume: 'c4.launch', allow: 'none', dim: false, holdOps: true, line: 'Settling into orbit.', doneWhen: (c) => c.screen === 'ops' },

  // ============================================================ 6: Fly the mission
  {
    id: 'c6.globe',
    chapter: 6,
    type: 'talk',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    target: 'ops.globe',
    holdOps: true,
    line: "That's our satellite. Each mission day passes in a few seconds.",
  },
  {
    id: 'c6.pipe',
    chapter: 6,
    type: 'talk',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    target: 'ops.pipeline',
    holdOps: true,
    line: 'Photos go from the camera into storage, through the radio and down to our dish. The slowest link sets the pace. Ours is the radio.',
  },
  {
    id: 'c6.run',
    chapter: 6,
    type: 'wait',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    allow: 'none',
    dim: false,
    line: 'Here we go. Day one.',
    doneWhen: (c) => c.has('event') || c.has('ops.debrief'),
  },
  {
    id: 'c6.event',
    chapter: 6,
    type: 'do',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    target: ['event.choose.a', 'event.choose.b'],
    // the decision card already has the screen to itself: no dimming, nothing drawn over it
    dim: false,
    // (a flight with nothing to decide goes straight on)
    skipIf: (c) => c.has('ops.debrief'),
    line: 'Things go wrong in space too. Each choice shows what it costs.',
    instruction: 'Pick one',
    idleHint: 'Click either button. Both are fine.',
    done: ['event.resolved'],
    doneWhen: (c) => !c.has('event') && c.elapsed > 500,
  },
  {
    id: 'c6.skip',
    chapter: 6,
    type: 'talk',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    target: 'ops.skip',
    holdOps: true,
    skipIf: (c) => !c.has('ops.skip'),
    line: '[[Skip to end|cream]] jumps ahead whenever you like.',
  },
  {
    id: 'c6.fly',
    chapter: 6,
    type: 'wait',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    allow: 'all',
    dim: false,
    line: 'Watch the days go by, or skip ahead. If something else comes up, it is your call.',
    done: ['mission.done'],
    doneWhen: (c) => c.has('ops.debrief') || c.screen === 'debrief',
  },
  {
    id: 'c6.debrief',
    chapter: 6,
    type: 'do',
    scene: { screen: 'ops' },
    resume: 'c4.launch',
    target: 'ops.debrief',
    line: 'Mission complete!',
    instruction: 'Click the [[Mission complete: debrief|green]] button',
    idleHint: 'The green button is at the bottom of the gauges, on the right.',
    done: ['screen:debrief'],
    doneWhen: (c) => c.screen === 'debrief',
  },

  // ============================================================ 7: Get paid
  {
    id: 'c7.stars',
    chapter: 7,
    type: 'talk',
    scene: { screen: 'debrief' },
    resume: 'c8.levelup',
    target: 'debrief.stars',
    line: 'Three stars to win: hit the science target, make a profit, keep the design efficient.',
  },
  {
    id: 'c7.reason',
    chapter: 7,
    type: 'talk',
    scene: { screen: 'debrief' },
    resume: 'c8.levelup',
    target: 'debrief.reason.0',
    line: 'This is why photos got lost, and how to fix it.',
  },
  { id: 'c7.profit', chapter: 7, type: 'talk', scene: { screen: 'debrief' }, resume: 'c8.levelup', target: 'debrief.profit', line: 'And this is what the mission earned.' },
  { id: 'c7.match', chapter: 7, type: 'talk', scene: { screen: 'debrief' }, resume: 'c8.levelup', target: 'debrief.match', line: 'A real NASA mission a lot like yours.' },
  {
    id: 'c7.home',
    chapter: 7,
    type: 'do',
    scene: { screen: 'debrief' },
    resume: 'c8.levelup',
    target: 'debrief.home',
    line: '[[Fix and relaunch|blue]] lets you improve the design and fly again.',
    instruction: 'For now, click [[Collect and go home|green]]',
    idleHint: '[[Collect and go home|green]] is the green button at the bottom right.',
    done: ['debrief.collected'],
    doneWhen: (c) => c.screen === null && !c.game.draft,
  },

  // ============================================================ 8: Graduation
  {
    id: 'c8.levelup',
    chapter: 8,
    type: 'wait',
    scene: { screen: null, sheet: null },
    camera: 'home',
    allow: 'all',
    dim: false,
    // the first-flight bonus tips the agency over to level 2: the banner plays, then Rocco has the last word
    doneWhen: (c) => (c.since('levelup.closed') !== null && c.elapsed > 600) || (c.since('levelup.shown') === null && c.elapsed > 3200),
  },
  { id: 'c8.nice', chapter: 8, type: 'talk', stage: true, scene: { screen: null, sheet: null }, line: 'Nice flying, Flight Director.' },
  {
    id: 'c8.goal',
    chapter: 8,
    type: 'talk',
    scene: { screen: null, sheet: null },
    target: 'goal',
    line: 'This always tells you what to do next. Click [[Show me|blue]] any time.',
  },
  {
    id: 'c8.lab',
    chapter: 8,
    type: 'talk',
    scene: { screen: null, sheet: null },
    target: 'build',
    line: `Our satellite keeps sending photos home. Build a ${BUILDINGS.scienceLab.name} to turn them into maps people pay for.`,
  },
  {
    id: 'c8.orders',
    chapter: 8,
    type: 'talk',
    scene: { screen: null, sheet: null },
    camera: { region: 'tracking' },
    target: 'region:tracking',
    line: `Small orders at ${BUILDINGS.missionControl.name} pay quick coins. And at Level ${REGIONS.tracking.needsLevel}, we explore the old Tracking Station.`,
  },
  {
    id: 'c8.bye',
    chapter: 8,
    type: 'talk',
    stage: true,
    camera: 'home',
    scene: { screen: null, sheet: null },
    line: "That's it from me. I'll pop in with tips now and then. You can replay this tutorial in Settings.",
  },
]

export const STEP_BY_ID: Record<string, Step> = Object.fromEntries(STEPS.map((s) => [s.id, s]))
export const FIRST_STEP = STEPS[0].id
