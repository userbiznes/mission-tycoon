import { useEffect, useMemo, useRef } from 'react'
import { AUTOPILOT_QUALITY, GAUGE, flight, flightQuality, flightWord, lifeKept, useLaunch, type LaunchPhase } from '../state/launch'
import { Icon } from './icons'
import { Btn } from './kit'
import { sfx } from './sound'

/**
 * One line at a time from the Flight Director. While the player is timing a
 * click the line is the instruction and it stays; in calm moments it is a fact
 * and it fades after about four seconds.
 */
function lineFor(phase: LaunchPhase, autopilot: boolean): { text: string; stay: boolean } | null {
  switch (phase) {
    case 'countdown':
      return { text: 'Final checks. Every seat has called GO.', stay: false }
    case 'hold':
      return autopilot ? { text: 'Engines must reach full thrust before the clamps let go.', stay: false } : { text: 'Hold the button. Let go when the ring is in the green.', stay: true }
    case 'ascent':
      return { text: 'Reaching low orbit takes about 9.4 km/s of delta-v.', stay: false }
    case 'staging':
      return autopilot ? { text: 'Dropping the empty first stage means less mass to push.', stay: false } : { text: 'Stage one is nearly empty. Click DROP in the green.', stay: true }
    case 'coast':
      return autopilot ? { text: "Orbit isn't about height. It's about going sideways fast enough.", stay: false } : { text: 'Click BURN as the rocket reaches the top of the arc.', stay: true }
    case 'insert':
      return { text: 'One last burn to make the path a circle.', stay: false }
    case 'orbit':
    case 'done':
      return { text: 'In orbit: falling around the Earth without ever landing.', stay: false }
    default:
      return null
  }
}

const BUTTON: Partial<Record<LaunchPhase, string>> = { hold: 'HOLD', staging: 'DROP', coast: 'BURN' }

const STAMP_CLASS: Record<string, string> = { 'Perfect!': 'perfect', Good: 'good', 'A bit off': 'off', Sloppy: 'bad', 'Too late!': 'bad' }

/** The speedometer: a half circle that fills toward a notch at the speed this orbit needs. */
const ARC = { cx: 60, cy: 62, r: 46, len: Math.PI * 46, max: 1.1 }
const RING_LEN = 2 * Math.PI * 54

