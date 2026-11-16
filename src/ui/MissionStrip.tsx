import { useLaunch } from '../state/launch'
import { useUi } from '../state/ui'
import { Icon } from './icons'

const STAGES = ['Board', 'Countdown', 'Ascent', 'Orbit', 'Operations', 'Report']

/**
 * Where the player is in the mission, along the top of every mission screen:
 * the current stage is lit and finished ones get a check. It lives above the
 * screens, so it stays put while they change underneath.
 */
export function MissionStrip() {
  const screen = useUi((s) => s.screen)
  const phase = useLaunch((s) => s.phase)
  const at =
    screen === 'launchPrep'
      ? 0
      : screen === 'launch'
        ? phase === 'orbit' || phase === 'done'
          ? 3
          : phase === 'ascent' || phase === 'staging' || phase === 'coast' || phase === 'insert'
            ? 2
            : 1
        : screen === 'ops'
          ? 4
          : screen === 'debrief'
            ? 5
            : -1
  if (at < 0) return null
  return (
    <ol className="ms" data-ui="mission.strip" aria-label="Mission progress">
      {STAGES.map((name, i) => (
        <li key={name} className={i < at ? 'done' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <i>{i < at && <Icon.check />}</i>
          {name}
        </li>
      ))}
    </ol>
  )
}
