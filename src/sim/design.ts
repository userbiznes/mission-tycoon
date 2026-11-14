import { PART_BY_ID } from '../data/parts'
import type { PartDef, PartId, PointingLevel, RawDataType } from '../data/types'
import type { CrewMods } from './crew'
import { round } from './format'

/** A satellite design: one bus plus the parts bolted onto it (duplicates allowed). */
export interface Design {
  busId: PartId | null
  parts: PartId[]
}

export function emptyDesign(): Design {
  return { busId: null, parts: [] }
}

export function countOf(design: Design, partId: PartId): number {
  if (design.busId === partId) return 1
  return design.parts.reduce((n, id) => n + (id === partId ? 1 : 0), 0)
}

/** Every part id in the design, bus first. */
export function allPartIds(design: Design): PartId[] {
  return design.busId ? [design.busId, ...design.parts] : [...design.parts]
}

/** How many of each part the design uses, bus included. */
export function partCounts(design: Design): Record<PartId, number> {
  const counts: Record<PartId, number> = {}
  for (const id of allPartIds(design)) counts[id] = (counts[id] ?? 0) + 1
  return counts
}

export function slotsTotal(design: Design): number {
  return design.busId ? (PART_BY_ID[design.busId]?.slots ?? 0) : 0
}

export function slotsUsed(design: Design): number {
  return design.parts.length
}

/** Add a part (a bus replaces the current bus). Returns a new design; never mutates. */
export function addPart(design: Design, partId: PartId): Design {
  const part = PART_BY_ID[partId]
  if (!part) return design
  if (part.category === 'bus') return { busId: partId, parts: [...design.parts] }
  return { busId: design.busId, parts: [...design.parts, partId] }
}

/** Remove one unit of a part (or the bus). Returns a new design. */
export function removePart(design: Design, partId: PartId): Design {
  if (design.busId === partId) return { busId: null, parts: [...design.parts] }
  const i = design.parts.lastIndexOf(partId)
  if (i < 0) return design
  return { busId: design.busId, parts: design.parts.filter((_, j) => j !== i) }
}

const POINTING_RANK: Record<PointingLevel, number> = { none: 0, coarse: 1, fine: 2 }

export function pointingMeets(have: PointingLevel, need: PointingLevel | undefined): boolean {
  return POINTING_RANK[have] >= POINTING_RANK[need ?? 'none']
}

/** Plain words for the hardware that gives a pointing level. */
export function pointingNeedWords(need: PointingLevel): string {
  return need === 'fine' ? 'reaction wheels' : 'magnetorquers or reaction wheels'
}

export interface InstrumentStatus {
  part: PartDef
  produces: RawDataType
  mbPerDay: number
  /** false when the satellite can't point well enough for it */
  working: boolean
}

/** Everything the engine needs to know about a design, added up once. */
export interface DesignSummary {
  bus: PartDef | null
  /** part definitions, bus excluded, in build order */
  parts: PartDef[]
  slotsUsed: number
  slotsTotal: number
  /** total mass after the Spacecraft seat's mass saving */
  massKg: number
  /** mass before crew savings */
  rawMassKg: number
  /** average electrical load, W */
  loadW: number
  /** generation in sunlight, W */
  solarW: number
  batteryWh: number
  pointing: PointingLevel
  /** all radios on board, best first */
  radios: PartDef[]
  /** the fastest radio the satellite can actually aim, or null */
  radio: PartDef | null
  computers: PartDef[]
  storageMb: number
  stormProof: boolean
  instruments: InstrumentStatus[]
  extraLifeYears: number
  /** months of build time from the parts alone */
  partBuildMonths: number
  /** sum of list (order) prices */
  listCost: number
}

export function summarize(design: Design, mods?: Pick<CrewMods, 'massMult'>): DesignSummary {
  const bus = design.busId ? (PART_BY_ID[design.busId] ?? null) : null
  const parts = design.parts.map((id) => PART_BY_ID[id]).filter((p): p is PartDef => !!p)
  const all = bus ? [bus, ...parts] : parts
  const sum = (pick: (p: PartDef) => number | undefined) => all.reduce((n, p) => n + (pick(p) ?? 0), 0)

  let pointing: PointingLevel = 'none'
  for (const p of parts) {
    if (p.pointing && POINTING_RANK[p.pointing] > POINTING_RANK[pointing]) pointing = p.pointing
  }
  const radios = parts.filter((p) => p.category === 'comms').sort((a, b) => (b.mbPerPass ?? 0) - (a.mbPerPass ?? 0))
  const radio = radios.find((r) => pointingMeets(pointing, r.needsPointing)) ?? null
  const computers = parts.filter((p) => p.category === 'computer')
  const instruments: InstrumentStatus[] = parts
    .filter((p) => p.category === 'instrument' && p.produces)
    .map((p) => ({
      part: p,
      produces: p.produces as RawDataType,
      mbPerDay: p.mbPerDay ?? 0,
      working: pointingMeets(pointing, p.needsPointing),
    }))
  const rawMassKg = sum((p) => p.massKg)

  return {
    bus,
    parts,
    slotsUsed: parts.length,
    slotsTotal: bus?.slots ?? 0,
    massKg: round(rawMassKg * (mods?.massMult ?? 1), 3),
    rawMassKg: round(rawMassKg, 3),
    loadW: round(sum((p) => p.loadW), 3),
    solarW: round(sum((p) => p.solarW), 3),
    batteryWh: round(sum((p) => p.batteryWh), 3),
    pointing,
    radios,
    radio,
    computers,
    storageMb: sum((p) => p.storageMb),
    stormProof: computers.length > 0 && computers.some((c) => !!c.stormProof),
    instruments,
    extraLifeYears: sum((p) => p.extraLifeYears),
    partBuildMonths: round(sum((p) => p.buildMonths), 3),
    listCost: sum((p) => p.cost),
  }
}
