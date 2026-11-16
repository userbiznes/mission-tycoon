import { useEffect, useState } from 'react'
import { CREW, SEATS, TRAITS } from '../data/crew'
import { REGIONS } from '../data/regions'
import { ITEM_NAMES, ORDER_TEMPLATES, RAW_TYPES, RAW_UNIT_MB, RECIPES, RECIPE_BY_ID } from '../data/lab'
import { STATIONS } from '../data/stations'
import { TIPS } from '../data/tutorial'
import type { ItemId, ProductId, SeatId } from '../data/types'
import { WHY_LAB } from '../data/why'
import { canFillOrder, deliverOrder, ensureOrders, orderValue, sellItem, startRecipe } from '../state/economy'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { labSlots, missingInputs, rawCapacity, rawStored } from '../sim'
import { Icon } from './icons'
import { Bar, Btn, Empty, LockBadge, Ring, Timer, Tip, Win, formatTime, tapPoint, useNow } from './kit'
import { ITEM_ICON } from './parts'
import { Portrait } from './Portrait'
import { tourHooks } from '../tutorial/hooks'
import { sfx } from './sound'
import { CoachTip } from './Tutorial'

/** A lab item as a little tile: its picture, how many, and (for a recipe) whether there are enough. */
function ItemTile({ item, qty, have, big }: { item: ItemId; qty?: number; have?: number; big?: boolean }) {
  const I = Icon[ITEM_ICON[item]]
  const raw = (RAW_TYPES as readonly string[]).includes(item)
  const short = have !== undefined && qty !== undefined && have < qty
  return (
    <Tip text={`${ITEM_NAMES[item]}${have !== undefined ? `: you have ${have}` : ''}`}>
      <span className={`item-tile${raw ? ' raw' : ''}${short ? ' short' : ''}${big ? ' big' : ''}`}>
        <I />
        {qty !== undefined && <i className={`nbadge${short ? ' red' : ''}`}>{have !== undefined ? `${Math.min(have, 99)}/${qty}` : `×${qty}`}</i>}
      </span>
    </Tip>
  )
}

