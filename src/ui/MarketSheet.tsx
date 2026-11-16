import { useState } from 'react'
import { PART_CATEGORIES, partsInCategory } from '../data/parts'
import { MATERIALS, REGIONS, REGION_IDS, type MaterialDef } from '../data/regions'
import type { PartCategory, PartDef } from '../data/types'
import { buyNow, goodInfo, orderPart, stockPrice } from '../state/actions'
import { useGame, type Delivery } from '../state/game'
import { useUi } from '../state/ui'
import { BUILDING_ICON } from './BuildingSheet'
import { Icon, type IconName } from './icons'
import { LockBadge, PayBtn, Tabs, Tag, Win, formatTime, useNow } from './kit'
import { CATEGORY_ICON, CATEGORY_TINT, partStats } from './parts'
import { Thumb } from './thumbs'
import { tourHooks } from '../tutorial/hooks'

/** Set before opening the market to land on a particular stall (the region card sends players to Materials). */
export const marketStart: { tab: PartCategory | 'material' | null } = { tab: null }

type Stall = PartCategory | 'material'

/** One thing on a shelf: its picture, what it does, and the two ways to get it. */
function ShelfItem({
  id,
  model,
  icon,
  tint,
  name,
  blurb,
  chips,
  owned,
  lockLevel,
  cost,
  deliverySec,
}: {
  id: string
  model: string
  icon: IconName
  tint: string
  name: string
  blurb: string
  chips: React.ReactNode
  owned: number
  lockLevel: number | null
  cost: number
  deliverySec: number
}) {
  return (
    <div className={`card shelf-item${lockLevel ? ' locked' : ''}`} data-ui={`market.item.${id}`}>
      <span className="on-shelf">
        <Thumb model={model} icon={icon} tint={tint} />
        {owned > 0 && <i className="nbadge">×{owned}</i>}
        {!lockLevel && <Tag amount={cost} twine />}
      </span>
      <div className="words">
        <b className="t-label">{name}</b>
        <p className="t-small">{blurb}</p>
        <div className="chips">{chips}</div>
      </div>
      {lockLevel ? (
        <div className="buy">
          <LockBadge level={lockLevel} text="Unlocks at level" />
        </div>
      ) : (
        <div className="buy">
          <PayBtn price={stockPrice(id)} ui={`market.buy.${id}`} onPay={() => buyNow(id)}>
            Buy now
          </PayBtn>
          {/* during the tutorial the boat is quick, so nobody stands around */}
          <PayBtn tone="blue" price={cost} ui={`market.order.${id}`} onPay={() => orderPart(id, tourHooks.orderSeconds?.(id))}>
            <Icon.boat /> Order
            <i className="wait">{deliverySec}s</i>
          </PayBtn>
        </div>
      )}
    </div>
  )
}

function PartItem({ part }: { part: PartDef }) {
  const level = useGame((s) => s.level)
  const owned = useGame((s) => s.inventory[part.id] ?? 0)
  return (
    <ShelfItem
      id={part.id}
      model={`part:${part.id}`}
      icon={CATEGORY_ICON[part.category]}
      tint={CATEGORY_TINT[part.category]}
      name={part.name}
      blurb={part.blurb}
      chips={partStats(part)
        .slice(0, 3)
        .map((s) => (
          <span key={s} className="chip">
            {s}
          </span>
        ))}
      owned={owned}
      lockLevel={level < part.unlockLevel ? part.unlockLevel : null}
      cost={part.cost}
      deliverySec={part.deliverySec}
    />
  )
}

/** A building material: cable, steel, consoles. Restorations are made of these. */
function MaterialItem({ m }: { m: MaterialDef }) {
  const owned = useGame((s) => s.inventory[m.id] ?? 0)
  const regions = useGame((s) => s.regions)
  // how many the ruins waiting to be restored still call for
  const wanted = REGION_IDS.filter((id) => regions[id].state === 'ruins').reduce((n, id) => n + (REGIONS[id].materials.find((x) => x.id === m.id)?.qty ?? 0), 0)
  return (
    <ShelfItem
      id={m.id}
      model={`material:${m.id}`}
      icon="hammer"
      tint="#ffe69a"
      name={m.name}
      blurb={m.blurb}
      chips={
        wanted > 0 ? (
          <span className={`chip ${owned >= wanted ? 'good' : 'warn'}`}>
            {owned >= wanted ? <Icon.check /> : <Icon.wrench />} Restoration needs {wanted}
          </span>
        ) : (
          <span className="chip">For restoring ruins</span>
        )
      }
      owned={owned}
      lockLevel={null}
      cost={m.cost}
      deliverySec={m.deliverySec}
    />
  )
}

/** The boat on its way in: it sails along the track as the order comes due. */
function DeliveryTrack({ d }: { d: Delivery }) {
  const now = useNow(200)
  const k = Math.max(0, Math.min(1, (now - d.start) / Math.max(1, d.end - d.start)))
  return (
    <div className="delivery" data-ui={`market.delivery.${d.id}`}>
      <b className="t-small">{goodInfo(d.partId).name}</b>
      <span className="sea">
        <i className="boat" style={{ left: `${k * 100}%` }}>
          <Icon.boat />
        </i>
      </span>
      <span className="t-num">{formatTime(d.end - now)}</span>
    </div>
  )
}

/** Parts Market: buy from stock now (+30%) or order for less and wait for the boat. */
export function MarketSheet() {
  const close = useUi((s) => s.close)
  const deliveries = useGame((s) => s.deliveries)
  const [cat, setCat] = useState<Stall>(() => {
    const start = marketStart.tab
    marketStart.tab = null
    return start ?? 'power'
  })
  const I = Icon[BUILDING_ICON.partsMarket]

  return (
    <Win
      id="market"
      title="Parts Market"
      icon={<I />}
      onClose={close}
      variant="wide"
      theme="market"
      coins
      tabs={
        <>
          <span className="awning" aria-hidden />
          <Tabs<Stall>
          ui="market.tab"
          icons
          value={cat}
          onChange={setCat}
          tabs={[...PART_CATEGORIES.map((c) => ({ id: c.id as Stall, label: c.name, icon: CATEGORY_ICON[c.id] })), { id: 'material' as Stall, label: 'Materials', icon: 'hammer' as IconName }]}
          />
        </>
      }
    >
      {deliveries.length > 0 && (
        <div className="deliveries" data-ui="market.deliveries">
          <span className="eyebrow">
            <Icon.boat /> On the way
          </span>
          {deliveries.map((d) => (
            <DeliveryTrack key={d.id} d={d} />
          ))}
        </div>
      )}
      {cat === 'material' && <p className="hint-strip plain">Building materials for restoring the old spaceport's ruins. They are not satellite parts.</p>}
      <div className="shelves stagger" key={cat}>
        {cat === 'material' ? MATERIALS.map((m) => <MaterialItem key={m.id} m={m} />) : partsInCategory(cat).map((p) => <PartItem key={p.id} part={p} />)}
      </div>
      <p className="t-small center shelf-foot">
        <b>Buy now</b> takes it off the shelf today. <b>Order</b> costs less, and the boat brings it.
      </p>
    </Win>
  )
}
