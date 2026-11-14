import type { PartCategory, PartDef } from '../data/types'
import { Icon, type IconName } from './icons'

export const CATEGORY_ICON: Record<PartCategory, IconName> = {
  bus: 'satellite',
  power: 'bolt',
  comms: 'comms',
  instrument: 'camera',
  computer: 'cpu',
  pointing: 'target',
  propulsion: 'flame',
}

export const CATEGORY_TINT: Record<PartCategory, string> = {
  bus: '#fbe3ac',
  power: '#ffe69a',
  comms: '#d3ecff',
  instrument: '#ffd9cf',
  computer: '#d6f3c2',
  pointing: '#e6dcff',
  propulsion: '#ffe0bd',
}

export function PartIcon({ part, className }: { part: PartDef; className?: string }) {
  const I = Icon[CATEGORY_ICON[part.category]]
  return (
    <span className={`part-icon ${className ?? ''}`} style={{ background: CATEGORY_TINT[part.category] }}>
      <I />
    </span>
  )
}

const mb = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)} GB` : `${n} MB`)

/** The two or three numbers that matter for a part, as short chips. */
export function partStats(p: PartDef): string[] {
  const out: string[] = [`${p.massKg} kg`]
  if (p.solarW) out.push(`+${p.solarW} W in sun`)
  if (p.batteryWh) out.push(`${p.batteryWh} Wh`)
  if (p.loadW) out.push(`−${p.loadW} W`)
  if (p.slots) out.push(`${p.slots} slots`)
  if (p.mbPerPass) out.push(`${mb(p.mbPerPass)}/pass`)
  if (p.storageMb) out.push(`${mb(p.storageMb)} storage`)
  if (p.mbPerDay) out.push(`${mb(p.mbPerDay)}/day`)
  if (p.pointing) out.push(p.pointing === 'fine' ? 'fine pointing' : 'coarse pointing')
  if (p.needsPointing === 'fine') out.push('needs fine pointing')
  if (p.stormProof) out.push('storm-proof')
  if (p.extraLifeYears) out.push(`+${p.extraLifeYears} yr life`)
  return out
}
