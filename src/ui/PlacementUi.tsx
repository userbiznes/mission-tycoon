import { BUILDINGS } from '../data/buildings'
import { BUILDING_IDS } from '../data/layout'
import { REGIONS } from '../data/regions'
import { BUILDING_ICON } from './BuildingSheet'
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
  const rotate = usePlacement((s) => s.rotate)
  const toast = useUi((s) => s.toast)
  if (!id) return null
  const def = BUILDINGS[id]
  return (
    <div className="place-bar">
      <div className="panel">
        <div className="grow">
          <b>{isNew ? `Place the ${def.name}` : `Move the ${def.name}`}</b>
          <small className={problem ? 'bad' : ''}>{problem ?? 'Drag it, or tap the ground. Turn it with the blue button.'}</small>
        </div>
        <Btn tone="blue" round sound={null} onClick={rotate} aria-label="Turn it round">
          <Icon.turn />
        </Btn>
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

/** The shop button, bottom-left, and the tray of blueprints it opens. */
export function BuildButton() {
  const sheet = useUi((s) => s.sheet)
  const open = useUi((s) => s.open)
  const close = useUi((s) => s.close)
  const placing = usePlacement((s) => s.id)
  const tour = useGame((s) => s.tourStep)
  const level = useGame((s) => s.level)
  const coins = useGame((s) => s.coins)
  const placed = useGame((s) => s.placed)
  const regions = useGame((s) => s.regions)
  const toast = useUi((s) => s.toast)
  if (placing || tour >= 0) return null
  const isOpen = sheet?.kind === 'buildmenu'
  const todo = BUILDING_IDS.filter((id) => !placed[id])
  return (
    <>
      <div className="build-btn">
        <Btn tone="yellow" onClick={() => (isOpen ? close() : open({ kind: 'buildmenu' }))}>
          <Icon.hammer /> Build
        </Btn>
      </div>
      {isOpen && (
        <div className="shop-tray">
          {todo.length === 0 && <p className="empty-note">Everything is built. Press and hold a building to move it.</p>}
          {todo.map((id) => {
            const def = BUILDINGS[id]
            const I = Icon[BUILDING_ICON[id]]
            const gate = level < def.needsLevel ? `Level ${def.needsLevel}` : def.needsRegion && regions[def.needsRegion].state !== 'active' ? `Restore the ${REGIONS[def.needsRegion].name}` : null
            const locked = !!gate
            return (
              <button
                key={id}
                type="button"
                className={`shop-card${locked ? ' locked' : ''}`}
                onClick={() => {
                  if (locked) {
                    sfx('error')
                    toast(level < def.needsLevel ? `${def.name} unlocks at agency level ${def.needsLevel}` : `${gate} to build the ${def.name}`)
                  } else if (coins < def.buildCost) {
                    sfx('error')
                    toast('Not enough coins', 'bad')
                  } else usePlacement.getState().begin(id, true)
                }}
              >
                <span className="part-icon">
                  <I />
                </span>
                <b>{def.name}</b>
                <small>{def.role}</small>
                {locked ? (
                  <span className="chip warn">
                    <Icon.lock /> {gate}
                  </span>
                ) : (
                  <Price amount={def.buildCost} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
