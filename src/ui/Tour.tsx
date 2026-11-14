import { useEffect, useState } from 'react'
import { PLOTS, type BuildingId } from '../data/layout'
import { TOUR } from '../data/tutorial'
import { focusPlot } from '../state/actions'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { rig } from '../scene/cameraRig'
import { juice } from '../scene/juice'
import { Pin } from '../scene/pins'
import { uvToWorld } from '../scene/world'
import { RoccoSays } from './Rocco'
import { sfx } from './sound'

/** Lets the rest of the game ask "is the tour handling this tap?" */
export const tourHooks: {
  onBuildingTap: ((id: BuildingId) => boolean) | null
  /** called by the market when the tutorial purchases are complete */
  onShopDone: (() => void) | null
  /** set by the game: opens the guided market / the first contract */
  openShop: (() => void) | null
  startFirstContract: (() => void) | null
} = { onBuildingTap: null, onShopDone: null, openShop: null, startFirstContract: null }

const PIN_HEIGHT: Partial<Record<BuildingId, number>> = { launchPad: 8.2, commsCenter: 5.6 }

function Arrow() {
  return (
    <svg className="pointer-arrow" viewBox="0 0 40 46">
      <path
        d="M14 3 h12 a3 3 0 0 1 3 3 v15 h6.500 a2.500 2.500 0 0 1 1.900 4.100 L22.500 42 a3.200 3.200 0 0 1 -5 0 L2.600 25.100 A2.500 2.500 0 0 1 4.500 21 H11 V6 a3 3 0 0 1 3 -3 z"
        fill="#ffd75a"
        stroke="#4b2f1c"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Chief Rocco's scripted tour: one line, one camera move and one real action per stop. */
export function Tour() {
  const step = useGame((s) => s.tourStep)
  const setStep = useGame((s) => s.setTourStep)
  const player = useGame((s) => s.player)
  const sheet = useUi((s) => s.sheet)
  const screen = useUi((s) => s.screen)
  // the line for a step has been read and we're waiting for the player's action
  const [waiting, setWaiting] = useState(false)
  const def = step >= 0 ? TOUR[step] : null

  const advance = () => {
    setWaiting(false)
    const next = step + 1
    if (next >= TOUR.length) {
      setStep(-1)
      rig.locked = false
    } else setStep(next)
  }

  // camera for each stop
  useEffect(() => {
    if (!def) return
    rig.locked = true
    if (!def.focus || def.focus === 'home') rig.home()
    else focusPlot(def.focus, 0, 26, 0.16)
    return () => {
      rig.locked = false
    }
  }, [def])

  // building taps during the tour
  useEffect(() => {
    if (!def) {
      tourHooks.onBuildingTap = null
      return
    }
    tourHooks.onBuildingTap = (id) => {
      if (def.do && def.focus === id && waiting) {
        sfx('pop')
        juice(id, 'wobble')
        if (def.do === 'shop' && tourHooks.openShop) tourHooks.openShop()
        else advance()
      }
      return true
    }
    tourHooks.onShopDone = () => advance()
    return () => {
      tourHooks.onBuildingTap = null
      tourHooks.onShopDone = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, waiting, step])

  if (!def || sheet || screen) return null

  const text = def.text.replace('{name}', player.name || 'Chief').replace('{agency}', player.agency || 'the agency')
  const focusId = def.focus && def.focus !== 'home' ? def.focus : null
  const plot = focusId ? PLOTS[focusId] : null
  const [px, pz] = plot ? uvToWorld(plot.u, plot.v) : [0, 0]

  const onNext = () => {
    if (def.do === 'tapBuilding' || def.do === 'shop') {
      if (!waiting) {
        setWaiting(true)
        return
      }
      // tapping the bubble a second time also works, so nobody gets stuck
      if (def.do === 'shop' && tourHooks.openShop) tourHooks.openShop()
      else advance()
      return
    }
    if (def.do === 'firstContract') {
      advance()
      tourHooks.startFirstContract?.()
      return
    }
    advance()
  }

  return (
    <>
      {waiting && plot && focusId && (
        <Pin at={[px, PIN_HEIGHT[focusId] ?? 4.6, pz]}>
          <Arrow />
        </Pin>
      )}
      <RoccoSays key={def.id} text={text} mood={def.mood} onNext={onNext} hint={waiting ? def.hint : undefined} blockWorld={!waiting} />
    </>
  )
}
