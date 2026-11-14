import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { arriveAtBase, startTitleShot } from './scene/cinematics'
import { processTimers } from './state/actions'
import { useGame } from './state/game'
import { useUi } from './state/ui'
import { BuildSheet, BuildingSheet } from './ui/BuildingSheet'
import { Hud } from './ui/Hud'
import { Onboarding } from './ui/Onboarding'
import { Flyers, Toasts } from './ui/Overlays'
import { SettingsSheet } from './ui/SettingsSheet'
import { Title } from './ui/Title'
import { Tour } from './ui/Tour'

function Sheets() {
  const sheet = useUi((s) => s.sheet)
  if (!sheet) return null
  switch (sheet.kind) {
    case 'settings':
      return <SettingsSheet />
    case 'building':
      return <BuildingSheet id={sheet.id} />
    case 'build':
      return <BuildSheet id={sheet.id} />
    default:
      return null
  }
}

export function App() {
  const phase = useGame((s) => s.phase)
  const setPhase = useGame((s) => s.setPhase)
  const begin = useGame((s) => s.begin)

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
          {(phase === 'arrival' || phase === 'play') && <Hud />}
          {phase === 'play' && <Tour />}
          {phase === 'play' && <Sheets />}
          <Toasts />
          <Flyers />
        </div>
      </div>
    </div>
  )
}
