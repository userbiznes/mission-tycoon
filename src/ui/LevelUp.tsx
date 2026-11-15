import { useEffect, useMemo } from 'react'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { Icon, type IconName } from './icons'
import { Btn, useEsc } from './kit'
import { LogoBadge } from './LogoBadge'
import { sfx } from './sound'

/** The picture an unlock goes by, guessed from what it is called. */
function unlockIcon(text: string): IconName {
  const t = text.toLowerCase()
  if (t.includes('expedition')) return 'map'
  if (t.includes('contract')) return 'clipboard'
  if (t.includes('rocket') || t.includes('launch')) return 'rocket'
  if (t.includes('orbit')) return 'orbit'
  if (t.includes('camera')) return 'camera'
  if (t.includes('sensor')) return 'thermo'
  if (t.includes('radio')) return 'comms'
  if (t.includes('dish') || t.includes('station')) return 'dish'
  if (t.includes('wheel')) return 'target'
  if (t.includes('computer')) return 'cpu'
  if (t.includes('thruster')) return 'flame'
  if (t.includes('bus') || t.includes('satellite')) return 'satellite'
  if (t.includes('lab')) return 'flask'
  if (t.includes('crew')) return 'crew'
  return 'star'
}

const CONFETTI = ['#e9523b', '#fcc840', '#63bf4f', '#4ba4e3', '#f6963a', '#2fb7aa', '#fff6e0']

/** Level up: a ribbon banner, confetti, and the new unlocks as cards. */
export function LevelUp() {
  const up = useUi((s) => s.levelUp)
  const close = useUi((s) => s.closeLevelUp)
  const logo = useGame((s) => s.player.logo)
  useEsc(up ? close : null)
  useEffect(() => {
    if (!up) return
    sfx('success')
    const id = setTimeout(() => sfx('star'), 320)
    return () => clearTimeout(id)
  }, [up])
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: ((i * 53) % 90) / 100,
        dur: 1.9 + ((i * 29) % 16) / 10,
        color: CONFETTI[i % CONFETTI.length],
        turn: (i % 2 ? 1 : -1) * (240 + ((i * 71) % 300)),
        wide: i % 3 === 0,
      })),
    [],
  )
  if (!up) return null
  return (
    <div className="levelup" data-ui="levelup" onClick={close}>
      <div className="confetti" aria-hidden>
        {bits.map((b, i) => (
          <i key={i} className={b.wide ? 'wide' : ''} style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, ['--turn' as string]: `${b.turn}deg` }} />
        ))}
      </div>
      <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
        <div className="ribbon">
          <span className="ribbon-badge">
            <LogoBadge spec={logo} />
            <b>{up.level}</b>
          </span>
          <h2>Agency level {up.level}!</h2>
        </div>
        <p className="eyebrow center">New at the agency</p>
        <div className="unlocks stagger">
          {up.unlocks.map((u) => {
            const I = Icon[unlockIcon(u)]
            return (
              <div key={u} className="card unlock">
                <span className="thumb sm">
                  <I />
                </span>
                <b className="t-small">{u}</b>
              </div>
            )
          })}
          {up.unlocks.length === 0 && (
            <div className="card unlock">
              <span className="thumb sm">
                <Icon.star />
              </span>
              <b className="t-small">Bragging rights</b>
            </div>
          )}
        </div>
        <Btn size="lg" sound="tap" ui="levelup.ok" onClick={close}>
          Onwards!
        </Btn>
      </div>
    </div>
  )
}
