import { useMemo, useState } from 'react'
import type { RocketKind } from '../art/models/rocket'
import { CONTRACT_BY_ID } from '../data/contracts'
import { ORBIT_BY_ID } from '../data/orbits'
import { ROCKETS } from '../data/rockets'
import { STATIONS } from '../data/stations'
import type { OrbitId } from '../data/types'
import { useGame } from '../state/game'
import { useLaunch } from '../state/launch'
import { commitLaunch, evalInputFor, setDraft } from '../state/mission'
import { useUi } from '../state/ui'
import { evaluateDesign, goNoGo } from '../sim'
import { Icon } from './icons'
import { Btn, Meter } from './kit'
import { sfx } from './sound'

/** Orbit, rocket, ground stations, then the GO / NO-GO poll. */
export function LaunchPrep() {
  const draft = useGame((s) => s.draft)!
  const coins = useGame((s) => s.coins)
  const level = useGame((s) => s.level)
  const inventory = useGame((s) => s.inventory)
  const setScreen = useUi((s) => s.setScreen)
  const toast = useUi((s) => s.toast)
  const [confirm, setConfirm] = useState(false)
  const contract = CONTRACT_BY_ID[draft.contractId]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evaluateDesign(evalInputFor(draft)), [draft, coins, inventory, level])
  const calls = goNoGo(ev)
  const noGo = calls.filter((c) => !c.go)

  const pickOrbit = (id: OrbitId) => {
    sfx('tap')
    // keep the rocket if it can reach, otherwise switch to the cheapest that can
    const ok = ROCKETS.find((r) => r.id === draft.rocketId)?.orbits.includes(id)
    const rocket = ok ? draft.rocketId : (ROCKETS.find((r) => r.orbits.includes(id) && level >= r.unlockLevel) ?? ROCKETS.find((r) => r.orbits.includes(id)))!.id
    setDraft({ orbitId: id, rocketId: rocket })
    useLaunch.getState().setKind(rocket as RocketKind)
  }

  const launch = () => {
    const blockers = commitLaunch()
    if (blockers) {
      sfx('error')
      toast(blockers[0], 'bad')
    }
  }

  return (
    <div className="flow prep">
      <header className="b-head">
        <Btn tone="cream" round sound="close" onClick={() => setScreen('builder')} aria-label="Back to the bay">
          <Icon.back style={{ filter: 'invert(0.75)' }} />
        </Btn>
        <div className="grow">
          <b>Launch prep</b>
          <small>{contract.title}: pick the orbit, the ride and who listens</small>
        </div>
      </header>
      <div className="flow-body">
        <p className="eyebrow">Orbit</p>
        <div className="opts">
          {contract.allowedOrbits.map((id) => {
            const o = ORBIT_BY_ID[id]
            const locked = level < o.unlockLevel
            return (
              <button key={id} type="button" disabled={locked} className={`opt${draft.orbitId === id ? ' on' : ''}`} onClick={() => pickOrbit(id)}>
                <b>
                  {o.name} <i>{o.altitudeKm} km</i>
                </b>
                <small>{locked ? `Unlocks at agency level ${o.unlockLevel}` : o.card}</small>
              </button>
            )
          })}
        </div>

        <p className="eyebrow">Rocket</p>
        <div className="opts row">
          {ROCKETS.map((r) => {
            const reach = r.orbits.includes(draft.orbitId)
            const locked = level < r.unlockLevel
            return (
              <button
                key={r.id}
                type="button"
                disabled={!reach || locked}
                className={`opt${draft.rocketId === r.id ? ' on' : ''}`}
                onClick={() => {
                  sfx('tap')
                  setDraft({ rocketId: r.id })
                  useLaunch.getState().setKind(r.id as RocketKind)
                }}
              >
                <b>{r.name}</b>
                <small>
                  {locked ? `Level ${r.unlockLevel}` : !reach ? "Can't reach this orbit" : `${Math.round(r.capacityKg * ORBIT_BY_ID[draft.orbitId].capacityFactor)} kg here`}
                </small>
                <span className="price">
                  <Icon.coin /> {r.price.toLocaleString('en-US')}
                </span>
              </button>
            )
          })}
        </div>
        <div className="massgauge card">
          <Icon.mass className="ic" />
          <div className="grow">
            <b>
              Satellite {ev.mass.kg} kg <span className="muted">of {Math.round(ev.mass.capacityKg * 10) / 10} kg this rocket lifts here</span>
            </b>
            <Meter value={ev.bars.mass.fill} tone={ev.bars.mass.status} />
          </div>
        </div>

        <p className="eyebrow">Ground stations</p>
        <div className="opts">
          {STATIONS.filter((s) => s.passes[draft.orbitId] > 0 || s.id === 'home').map((s) => {
            const on = draft.stationIds.includes(s.id)
            const locked = level < s.unlockLevel
            return (
              <button
                key={s.id}
                type="button"
                disabled={locked || s.id === 'home'}
                className={`opt station${on ? ' on' : ''}`}
                onClick={() => {
                  sfx('tap')
                  setDraft({ stationIds: on ? draft.stationIds.filter((x) => x !== s.id) : [...draft.stationIds, s.id] })
                }}
              >
                <Icon.dish className="ic" />
                <div className="grow">
                  <b>{s.name}</b>
                  <small>{locked ? `Unlocks at agency level ${s.unlockLevel}` : `${s.passes[draft.orbitId]} passes a day · ${s.region}`}</small>
                </div>
                <span className="price">{s.rent ? <><Icon.coin /> {s.rent}</> : 'Yours'}</span>
              </button>
            )
          })}
        </div>

        <p className="eyebrow">Go / no-go poll</p>
        <div className="poll">
          {calls.map((c) => (
            <div key={c.seat} className={`call ${c.go ? (c.caution ? 'warn' : 'go') : 'nogo'}`}>
              <b>{c.seatName}</b>
              <span>{c.go ? 'GO' : 'NO-GO'}</span>
              <small>{c.reason}</small>
            </div>
          ))}
        </div>
      </div>
      <footer className="flow-foot">
        <div className="bill">
          <small>Bills at launch</small>
          <b>
            <Icon.coin /> {ev.cost.cashNeeded.toLocaleString('en-US')}
          </b>
          <small>grant +{contract.grant.toLocaleString('en-US')}</small>
        </div>
        {!ev.canLaunch ? (
          <Btn tone="red" size="lg" disabled>
            {ev.blockers[0] ?? 'Not ready'}
          </Btn>
        ) : noGo.length && !confirm ? (
          <Btn tone="yellow" size="lg" onClick={() => setConfirm(true)}>
            {noGo.length} NO-GO…
          </Btn>
        ) : (
          <Btn tone="red" size="lg" sound="success" onClick={launch}>
            {noGo.length ? 'Launch anyway' : 'Launch!'} <Icon.rocket />
          </Btn>
        )}
      </footer>
    </div>
  )
}
