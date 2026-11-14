import { COMMS_LEVELS, LIFE_DAYS_PER_YEAR } from '../data/economy'
import { LAB_LEVELS, ORDER_BONUS, RAW_TYPES, RAW_UNIT_MB, RECIPE_BY_ID } from '../data/lab'
import type { ItemId, OrderTemplate, ProductId, RawDataType, RecipeDef } from '../data/types'
import type { OrbitProduction } from './simulate'

/**
 * Lab and storage rules: the Hay Day-style production chain built on NASA's
 * data processing levels (raw Level 0 → calibrated Level 1 → mapped Level 3).
 */

export type Inventory = Partial<Record<ItemId, number>>

export function have(inv: Inventory, item: ItemId): number {
  return inv[item] ?? 0
}

/** Raw items sitting in the Comms Center. */
export function rawStored(inv: Inventory): number {
  return RAW_TYPES.reduce((n, t) => n + have(inv, t), 0)
}

export function rawCapacity(commsLevel: number): number {
  return (COMMS_LEVELS.find((l) => l.level === commsLevel) ?? COMMS_LEVELS[0]).rawStorage
}

/** What a recipe still needs, as (item, short-by) pairs. Empty when it can start. */
export function missingInputs(recipe: RecipeDef, inv: Inventory): { item: ItemId; qty: number }[] {
  return recipe.inputs
    .map((i) => ({ item: i.item, qty: i.qty - have(inv, i.item) }))
    .filter((m) => m.qty > 0)
}

export function canStart(recipe: RecipeDef, inv: Inventory): boolean {
  return missingInputs(recipe, inv).length === 0
}

/** Take a recipe's inputs out of the inventory. Returns null if something is missing. */
export function consumeInputs(recipe: RecipeDef, inv: Inventory): Inventory | null {
  if (!canStart(recipe, inv)) return null
  const next: Inventory = { ...inv }
  for (const i of recipe.inputs) next[i.item] = have(next, i.item) - i.qty
  return next
}

export function addItems(inv: Inventory, item: ItemId, qty: number): Inventory {
  return { ...inv, [item]: have(inv, item) + qty }
}

/**
 * Bring raw data down into the Comms Center. Storage is the cap, like a barn:
 * whatever doesn't fit is lost.
 */
export function storeRaw(
  inv: Inventory,
  incoming: Partial<Record<RawDataType, number>>,
  capacity: number,
): { inventory: Inventory; stored: number; lost: number } {
  const next: Inventory = { ...inv }
  let room = Math.max(0, capacity - rawStored(inv))
  let stored = 0
  let lost = 0
  for (const t of RAW_TYPES) {
    const n = Math.floor(incoming[t] ?? 0)
    if (n <= 0) continue
    const fit = Math.min(n, room)
    next[t] = have(next, t) + fit
    room -= fit
    stored += fit
    lost += n - fit
  }
  return { inventory: next, stored, lost }
}

/** Processing time for a recipe at a given lab level, in design seconds. */
export function recipeSeconds(recipe: RecipeDef, labLevel: number): number {
  const lvl = LAB_LEVELS.find((l) => l.level === labLevel) ?? LAB_LEVELS[0]
  return recipe.seconds / lvl.speed
}

export function labSlots(labLevel: number): number {
  return (LAB_LEVELS.find((l) => l.level === labLevel) ?? LAB_LEVELS[0]).slots
}

/** Coins a small order pays: the products' value plus the order bonus. */
export function orderValue(order: Pick<OrderTemplate, 'wants'>): number {
  const base = order.wants.reduce((n, w) => n + RECIPE_BY_ID[w.item].sellsFor * w.qty, 0)
  return Math.round(base * ORDER_BONUS)
}

export function canFillOrder(order: Pick<OrderTemplate, 'wants'>, inv: Inventory): boolean {
  return order.wants.every((w) => have(inv, w.item) >= w.qty)
}

export function fillOrder(order: Pick<OrderTemplate, 'wants'>, inv: Inventory): Inventory | null {
  if (!canFillOrder(order, inv)) return null
  const next: Inventory = { ...inv }
  for (const w of order.wants) next[w.item as ProductId] = have(next, w.item) - w.qty
  return next
}

/**
 * Raw items one in-game day of passes brings down from an orbiting satellite.
 * Fractions carry over through `carry` so slow satellites still add up.
 */
export function dailyRawUnits(
  production: OrbitProduction,
  carry: Partial<Record<RawDataType, number>> = {},
): { units: Partial<Record<RawDataType, number>>; carry: Partial<Record<RawDataType, number>> } {
  const units: Partial<Record<RawDataType, number>> = {}
  const nextCarry: Partial<Record<RawDataType, number>> = {}
  for (const t of RAW_TYPES) {
    const mb = (production.mbPerDay[t] ?? 0) + (carry[t] ?? 0)
    if (mb <= 0) continue
    const whole = Math.floor(mb / RAW_UNIT_MB[t])
    if (whole > 0) units[t] = whole
    nextCarry[t] = mb - whole * RAW_UNIT_MB[t]
  }
  return { units, carry: nextCarry }
}

/** In-game days a satellite keeps working. */
export function lifeDays(lifetimeYears: number): number {
  return Math.max(1, Math.round(lifetimeYears * LIFE_DAYS_PER_YEAR))
}
