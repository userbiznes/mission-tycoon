import { useEffect, useMemo, useRef, useState } from 'react'
import type { ResourceKey } from '../data/types'
import { useGame } from '../state/game'
import { currentResult, useMission } from '../state/mission'
import { toMs } from '../state/time'
import { useUi } from '../state/ui'
import type { PlannedEvent, StageId } from '../sim'
import { BAR_ICON } from './Builder'
import { Globe, type GlobeClock } from './Globe'
import { Icon } from './icons'
import { Btn } from './kit'
import { sfx } from './sound'

const STAGE_ICON: Record<StageId, keyof typeof Icon> = { instruments: 'camera', storage: 'data', radio: 'comms', ground: 'dish' }
const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toLocaleString('en-US'))

/** A decision card: two clear choices, each showing how it will move the bars. */
function EventCard({ event, onChoose }: { event: PlannedEvent; onChoose: (c: 'a' | 'b') => void }) {
  return (
    <div className="event-wrap">
      <div className="event-card panel">
        <span className="eyebrow">Day {event.day} · decision</span>
        <h2>{event.title}</h2>
        <p>{event.text}</p>
        <div className="event-sides">
          {event.choices.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="side"
              onClick={() => {
                sfx('snap')
                onChoose(i === 0 ? 'a' : 'b')
              }}
            >
              <b>{c.label}</b>
              <small>{c.blurb}</small>
              <div className="fx">
                {c.previews.length === 0 && <span className="chip">No change</span>}
                {c.previews.map((p, j) => {
                  const BI = Icon[BAR_ICON[p.bar as ResourceKey]]
                  return (
                    <span key={j} className={`chip ${p.delta < 0 ? 'bad' : 'good'}`}>
                      <BI /> {p.text}
                    </span>
                  )
                })}
              </div>
              <span className="pick-btn">Choose this</span>
            </button>
          ))}
        </div>
        <small className="basis">{event.basis}</small>
      </div>
    </div>
  )
}

/** Mission operations: the time-lapse on the globe, the data pipeline and the decision cards. */
export function Ops() {
  const plan = useMission((s) => s.plan)!
  const choices = useMission((s) => s.choices)
  const flightQuality = useMission((s) => s.flightQuality)
  const setMission = useMission((s) => s.set)
  const draft = useGame((s) => s.draft)
  const setScreen = useUi((s) => s.setScreen)
  const nDays = plan.evaluation.contract.missionDays
  // the whole time-lapse takes about 40 design-seconds, whatever the mission length
  const dayMs = useMemo(() => toMs(Math.min(5.5, Math.max(2.4, 40 / nDays))), [nDays])
  const clock = useRef<GlobeClock>({ days: 0, running: true, inContact: false }).current
  const [day, setDay] = useState(0) // completed days
  const [card, setCard] = useState<PlannedEvent | null>(null)
  const [done, setDone] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => currentResult()!, [choices, flightQuality])
  const answered = useRef(new Set<string>())

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (clock.running && !done) {
        clock.days = Math.min(nDays, clock.days + dt / dayMs)
        const whole = Math.floor(clock.days + 1e-6)
        // a decision card comes up at the start of its day
        const due = plan.events.find((e) => !answered.current.has(e.id) && clock.days >= e.day - 1)
        if (due) {
          clock.running = false
          clock.days = due.day - 1
          setDay(due.day - 1)
          setCard(due)
          sfx('pop')
        } else {
          setDay((d) => {
            if (whole !== d) sfx('tick')
            return whole
          })
          if (clock.days >= nDays) {
            setDone(true)
            sfx('success')
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMs, nDays, done])

  const choose = (c: 'a' | 'b') => {
    if (!card) return
    answered.current.add(card.id)
    setMission({ choices: { ...choices, [card.id]: c } })
    setCard(null)
    clock.running = true
  }

  const logs = result.days.slice(0, day)
  const made = logs.reduce((n, d) => n + d.madeMb, 0)
  const home = logs.reduce((n, d) => n + d.deliveredMb, 0)
  const science = logs.length ? logs[logs.length - 1].scienceTotal : 0
  const today = result.days[Math.min(day, nDays - 1)]
  const p = result.evaluation.pipeline
  const target = result.science.target

  return (
    <div className="flow ops">
      <div className="ops-globe">
        <Globe orbitId={draft?.orbitId ?? 'leo'} stationIds={draft?.stationIds ?? ['home']} clock={clock} />
      </div>
      <header className="ops-top">
        <div className="panel ops-day">
          <small>{result.evaluation.contract.title}</small>
          <b>
            Day {Math.min(nDays, day + (done ? 0 : 1))} <i>of {nDays}</i>
          </b>
        </div>
        <div className="panel ops-sci">
          <small>
            Science <b>{fmt(science)}</b> / {fmt(target)}
          </small>
          <div className={`meter${science >= target ? '' : ' blue'}`}>
            <i style={{ width: `${Math.min(100, (science / target) * 100)}%` }} />
          </div>
        </div>
      </header>

      <div className="ops-bottom">
        <div className="counters">
          <span className="chip">
            <Icon.camera /> Made {fmt(made)} MB
          </span>
          <span className="chip good">
            <Icon.dish /> Home {fmt(home)} MB
          </span>
          <span className="chip bad">Lost {fmt(Math.max(0, made - home))} MB</span>
        </div>
        <div className="pipeline panel">
          <small className="eyebrow">Data pipeline · MB per day</small>
          <div className="stages">
            {p.stages.map((s, i) => {
              const SI = Icon[STAGE_ICON[s.id]]
              const slow = today && today.bottleneck === s.id && p.losing
              return (
                <div key={s.id} className={`pstage${slow ? ' slow' : ''}`}>
                  <SI />
                  <b>{fmt(s.mbPerDay)}</b>
                  <small>{s.label}</small>
                  {i < p.stages.length - 1 && <i className="arrow">›</i>}
                </div>
              )
            })}
          </div>
          <p className="pipe-note">
            {p.losing ? `The slowest link sets the pace: ${fmt(p.deliveredPerDay)} of ${fmt(p.madeIdealPerDay)} MB a day reaches the ground.` : 'Every link keeps up: all the data reaches the ground.'}
          </p>
        </div>
        {done ? (
          <Btn block size="lg" sound="success" onClick={() => setScreen('debrief')}>
            Mission complete: debrief
          </Btn>
        ) : (
          <Btn
            tone="cream"
            block
            size="sm"
            disabled={!!card}
            onClick={() => {
              const next = plan.events.find((e) => !answered.current.has(e.id))
              clock.days = next ? next.day - 1 : nDays
            }}
          >
            <Icon.fast style={{ filter: 'invert(0.75)' }} /> Skip ahead
          </Btn>
        )}
      </div>
      {card && <EventCard event={card} onChoose={choose} />}
    </div>
  )
}
