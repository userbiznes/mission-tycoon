import { ORBIT_DAY_SEC } from '../data/economy'
import { ITEM_NAMES, ORDER_REFILL_SEC, ORDER_TEMPLATES, ORDER_XP_PER_ITEM, RAW_TYPES, RECIPE_BY_ID } from '../data/lab'
import type { ItemId, ProductId } from '../data/types'
import { juice } from '../scene/juice'
import { canFillOrder, consumeInputs, dailyRawUnits, fillOrder, labSlots, orderValue, rawCapacity, recipeSeconds, storeRaw } from '../sim'
import { sfx } from '../ui/sound'
import { onTimer } from './actions'
import { useGame, type OrderRec } from './game'
import { toMs } from './time'
import { useUi } from './ui'

/** The economy loop: satellites send raw data, the lab turns it into products, orders pay for them. */

export function orderSlots(): number {
  const lvl = useGame.getState().buildings.missionControl.level
  return lvl >= 3 ? 4 : lvl === 2 ? 3 : 2
}

function pickTemplate(skip: string[]): string {
  const level = useGame.getState().level
  const pool = ORDER_TEMPLATES.filter((t) => t.unlockLevel <= level)
  const fresh = pool.filter((t) => !skip.includes(t.id))
  const from = fresh.length ? fresh : pool
  return from[Math.floor(Math.random() * from.length)].id
}

/** Make sure the order board has one order per slot. */
export function ensureOrders() {
  const g = useGame.getState()
  const want = orderSlots()
  if (g.orders.length >= want) return
  const orders: OrderRec[] = [...g.orders]
  while (orders.length < want) {
    orders.push({ id: `o${Date.now()}${orders.length}`, templateId: pickTemplate(orders.map((o) => o.templateId)), readyAt: 0 })
  }
  useGame.setState({ orders })
}

export function deliverOrder(orderId: string, at?: { x: number; y: number }) {
  const g = useGame.getState()
  const order = g.orders.find((o) => o.id === orderId)
  if (!order) return
  const tpl = ORDER_TEMPLATES.find((t) => t.id === order.templateId)!
  const items = fillOrder(tpl, g.items)
  if (!items) {
    sfx('error')
    return
  }
  const count = tpl.wants.reduce((n, w) => n + w.qty, 0)
  useGame.setState({
    items,
    orders: g.orders.map((o) =>
      o.id === orderId ? { ...o, templateId: pickTemplate(g.orders.map((x) => x.templateId)), readyAt: Date.now() + toMs(ORDER_REFILL_SEC) } : o,
    ),
  })
  useGame.getState().addCoins(orderValue(tpl))
  useGame.getState().addXp(count * ORDER_XP_PER_ITEM)
  sfx('success')
  if (at) {
    useUi.getState().fly('coin', 6, at.x, at.y)
    useUi.getState().fly('xp', 2, at.x, at.y)
  }
}

export function startRecipe(recipeId: ProductId): string | null {
  const g = useGame.getState()
  const lab = g.buildings.scienceLab.level
  if (lab < 1) return 'Build the Science Lab first'
  if (g.labJobs.length >= labSlots(lab)) return 'Every lab slot is busy'
  const recipe = RECIPE_BY_ID[recipeId]
  const items = consumeInputs(recipe, g.items)
  if (!items) return 'Not enough data yet'
  const now = Date.now()
  useGame.setState({
    items,
    labJobs: [...g.labJobs, { id: `j${now}`, recipeId, start: now, end: now + toMs(recipeSeconds(recipe, lab)) }],
  })
  sfx('snap')
  juice('scienceLab', 'wobble')
  return null
}

export function sellItem(item: ProductId, at?: { x: number; y: number }) {
  const g = useGame.getState()
  if ((g.items[item] ?? 0) < 1) return
  useGame.setState({ items: { ...g.items, [item]: (g.items[item] ?? 0) - 1 } })
  useGame.getState().addCoins(RECIPE_BY_ID[item].sellsFor)
  sfx('coin')
  if (at) useUi.getState().fly('coin', 2, at.x, at.y)
}

export { canFillOrder, orderValue }

onTimer((e) => {
  if (e.kind !== 'tick') return
  const g = useGame.getState()
  const now = e.now

  // lab jobs finish
  const done = g.labJobs.filter((j) => now >= j.end)
  if (done.length) {
    const items = { ...g.items }
    for (const j of done) items[j.recipeId as ItemId] = (items[j.recipeId as ItemId] ?? 0) + 1
    useGame.setState({ items, labJobs: g.labJobs.filter((j) => now < j.end) })
    useUi.getState().toast(`Lab finished: ${done.map((j) => ITEM_NAMES[j.recipeId as ItemId]).join(', ')}`, 'good')
    sfx('success')
    juice('scienceLab', 'pop')
  }

  // every in-game day, each satellite in orbit sends its raw data home
  const due = useGame.getState().satellites.filter((s) => now >= s.nextAt)
  if (due.length) {
    const s0 = useGame.getState()
    let items = s0.items
    let stored = 0
    let lost = 0
    const cap = rawCapacity(s0.buildings.commsCenter.level)
    const sats = s0.satellites
      .map((sat) => {
        if (now < sat.nextAt) return sat
        const { units, carry } = dailyRawUnits({ mbPerDay: sat.mbPerDay, lifetimeYears: 0 }, sat.carry)
        const r = storeRaw(items, units, cap)
        items = r.inventory
        stored += r.stored
        lost += r.lost
        return { ...sat, carry, daysLeft: sat.daysLeft - 1, nextAt: now + toMs(ORBIT_DAY_SEC) }
      })
    const retired = sats.filter((s) => s.daysLeft <= 0)
    useGame.setState({ items, satellites: sats.filter((s) => s.daysLeft > 0) })
    const ui = useUi.getState()
    if (stored > 0) {
      ui.toast(`Downlink: +${stored} raw data`, 'good')
      juice('commsCenter', 'wobble')
      sfx('coin')
    }
    if (lost > 0) {
      ui.toast(`Storage full: ${lost} raw data lost`, 'bad')
      ui.showTip('storage')
    }
    for (const s of retired) ui.toast(`${s.name} has reached the end of its orbital life`)
  }

  // order slots refill
  if (g.orders.some((o) => o.readyAt && now >= o.readyAt)) {
    useGame.setState({ orders: useGame.getState().orders.map((o) => (o.readyAt && now >= o.readyAt ? { ...o, readyAt: 0 } : o)) })
  }
})

export function rawTotal(): number {
  const items = useGame.getState().items
  return RAW_TYPES.reduce((n, t) => n + (items[t] ?? 0), 0)
}
