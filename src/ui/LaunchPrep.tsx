import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RocketKind } from '../art/models/rocket'
import { CONTRACT_BY_ID } from '../data/contracts'
import { ORBIT_BY_ID } from '../data/orbits'
import { REGIONS } from '../data/regions'
import { ROCKETS } from '../data/rockets'
import { STATIONS } from '../data/stations'
import type { OrbitId, SeatId, StationId } from '../data/types'
import { useGame } from '../state/game'
import { useLaunch } from '../state/launch'
import { commitLaunch, evalInputFor, setDraft } from '../state/mission'
import { useUi } from '../state/ui'
import { evaluateDesign, goNoGo, yearsWords } from '../sim'
import { BoardPreview, type BoardLabels } from './BoardPreview'
import { BAR_ICON } from './Builder'
import { Icon } from './icons'
import { Btn, LockBadge, Tip, useEsc } from './kit'
import { Portrait } from './Portrait'
import { emit } from '../tutorial/bus'
import { sfx } from './sound'
import { Thumb } from './thumbs'

/** A label on the launch board, spelled out in split-flap tiles. */
export function Flip({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`flip ${className}`} aria-label={text}>
      {text.split('').map((ch, i) => (ch === ' ' ? <i key={i} className="gap" aria-hidden /> : <i key={i} aria-hidden>{ch}</i>))}
    </span>
  )
}

/** A little picture of an orbit: the Earth and a ring at its height. */
function OrbitGlyph({ km }: { km: number }) {
  // higher orbits draw a wider ring
  const r = 13 + Math.min(1, Math.log10(Math.max(200, km) / 200) / 1.2) * 8
  return (
    <svg viewBox="0 0 48 48" className="orbit-glyph" aria-hidden>
      <ellipse cx="24" cy="24" rx={r} ry={r * 0.42} fill="none" stroke="#4b2f1c" strokeWidth="2.2" strokeDasharray="3.4 3" transform="rotate(-22 24 24)" />
      <circle cx="24" cy="24" r="9.5" fill="#6fc7ff" stroke="#4b2f1c" strokeWidth="2.4" />
      <path d="M18.500 20.500c2.600-2.800 6.400-2.400 7.400.2s-1.400 4.800-4 4.600-4.800-2.400-3.400-4.800z" fill="#8be05f" />
      <circle cx={24 + r * 0.927} cy={24 - r * 0.375} r="3.400" fill="#fcc840" stroke="#4b2f1c" strokeWidth="2" />
    </svg>
  )
}

const STEPS = ['Orbit', 'Rocket', 'Ground stations']
const SEAT_ICON: Record<SeatId, keyof typeof Icon> = { science: 'star', spacecraft: 'satellite', launch: 'rocket', ground: 'dish' }

/** One choice: a big picture, the name, two or three numbers as chips, and the reason tucked behind "Why?". */
function Choice({ ui, on, locked, onPick, icon, name, chips, why }: { ui: string; on: boolean; locked?: boolean; onPick: () => void; icon: ReactNode; name: string; chips: ReactNode; why: string }) {
  return (
    <button type="button" disabled={locked} className={`bd-card${on ? ' on' : ''}${locked ? ' locked' : ''}`} data-ui={ui} aria-pressed={on} onClick={onPick}>
      <span className="bd-card-icon">
        {icon}
        {on && (
          <span className="bd-tick">
            <Icon.check />
          </span>
        )}
      </span>
      <span className="bd-card-body">
        <span className="bd-card-top">
          <b>{name}</b>
          <Tip text={why} below className="bd-why">
            <i>Why?</i>
          </Tip>
        </span>
        <span className="bd-chips">{chips}</span>
      </span>
    </button>
  )
}

/**
 * Launch Pad: three guided steps with a live picture. Orbit, then rocket, then
 * ground stations; the crew's GO / NO-GO poll and the launch button stay along
 * the bottom the whole time.
 */