/** Overlay for the launch: the Flight Director's line, the altitude ladder, the speedometer and the three timing moments. */
export function LaunchScreen() {
  const phase = useLaunch((s) => s.phase)
  const count = useLaunch((s) => s.count)
  const autopilot = useLaunch((s) => s.autopilot)
  const verdicts = useLaunch((s) => s.verdicts)
  const setAutopilot = useLaunch((s) => s.setAutopilot)
  const root = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const me = useRef<HTMLSpanElement>(null)
  const climbed = useRef<HTMLElement>(null)
  const altNum = useRef<HTMLElement>(null)
  const marksEl = useRef<HTMLDivElement>(null)
  const speedo = useRef<HTMLDivElement>(null)
  const speedArc = useRef<SVGPathElement>(null)
  const speedNum = useRef<HTMLSpanElement>(null)
  const ringFill = useRef<SVGCircleElement>(null)
  const fuel = useRef<HTMLDivElement>(null)
  const fuelLevel = useRef<HTMLElement>(null)
  const apex = useRef<HTMLDivElement>(null)

  const orbitKm = flight.orbitKm
  const vOrbit = Math.sqrt(398600 / (6371 + orbitKm))
  // the ladder is stretched low down, so the first hundred kilometres are not squeezed into its foot
  const rung = (km: number) => Math.sqrt(Math.min(1, Math.max(0, km / orbitKm)))
  const marks = useMemo(
    () => [
      { km: 10, label: 'Clouds', sub: '10 km' },
      { km: 50, label: 'Staging', sub: '50 km' },
      { km: 100, label: 'Space', sub: '100 km' },
      { km: orbitKm, label: 'Orbit', sub: `${orbitKm} km` },
    ],
    [orbitKm],
  )

  // the 3D scene owns the clock; mirror its numbers into the DOM every frame
  useEffect(() => {
    let raf = 0
    const passed = new Set<number>()
    const tick = () => {
      const f = flight
      const host = root.current
      if (veil.current) veil.current.style.opacity = f.veil.toFixed(3)
      const at = rung(f.altKm) * 100
      if (me.current) me.current.style.bottom = `${at}%`
      if (climbed.current) climbed.current.style.height = `${at}%`
      if (altNum.current) altNum.current.textContent = f.altKm < 10 ? f.altKm.toFixed(1) : Math.round(f.altKm).toString()
      if (marksEl.current) {
        marks.forEach((m, i) => {
          const on = f.altKm >= m.km - 0.5
          const el = marksEl.current!.children[i] as HTMLElement
          if (on && !passed.has(i)) {
            passed.add(i)
            el.classList.add('on')
            if (f.phase !== 'orbit') sfx('beep')
          }
        })
      }
      const share = Math.min(1, f.speedKms / (vOrbit * ARC.max))
      if (speedArc.current) speedArc.current.style.strokeDasharray = `${(share * ARC.len).toFixed(1)} ${ARC.len}`
      if (speedNum.current) speedNum.current.textContent = f.speedKms.toFixed(1)
      if (speedo.current) speedo.current.classList.toggle('reached', f.speedKms >= vOrbit * 0.995)
      if (ringFill.current) ringFill.current.style.strokeDasharray = `${(Math.min(1, f.gauge) * RING_LEN).toFixed(1)} ${RING_LEN}`
      if (host && fuel.current && f.phase === 'staging') {
        const hi = GAUGE.staging.center + GAUGE.staging.half * f.windowScale
        const lo = GAUGE.staging.center - GAUGE.staging.half * f.windowScale
        const level = Math.max(0, 1 - f.gauge / hi)
        if (fuelLevel.current) fuelLevel.current.style.height = `${level * 100}%`
        fuel.current.classList.toggle('go', f.gauge >= lo && f.gauge <= hi)
        fuel.current.classList.toggle('late', f.gauge > hi)
        fuel.current.style.transform = `translate(${(f.sx * host.clientWidth).toFixed(1)}px, ${(f.sy * host.clientHeight).toFixed(1)}px)`
      }
      if (host && apex.current && f.phase === 'coast') {
        apex.current.style.transform = `translate(${(f.ax * host.clientWidth).toFixed(1)}px, ${(f.ay * host.clientHeight).toFixed(1)}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, vOrbit])

  const label = BUTTON[phase]
  const live = !!label && !autopilot
  const line = lineFor(phase, autopilot)
  // (the autopilot's timing is not the player's to be graded on)
  const stamp = autopilot ? null : phase === 'ascent' ? verdicts[0] : phase === 'coast' ? verdicts[1] : phase === 'insert' ? verdicts[2] : null
  useEffect(() => {
    if (stamp) sfx('stamp')
  }, [stamp, phase])

  const press = () => {
    if (!live) return
    if (phase === 'hold') {
      if (!flight.holding) sfx('tap')
      flight.holding = true
    } else flight.tapQueued = true
  }
  const release = () => {
    if (phase === 'hold' && flight.holding) flight.releaseQueued = true
  }
  // the space bar is the big button too
  useEffect(() => {
    if (!live) return
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
      press()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, phase])

  // the green band on the ignition ring
  const band = GAUGE.hold.half * flight.windowScale
  const notch = Math.PI * (1 - 1 / ARC.max)
  const inOrbit = phase === 'orbit' || phase === 'done'
  const quality = autopilot ? AUTOPILOT_QUALITY : flightQuality(flight.scores)
  const life = (q: number) => `${Math.round(lifeKept(q) * 100)}%`
  const locked = phase === 'insert' || inOrbit

  return (
    <div className="fl" data-ui="launch" ref={root} onPointerUp={release} onPointerCancel={release}>
      <div className="fl-veil" ref={veil} aria-hidden />

      {line && (
        <p className={`fl-ticker${line.stay ? ' stay' : ''}`} key={line.text} data-ui="launch.ticker">
          <b>Flight</b>
          <span>{line.text}</span>
        </p>
      )}

      {/* left: how high, and what comes next */}
      <div className="fl-ladder" data-ui="launch.ladder">
        <div className="fl-alt">
          <small>Altitude</small>
          <b>
            <span ref={altNum}>0.0</span> km
          </b>
        </div>
        <div className="fl-rungs">
          <span className="rail">
            <i ref={climbed} />
          </span>
          <div ref={marksEl}>
            {marks.map((m) => (
              <span key={m.label} className="mark" style={{ bottom: `${rung(m.km) * 100}%` }}>
                {m.label} <small>{m.sub}</small>
              </span>
            ))}
          </div>
          <span className="me" ref={me}>
            <Icon.rocket />
          </span>
        </div>
      </div>

      {/* right: how fast, against what the orbit needs */}
      <div className="fl-speedo" ref={speedo} data-ui="launch.readout">
        <svg viewBox="0 0 120 70" aria-hidden>
          <path className="track" d={`M${ARC.cx - ARC.r} ${ARC.cy} A${ARC.r} ${ARC.r} 0 0 1 ${ARC.cx + ARC.r} ${ARC.cy}`} />
          <path className="fill" ref={speedArc} d={`M${ARC.cx - ARC.r} ${ARC.cy} A${ARC.r} ${ARC.r} 0 0 1 ${ARC.cx + ARC.r} ${ARC.cy}`} style={{ strokeDasharray: `0 ${ARC.len}` }} />
          <line className="notch" x1={ARC.cx + Math.cos(notch) * (ARC.r - 9)} y1={ARC.cy - Math.sin(notch) * (ARC.r - 9)} x2={ARC.cx + Math.cos(notch) * (ARC.r + 9)} y2={ARC.cy - Math.sin(notch) * (ARC.r + 9)} />
        </svg>
        <p className="num">
          <span ref={speedNum}>0.0</span> <small>km/s</small>
        </p>
        <p className="need">Orbit needs {vOrbit.toFixed(1)} km/s</p>
      </div>

      <div className={`fl-mid${inOrbit ? ' top' : ''}`}>
        {phase === 'countdown' && (
          <div className="count" key={count}>
            {count}
          </div>
        )}
        {phase === 'ascent' && (
          <div className="count word" key="go">
            Liftoff!
          </div>
        )}
        {inOrbit && (
          <div className="count word" key="orbit">
            Orbit!
          </div>
        )}
      </div>
      {stamp && (
        <div className={`fl-stamp ${STAMP_CLASS[stamp] ?? 'good'}`} key={`${phase}-stamp`} data-ui="launch.stamp">
          {stamp}
        </div>
      )}

      {/* staging: the first stage's fuel, beside the rocket */}
      {phase === 'staging' && (
        <div className="fl-fuel" ref={fuel} data-ui="launch.fuel">
          <div>
            <span className="tank">
              <i className="zone" style={{ height: `${(1 - (GAUGE.staging.center - GAUGE.staging.half * flight.windowScale) / (GAUGE.staging.center + GAUGE.staging.half * flight.windowScale)) * 100}%` }} />
              <i className="level" ref={fuelLevel} style={{ height: '100%' }} />
            </span>
            <small>Stage 1 fuel</small>
          </div>
        </div>
      )}
      {/* the final burn: the top of the arc, marked in the world */}
      {phase === 'coast' && (
        <div className="fl-apex" ref={apex} aria-hidden>
          <span>Top of the arc</span>
        </div>
      )}

      {inOrbit && (
        <div className="fl-card" data-ui="launch.card">
          <b className="fl-card-title">{autopilot ? 'Autopilot flight' : flightWord(quality)}</b>
          <p className="fl-life">
            <b>{life(quality)}</b> of orbit life
          </p>
          {autopilot ? (
            <p>Fly it yourself next time for up to 100%.</p>
          ) : (
            <ul>
              {['Ignition', 'Staging', 'Final burn'].map((name, i) => (
                <li key={name} className={STAMP_CLASS[verdicts[i] ?? ''] ?? ''}>
                  <span>{name}</span>
                  <b>{verdicts[i] ?? '·'}</b>
                </li>
              ))}
            </ul>
          )}
          <Btn
            tone="yellow"
            block
            ui="launch.continue"
            onClick={() => {
              flight.skip = true
            }}
          >
            To operations
          </Btn>
        </div>
      )}

      {!inOrbit && (
        <div className="fl-auto" data-ui="launch.autopilot" role="radiogroup" aria-label="Who flies the launch">
          <button type="button" role="radio" aria-checked={autopilot} className={autopilot ? 'on' : ''} disabled={locked} data-ui="launch.autopilot.on" onClick={() => setAutopilot(true)}>
            <b>Autopilot</b>
            <small>Safe: keeps {life(AUTOPILOT_QUALITY)} of orbit life</small>
          </button>
          <button type="button" role="radio" aria-checked={!autopilot} className={autopilot ? '' : 'on'} disabled={locked} data-ui="launch.autopilot.off" onClick={() => setAutopilot(false)}>
            <b>Fly it myself</b>
            <small>Up to 100%</small>
          </button>
        </div>
      )}

      {!inOrbit && (
        <div className={`fl-fire${phase === 'hold' && !autopilot ? ' ring' : ''}`}>
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle className="track" cx="60" cy="60" r="54" />
            <circle className="band" cx="60" cy="60" r="54" style={{ strokeDasharray: `${band * 2 * RING_LEN} ${RING_LEN}`, strokeDashoffset: -(GAUGE.hold.center - band) * RING_LEN }} />
            <circle className="thrust" ref={ringFill} cx="60" cy="60" r="54" style={{ strokeDasharray: `0 ${RING_LEN}` }} />
          </svg>
          <button
            type="button"
            className={`fire${live ? ' live' : ''}`}
            data-ui="launch.fire"
            disabled={!live}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId)
              press()
            }}
          >
            {label && !autopilot ? label : '···'}
          </button>
        </div>
      )}
    </div>
  )
}
