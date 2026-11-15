import { useEffect, useRef } from 'react'
import { levelProgress, useGame } from '../state/game'
import { useUi } from '../state/ui'
import { Icon } from './icons'
import { Btn, CoinPill } from './kit'
import { LogoBadge } from './LogoBadge'

/** Top bar: agency badge with level and XP on the left; coins and settings on the right. */
export function Hud() {
  const player = useGame((s) => s.player)
  const xp = useGame((s) => s.xp)
  const level = useGame((s) => s.level)
  const bump = useUi((s) => s.bump)
  const open = useUi((s) => s.open)
  const xpRef = useRef<HTMLDivElement>(null)

  // restart the bump animation whenever a reward lands
  useEffect(() => {
    const el = xpRef.current
    if (!el || !bump.xp) return
    el.classList.remove('bump')
    void el.offsetWidth
    el.classList.add('bump')
  }, [bump.xp])

  return (
    <div className="hud" data-ui="hud">
      <div className="hud-agency" data-ui="hud.agency">
        <div className="hud-logo" ref={xpRef} data-hud="xp">
          <LogoBadge spec={player.logo} />
          <span className="level" data-ui="hud.level">
            {level}
          </span>
        </div>
        <div className="hud-name">
          <b>{player.agency || 'Your agency'}</b>
          <div className="xp-track" data-ui="hud.xp">
            <div className="xp-fill" style={{ width: `${levelProgress(xp) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="hud-right">
        <CoinPill />
        <Btn tone="cream" round ui="hud.settings" onClick={() => open({ kind: 'settings' })} aria-label="Settings">
          <Icon.gear />
        </Btn>
      </div>
    </div>
  )
}
