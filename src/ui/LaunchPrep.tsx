import { useMemo, useState } from 'react'
import type { RocketKind } from '../art/models/rocket'
import { CONTRACT_BY_ID } from '../data/contracts'
import { ORBIT_BY_ID } from '../data/orbits'
import { REGIONS } from '../data/regions'
import { ROCKETS } from '../data/rockets'
import { STATIONS } from '../data/stations'
import type { OrbitId } from '../data/types'
import { useGame } from '../state/game'
import { useLaunch } from '../state/launch'
import { commitLaunch, evalInputFor, setDraft } from '../state/mission'
import { useUi } from '../state/ui'
import { evaluateDesign, goNoGo } from '../sim'
import { Icon } from './icons'
import { Bar, Btn, LockBadge, Tag, useEsc } from './kit'
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

/** Launch Pad: the launch-control board. Orbit, rocket, ground stations, then the GO / NO-GO poll. */
export function LaunchPrep() {
  const draft = useGame((s) => s.draft)!
  const coins = useGame((s) => s.coins)
  const level = useGame((s) => s.level)
  const inventory = useGame((s) => s.inventory)
  const regions = useGame((s) => s.regions)
  const setScreen = useUi((s) => s.setScreen)
  const toast = useUi((s) => s.toast)
  const [confirm, setConfirm] = useState(false)
  const contract = CONTRACT_BY_ID[draft.contractId]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evaluateDesign(evalInputFor(draft)), [draft, coins, inventory, level, regions])
  const calls = goNoGo(ev)
  const noGo = calls.filter((c) => !c.go)
  useEsc(() => setScreen('builder'))

  const pickOrbit = (id: OrbitId) => {
    sfx('tap')
    // keep the rocket if it can reach, otherwise switch to the cheapest that can
    const ok = ROCKETS.find((r) => r.id === draft.rocketId)?.orbits.includes(id)
    const rocket = ok ? draft.rocketId : (ROCKETS.find((r) => r.orbits.includes(id) && level >= r.unlockLevel) ?? ROCKETS.find((r) => r.orbits.includes(id)))!.id
    setDraft({ orbitId: id, rocketId: rocket })
    useLaunch.getState().setKind(rocket as RocketKind)
    emit(`orbit.selected:${id}`)
  }

  const launch = () => {
    const blockers = commitLaunch()
    if (blockers) {
      sfx('error')
      toast(blockers[0], 'bad')
    }
  }

  return (
    <div className="flow prep" data-ui="prep">
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
        <p className="t-small grow">Pick the orbit, the ride and who listens.</p>
      </header>

      <div className="board3">
        <section data-ui="prep.col.orbit">
          <h3>
            <Flip text="ORBIT" />
          </h3>
          <div className="opts stagger">
            {contract.allowedOrbits.map((id) => {
              const o = ORBIT_BY_ID[id]
              const locked = level < o.unlockLevel
              return (
                <button key={id} type="button" disabled={locked} className={`card opt orbit${draft.orbitId === id ? ' on' : ''}${locked ? ' locked' : ''}`} data-ui={`prep.orbit.${id}`} aria-pressed={draft.orbitId === id} onClick={() => pickOrbit(id)}>
                  <OrbitGlyph km={o.altitudeKm} />
                  <span className="words">
                    <b className="t-label">
                      {o.name} <Flip text={`${o.altitudeKm} KM`} className="small" />
                    </b>
                    {locked ? <LockBadge level={o.unlockLevel} /> : <small className="t-small">{o.card}</small>}
                  </span>
                </button>
              )
            })}
          </div>

        </section>

        <section data-ui="prep.col.rocket">
          <h3>
            <Flip text="ROCKET" />
          </h3>
          <div className="opts rockets stagger">
            {ROCKETS.map((r) => {
              const reach = r.orbits.includes(draft.orbitId)
              const needsLevel = level < r.unlockLevel
              const needsRegion = !needsLevel && r.needsRegion && regions[r.needsRegion].state !== 'active' ? r.needsRegion : null
              const locked = needsLevel || !!needsRegion
              const lifts = Math.round(r.capacityKg * ORBIT_BY_ID[draft.orbitId].capacityFactor)
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={!reach || locked}
                  className={`card opt rocket${draft.rocketId === r.id ? ' on' : ''}${locked || !reach ? ' locked' : ''}`}
                  data-ui={`prep.rocket.${r.id}`}
                  aria-pressed={draft.rocketId === r.id}
                  onClick={() => {
                    sfx('tap')
                    setDraft({ rocketId: r.id })
                    useLaunch.getState().setKind(r.id as RocketKind)
                    emit(`rocket.selected:${r.id}`)
                  }}
                >
                  <Thumb model={`rocket:${r.id}`} icon="rocket" tint="#bfe3ff" />
                  <span className="words">
                    <b className="t-label">{r.name}</b>
                    {needsLevel ? (
                      <LockBadge level={r.unlockLevel} />
                    ) : needsRegion ? (
                      <LockBadge text={`Restore the ${REGIONS[needsRegion].name}`} />
                    ) : !reach ? (
                      <small className="t-small">Can't reach this orbit</small>
                    ) : (
                      <>
                        <span className="lifts">
                          <Bar value={ev.mass.kg / Math.max(0.1, lifts)} tone={ev.mass.kg > lifts ? 'bad' : ev.mass.kg > lifts * 0.9 ? 'warn' : 'ok'} />
                          <small className="t-small">lifts {lifts} kg</small>
                        </span>
                        <Tag amount={r.price} />
                      </>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <div className={`card capacity ${ev.bars.mass.status}`} data-ui="prep.capacity">
            <Icon.mass className="ic" />
            <div className="grow">
              <b className="t-label">
                Satellite {ev.mass.kg} kg <span className="muted">of {Math.round(ev.mass.capacityKg * 10) / 10} kg this rocket lifts here</span>
              </b>
              <Bar value={ev.bars.mass.fill} tone={ev.bars.mass.status} className="thick" />
            </div>
          </div>
        </section>

        <section data-ui="prep.col.stations">
          <h3>
            <Flip text="STATIONS" />
          </h3>
          <div className="opts stagger">
            {STATIONS.filter((s) => s.passes[draft.orbitId] > 0 || s.id === 'home').map((s) => {
              const on = draft.stationIds.includes(s.id)
              const locked = level < s.unlockLevel
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={locked || s.id === 'home'}
                  className={`card opt station${on ? ' on' : ''}${locked ? ' locked' : ''}`}
                  data-ui={`prep.station.${s.id}`}
                  aria-pressed={on}
                  onClick={() => {
                    sfx('tap')
                    setDraft({ stationIds: on ? draft.stationIds.filter((x) => x !== s.id) : [...draft.stationIds, s.id] })
                    emit(`station.toggled:${s.id}`)
                  }}
                >
                  <span className={`tick${on ? ' on' : ''}`}>{on && <Icon.check />}</span>
                  <span className="words">
                    <b className="t-label">{s.name}</b>
                    {locked ? (
                      <LockBadge level={s.unlockLevel} />
                    ) : (
                      <small className="t-small">
                        {ev.links.find((l) => l.station.id === s.id)?.passesPerDay ?? s.passes[draft.orbitId]} passes a day · {s.id === 'home' && regions.tracking.state === 'active' ? 'two dishes, with the Tracking Station' : s.region}
                      </small>
                    )}
                    {s.rent ? <Tag amount={s.rent} /> : <span className="chip good">Yours</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section data-ui="prep.col.poll">
          <h3>
            <Flip text="GO / NO-GO" />
          </h3>
          <div className="poll stagger">
            {calls.map((c) => {
              const state = c.go ? (c.caution ? 'warn' : 'go') : 'nogo'
              return (
                <div key={c.seat} className={`call ${state}`} data-ui={`prep.call.${c.seat}`}>
                  <i className="lamp" aria-hidden />
                  <b className="t-label">{c.seatName}</b>
                  <Flip text={c.go ? 'GO' : 'NO-GO'} className="small" />
                  <small className="t-small">{c.reason}</small>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="flow-foot">
        <div className="bill" data-ui="prep.bill">
          <small className="t-small">Bills at launch</small>
          <b className="t-num">
            <Icon.coin /> {ev.cost.cashNeeded.toLocaleString('en-US')}
          </b>
          <span className="chip good">grant +{contract.grant.toLocaleString('en-US')}</span>
        </div>
        {!ev.canLaunch ? (
          <Btn tone="red" size="lg" disabled ui="prep.launch">
            {ev.blockers[0] ?? 'Not ready'}
          </Btn>
        ) : noGo.length && !confirm ? (
          <Btn
            tone="yellow"
            size="lg"
            ui="prep.launch"
            onClick={() => {
              setConfirm(true)
              emit('launch.pressed')
            }}
          >
            <Icon.alert /> {noGo.length} NO-GO…
          </Btn>
        ) : (
          <Btn tone="red" size="lg" sound="success" ui="prep.launch" onClick={launch}>
            {noGo.length ? 'Launch anyway' : 'Launch!'} <Icon.rocket />
          </Btn>
        )}
      </footer>
    </div>
  )
}
