import { DECK_TOP } from '../art/models/dock'
import { BUILDINGS } from '../data/buildings'
import { FOOTPRINT, type BuildingId } from '../data/layout'
import { REGIONS, type RegionId } from '../data/regions'
import { CELL, buildingCenter } from '../scene/grid'
import { terrainHeightUv } from '../scene/relief'
import { uvToWorld } from '../scene/world'
import { useGame } from '../state/game'

/**
 * Anchors: the things the tutorial can point at. An anchor is either the
 * stable `data-ui` id of something in the interface ("market.buy.camWide"),
 * or something in the 3D world ("building:missionControl", "region:tracking"),
 * whose bounds are projected onto the screen every frame by <TutorialProbe />.
 */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
  /** corner radius, in px */
  r: number
}

/** World anchors the spotlight wants this frame, and where the probe last saw them (in canvas pixels). */
export const worldProbe: { wanted: Set<string>; rects: Map<string, Rect> } = { wanted: new Set(), rects: new Map() }

export const isWorldAnchor = (a: string) => a.startsWith('building:') || a.startsWith('region:')

const TOP: Partial<Record<BuildingId, number>> = { launchPad: 8.4, commsCenter: 5.6, missionControl: 5.2, partsMarket: 4.4, integrationBay: 4.6, scienceLab: 4.6, crewQuarters: 4, engineeringLab: 4.2 }

/** A world anchor as a box in the world: centre, half-width, base and top. */
export function worldBox(anchor: string): { x: number; z: number; half: number; y0: number; y1: number } | null {
  const [kind, id] = anchor.split(':')
  if (kind === 'building') {
    const at = useGame.getState().placed[id as BuildingId]
    if (!at) return null
    const [x, z] = buildingCenter(id as BuildingId, at)
    const y0 = id === 'partsMarket' ? DECK_TOP : 0
    return { x, z, half: FOOTPRINT[id as BuildingId] * CELL * 0.44, y0, y1: y0 + (TOP[id as BuildingId] ?? 4.4) }
  }
  if (kind === 'region') {
    const def = REGIONS[id as RegionId]
    if (!def) return null
    const [x, z] = uvToWorld(def.sign[0], def.sign[1])
    const y = terrainHeightUv(def.sign[0], def.sign[1])
    return { x, z, half: 1.3, y0: y, y1: y + 3.2 }
  }
  return null
}

/** The name to float over a world anchor. */
export function anchorName(anchor: string): string | null {
  const [kind, id] = anchor.split(':')
  if (kind === 'building') return BUILDINGS[id as BuildingId]?.name ?? null
  if (kind === 'region') return REGIONS[id as RegionId]?.name ?? null
  return null
}

export function anchorElement(anchor: string): HTMLElement | null {
  if (isWorldAnchor(anchor)) return null
  return document.querySelector<HTMLElement>(`[data-ui="${anchor}"]`)
}

/**
 * Where an anchor is on screen, relative to the interface layer, or null if it
 * is not there (or scrolled out of sight). `scroll` brings an interface
 * element into view inside its scrolling panel first.
 */
export function anchorRect(anchor: string, host: DOMRect, scroll = false): Rect | null {
  if (isWorldAnchor(anchor)) {
    worldProbe.wanted.add(anchor)
    return worldProbe.rects.get(anchor) ?? null
  }
  const el = anchorElement(anchor)
  if (!el) return null
  let r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  const cs = getComputedStyle(el)
  if (cs.visibility === 'hidden' || cs.display === 'none') return null
  // clip to the scrolling panel it sits in; if most of it is out of view, bring it in
  let clip = { l: host.left, t: host.top, r: host.right, b: host.bottom }
  let panel: HTMLElement | null = null
  for (let p = el.parentElement; p && !p.classList.contains('ui'); p = p.parentElement) {
    const ps = getComputedStyle(p)
    if (/(auto|scroll|hidden)/.test(ps.overflowY + ps.overflowX)) {
      if (!panel && /(auto|scroll)/.test(ps.overflowY) && p.scrollHeight > p.clientHeight + 1) panel = p
      const pr = p.getBoundingClientRect()
      clip = { l: Math.max(clip.l, pr.left), t: Math.max(clip.t, pr.top), r: Math.min(clip.r, pr.right), b: Math.min(clip.b, pr.bottom) }
    }
  }
  const seenW = Math.min(r.right, clip.r) - Math.max(r.left, clip.l)
  const seenH = Math.min(r.bottom, clip.b) - Math.max(r.top, clip.t)
  if (seenW < r.width * 0.9 || seenH < Math.min(r.height, clip.b - clip.t) * 0.9) {
    if (scroll && panel) {
      // centre it in the panel that scrolls it, and move nothing else
      const pr = panel.getBoundingClientRect()
      panel.scrollTop += r.top + r.height / 2 - (pr.top + pr.height / 2)
      r = el.getBoundingClientRect()
    }
    if (Math.min(r.right, clip.r) - Math.max(r.left, clip.l) < 8 || Math.min(r.bottom, clip.b) - Math.max(r.top, clip.t) < 8) return null
  }
  const l = Math.max(r.left, clip.l)
  const t = Math.max(r.top, clip.t)
  return { x: l - host.left, y: t - host.top, w: Math.min(r.right, clip.r) - l, h: Math.min(r.bottom, clip.b) - t, r: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.height / 2, r.width / 2) }
}
