import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { arriveAtBase, startTitleShot } from './scene/cinematics'
import { processTimers } from './state/actions'
import { onLevelUp, useGame } from './state/game'
import { sfx } from './ui/sound'
import { useUi } from './state/ui'
import { BuildMenu, BuildingSheet } from './ui/BuildingSheet'
import { BuildButton, ClearPopup, PlacementBar } from './ui/PlacementUi'
import { usePlacement } from './state/placement'
import { Hud } from './ui/Hud'
import { MarketSheet } from './ui/MarketSheet'
import { Builder } from './ui/Builder'
import { ContractBoard } from './ui/ContractBoard'
import { Debrief } from './ui/Debrief'
import { LaunchPrep } from './ui/LaunchPrep'
import { Ops } from './ui/Ops'
import { CommsStatus, CrewSheet, LabSheet, TipHost } from './ui/EconomySheets'
import './state/economy'
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
    case 'scienceLab':
      ui.open({ kind: 'lab' })
      break
    case 'crewQuarters':
      ui.open({ kind: 'crew' })
      break
    case 'commsCenter':
      ui.open({ kind: 'lab' })
      break
    default:
      ui.toast('The workshop is still being fitted out')
  }
}

onLevelUp((level, unlocks) => {
  setTimeout(() => {
    sfx('success')
    useUi.getState().toast(`Agency level ${level}! Unlocked: ${unlocks.slice(0, 3).join(', ')}`, 'good')
  }, 900)
})

tourHooks.openShop = () => useUi.getState().open({ kind: 'market' })
tourHooks.startFirstContract = () => acceptContract('firstLight')

function Sheets() {
  const sheet = useUi((s) => s.sheet)
  if (!sheet) return null
  switch (sheet.kind) {
    case 'settings':
      return <SettingsSheet />
    case 'building':
      return (
        <BuildingSheet
          id={sheet.id}
          onAction={() => buildingAction(sheet.id)}
          status={sheet.id === 'commsCenter' ? <CommsStatus /> : undefined}
        />
      )
    case 'lab':
      return <LabSheet />
    case 'crew':
      return <CrewSheet />
    case 'contracts':
      return <ContractBoard />
    case 'buildmenu':
      return <BuildMenu />
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
  const placing = usePlacement((s) => s.id)

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
      <div className="rotate-hint">
        <div>
          <svg viewBox="0 0 64 64" fill="none" stroke="#fff" strokeWidth="3.500" strokeLinejoin="round">
            <rect x="20" y="6" width="24" height="52" rx="5" fill="#2d4a6b" />
            <circle cx="32" cy="50" r="2.500" fill="#fff" stroke="none" />
          </svg>
          <b>Turn your phone sideways</b>
          Mission Tycoon plays in landscape.
        </div>
      </div>
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
          {phase === 'play' && !screen && !placing && <Tour />}
          {phase === 'play' && !screen && !placing && <Sheets />}
          {phase === 'play' && !screen && <BuildButton />}
          {phase === 'play' && !screen && <PlacementBar />}
          {phase === 'play' && !screen && !placing && <ClearPopup />}
          {screen === 'builder' && <Builder />}
          {screen === 'launchPrep' && <LaunchPrep />}
          {screen === 'launch' && launching && <LaunchScreen />}
          {screen === 'ops' && <Ops />}
          {screen === 'debrief' && <Debrief />}
          <TipHost />
          <Toasts />
          <Flyers />
        </div>
      </div>
    </div>
  )
}
