import { ORDER_TEMPLATES } from '../data/lab'
import { BUILDING_IDS, type BuildingId } from '../data/layout'
import { Pin } from '../scene/pins'
import { buildingWorld, tapBuilding } from '../state/actions'
import { canFillOrder } from '../state/economy'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { useUi } from '../state/ui'
import { Icon } from './icons'
import { Ring, formatTime, useNow } from './kit'
import { sfx } from './sound'

const HEIGHT: Partial<Record<BuildingId, number>> = { launchPad: 8.2, commsCenter: 5.8, missionControl: 6.0, partsMarket: 4.8 }

/**
 * Labels over the buildings: a timer bubble while something is being built,
 * upgraded, made or shipped, and a bobbing "ready" bubble when there is
 * something to collect. They use the same badge as the region signposts.
 */
export function WorldBubbles() {
  const buildings = useGame((s) => s.buildings)
  const placed = useGame((s) => s.placed)
  const labJobs = useGame((s) => s.labJobs)
  const deliveries = useGame((s) => s.deliveries)
  const orders = useGame((s) => s.orders)
  const items = useGame((s) => s.items)
  const tour = useGame((s) => s.tourStep)
  const placing = usePlacement((s) => s.id)
  const sheet = useUi((s) => s.sheet)
  const card = useUi((s) => s.regionCard)
  const now = useNow(250)
  if (tour >= 0 || placing || sheet || card) return null
  const ready = orders.filter((o) => o.readyAt <= now && canFillOrder(ORDER_TEMPLATES.find((t) => t.id === o.templateId)!, items)).length
  const soonest = <T extends { start: number; end: number }>(list: T[]): T | undefined => list.slice().sort((a, b) => a.end - b.end)[0]
  return (
    <>
      {BUILDING_IDS.map((id) => {
        const b = buildings[id]
        if (!placed[id]) return null
        const at = buildingWorld(id)
        if (!at) return null
        let bubble: React.ReactNode = null
        const timer = (start: number, end: number, icon: React.ReactNode, label: string) => (
          <button
            type="button"
            className="wbadge timer"
            data-ui={`world.building.${id}`}
            aria-label={label}
            onClick={() => {
              sfx('pop')
              tapBuilding(id)
            }}
          >
            <Ring p={(now - start) / Math.max(1, end - start)}>{icon}</Ring>
            <span>{formatTime(end - now)}</span>
          </button>
        )
        if (b.buildStart && b.buildEnd) bubble = timer(b.buildStart, b.buildEnd, <Icon.hammer />, 'Under construction')
        else if (id === 'scienceLab' && labJobs.length) {
          const j = soonest(labJobs)!
          bubble = timer(j.start, j.end, <Icon.flask />, 'The lab is working')
        } else if (id === 'partsMarket' && deliveries.length) {
          const d = soonest(deliveries)!
          bubble = timer(d.start, d.end, <Icon.boat />, 'A delivery is on its way')
        } else if (id === 'missionControl' && ready > 0) {
          bubble = (
            <button
              type="button"
              className="wbadge ready"
              data-ui="world.building.missionControl"
              aria-label="An order is ready to deliver"
              onClick={() => {
                sfx('pop')
                useUi.getState().open({ kind: 'contracts' })
              }}
            >
              <Icon.coin />
              <span>{ready === 1 ? 'Order ready' : `${ready} orders ready`}</span>
            </button>
          )
        }
        if (!bubble) return null
        return (
          <Pin key={id} at={[at[0], HEIGHT[id] ?? 4.6, at[1]]}>
            {bubble}
          </Pin>
        )
      })}
    </>
  )
}
