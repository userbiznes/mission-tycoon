import { useState } from 'react'
import { LOGO_COLORS, LOGO_ICONS, LOGO_SHAPES, randomLogo, type LogoSpec } from '../art/logo'
import { palette } from '../art/palette'
import { useGame } from '../state/game'
import { Btn } from './kit'
import { LogoBadge } from './LogoBadge'
import { sfx } from './sound'

const AGENCY_A = ['Starling', 'Pelican', 'Tidewater', 'Lighthouse', 'Sandpiper', 'Driftwood', 'Blue Heron', 'Seabreeze', 'Firefly', 'Juniper']
const AGENCY_B = ['Aerospace', 'Orbital', 'Space Co.', 'Rocket Works', 'Space Lab', 'Launch Club']
const randomAgency = () => `${AGENCY_A[Math.floor(Math.random() * AGENCY_A.length)]} ${AGENCY_B[Math.floor(Math.random() * AGENCY_B.length)]}`

/**
 * Registering the agency: a form on a clipboard. Page one is the name and the
 * agency, page two is the logo. The flag on the right flies the logo as it is
 * built. Every step can be skipped, and it takes well under a minute.
 */
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
    <div className="onboard" data-ui="onboard">
      <div className="clipboard">
        <span className="clip" aria-hidden />
        <div className="form">
          <header className="form-head">
            <h2>Agency registration</h2>
            <small>{step === 0 ? 'Page 1: who is in charge' : 'Page 2: your logo'}</small>
            <span className="steps" aria-hidden>
              <i className={step === 0 ? 'on' : ''} />
              <i className={step === 1 ? 'on' : ''} />
            </span>
          </header>

          {step === 0 ? (
            <div className="form-main" key="who">
              <p className="t-body" style={{ marginBottom: '0.6em' }}>
                You just took over a small, slightly rusty space agency.
              </p>
              <label className="field">
                <span>Your name</span>
                <input data-ui="onboard.name" value={name} maxLength={16} placeholder="Chief" autoComplete="off" enterKeyHint="next" onChange={(e) => setName(e.target.value)} />
              </label>
              <div className="row">
                <label className="field">
                  <span>Agency name</span>
                  <input data-ui="onboard.agency" value={agency} maxLength={22} autoComplete="off" enterKeyHint="done" onChange={(e) => setAgency(e.target.value)} />
                </label>
                <Btn tone="blue" sound="pop" ui="onboard.surprise" onClick={() => setAgency(randomAgency())} aria-label="Suggest a name">
                  Surprise me
                </Btn>
              </div>
            </div>
          ) : (
            <div className="form-main" key="logo">
              <div className="pick-group">
                <div>
                  <div className="pick-label">Shape</div>
                  <div className="pick-row">
                    {LOGO_SHAPES.map((shape) => (
                      <button key={shape} type="button" className={`pickable${logo.shape === shape ? ' on' : ''}`} data-ui={`onboard.shape.${shape}`} onClick={() => update({ shape })} aria-label={`Shape: ${shape}`} aria-pressed={logo.shape === shape}>
                        <LogoBadge spec={{ ...logo, shape }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="pick-label">Icon</div>
                  <div className="pick-row">
                    {LOGO_ICONS.map((icon) => (
                      <button key={icon} type="button" className={`pickable${logo.icon === icon ? ' on' : ''}`} data-ui={`onboard.icon.${icon}`} onClick={() => update({ icon })} aria-label={`Icon: ${icon}`} aria-pressed={logo.icon === icon}>
                        <LogoBadge spec={{ ...logo, icon }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pick-label">Background colour</div>
              <div className="pick-row">
                {LOGO_COLORS.map((c, i) => (
                  <button key={c} type="button" className={`pickable swatch${logo.colorA === c ? ' on' : ''}`} data-ui={`onboard.bg.${i}`} onClick={() => update({ colorA: c })} aria-label={`Background colour ${i + 1}`} aria-pressed={logo.colorA === c}>
                    <i style={{ background: c }} />
                  </button>
                ))}
              </div>
              <div className="pick-label">Icon colour</div>
              <div className="pick-row">
                {LOGO_COLORS.map((c, i) => (
                  <button key={c} type="button" className={`pickable swatch${logo.colorB === c ? ' on' : ''}`} data-ui={`onboard.fg.${i}`} onClick={() => update({ colorB: c })} aria-label={`Icon colour ${i + 1}`} aria-pressed={logo.colorB === c}>
                    <i style={{ background: c }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <aside className="form-side">
            <div className="flag" aria-hidden>
              <span className="pole" />
              <span className="cloth">
                <LogoBadge spec={logo} />
              </span>
            </div>
            <b className="agency">{agency.trim() || 'Your agency'}</b>
            <small className="t-small">On the HQ sign, the flag and every rocket.</small>
          </aside>

          <footer className="form-actions">
            {step === 0 ? (
              <Btn
                ui="onboard.next"
                onClick={() => {
                  setPlayer({ name: name.trim() || 'Chief', agency: agency.trim() || randomAgency() })
                  setStep(1)
                }}
              >
                Next
              </Btn>
            ) : (
              <>
                <Btn tone="cream" sound="close" ui="onboard.back" onClick={() => setStep(0)}>
                  Back
                </Btn>
                <Btn
                  tone="cream"
                  sound="pop"
                  ui="onboard.skip"
                  onClick={() => {
                    const spec = randomLogo()
                    setLogo(spec)
                    finish(spec)
                  }}
                >
                  Skip
                </Btn>
                <Btn sound="success" ui="onboard.done" onClick={() => finish(logo)}>
                  Looks great!
                </Btn>
              </>
            )}
          </footer>
        </div>
      </div>
    </div>
  )
}
