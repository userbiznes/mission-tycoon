import type { BuildingId } from './layout'

/**
 * Chief Rocco's script. `{name}` and `{agency}` are filled in at runtime.
 * Each stop flies the camera to a building; `do` is the one real action the
 * player performs there.
 */

export type TourAction = 'tapBuilding' | 'shop' | 'firstContract'

export interface TourStep {
  id: string
  text: string
  /** where the camera goes; 'home' is the whole-base view */
  focus?: BuildingId | 'home'
  do?: TourAction
  /** short prompt shown once the line has finished */
  hint?: string
  mood?: 'happy' | 'worried' | 'proud'
}

export const TOUR: TourStep[] = [
  {
    id: 'welcome',
    focus: 'home',
    text: "Hey {name}! Welcome to {agency}. How do you like the place? I know, I know, it's pretty old. But everybody starts somewhere.",
  },
  { id: 'look', focus: 'home', text: "Let's take a look around." },
  {
    id: 'missionControl',
    focus: 'missionControl',
    text: 'This is Mission Control. Clients pin jobs on this board, and we run every mission from here.',
    do: 'tapBuilding',
    hint: 'Tap Mission Control',
  },
  {
    id: 'market',
    focus: 'partsMarket',
    text: "Parts come from the market. Some are in stock, some we have to order. Ordering's cheaper, but you wait. Grab a camera now, and order a battery.",
    do: 'shop',
    hint: 'Tap the market on the dock',
  },
  {
    id: 'bay',
    focus: 'integrationBay',
    text: 'The Integration Bay. This is where we put satellites together, part by part.',
    do: 'tapBuilding',
    hint: 'Tap the bay',
  },
  {
    id: 'comms',
    focus: 'commsCenter',
    text: 'That old dish is how our satellites talk to us. No dish time, no data, no paycheck.',
    do: 'tapBuilding',
    hint: 'Tap the dish',
  },
  {
    id: 'pad',
    focus: 'launchPad',
    text: "And the pad. She's rusty, but she'll fly.",
    do: 'tapBuilding',
    hint: 'Tap the pad',
    mood: 'proud',
  },
  {
    id: 'truck',
    focus: 'partsMarket',
    text: "Battery's here! Let's build your first satellite.",
    do: 'firstContract',
    mood: 'proud',
  },
]

/** Contextual tips, each shown once. */
export const TIPS: Record<string, { text: string; mood?: 'happy' | 'worried' | 'proud' }> = {
  shadow: { text: "We're in Earth's shadow about 35 minutes every orbit. No battery, no satellite.", mood: 'worried' },
  bottleneck: {
    text: 'A satellite is a pipeline: camera, storage, radio, dish. The slowest link sets how much comes home.',
  },
  overweight: { text: "She's too heavy for that rocket. Drop a part or book a bigger ride.", mood: 'worried' },
  construction: { text: 'Empty plots are for new buildings. The Science Lab turns raw data into things clients pay for.' },
  lab: { text: 'Raw data is Level 0. The lab calibrates it (Level 1) and turns it into maps on a grid (Level 3). Maps sell best.' },
  order: { text: 'Small orders come in all the time. Fill them from the lab for quick coins.' },
  storage: { text: 'The Comms Center only holds so much raw data. When it is full, new data is lost. Keep the lab busy!', mood: 'worried' },
  testrun: { text: 'Test runs are free. Try the design, read why it failed, fix it, then commit.' },
  reserve: { text: 'Keep at least 10% of the budget in reserve. Real missions always meet surprises.', mood: 'worried' },
}
