import { BUILDINGS } from '../data/buildings'
import { clearObstacle } from '../state/actions'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { useUi } from '../state/ui'
import { CELL, OBSTACLE_INFO, allObstacles } from '../scene/grid'
import { Pin } from '../scene/pins'
import { Price } from './BuildingSheet'
import { Icon } from './icons'
import { Btn } from './kit'
import { sfx } from './sound'

/** Confirm / cancel bar shown while a building is in hand. */
export function PlacementBar() {
  const id = usePlacement((s) => s.id)
  const isNew = usePlacement((s) => s.isNew)
  const problem = usePlacement((s) => s.problem)
  const confirm = usePlacement((s) => s.confirm)
  const cancel = usePlacement((s) => s.cancel)
  const toast = useUi((s) => s.toast)
  if (!id) return null
  const def = BUILDINGS[id]
  return (
    <div className="place-bar">
      <div className="panel">
        <div className="grow">
          <b>{isNew ? `Place the ${def.name}` : `Move the ${def.name}`}</b>
          <small className={problem ? 'bad' : ''}>{problem ?? 'Drag it, or tap the ground. Green means it fits.'}</small>
        </div>
        <Btn tone="red" round onClick={cancel} aria-label="Cancel">
          <Icon.close />
        </Btn>
        <Btn
          round
          disabled={!!problem}
          sound={null}
          onClick={() => {
            const err = confirm()
            if (err) {
              sfx('error')
              toast(err, 'bad')
            }
          }}
          aria-label="Confirm"
        >
          <Icon.check />
        </Btn>
      </div>
    </div>
  )
}

/** Bubble over a tapped piece of overgrowth: pay a few coins to clear it. */
export function ClearPopup() {
  const target = useUi((s) => s.clearTarget)
  const setTarget = useUi((s) => s.setClearTarget)
  const toast = useUi((s) => s.toast)
  const coins = useGame((s) => s.coins)
  if (!target) return null
  const o = allObstacles().find((x) => x.id === target)
  if (!o) return null
  const info = OBSTACLE_INFO[o.kind]
  return (
    <Pin at={[(o.i + o.size / 2) * CELL, o.size > 1 ? 2.4 : 1.6, (o.j + o.size / 2) * CELL]}>
      <div className="clear-pop panel">
        <b>{info.name}</b>
        <div>
          <Btn
            tone="yellow"
            size="sm"
            sound={null}
            disabled={coins < info.cost}
            onClick={() => {
              const err = clearObstacle(target)
              if (err) toast(err, 'bad')
              setTarget(null)
            }}
          >
            Clear <Price amount={info.cost} />
          </Btn>
          <Btn tone="cream" size="sm" round onClick={() => setTarget(null)} aria-label="Leave it">
            <Icon.close style={{ filter: 'invert(0.75)' }} />
          </Btn>
        </div>
      </div>
    </Pin>
  )
}

/** The hammer button that opens the build menu. */
export function BuildButton() {
  const open = useUi((s) => s.open)
  const placing = usePlacement((s) => s.id)
  const tour = useGame((s) => s.tourStep)
  if (placing || tour >= 0) return null
  return (
    <div className="build-btn">
      <Btn tone="yellow" onClick={() => open({ kind: 'buildmenu' })}>
        <Icon.hammer /> Build
      </Btn>
    </div>
  )
}
