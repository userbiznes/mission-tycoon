import { useGame } from '../state/game'
import { Icon } from './icons'
import { Btn } from './kit'

/** Title screen over the live spaceport. */
export function Title() {
  const setPhase = useGame((s) => s.setPhase)
  return (
    <div className="title">
      <h1 className="wordmark">
        <span className="a">Mission</span>
        <span className="b">Tycoon</span>
      </h1>
      <p className="tagline">Run a tiny space agency. Learn how real missions are designed.</p>
      <div className="spacer" />
      <Btn size="lg" className="start" sound="success" onClick={() => setPhase('onboarding')}>
        <Icon.play /> Start
      </Btn>
      <p className="foot">Made for the 2026 Space Apps Challenge · Space Mission Design Game</p>
    </div>
  )
}
