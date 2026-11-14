import { useState } from 'react'
import { LOGO_COLORS, LOGO_ICONS, LOGO_SHAPES, randomLogo, type LogoSpec } from '../art/logo'
import { palette } from '../art/palette'
import { useGame } from '../state/game'
import { Btn } from './kit'
import { LogoBadge } from './LogoBadge'
import { sfx } from './sound'

const AGENCY_A = ['Starling', 'Pelican', 'Tidewater', 'Lighthouse', 'Sandpiper', 'Driftwood', 'Blue Heron', 'Seabreeze', 'Firefly', 'Juniper']
const AGENCY_B = ['Aerospace', 'Orbital', 'Space Co.', 'Rocket Works', 'Space Lab', 'Launch Club']
const randomAgency = () =>
  `${AGENCY_A[Math.floor(Math.random() * AGENCY_A.length)]} ${AGENCY_B[Math.floor(Math.random() * AGENCY_B.length)]}`

/** Name, agency, logo: three quick choices, under 45 seconds. Every step can be skipped. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const player = useGame((s) => s.player)
  const setPlayer = useGame((s) => s.setPlayer)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(player.name)
  const [agency, setAgency] = useState(player.agency || randomAgency())
  const [logo, setLogo] = useState<LogoSpec>(player.logo)

  const update = (patch: Partial<LogoSpec>) => {
    sfx('pop')
    const next = { ...logo, ...patch }
    // keep the icon readable: never the same colour as its background
    if (next.colorA === next.colorB) {
      const other = patch.colorA ? 'colorB' : 'colorA'
      next[other] = next.colorA === palette.cream ? palette.navy : palette.cream
    }
    setLogo(next)
    setPlayer({ logo: next })
  }

  const finish = (spec: LogoSpec) => {
    setPlayer({ name: name.trim() || 'Chief', agency: agency.trim() || randomAgency(), logo: spec })
    onDone()
  }

  return (
    <div className="onboard">
      <div className="steps">
        <i className={step === 0 ? 'on' : ''} />
        <i className={step === 1 ? 'on' : ''} />
      </div>
      {step === 0 ? (
        <div className="panel" key="who">
          <h2>Who's running this place?</h2>
          <p className="sub">You just took over a small, slightly rusty space agency.</p>
          <label className="field">
            <span>Your name</span>
            <input
              value={name}
              maxLength={16}
              placeholder="Chief"
              autoComplete="off"
              enterKeyHint="next"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="row">
            <label className="field">
              <span>Agency name</span>
              <input value={agency} maxLength={22} autoComplete="off" enterKeyHint="done" onChange={(e) => setAgency(e.target.value)} />
            </label>
            <Btn tone="cream" size="sm" sound="pop" onClick={() => setAgency(randomAgency())} aria-label="Suggest a name">
              Surprise me
            </Btn>
          </div>
          <div className="actions">
            <Btn
              onClick={() => {
                setPlayer({ name: name.trim() || 'Chief', agency: agency.trim() || randomAgency() })
                setStep(1)
              }}
            >
              Next
            </Btn>
          </div>
        </div>
      ) : (
        <div className="panel" key="logo">
          <div className="logo-preview">
            <LogoBadge spec={logo} />
            <div>
              <b>{agency.trim() || 'Your agency'}</b>
              <span>Your logo goes on the HQ sign, the flag and every rocket.</span>
            </div>
          </div>
          <div className="picker-label">Shape</div>
          <div className="picker shapes">
            {LOGO_SHAPES.map((shape) => (
              <button key={shape} type="button" className={`pick${logo.shape === shape ? ' on' : ''}`} onClick={() => update({ shape })} aria-label={shape}>
                <LogoBadge spec={{ ...logo, shape }} />
              </button>
            ))}
          </div>
          <div className="picker-label">Icon</div>
          <div className="picker icons">
            {LOGO_ICONS.map((icon) => (
              <button key={icon} type="button" className={`pick${logo.icon === icon ? ' on' : ''}`} onClick={() => update({ icon })} aria-label={icon}>
                <LogoBadge spec={{ ...logo, icon }} />
              </button>
            ))}
          </div>
          <div className="picker-label">Background colour</div>
          <div className="picker colors">
            {LOGO_COLORS.map((c) => (
              <button key={c} type="button" className={`swatch${logo.colorA === c ? ' on' : ''}`} style={{ background: c }} onClick={() => update({ colorA: c })} aria-label="colour" />
            ))}
          </div>
          <div className="picker-label">Icon colour</div>
          <div className="picker colors">
            {LOGO_COLORS.map((c) => (
              <button key={c} type="button" className={`swatch${logo.colorB === c ? ' on' : ''}`} style={{ background: c }} onClick={() => update({ colorB: c })} aria-label="colour" />
            ))}
          </div>
          <div className="actions">
            <Btn
              tone="cream"
              sound="pop"
              onClick={() => {
                const spec = randomLogo()
                setLogo(spec)
                finish(spec)
              }}
            >
              Skip
            </Btn>
            <Btn sound="success" onClick={() => finish(logo)}>
              Looks great!
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
