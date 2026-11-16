import { useEffect, useState } from 'react'
import { BUILDINGS } from '../data/buildings'
import { BUILDING_IDS } from '../data/layout'
import { REGIONS } from '../data/regions'
import { CELL, OBSTACLE_INFO, allObstacles } from '../scene/grid'
import { Pin } from '../scene/pins'
import { clearObstacle } from '../state/actions'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { useUi } from '../state/ui'
import { BUILDING_ICON } from './BuildingSheet'
import { Icon } from './icons'
import { Btn, Empty, LockBadge, Tag, useEsc } from './kit'
import { sfx } from './sound'
import { Thumb } from './thumbs'

/** Confirm / cancel bar shown while a building is in hand. */
export function PlacementBar() {
  const id = usePlacement((s) => s.id)
  const isNew = usePlacement((s) => s.isNew)
  const problem = usePlacement((s) => s.problem)
  const confirm = usePlacement((s) => s.confirm)
  const cancel = usePlacement((s) => s.cancel)
  const rotate = usePlacement((s) => s.rotate)
  const toast = useUi((s) => s.toast)
  useEsc(id ? cancel : null)
  if (!id) return null
  const def = BUILDINGS[id]
  return (
    <div className="place-bar" data-ui="place">
      <div className="grow">
        <b className="t-label">{isNew ? `Place the ${def.name}` : `Move the ${def.name}`}</b>
        <small className={`t-small${problem ? ' bad' : ''}`} style={{ display: 'block' }}>
          {problem ?? 'Drag it, or click the ground.'}
        </small>
      </div>
      <Btn tone="blue" round sound={null} ui="place.turn" onClick={rotate} aria-label="Turn it round">
        <Icon.turn />
      </Btn>
      <Btn tone="red" round ui="place.cancel" onClick={cancel} aria-label="Cancel">
        <Icon.close />
      </Btn>
      <Btn
        round
        disabled={!!problem}
        sound={null}
        ui="place.confirm"
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
  )
}

/**
 * The badge over a tapped piece of overgrowth: pay a few coins to clear it.
 * It is the same small badge as the level indicators over the lost regions:
 * an icon, one word, and the number in a roundel (here, the price). Tap it to
 * clear; tap anywhere else, or press Esc, to leave the thing alone.
 */
export function ClearPopup() {
  const target = useUi((s) => s.clearTarget)
  const setTarget = useUi((s) => s.setClearTarget)
  const toast = useUi((s) => s.toast)
  const coins = useGame((s) => s.coins)
  const [shake, setShake] = useState(0)
  useEsc(target ? () => setTarget(null) : null)
  // a press anywhere but on the badge puts it away (tapping another rock or tree then opens a new one)
  useEffect(() => {
    if (!target) return
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-ui="clear"]')) return
      setTarget(null)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [target, setTarget])
  if (!target) return null
  const o = allObstacles().find((x) => x.id === target)
  if (!o) return null
  const info = OBSTACLE_INFO[o.kind]
  const short = coins < info.cost
  return (
    <Pin at={[(o.i + o.size / 2) * CELL, o.size > 1 ? 2.4 : 1.6, (o.j + o.size / 2) * CELL]}>
      <button
        type="button"
        className={`wbadge clear${short ? ' short' : ''}`}
        data-ui="clear"
        title={info.name}
        aria-label={`Clear the ${info.name.toLowerCase()} for ${info.cost} coins`}
        onClick={() => {
          if (short) {
            sfx('error')
            setShake((n) => n + 1)
            toast(`Not enough coins: ${(info.cost - coins).toLocaleString('en-US')} short`, 'bad')
            return
          }
          const err = clearObstacle(target)
          if (err) toast(err, 'bad')
          setTarget(null)
        }}
      >
        <Icon.hammer />
        <span>Clear</span>
        <b key={shake} className={shake ? 'shake' : ''}>
          <Icon.coin />
          {info.cost}
        </b>
      </button>
    </Pin>
  )
}

/** The Build button, bottom-left, and the shelf of blueprints it opens along the bottom. */
export function BuildButton() {
  const sheet = useUi((s) => s.sheet)
  const open = useUi((s) => s.open)
  const close = useUi((s) => s.close)
  const placing = usePlacement((s) => s.id)
  const level = useGame((s) => s.level)
  const coins = useGame((s) => s.coins)
  const placed = useGame((s) => s.placed)
  const regions = useGame((s) => s.regions)
  const toast = useUi((s) => s.toast)
  const isOpen = sheet?.kind === 'buildmenu'
  useEsc(isOpen ? close : null)
  if (placing) return null
  const todo = BUILDING_IDS.filter((id) => !placed[id])
  return (
    <>
      <div className="build-btn">
        <Btn tone="yellow" className={isOpen ? 'open' : ''} ui="build" aria-expanded={isOpen} onClick={() => (isOpen ? close() : open({ kind: 'buildmenu' }))}>
          {isOpen ? <Icon.close style={{ filter: 'invert(0.75)' }} /> : <Icon.hammer />} {isOpen ? 'Close' : 'Build'}
        </Btn>
      </div>
      {isOpen && (
        <div className="build-shelf stagger" data-ui="build.shelf">
          {todo.length === 0 && (
            <Empty icon="check" row>
              Everything is built. Press and hold a building to move it.
            </Empty>
          )}
          {todo.map((id) => {
            const def = BUILDINGS[id]
            const needsLevel = level < def.needsLevel
            const needsRegion = !needsLevel && def.needsRegion && regions[def.needsRegion].state !== 'active' ? def.needsRegion : null
            const locked = needsLevel || !!needsRegion
            return (
              <button
                key={id}
                type="button"
                className={`card shelf-card${locked ? ' locked' : ''}`}
                data-ui={`build.item.${id}`}
                onClick={() => {
                  if (needsLevel) {
                    sfx('error')
                    toast(`The ${def.name} unlocks at agency level ${def.needsLevel}`)
                  } else if (needsRegion) {
                    sfx('error')
                    toast(`Restore the ${REGIONS[needsRegion].name} to build the ${def.name}`)
                  } else if (coins < def.buildCost) {
                    sfx('error')
                    toast(`Not enough coins: ${(def.buildCost - coins).toLocaleString('en-US')} short`, 'bad')
                  } else {
                    sfx('tap')
                    usePlacement.getState().begin(id, true)
                  }
                }}
              >
                <Thumb model={`building:${id}`} icon={BUILDING_ICON[id]} />
                <span className="words">
                  <b className="t-label">{def.name}</b>
                  <small className="t-small">{def.role}</small>
                  {needsLevel ? <LockBadge level={def.needsLevel} /> : needsRegion ? <LockBadge text={`Restore the ${REGIONS[needsRegion].name}`} /> : <Tag amount={def.buildCost} />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
