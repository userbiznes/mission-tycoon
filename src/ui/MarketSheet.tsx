import { useEffect, useState } from 'react'
import { PART_CATEGORIES, partsInCategory } from '../data/parts'
import { MATERIALS, REGIONS, REGION_IDS, type MaterialDef } from '../data/regions'
import { TOUR } from '../data/tutorial'
import type { PartCategory, PartDef } from '../data/types'
import { buyNow, goodInfo, orderPart, stockPrice } from '../state/actions'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { BUILDING_ICON, Price, TimerRow } from './BuildingSheet'
import { Icon } from './icons'
import { Btn, Sheet } from './kit'
import { CATEGORY_ICON, PartIcon, partStats } from './parts'
import { PART_BY_ID } from '../data/parts'
import { tourHooks } from './Tour'

/** Set before opening the market to land on a particular stall (the region card sends players to Materials). */
export const marketStart: { tab: PartCategory | 'material' | null } = { tab: null }

const TOUR_BUY = 'camWide'
const TOUR_ORDER = 'batterySmall'

function PartCard({ part, guided }: { part: PartDef; guided: 'buy' | 'order' | null }) {
  const level = useGame((s) => s.level)
  const coins = useGame((s) => s.coins)
  const owned = useGame((s) => s.inventory[part.id] ?? 0)
  const locked = level < part.unlockLevel
  return (
    <div className={`part-card card${locked ? ' locked' : ''}`}>
      <PartIcon part={part} />
      <div className="grow">
        <b>
          {part.name}
          {owned > 0 && <span className="owned">×{owned}</span>}
        </b>
        <small>{part.blurb}</small>
        <div className="stats">
          {partStats(part).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
        {locked ? (
          <span className="chip warn">
            <Icon.lock /> Unlocks at agency level {part.unlockLevel}
          </span>
        ) : (
          <div className="buy-row">
            <Btn tone="yellow" size="sm" sound={null} className={guided === 'buy' ? 'nudge' : ''} disabled={coins < stockPrice(part.id)} onClick={() => buyNow(part.id)}>
              Buy now <Price amount={stockPrice(part.id)} />
            </Btn>
            <Btn tone="blue" size="sm" sound={null} className={guided === 'order' ? 'nudge' : ''} disabled={coins < part.cost} onClick={() => orderPart(part.id, guided === 'order' ? 14 : undefined)}>
              <Icon.boat /> Order <Price amount={part.cost} />
              <i className="wait">{part.deliverySec}s</i>
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

/** A building material: cable, steel, consoles. Restorations are made of these. */
function MaterialCard({ m }: { m: MaterialDef }) {
  const coins = useGame((s) => s.coins)
  const owned = useGame((s) => s.inventory[m.id] ?? 0)
  const regions = useGame((s) => s.regions)
  // how many the ruins waiting to be restored still call for
  const wanted = REGION_IDS.filter((id) => regions[id].state === 'ruins').reduce((n, id) => n + (REGIONS[id].materials.find((x) => x.id === m.id)?.qty ?? 0), 0)
  return (
    <div className="part-card card">
      <span className="part-icon" style={{ background: '#ffe69a' }}>
        {m.id === 'cableSpool' ? <Icon.turn /> : m.id === 'steelBeam' ? <Icon.hammer /> : <Icon.cpu />}
      </span>
      <div className="grow">
        <b>
          {m.name}
          {owned > 0 && <span className="owned">×{owned}</span>}
        </b>
        <small>{m.blurb}</small>
        {wanted > 0 && (
          <div className="stats">
            <span className={`chip ${owned >= wanted ? 'good' : 'warn'}`}>
              {owned >= wanted ? <Icon.check /> : <Icon.wrench />} Restoration needs {wanted}
            </span>
          </div>
        )}
        <div className="buy-row">
          <Btn tone="yellow" size="sm" sound={null} disabled={coins < stockPrice(m.id)} onClick={() => buyNow(m.id)}>
            Buy now <Price amount={stockPrice(m.id)} />
          </Btn>
          <Btn tone="blue" size="sm" sound={null} disabled={coins < m.cost} onClick={() => orderPart(m.id)}>
            <Icon.boat /> Order <Price amount={m.cost} />
            <i className="wait">{m.deliverySec}s</i>
          </Btn>
        </div>
      </div>
    </div>
  )
}

/** Parts Market: buy from stock now (+30%) or order for less and wait for the boat. */
export function MarketSheet() {
  const close = useUi((s) => s.close)
  const deliveries = useGame((s) => s.deliveries)
  const inventory = useGame((s) => s.inventory)
  const tourStep = useGame((s) => s.tourStep)
  const guidedTour = tourStep >= 0 && TOUR[tourStep]?.do === 'shop'
  const [cat, setCat] = useState<PartCategory | 'material'>(() => {
    const start = marketStart.tab
    marketStart.tab = null
    return guidedTour ? 'instrument' : (start ?? 'power')
  })
  const I = Icon[BUILDING_ICON.partsMarket]

  const hasCamera = (inventory[TOUR_BUY] ?? 0) > 0
  const hasBattery = (inventory[TOUR_ORDER] ?? 0) > 0 || deliveries.some((d) => d.partId === TOUR_ORDER)
  // walk the player from the camera stall to the battery stall, then hand back to Rocco
  useEffect(() => {
    if (!guidedTour) return
    if (hasCamera && !hasBattery) setCat('power')
    if (hasCamera && hasBattery) {
      const id = setTimeout(() => {
        close()
        tourHooks.onShopDone?.()
      }, 900)
      return () => clearTimeout(id)
    }
  }, [guidedTour, hasCamera, hasBattery, close])

  const guidedFor = (p: PartDef): 'buy' | 'order' | null =>
    !guidedTour ? null : !hasCamera && p.id === TOUR_BUY ? 'buy' : hasCamera && !hasBattery && p.id === TOUR_ORDER ? 'order' : null

  return (
    <Sheet
      title="Parts Market"
      subtitle="Buy now, or order for less and wait"
      icon={<I />}
      onClose={close}
      tall
      tabs={
        <nav className="stalls">
          {PART_CATEGORIES.map((c) => {
            const CI = Icon[CATEGORY_ICON[c.id]]
            return (
              <button key={c.id} type="button" className={`stall${cat === c.id ? ' on' : ''}`} onClick={() => setCat(c.id)} aria-label={c.name}>
                <CI />
                <span>{c.name}</span>
              </button>
            )
          })}
          <button type="button" className={`stall${cat === 'material' ? ' on' : ''}`} onClick={() => setCat('material')} aria-label="Materials">
            <Icon.hammer />
            <span>Materials</span>
          </button>
        </nav>
      }
    >
      {guidedTour && (
        <p className="guide-note">
          {!hasCamera ? 'Buy the Wide camera now. It costs a bit more, but it is yours right away.' : !hasBattery ? 'Now order a Small battery. Cheaper, and the boat brings it.' : 'Nice shopping!'}
        </p>
      )}
      {deliveries.length > 0 && (
        <div className="deliveries">
          {deliveries.map((d) => (
            <TimerRow key={d.id} label={`On the way: ${goodInfo(d.partId).name}`} start={d.start} end={d.end} icon={<Icon.boat className="ic" />} />
          ))}
        </div>
      )}
      <div className="part-list">
        {cat === 'material' ? (
          <>
            <p className="guide-note">Building materials for restoring the old spaceport's ruins. They are not satellite parts.</p>
            {MATERIALS.map((m) => (
              <MaterialCard key={m.id} m={m} />
            ))}
          </>
        ) : (
          partsInCategory(cat).map((p) => <PartCard key={p.id} part={p} guided={guidedFor(p)} />)
        )}
      </div>
    </Sheet>
  )
}
