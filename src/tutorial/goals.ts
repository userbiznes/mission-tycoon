import { BUILDINGS } from '../data/buildings'
import { CONTRACT_BY_ID } from '../data/contracts'
import { REGIONS } from '../data/regions'
import { useGame, type GameState } from '../state/game'
import type { CameraTarget } from './steps'

/**
 * The Next Goal tracker's goals, in order. The first one that is not done is
 * the current goal. "Show me" glides the camera to the right place, opens the
 * right menu and points the hand at the right button.
 */
export interface Goal {
  id: string
  text: string
  /** [so far, needed], shown as "0/1" */
  progress?: (g: GameState) => [number, number]
  done: (g: GameState) => boolean
  show: { camera?: CameraTarget; open?: 'contracts' | 'market' | 'lab' | 'crew'; marketTab?: string; anchor: string }
}

interface GoalNotes {
  ordersFilled?: number
}
const notes = (g: GameState): GoalNotes => (g.ext.goals as GoalNotes | undefined) ?? {}

const regionReached = (g: GameState, id: 'tracking', states: string[]) => states.includes(g.regions[id].state)

export const GOALS: Goal[] = [
  {
    id: 'lab',
    text: `Build a ${BUILDINGS.scienceLab.name}`,
    done: (g) => g.buildings.scienceLab.level >= 1 || !!g.buildings.scienceLab.buildEnd,
    show: { camera: 'home', anchor: 'build' },
  },
  {
    id: 'order',
    text: 'Fill a small order',
    progress: (g) => [Math.min(1, notes(g).ordersFilled ?? 0), 1],
    done: (g) => (notes(g).ordersFilled ?? 0) >= 1,
    show: { open: 'contracts', anchor: 'contracts.tab.orders' },
  },
  {
    id: 'level',
    text: `Reach Level ${REGIONS.tracking.needsLevel}`,
    progress: (g) => [Math.min(g.level, REGIONS.tracking.needsLevel), REGIONS.tracking.needsLevel],
    done: (g) => g.level >= REGIONS.tracking.needsLevel,
    show: { open: 'contracts', anchor: 'contracts.tab.contracts' },
  },
  {
    id: 'explore',
    text: `Explore the ${REGIONS.tracking.name}`,
    done: (g) => regionReached(g, 'tracking', ['clearing', 'ruins', 'restoring', 'active']),
    show: { camera: { region: 'tracking' }, anchor: 'world.region.tracking' },
  },
  {
    id: 'restore',
    text: `Restore the ${REGIONS.tracking.name}`,
    done: (g) => regionReached(g, 'tracking', ['active']),
    show: { camera: { region: 'tracking' }, anchor: 'world.region.tracking' },
  },
  {
    id: 'fireWatch',
    text: `Fly the ${CONTRACT_BY_ID.fireWatch.title} contract`,
    done: (g) => g.bestStars.fireWatch !== undefined,
    show: { open: 'contracts', anchor: 'contracts.note.fireWatch' },
  },
  {
    id: 'threeStars',
    text: `Earn three stars on ${CONTRACT_BY_ID.firstLight.title}`,
    progress: (g) => [g.bestStars.firstLight ?? 0, 3],
    done: (g) => (g.bestStars.firstLight ?? 0) >= 3,
    show: { open: 'contracts', anchor: 'contracts.note.firstLight' },
  },
]

export function currentGoal(g: GameState): Goal | null {
  return GOALS.find((goal) => !goal.done(g)) ?? null
}

/** Count small orders as they are filled (the game keeps no tally of its own). */
export function initGoals() {
  useGame.subscribe((s, p) => {
    if (s.orders === p.orders || !p.orders.length) return
    // a filled order comes back as a new one that is not ready yet
    const filled = s.orders.filter((o) => {
      const before = p.orders.find((x) => x.id === o.id)
      return before && before.readyAt <= Date.now() && o.readyAt > Date.now() && o.readyAt !== before.readyAt
    }).length
    if (filled) s.setExt('goals', { ...notes(s), ordersFilled: (notes(s).ordersFilled ?? 0) + filled })
  })
}