export function LaunchPrep() {
  const draft = useGame((s) => s.draft)!
  const coins = useGame((s) => s.coins)
  const level = useGame((s) => s.level)
  const inventory = useGame((s) => s.inventory)
  const regions = useGame((s) => s.regions)
  const seats = useGame((s) => s.seats)
  const setScreen = useUi((s) => s.setScreen)
  const step = useUi((s) => s.prepStep)
  const setStep = useUi((s) => s.setPrepStep)
  const toast = useUi((s) => s.toast)
  const [confirm, setConfirm] = useState(false)
  const contract = CONTRACT_BY_ID[draft.contractId]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evaluateDesign(evalInputFor(draft)), [draft, coins, inventory, level, regions])
  const calls = goNoGo(ev)
  const noGo = calls.filter((c) => !c.go)
  useEsc(() => (confirm ? setConfirm(false) : setScreen('builder')))

  const orbit = ORBIT_BY_ID[draft.orbitId]
  const rocket = ROCKETS.find((r) => r.id === draft.rocketId) ?? ROCKETS[0]
  const lifts = (capacityKg: number) => Math.round(capacityKg * orbit.capacityFactor)
  const offered = STATIONS.filter((s) => s.passes[draft.orbitId] > 0 || s.id === 'home')
  const passesOf = (id: StationId) => ev.links.find((l) => l.station.id === id)?.passesPerDay ?? STATIONS.find((s) => s.id === id)!.passes[draft.orbitId]
  const totalPasses = ev.links.reduce((n, l) => n + l.passesPerDay, 0)
  const over = ev.mass.kg > ev.mass.capacityKg
  const TimeIcon = Icon[BAR_ICON.time]

  const pickOrbit = (id: OrbitId) => {
    sfx('tap')
    // keep the rocket if it can reach, otherwise switch to the cheapest that can
    const ok = ROCKETS.find((r) => r.id === draft.rocketId)?.orbits.includes(id)
    const next = ok ? draft.rocketId : (ROCKETS.find((r) => r.orbits.includes(id) && level >= r.unlockLevel) ?? ROCKETS.find((r) => r.orbits.includes(id)))!.id
    setDraft({ orbitId: id, rocketId: next })
    useLaunch.getState().setKind(next as RocketKind)
    emit(`orbit.selected:${id}`)
  }

  const launch = () => {
    const blockers = commitLaunch()
    if (blockers) {
      sfx('error')
      toast(blockers[0], 'bad')
    }
  }
  const fix = () => {
    // back to the bay, with the bar that drew the NO-GO pointed out
    useUi.getState().setBuilderFocus(noGo.find((c) => c.bar)?.bar ?? null)
    setScreen('builder')
  }

  // the dishes' labels follow them round the globe
  const labels = useRef<BoardLabels>({ at: {} }).current
  const labelBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const box = labelBox.current
      if (box) {
        const w = box.clientWidth
        const h = box.clientHeight
        for (const el of Array.from(box.children) as HTMLElement[]) {
          const at = labels.at[el.dataset.station as StationId]
          el.style.opacity = at?.show ? '1' : '0'
          if (at) el.style.transform = `translate(${(at.x * w).toFixed(1)}px, ${(at.y * h).toFixed(1)}px)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [labels])

  // one short line each: a folded step is half the column wide
  const summary = [`${orbit.name}, ${orbit.altitudeKm} km`, `Lifts ${lifts(rocket.capacityKg)} kg`, `${totalPasses} passes a day`]
  const caption = [
    `The ring is the orbit. The dots are where it passes over the ground in a day. The glow is the ${contract.region.toLowerCase()}.`,
    over ? 'Too heavy: this rocket cannot lift the satellite to this orbit.' : 'The satellite sits on the scale. It must weigh less than the rocket lifts to this orbit.',
    `Each cone is the sky a dish can see. Together: ${totalPasses} passes a day.`,
  ][step]

  return (
    <div className="flow prep bd" data-ui="prep">
      <header className="flow-head">
        <Btn tone="cream" round sound="close" ui="prep.back" onClick={() => setScreen('builder')} aria-label="Back to the bay">
          <Icon.back style={{ filter: 'invert(0.75)' }} />
        </Btn>
        <div className="plaque">
          <span className="plaque-icon">
            <Icon.rocket />
          </span>
          <h2>Launch Pad</h2>
        </div>
        <Flip text={contract.title.toUpperCase()} className="mission" />
      </header>

      <div className="bd-main">
        {/* the live picture: it answers every choice */}
        <section className="bd-preview" data-ui="prep.preview">
          <BoardPreview mode={step} orbitId={draft.orbitId} rocketId={draft.rocketId} picked={draft.stationIds} contractId={contract.id} labels={labels} />
          <div className="bd-labels" ref={labelBox} aria-hidden>
            {step === 2 &&
              offered.map((s) => (
                <span key={s.id} data-station={s.id} className={draft.stationIds.includes(s.id) ? 'on' : ''}>
                  <b>{s.name}</b> {passesOf(s.id)} a day
                </span>
              ))}
          </div>
          {step === 1 && (
            <div className={`bd-scale${over ? ' over' : ev.bars.mass.status === 'warn' ? ' tight' : ''}`} data-ui="prep.capacity">
              <span className="bd-scale-max">
                The most it lifts here: <b>{Math.round(ev.mass.capacityKg * 10) / 10} kg</b>
              </span>
              <div className="bd-scale-well">
                <i className="bd-scale-red" />
                <em className="bd-scale-tag">max</em>
                {/* the satellite as a weight: the heavier it is, the lower it sinks */}
                <div className="bd-weight" style={{ top: `max(3.9em, ${Math.min(1.16, ev.mass.kg / Math.max(0.1, ev.mass.capacityKg)) * 78}%)` }}>
                  <Icon.satellite />
                  <b>{ev.mass.kg} kg</b>
                </div>
              </div>
              <span className="bd-scale-note">{over ? 'Too heavy for this rocket' : `Your satellite: ${ev.mass.kg} kg`}</span>
            </div>
          )}
          <p className="bd-caption">{caption}</p>
        </section>

        {/* one step's choices at a time; finished steps fold to a line */}
        <section className="bd-steps">
          {STEPS.map((name, i) =>
            i === step ? (
              <div key={name} className="bd-step open" data-ui={`prep.col.${['orbit', 'rocket', 'stations'][i]}`}>
                {/* the way on sits beside the title, so the choices get the height; a folded step is the way back */}
                <div className="bd-head">
                  <h3>
                    <i>{i + 1}</i> {name}
                  </h3>
                  {i < 2 && (
                    <Btn tone="blue" ui="prep.next" onClick={() => setStep(i + 1)}>
                      Next: {STEPS[i + 1]}
                    </Btn>
                  )}
                </div>
                <div className="bd-cards stagger">
                  {i === 0 &&
                    contract.allowedOrbits.map((id) => {
                      const o = ORBIT_BY_ID[id]
                      const locked = level < o.unlockLevel
                      return (
                        <Choice
                          key={id}
                          ui={`prep.orbit.${id}`}
                          on={draft.orbitId === id}
                          locked={locked}
                          onPick={() => pickOrbit(id)}
                          icon={<OrbitGlyph km={o.altitudeKm} />}
                          name={o.name}
                          why={o.card}
                          chips={
                            locked ? (
                              <LockBadge level={o.unlockLevel} />
                            ) : (
                              <>
                                <span className="chip">
                                  <Icon.globe /> {o.altitudeKm} km
                                </span>
                                <span className="chip">
                                  <TimeIcon /> {yearsWords(o.lifetimeYears)}
                                </span>
                                <span className={`chip${o.capacityFactor < 1 ? ' warn' : ' good'}`}>
                                  <Icon.mass /> {o.capacityFactor < 1 ? `${Math.round((1 - o.capacityFactor) * 100)}% less lift` : 'full lift'}
                                </span>
                              </>
                            )
                          }
                        />
                      )
                    })}
                  {i === 1 &&
                    ROCKETS.map((r) => {
                      const reach = r.orbits.includes(draft.orbitId)
                      const needsLevel = level < r.unlockLevel
                      const needsRegion = !needsLevel && r.needsRegion && regions[r.needsRegion].state !== 'active' ? r.needsRegion : null
                      const locked = needsLevel || !!needsRegion || !reach
                      return (
                        <Choice
                          key={r.id}
                          ui={`prep.rocket.${r.id}`}
                          on={draft.rocketId === r.id}
                          locked={locked}
                          onPick={() => {
                            sfx('tap')
                            setDraft({ rocketId: r.id })
                            useLaunch.getState().setKind(r.id as RocketKind)
                            emit(`rocket.selected:${r.id}`)
                          }}
                          icon={<Thumb model={`rocket:${r.id}`} icon="rocket" tint="#bfe3ff" />}
                          name={r.name}
                          why={r.blurb}
                          chips={
                            needsLevel ? (
                              <LockBadge level={r.unlockLevel} />
                            ) : needsRegion ? (
                              <LockBadge text={`Restore the ${REGIONS[needsRegion].name}`} />
                            ) : !reach ? (
                              <span className="chip bad">Can't reach this orbit</span>
                            ) : (
                              <>
                                <span className={`chip${ev.mass.kg > lifts(r.capacityKg) ? ' bad' : ' good'}`}>
                                  <Icon.mass /> lifts {lifts(r.capacityKg)} kg
                                </span>
                                <span className="chip">
                                  <Icon.coin /> {r.price.toLocaleString('en-US')}
                                </span>
                              </>
                            )
                          }
                        />
                      )
                    })}
                  {i === 2 &&
                    offered.map((s) => {
                      const on = draft.stationIds.includes(s.id)
                      const locked = level < s.unlockLevel
                      return (
                        <Choice
                          key={s.id}
                          ui={`prep.station.${s.id}`}
                          on={on}
                          locked={locked || s.id === 'home'}
                          onPick={() => {
                            sfx('tap')
                            setDraft({ stationIds: on ? draft.stationIds.filter((x) => x !== s.id) : [...draft.stationIds, s.id] })
                            emit(`station.toggled:${s.id}`)
                          }}
                          icon={<Icon.dish />}
                          name={s.name}
                          why={s.blurb}
                          chips={
                            locked ? (
                              <LockBadge level={s.unlockLevel} />
                            ) : (
                              <>
                                <span className="chip good">
                                  <Icon.dish /> {passesOf(s.id)} passes a day
                                </span>
                                {s.rent ? (
                                  <span className="chip">
                                    <Icon.coin /> {s.rent.toLocaleString('en-US')}
                                  </span>
                                ) : (
                                  <span className="chip good">Yours</span>
                                )}
                              </>
                            )
                          }
                        />
                      )
                    })}
                </div>
              </div>
            ) : (
              <button key={name} type="button" className={`bd-step fold${i < step ? ' done' : ''}`} data-ui={`prep.step.${i}`} onClick={() => setStep(i)}>
                <i>{i < step ? <Icon.check /> : i + 1}</i>
                <b>{name}</b>
                <span>{summary[i]}</span>
              </button>
            ),
          )}
        </section>
      </div>

      {/* readiness: the four seats, the bill and the launch button */}
      <footer className="bd-ready">
        <div className="bd-seats" data-ui="prep.col.poll">
          {calls.map((c) => {
            const state = c.go ? (c.caution ? 'warn' : 'go') : 'nogo'
            const SI = Icon[SEAT_ICON[c.seat]]
            return (
              <Tip key={c.seat} text={c.reason} className={`bd-seat ${state}`}>
                <span className="bd-face" data-ui={`prep.call.${c.seat}`}>
                  <Portrait id={seats[c.seat] ?? ''} fallback={<SI />} />
                  <i className="lamp" aria-hidden />
                </span>
                <span className="bd-seat-words">
                  <b>{c.seatName}</b>
                  <em>{c.go ? 'GO' : 'NO-GO'}</em>
                </span>
              </Tip>
            )
          })}
        </div>
        <div className="bd-bill" data-ui="prep.bill">
          <small>Bills at launch</small>
          <span>
            <b>
              <Icon.coin /> {ev.cost.cashNeeded.toLocaleString('en-US')}
            </b>
            <span className="chip good">grant +{contract.grant.toLocaleString('en-US')}</span>
          </span>
        </div>
        {!ev.canLaunch ? (
          <Btn tone="red" size="lg" disabled ui="prep.launch">
            {ev.blockers[0] ?? 'Not ready'}
          </Btn>
        ) : noGo.length ? (
          <Btn
            tone="yellow"
            ui={confirm ? 'prep.launch.bar' : 'prep.launch'}
            onClick={() => {
              setConfirm(true)
              emit('launch.pressed')
            }}
          >
            <Icon.alert /> Launch with {noGo.length} NO-GO
          </Btn>
        ) : (
          <Btn tone="red" size="lg" sound="success" ui="prep.launch" onClick={launch}>
            Launch! <Icon.rocket />
          </Btn>
        )}
      </footer>

      {confirm && (
        <div className="bd-confirm-wrap" onClick={() => setConfirm(false)}>
          <div className="bd-confirm" role="dialog" aria-label="Launch with a NO-GO?" data-ui="prep.confirm" onClick={(e) => e.stopPropagation()}>
            <b className="bd-confirm-title">
              <Icon.alert /> {noGo.length === 1 ? 'One seat says NO-GO' : `${noGo.length} seats say NO-GO`}
            </b>
            <ul>
              {noGo.map((c) => (
                <li key={c.seat}>
                  <b>{c.seatName}</b>
                  <span>{c.reason}</span>
                </li>
              ))}
            </ul>
            <div className="bd-confirm-foot">
              <Btn tone="blue" ui="prep.fix" onClick={fix}>
                <Icon.wrench /> Fix it
              </Btn>
              <Btn tone="red" sound="success" ui="prep.launch" onClick={launch}>
                Launch anyway <Icon.rocket />
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
