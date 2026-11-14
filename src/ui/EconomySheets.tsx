import { useEffect, useState } from 'react'
import { CREW, SEATS, TRAITS } from '../data/crew'
import { ITEM_NAMES, ORDER_TEMPLATES, RAW_TYPES, RAW_UNIT_MB, RECIPES, RECIPE_BY_ID } from '../data/lab'
import { TIPS } from '../data/tutorial'
import type { ItemId, ProductId, SeatId } from '../data/types'
import { WHY_LAB } from '../data/why'
import { canFillOrder, deliverOrder, ensureOrders, orderValue, sellItem, startRecipe } from '../state/economy'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { labSlots, missingInputs, rawCapacity, rawStored } from '../sim'
import { TimerRow } from './BuildingSheet'
import { Icon } from './icons'
import { Btn, Meter, Sheet, formatTime, useNow } from './kit'
import { Portrait } from './Portrait'
import { RoccoSays } from './Rocco'
import { sfx } from './sound'

const at = (e: React.MouseEvent) => {
  const r = document.querySelector('.phone')!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function ItemChip({ item, qty, have }: { item: ItemId; qty: number; have?: number }) {
  const ok = have === undefined || have >= qty
  return (
    <span className={`chip ${have === undefined ? '' : ok ? 'good' : 'bad'}`}>
      {qty}× {ITEM_NAMES[item]}
      {have !== undefined && ` (${have})`}
    </span>
  )
}

/** Science Lab: raw data in, calibrated images and maps out. */
export function LabSheet() {
  const close = useUi((s) => s.close)
  const toast = useUi((s) => s.toast)
  const showTip = useUi((s) => s.showTip)
  const items = useGame((s) => s.items)
  const jobs = useGame((s) => s.labJobs)
  const level = useGame((s) => s.level)
  const lab = useGame((s) => s.buildings.scienceLab.level)
  const [why, setWhy] = useState(false)
  useEffect(() => showTip('lab'), [showTip])
  const products = RECIPES.filter((r) => (items[r.id] ?? 0) > 0)
  return (
    <Sheet title="Science Lab" subtitle={`${jobs.length}/${labSlots(lab)} slots busy · turns raw data into products`} icon={<Icon.flask />} onClose={close} tall>
      <button type="button" className="why-link" onClick={() => setWhy(!why)}>
        <Icon.info /> Why levels? {why ? 'Hide' : ''}
      </button>
      {why && (
        <p className="guide-note">
          {WHY_LAB.rule} {WHY_LAB.basis}
        </p>
      )}
      {jobs.map((j) => (
        <TimerRow key={j.id} label={RECIPE_BY_ID[j.recipeId as ProductId].name} start={j.start} end={j.end} icon={<Icon.flask className="ic" />} />
      ))}
      <p className="eyebrow">On the shelf</p>
      <div className="shelf">
        {RAW_TYPES.map((t) => (
          <span key={t} className="chip blue">
            {items[t] ?? 0}× {ITEM_NAMES[t]}
          </span>
        ))}
        {products.map((r) => (
          <button key={r.id} type="button" className="chip good sell" onClick={(e) => sellItem(r.id, at(e))}>
            {items[r.id]}× {r.name} · sell <Icon.coin /> {r.sellsFor}
          </button>
        ))}
      </div>
      <p className="eyebrow">Recipes</p>
      <div className="part-list">
        {RECIPES.map((r) => {
          const locked = level < r.unlockLevel
          const missing = missingInputs(r, items)
          return (
            <div key={r.id} className={`part-card card${locked ? ' locked' : ''}`}>
              <span className="part-icon" style={{ background: r.dataLevel === 3 ? '#d6f3c2' : '#d3ecff' }}>
                <b>L{r.dataLevel}</b>
              </span>
              <div className="grow">
                <b>{r.name}</b>
                <small>{r.blurb}</small>
                <div className="stats">
                  {r.inputs.map((i) => (
                    <ItemChip key={i.item} item={i.item} qty={i.qty} have={items[i.item] ?? 0} />
                  ))}
                </div>
                {locked ? (
                  <span className="chip warn">
                    <Icon.lock /> Agency level {r.unlockLevel}
                  </span>
                ) : (
                  <div className="buy-row">
                    <Btn
                      size="sm"
                      sound={null}
                      disabled={missing.length > 0}
                      onClick={() => {
                        const err = startRecipe(r.id)
                        if (err) {
                          sfx('error')
                          toast(err, 'bad')
                        }
                      }}
                    >
                      Start · {r.seconds}s
                    </Btn>
                    <span className="chip">
                      <Icon.coin /> sells for {r.sellsFor}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

/** Comms Center status rows: storage and the satellites feeding it. */
export function CommsStatus() {
  const items = useGame((s) => s.items)
  const sats = useGame((s) => s.satellites)
  const lvl = useGame((s) => s.buildings.commsCenter.level)
  const now = useNow(500)
  const cap = rawCapacity(lvl)
  const used = rawStored(items)
  return (
    <>
      <div className="b-row card">
        <Icon.data className="ic" />
        <div className="grow">
          <b>
            Raw data storage: {used} / {cap}
          </b>
          <Meter value={used / cap} tone={used >= cap ? 'bad' : used / cap > 0.8 ? 'warn' : 'ok'} />
          <small>When it is full, new data is lost. Keep the Science Lab busy.</small>
        </div>
      </div>
      {sats.length === 0 && <p className="empty-note">No satellites in orbit yet. Fly a mission and it will keep sending data here.</p>}
      {sats.map((s) => (
        <div key={s.id} className="b-row card">
          <Icon.satellite className="ic" />
          <div className="grow">
            <b>{s.name}</b>
            <small>
              {RAW_TYPES.filter((t) => (s.mbPerDay[t] ?? 0) > 0)
                .map((t) => `${Math.round(((s.mbPerDay[t] ?? 0) / RAW_UNIT_MB[t]) * 10) / 10} ${ITEM_NAMES[t]} a day`)
                .join(' · ')}{' '}
              · {s.daysLeft} days of life left
            </small>
            <Meter value={s.daysLeft / s.daysTotal} tone="blue" />
          </div>
          <span className="chip blue">
            <Icon.clock /> {formatTime(s.nextAt - now)}
          </span>
        </div>
      ))}
    </>
  )
}

/** Small orders: quick jobs filled from lab products. */
export function OrdersList() {
  const orders = useGame((s) => s.orders)
  const items = useGame((s) => s.items)
  const now = useNow(500)
  const showTip = useUi((s) => s.showTip)
  useEffect(() => {
    ensureOrders()
    showTip('order')
  }, [showTip])
  return (
    <div className="contracts">
      {orders.map((o) => {
        const tpl = ORDER_TEMPLATES.find((t) => t.id === o.templateId)!
        const waiting = o.readyAt > now
        return (
          <div key={o.id} className="contract card">
            <div className="c-top">
              <div className="grow">
                <b>{waiting ? 'Next order on its way' : tpl.client}</b>
                <small>{waiting ? `Ready in ${formatTime(o.readyAt - now)}` : 'wants'}</small>
              </div>
              {!waiting && (
                <span className="chip good">
                  <Icon.coin /> {orderValue(tpl)}
                </span>
              )}
            </div>
            {!waiting && (
              <>
                <div className="c-facts">
                  {tpl.wants.map((w) => (
                    <ItemChip key={w.item} item={w.item} qty={w.qty} have={items[w.item] ?? 0} />
                  ))}
                </div>
                <div className="c-foot">
                  <span className="muted">Made in the Science Lab</span>
                  <Btn size="sm" sound={null} disabled={!canFillOrder(tpl, items)} onClick={(e) => deliverOrder(o.id, at(e))}>
                    Deliver
                  </Btn>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

const BEDS = [0, 2, 4]

/** Crew Quarters: every candidate is on the board. Hire, then give each a mission seat. */
export function CrewSheet() {
  const close = useUi((s) => s.close)
  const toast = useUi((s) => s.toast)
  const hired = useGame((s) => s.hired)
  const seats = useGame((s) => s.seats)
  const level = useGame((s) => s.level)
  const crewXp = useGame((s) => s.crewXp)
  const beds = BEDS[useGame((s) => s.buildings.crewQuarters.level)] ?? 4
  const seatOf = (id: string) => (Object.keys(seats) as SeatId[]).find((s) => seats[s] === id)
  const setSeat = (id: string, seat: SeatId | null) => {
    sfx('tap')
    const next = { ...seats }
    for (const s of Object.keys(next) as SeatId[]) if (next[s] === id) delete next[s]
    if (seat) next[seat] = id
    useGame.setState({ seats: next })
  }
  return (
    <Sheet title="Crew Quarters" subtitle={`${hired.length}/${beds} beds · salaries are paid per mission`} icon={<Icon.crew />} onClose={close} tall>
      <div className="part-list">
        {CREW.map((c) => {
          const mine = hired.includes(c.id)
          const locked = level < c.unlockLevel
          const seat = seatOf(c.id)
          return (
            <div key={c.id} className={`part-card card${locked ? ' locked' : ''}`}>
              <Portrait
                id={c.id}
                className="crew-face"
                fallback={
                  <span className="part-icon" style={{ background: mine ? '#d6f3c2' : '#fbe3ac' }}>
                    <Icon.crew />
                  </span>
                }
              />
              <div className="grow">
                <b>
                  {c.name} <span className="owned" style={{ background: '#3e9fe8' }}>{TRAITS[c.trait].name}</span>
                </b>
                <small>
                  {c.bio} {TRAITS[c.trait].blurb}
                </small>
                <div className="stats">
                  {SEATS.map((s) => (
                    <span key={s.id} className={`chip ${c.dreamSeat === s.id ? 'good' : ''}`}>
                      {s.name} {Math.min(9, c.skills[s.id] + (crewXp[`${c.id}:${s.id}`] ?? 0))}
                      {c.dreamSeat === s.id ? ' ★' : ''}
                    </span>
                  ))}
                </div>
                {locked ? (
                  <span className="chip warn">
                    <Icon.lock /> Agency level {c.unlockLevel}
                  </span>
                ) : !mine ? (
                  <div className="buy-row">
                    <Btn
                      size="sm"
                      tone="yellow"
                      disabled={hired.length >= beds}
                      onClick={() => {
                        useGame.setState({ hired: [...hired, c.id] })
                        toast(`${c.name} joined the agency!`, 'good')
                      }}
                    >
                      Hire · <Icon.coin /> {c.salary} a mission
                    </Btn>
                  </div>
                ) : (
                  <div className="seat-row">
                    {SEATS.map((s) => (
                      <button key={s.id} type="button" className={`tab${seat === s.id ? ' on' : ''}`} onClick={() => setSeat(c.id, seat === s.id ? null : s.id)}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="muted" style={{ fontSize: '0.8em', padding: '0.3em' }}>
        ★ marks a dream seat (+2 skill). Science adds science, Spacecraft trims mass, Launch widens the timing window, Ground speeds the downlink.
      </p>
    </Sheet>
  )
}

/** Rocco pops up with a contextual tip (each shown once). */
export function TipHost() {
  const tip = useUi((s) => s.tip)
  const closeTip = useUi((s) => s.closeTip)
  useEffect(() => {
    if (tip) sfx('pop')
  }, [tip])
  if (!tip || !TIPS[tip]) return null
  return <RoccoSays key={tip} text={TIPS[tip].text} mood={TIPS[tip].mood} onNext={closeTip} />
}
