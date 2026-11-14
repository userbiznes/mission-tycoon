import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { arriveAtBase, startTitleShot } from './scene/cinematics'
import { processTimers } from './state/actions'
import { useGame } from './state/game'
import { useUi } from './state/ui'
import { BuildSheet, BuildingSheet } from './ui/BuildingSheet'
import { Hud } from './ui/Hud'
import { MarketSheet } from './ui/MarketSheet'
import { Builder } from './ui/Builder'
import { ContractBoard } from './ui/ContractBoard'
import { Debrief } from './ui/Debrief'
import { LaunchPrep } from './ui/LaunchPrep'
import { Ops } from './ui/Ops'
import { tourHooks } from './ui/Tour'
import { acceptContract } from './state/mission'
import type { BuildingId } from './data/layout'
import { LaunchScreen } from './ui/LaunchScreen'
import { useLaunch } from './state/launch'
import { Onboarding } from './ui/Onboarding'
import { Flyers, Toasts } from './ui/Overlays'
import { SettingsSheet } from './ui/SettingsSheet'
import { Title } from './ui/Title'
import { Tour } from './ui/Tour'

/** The big button in each building's sheet. */
function buildingAction(id: BuildingId) {
  const ui = useUi.getState()
  const draft = useGame.getState().draft
  switch (id) {
    case 'missionControl':
      ui.open({ kind: 'contracts' })
      break
    case 'partsMarket':
      ui.open({ kind: 'market' })
      break
    case 'integrationBay':
      if (draft) ui.setScreen('builder')
      else {
        ui.toast('Pick a contract first')
        ui.open({ kind: 'contracts' })
      }
      break
    case 'launchPad':
      if (draft) ui.setScreen('launchPrep')
      else {
        ui.toast('Pick a contract first')
        ui.open({ kind: 'contracts' })
      }
      break
    default:
      ui.toast('Coming with the next upgrade')
  }
}

tourHooks.openShop = () => useUi.getState().open({ kind: 'market' })
tourHooks.startFirstContract = () => acceptContract('firstLight')

function Sheets() {
  const sheet = useUi((s) => s.sheet)
  if (!sheet) return null
  switch (sheet.kind) {
    case 'settings':
      return <SettingsSheet />
    case 'building':
      return <BuildingSheet id={sheet.id} onAction={() => buildingAction(sheet.id)} />
    case 'contracts':
      return <ContractBoard />
    case 'build':
      return <BuildSheet id={sheet.id} />
    case 'market':
      return <MarketSheet />
    default:
      return null
  }
}

export function App() {
  const phase = useGame((s) => s.phase)
  const setPhase = useGame((s) => s.setPhase)
  const begin = useGame((s) => s.begin)
  const launching = useLaunch((s) => s.active)
  const screen = useUi((s) => s.screen)

  // title and onboarding play over a slow beauty shot of the spaceport
  useEffect(() => {
    if (phase === 'title') startTitleShot()
  }, [phase])

  // arrival: the camera glides down into the base, then the game begins
  useEffect(() => {
    if (phase !== 'arrival') return
    arriveAtBase(3.2)
    const id = setTimeout(() => setPhase('play'), 3300)
    return () => clearTimeout(id)
  }, [phase, setPhase])

  // heartbeat for every timer in the game
  useEffect(() => {
    const id = setInterval(() => processTimers(), 250)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="stage">
      <div className="phone">
        <div className="world">
          <Scene />
        </div>
        <div className="ui">
          {phase === 'title' && <Title />}
          {phase === 'onboarding' && (
            <Onboarding
              onDone={() => {
                begin()
                setPhase('arrival')
              }}
            />
          )}
          {(phase === 'arrival' || phase === 'play') && !screen && <Hud />}
          {phase === 'play' && !screen && <Tour />}
          {phase === 'play' && !screen && <Sheets />}
          {screen === 'builder' && <Builder />}
          {screen === 'launchPrep' && <LaunchPrep />}
          {screen === 'launch' && launching && <LaunchScreen />}
          {screen === 'ops' && <Ops />}
          {screen === 'debrief' && <Debrief />}
          <Toasts />
          <Flyers />
        </div>
      </div>
    </div>
  )
}