/** Science Lab: a lab notebook. Raw data in, calibrated images and maps out, on a little production line. */
export function LabSheet() {
  const close = useUi((s) => s.close)
  const toast = useUi((s) => s.toast)
  const showTip = useUi((s) => s.showTip)
  const items = useGame((s) => s.items)
  const jobs = useGame((s) => s.labJobs)
  const level = useGame((s) => s.level)
  const regions = useGame((s) => s.regions)
  const lab = useGame((s) => s.buildings.scienceLab.level)
  const [why, setWhy] = useState(false)
  useEffect(() => showTip('lab'), [showTip])
  const products = RECIPES.filter((r) => (items[r.id] ?? 0) > 0)
  const slots = labSlots(lab)
  return (
    <Win id="lab" title="Science Lab" subtitle="Turns raw data into things clients pay for" icon={<Icon.flask />} onClose={close} variant="wide" theme="lab" coins>
      <div className="lab">
        <section className="lab-line">
          <p className="eyebrow">
            Production line · {jobs.length}/{slots} busy
          </p>
          <div className={`conveyor${jobs.length ? ' running' : ''}`}>
            {Array.from({ length: slots }, (_, i) => {
              const j = jobs[i]
              if (!j)
                return (
                  <div key={i} className="tray free" data-ui={`lab.slot.${i}`}>
                    <Icon.plus />
                    <small className="t-small">Free</small>
                  </div>
                )
              const r = RECIPE_BY_ID[j.recipeId as ProductId]
              const PI = Icon[ITEM_ICON[r.id]]
              return (
                <div key={j.id} className="tray busy" data-ui={`lab.slot.${i}`}>
                  <span className="item-tile">
                    <PI />
                  </span>
                  <small className="t-small">{r.name}</small>
                  <Timer start={j.start} end={j.end} icon={<Icon.flask />} />
                </div>
              )
            })}
          </div>

          <p className="eyebrow">On the shelf</p>
          <div className="stock">
            {RAW_TYPES.map((t) => (
              <div key={t} className="stock-row" data-ui={`lab.stock.${t}`}>
                <ItemTile item={t} />
                <span className="grow t-small">{ITEM_NAMES[t]}</span>
                <b className="t-num">{items[t] ?? 0}</b>
              </div>
            ))}
            {products.map((r) => (
              <div key={r.id} className="stock-row product" data-ui={`lab.stock.${r.id}`}>
                <ItemTile item={r.id} />
                <span className="grow t-small">
                  <b>{items[r.id]}×</b> {r.name}
                </span>
                <Btn size="sm" sound={null} ui={`lab.sell.${r.id}`} onClick={(e) => sellItem(r.id, tapPoint(e))}>
                  Sell <span className="cost">
                    <Icon.coin />
                    {r.sellsFor}
                  </span>
                </Btn>
              </div>
            ))}
            {products.length === 0 && <p className="t-small pad">Nothing made yet. Start a recipe on the right.</p>}
          </div>
        </section>

        <section className="lab-recipes">
          <p className="eyebrow">
            Recipes
            <button type="button" className="why-btn" data-ui="lab.why" aria-expanded={why} onClick={() => setWhy(!why)}>
              <Icon.question /> Why levels?
            </button>
          </p>
          {why && (
            <p className="hint-strip plain">
              {WHY_LAB.rule} {WHY_LAB.basis}
            </p>
          )}
          <div className="recipes stagger">
            {RECIPES.map((r) => {
              const needsLevel = level < r.unlockLevel
              const needsRegion = !needsLevel && r.needsRegion && regions[r.needsRegion].state !== 'active' ? r.needsRegion : null
              const locked = needsLevel || !!needsRegion
              const missing = missingInputs(r, items)
              return (
                <div key={r.id} className={`card recipe${locked ? ' locked' : ''}`} data-ui={`lab.recipe.${r.id}`}>
                  <div className="formula">
                    {r.inputs.map((i) => (
                      <ItemTile key={i.item} item={i.item} qty={i.qty} have={items[i.item] ?? 0} />
                    ))}
                    <span className="arrow" aria-hidden>
                      →
                    </span>
                    <ItemTile item={r.id} big />
                    <span className={`data-level l${r.dataLevel}`}>Level {r.dataLevel}</span>
                  </div>
                  <b className="t-label">{r.name}</b>
                  <p className="t-small">{r.blurb}</p>
                  <footer>
                    {needsLevel ? (
                      <LockBadge level={r.unlockLevel} />
                    ) : needsRegion ? (
                      <LockBadge text={`Restore the ${REGIONS[needsRegion].name}`} />
                    ) : (
                      <Btn
                        sound={null}
                        disabled={missing.length > 0 || jobs.length >= slots}
                        ui={`lab.start.${r.id}`}
                        onClick={() => {
                          const err = startRecipe(r.id)
                          if (err) {
                            sfx('error')
                            toast(err, 'bad')
                          }
                        }}
                      >
                        <Icon.play /> Start · {r.seconds}s
                      </Btn>
                    )}
                    <Tip text="What one sells for">
                      <span className="tag earn">
                        <Icon.coin />
                        {r.sellsFor}
                      </span>
                    </Tip>
                  </footer>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Win>
  )
}

/** An analog dial with a swinging needle. */
function Dial({ value, label, text, blue }: { value: number; label: string; text: string; blue?: boolean }) {
  const k = Math.max(0, Math.min(1, value))
  return (
    <div className="dial" role="img" aria-label={`${label}: ${text}`}>
      <svg viewBox="0 0 100 60">
        <path d="M12 52 A38 38 0 0 1 88 52" fill="none" stroke="#1d2a33" strokeWidth="11" strokeLinecap="round" />
        {blue ? (
          <path d="M12 52 A38 38 0 0 1 88 52" fill="none" stroke="#4ba4e3" strokeWidth="7" strokeLinecap="round" />
        ) : (
          <>
            <path d="M12 52 A38 38 0 0 1 88 52" fill="none" stroke="#e9523b" strokeWidth="7" strokeLinecap="round" />
            <path d="M12 52 A38 38 0 0 1 88 52" fill="none" stroke="#fcc840" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray="82 100" />
            <path d="M12 52 A38 38 0 0 1 88 52" fill="none" stroke="#63bf4f" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray="60 100" />
          </>
        )}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const a = Math.PI * (1 - t)
          return <line key={t} x1={50 + Math.cos(a) * 27} y1={52 - Math.sin(a) * 27} x2={50 + Math.cos(a) * 31} y2={52 - Math.sin(a) * 31} stroke="#fff7e0" strokeWidth="1.6" strokeLinecap="round" />
        })}
        <g className="needle" style={{ transform: `rotate(${-90 + k * 180}deg)` }}>
          <path d="M50 52 L50 19" stroke="#fff7e0" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M50 52 L50 19" stroke="#e9523b" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <circle cx="50" cy="52" r="5.5" fill="#f6c64f" stroke="#4b2f1c" strokeWidth="2" />
      </svg>
      <b className="t-num">{text}</b>
      <small>{label}</small>
    </div>
  )
}

const STATION_AT: Record<string, [number, number]> = { home: [30, 25], equator: [56, 34], north: [52, 9], south: [70, 52], deepSpace: [98, 30] }

/** A small world map: one dot per ground station, lit when the agency may rent it. */
function StationMap() {
  const level = useGame((s) => s.level)
  const open = STATIONS.filter((s) => level >= s.unlockLevel).length
  return (
    <div className="station-map" role="img" aria-label={`${open} of ${STATIONS.length} ground stations in reach`}>
      <svg viewBox="0 0 120 62">
        <rect x="1" y="1" width="118" height="60" rx="8" fill="#17323f" stroke="#0e1f28" strokeWidth="2" />
        <g fill="#2f7f6d" stroke="#3fa58a" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M12 16c6-6 16-7 23-3 4 3 2 8-2 10-3 2-3 6-6 9-3 2-6-1-7-5-2-4-8-3-8-11z" />
          <path d="M33 37c4-1 8 1 8 6s-3 12-7 13c-3-3-4-8-4-12 0-3 1-6 3-7z" />
          <path d="M52 13c5-4 13-3 17 0 3 3-1 6-5 6-3 1-2 4-6 4-4-1-8-6-6-10z" />
          <path d="M55 28c5-2 11 0 12 5 1 6-2 14-6 15-4-2-7-9-7-14 0-3 0-5 1-6z" />
          <path d="M72 12c9-5 24-4 32 1 4 4 0 9-6 10-5 1-6 6-12 6-7-1-12-6-15-10-1-3-1-5 1-7z" />
          <path d="M92 41c4-2 10-1 11 3s-3 7-8 7c-4-1-5-7-3-10z" />
        </g>
        <path d="M2 31h116" stroke="#3b6c7d" strokeWidth="0.6" strokeDasharray="2 2" />
        {STATIONS.map((s) => {
          const [x, y] = STATION_AT[s.id] ?? [60, 31]
          const lit = level >= s.unlockLevel
          return (
            <g key={s.id} className={`st${lit ? ' lit' : ''}${s.id === 'home' ? ' home' : ''}`}>
              {lit && <circle cx={x} cy={y} r="5" className="ping" />}
              <circle cx={x} cy={y} r={s.id === 'home' ? 3.2 : 2.6} />
            </g>
          )
        })}
      </svg>
      <small>
        {open}/{STATIONS.length} stations in reach
      </small>
    </div>
  )
}

/** Comms Center: a radio console. Dials for storage and incoming data, the station map, and each satellite's link. */
export function CommsStatus() {
  const items = useGame((s) => s.items)
  const sats = useGame((s) => s.satellites)
  const lvl = useGame((s) => s.buildings.commsCenter.level)
  const cap = rawCapacity(lvl)
  const used = rawStored(items)
  const perDay = sats.reduce((n, s) => n + RAW_TYPES.reduce((m, t) => m + (s.mbPerDay[t] ?? 0) / RAW_UNIT_MB[t], 0), 0)
  const full = used >= cap
  return (
    <>
      <div className="console" data-ui="comms.console">
        <Dial value={used / cap} label="Storage" text={`${used}/${cap}`} />
        <Dial value={perDay / 12} label="Data a day" text={(Math.round(perDay * 10) / 10).toString()} blue />
        <StationMap />
        <i className={`lamp${full ? ' red' : sats.length ? ' green' : ''}`} aria-hidden />
      </div>
      <div className={`card storage-meter${full ? ' full' : ''}`} data-ui="comms.storage">
        <Icon.data className="ic" />
        <div className="grow">
          <b className="t-label">
            Raw data storage <span className="t-num">{used}</span> / {cap}
          </b>
          <Bar value={used / cap} tone={full ? 'bad' : used / cap > 0.8 ? 'warn' : 'ok'} className="thick" />
          <small className="t-small">{full ? 'Full: new data is being lost. Send some to the lab!' : 'When it is full, new data is lost. Keep the Science Lab busy.'}</small>
        </div>
      </div>
      {sats.length === 0 ? (
        <div className="card">
          <Empty icon="satellite" row>
            No satellites in orbit yet. Fly a mission and it will keep sending data here.
          </Empty>
        </div>
      ) : (
        sats.map((s) => (
          <div key={s.id} className="card lrow sat-row" data-ui={`comms.sat.${s.id}`}>
            <Icon.satellite className="ic" />
            <div className="grow">
              <b className="t-label">{s.name}</b>
              <small className="t-small">
                {RAW_TYPES.filter((t) => (s.mbPerDay[t] ?? 0) > 0)
                  .map((t) => `${Math.round(((s.mbPerDay[t] ?? 0) / RAW_UNIT_MB[t]) * 10) / 10} ${ITEM_NAMES[t]} a day`)
                  .join(' · ')}{' '}
                · {s.daysLeft} days left
              </small>
              <Bar value={s.daysLeft / s.daysTotal} tone="blue" />
            </div>
            <Tip text="Next day of passes">
              <Timer start={s.nextAt - 60000} end={s.nextAt} icon={<Icon.dish />} />
            </Tip>
          </div>
        ))
      )}
    </>
  )
}

/** Small orders: quick jobs filled from lab products, pinned up as sticky notes. */
export function OrdersList() {
  const orders = useGame((s) => s.orders)
  const items = useGame((s) => s.items)
  const now = useNow(500)
  const showTip = useUi((s) => s.showTip)
  useEffect(() => {
    ensureOrders()
    showTip('order')
  }, [showTip])
  if (orders.length === 0)
    return (
      <div className="notes">
        <Empty icon="bag">No orders on the board yet. They turn up once the Science Lab is running.</Empty>
      </div>
    )
  return (
    <div className="notes orders stagger">
      {orders.map((o) => {
        const tpl = ORDER_TEMPLATES.find((t) => t.id === o.templateId)!
        const waiting = o.readyAt > now
        if (waiting)
          return (
            <article key={o.id} className="note order waiting" data-ui={`orders.note.${o.id}`}>
              <Ring p={0.5}>
                <Icon.clock />
              </Ring>
              <b className="t-label">Next order on its way</b>
              <small className="t-small">Ready in {formatTime(o.readyAt - now)}</small>
            </article>
          )
        const ok = canFillOrder(tpl, items)
        return (
          <article key={o.id} className={`note order${ok ? ' ready' : ''}`} data-ui={`orders.note.${o.id}`}>
            <b className="t-label">{tpl.client}</b>
            <small className="t-small">would like</small>
            <div className="wants">
              {tpl.wants.map((w) => (
                <span key={w.item} className="want">
                  <ItemTile item={w.item} qty={w.qty} have={items[w.item] ?? 0} />
                  <span className="t-small">{ITEM_NAMES[w.item]}</span>
                </span>
              ))}
            </div>
            <footer>
              <span className="tag earn">
                <Icon.coin />
                {orderValue(tpl)}
              </span>
              <Btn sound={null} disabled={!ok} ui={`orders.deliver.${o.id}`} onClick={(e) => deliverOrder(o.id, tapPoint(e))}>
                Deliver
              </Btn>
            </footer>
          </article>
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
    <Win id="crew" title="Crew Quarters" subtitle={`${hired.length}/${beds} beds taken · salaries are paid per mission`} icon={<Icon.crew />} onClose={close} variant="wide" theme="roster" coins>
      <div className="roster stagger">
        {CREW.map((c) => {
          const mine = hired.includes(c.id)
          const locked = level < c.unlockLevel
          const seat = seatOf(c.id)
          const skill = (s: SeatId) => Math.min(9, c.skills[s] + (crewXp[`${c.id}:${s}`] ?? 0))
          return (
            <div key={c.id} className={`card crew-card${locked ? ' locked' : ''}${mine ? ' mine' : ''}`} data-ui={`crew.card.${c.id}`}>
              <Portrait
                id={c.id}
                className="crew-face"
                fallback={
                  <span className="thumb crew-face" style={{ '--tint': mine ? '#d6f3c2' : '#fbe3ac' } as React.CSSProperties}>
                    <Icon.crew />
                  </span>
                }
              />
              <div className="words">
                <b className="t-label">
                  {c.name} <span className="trait">{TRAITS[c.trait].name}</span>
                </b>
                <p className="t-small">
                  {c.bio} {TRAITS[c.trait].blurb}
                </p>
              </div>
              <div className="seats">
                {SEATS.map((s) =>
                  mine ? (
                    <button
                      key={s.id}
                      type="button"
                      className={`seat${seat === s.id ? ' on' : ''}${c.dreamSeat === s.id ? ' dream' : ''}`}
                      aria-pressed={seat === s.id}
                      data-ui={`crew.seat.${c.id}.${s.id}`}
                      onClick={() => setSeat(c.id, seat === s.id ? null : s.id)}
                    >
                      {s.name} <b>{skill(s.id)}</b>
                      {c.dreamSeat === s.id && <Icon.star />}
                    </button>
                  ) : (
                    <span key={s.id} className={`seat still${c.dreamSeat === s.id ? ' dream' : ''}`}>
                      {s.name} <b>{skill(s.id)}</b>
                      {c.dreamSeat === s.id && <Icon.star />}
                    </span>
                  ),
                )}
              </div>
              {locked ? (
                <footer>
                  <LockBadge level={c.unlockLevel} />
                </footer>
              ) : !mine ? (
                <footer>
                  <Btn
                    tone="yellow"
                    disabled={hired.length >= beds}
                    ui={`crew.hire.${c.id}`}
                    onClick={() => {
                      useGame.setState({ hired: [...hired, c.id] })
                      toast(`${c.name} joined the agency!`, 'good')
                    }}
                  >
                    Hire
                  </Btn>
                  <span className="t-small salary">
                    <Icon.coin /> {c.salary} a mission{hired.length >= beds ? ' · no free bed' : ''}
                  </span>
                </footer>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="t-small center shelf-foot">
        <Icon.star className="inline-star" /> marks a dream seat (+2 skill). Science adds science, Spacecraft trims mass, Launch widens the timing window, Ground speeds the downlink. Crew portraits are AI-generated.
      </p>
    </Win>
  )
}

/** Rocco pops up with a contextual tip (each shown once): the compact coach in the corner, which never blocks the game. */
export function TipHost() {
  const tip = useUi((s) => s.tip)
  const closeTip = useUi((s) => s.closeTip)
  if (!tip || !TIPS[tip] || tourHooks.tipsMuted?.()) return null
  return <CoachTip key={tip} text={TIPS[tip].text} onDone={closeTip} />
}
