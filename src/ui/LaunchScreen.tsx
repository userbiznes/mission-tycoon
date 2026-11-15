import { useEffect, useRef } from 'react'
import { GAUGE, flight, useLaunch } from '../state/launch'
import { Btn } from './kit'
import { sfx } from './sound'

const FACTS: Partial<Record<string, string>> = {
  countdown: 'Final checks. Every seat has called GO.',
  hold: 'Engines must reach full thrust before the clamps let go.',
  ascent: 'Reaching low orbit takes about 9.4 km/s of delta-v.',
  staging: 'Dropping the empty first stage means less mass to push.',
  coast: "Orbit isn't about height. It's about going sideways fast enough.",
  insert: 'One last burn to make the path a circle.',
  orbit: 'In orbit: falling around the Earth without ever landing.',
}

const PROMPT: Partial<Record<string, { title: string; button: string }>> = {
  hold: { title: 'Hold to fire. Let go in the green!', button: 'HOLD' },
  staging: { title: 'Tap to drop the stage in the green', button: 'DROP' },
  coast: { title: 'Tap at the top of the arc', button: 'BURN' },
}

// arc for the "tap at the top" gauge (quadratic Bézier in a 200×90 box)
const A = [12, 78]
const C = [100, 3.3]
const B = [188, 22]
function arcPoint(t: number): [number, number] {
  const u = 1 - t
  return [u * u * A[0] + 2 * t * u * C[0] + t * t * B[0], u * u * A[1] + 2 * t * u * C[1] + t * t * B[1]]
}

/** Overlay for the launch cinematic: countdown, readouts and the three timing gauges. */
export function LaunchScreen() {
  const phase = useLaunch((s) => s.phase)
  const count = useLaunch((s) => s.count)
  const autopilot = useLaunch((s) => s.autopilot)
  const verdicts = useLaunch((s) => s.verdicts)
  const setAutopilot = useLaunch((s) => s.setAutopilot)
  const marker = useRef<HTMLDivElement>(null)
  const arcDot = useRef<SVGGElement>(null)
  const alt = useRef<HTMLSpanElement>(null)
  const speed = useRef<HTMLSpanElement>(null)
  const speedFill = useRef<HTMLDivElement>(null)
  const space = useRef<HTMLDivElement>(null)

  // the 3D scene owns the clock; mirror its numbers into the DOM every frame
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const f = flight
      if (marker.current) marker.current.style.left = `${Math.min(1, f.gauge) * 100}%`
      if (arcDot.current) {
        const [x, y] = arcPoint(Math.min(1.02, f.gauge))
        arcDot.current.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
      }
      if (alt.current) alt.current.textContent = f.altKm < 10 ? f.altKm.toFixed(1) : Math.round(f.altKm).toString()
      if (speed.current) speed.current.textContent = f.speedKms.toFixed(1)
      const vOrbit = Math.sqrt(398600 / (6371 + f.orbitKm))
      if (speedFill.current) speedFill.current.style.width = `${Math.min(1, f.speedKms / vOrbit) * 100}%`
      if (space.current) space.current.classList.toggle('on', f.altKm >= 100)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const vOrbit = Math.sqrt(398600 / (6371 + flight.orbitKm))
  const prompt = PROMPT[phase]
  const gaugeKey = phase === 'hold' || phase === 'staging' || phase === 'coast' ? phase : null
  const zone = gaugeKey ? GAUGE[gaugeKey] : null
  const half = zone ? zone.half * flight.windowScale : 0
  const lastVerdict = phase === 'ascent' ? verdicts[0] : phase === 'coast' ? verdicts[1] : phase === 'insert' ? verdicts[2] : null

  const press = () => {
    if (phase === 'hold') {
      flight.holding = true
      sfx('tap')
    } else if (phase === 'staging' || phase === 'coast') {
      flight.tapQueued = true
    }
  }
  const release = () => {
    if (phase === 'hold' && flight.holding) flight.releaseQueued = true
  }

  return (
    <div className="launch" data-ui="launch" onPointerUp={release} onPointerCancel={release}>
      <div className="launch-top">
        <div className="readout panel">
          <div>
            <small>Altitude</small>
            <b>
              <span ref={alt}>0.0</span> km
            </b>
          </div>
          <div>
            <small>Speed</small>
            <b>
              <span ref={speed}>0.0</span> km/s
            </b>
          </div>
          <div className="speed-track" title="speed needed for orbit">
            <div ref={speedFill} />
            <i>orbit needs {vOrbit.toFixed(1)} km/s</i>
          </div>
        </div>
        <div className="space-badge" ref={space}>
          100 km: you're in space!
        </div>
        {FACTS[phase] && (
          <p className="launch-fact" key={phase}>
            {FACTS[phase]}
          </p>
        )}
      </div>

      <div className="launch-mid">
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
        {phase === 'orbit' && (
          <div className="count word" key="orbit">
            Orbit!
          </div>
        )}
        {lastVerdict && (
          <div className={`verdict${lastVerdict === 'Perfect!' ? ' perfect' : ''}`} key={`${phase}-v`}>
            {lastVerdict}
          </div>
        )}
      </div>

      <div className="launch-bottom">
        {prompt && zone && !autopilot && <p className="launch-prompt">{prompt.title}</p>}
        {autopilot && phase !== 'orbit' && phase !== 'done' && <p className="launch-prompt">Autopilot is flying. Sit back!</p>}
        {phase === 'coast' ? (
          <svg className="arc-gauge" viewBox="0 0 200 90">
            <path d={`M${A} Q${C} ${B}`} fill="none" stroke="#4b2f1c" strokeWidth="9" strokeLinecap="round" />
            <path d={`M${A} Q${C} ${B}`} fill="none" stroke="#fff3d6" strokeWidth="5" strokeLinecap="round" />
            {(() => {
              // the green window near the top of the arc
              const pts: string[] = []
              for (let i = 0; i <= 8; i++) pts.push(arcPoint(zone!.center - half + (i / 8) * half * 2).join(','))
              return <polyline points={pts.join(' ')} fill="none" stroke="#63bf4f" strokeWidth="6" strokeLinecap="round" />
            })()}
            <g ref={arcDot}>
              <circle r="7.500" fill="#e9523b" stroke="#4b2f1c" strokeWidth="2.600" />
              <circle r="2.600" fill="#fff" />
            </g>
          </svg>
        ) : (
          zone && (
            <div className="gauge">
              <div className="gauge-zone" style={{ left: `${(zone.center - half) * 100}%`, width: `${half * 200}%` }} />
              <div className="gauge-marker" ref={marker} />
            </div>
          )
        )}
        <div className="launch-controls">
          <Btn
            tone={autopilot ? 'teal' : 'cream'}
            ui="launch.autopilot"
            onClick={() => setAutopilot(!autopilot)}
            disabled={phase === 'orbit' || phase === 'done' || phase === 'insert'}
          >
            Autopilot {autopilot ? 'ON' : 'off'}
          </Btn>
          <button
            type="button"
            className={`fire${prompt && !autopilot ? ' live' : ''}`}
            data-ui="launch.fire"
            disabled={!prompt || autopilot}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId)
              press()
            }}
          >
            {prompt ? prompt.button : '···'}
          </button>
        </div>
      </div>
    </div>
  )
}
