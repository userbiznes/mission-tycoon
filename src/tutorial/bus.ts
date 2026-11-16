/**
 * The tutorial's event bus. The game and the interface announce what just
 * happened ("part.bought:camWide", "why.opened", "orbit.reached"); the
 * tutorial director listens and moves its script on. Nothing else depends on
 * it, so the game runs the same with nobody listening.
 *
 * Events: camera.moved, camera.zoomed, building.clicked:<id>,
 * sheet.opened:<kind>, sheet.closed, screen:<name>, contract.accepted,
 * part.bought:<id>, part.ordered:<id>, delivery.arrived, part.fitted:<id>,
 * part.removed:<id>, why.opened, why.closed, testrun.done, testrun.closed,
 * orbit.selected:<id>, rocket.selected:<id>, station.toggled:<id>,
 * launch.pressed, launch.started, orbit.reached, event.shown,
 * event.resolved, mission.done, debrief.collected, levelup.shown,
 * levelup.closed, tutorial.step:<id>, tutorial.finished, tutorial.skipped.
 */
type Listener = (name: string, detail?: unknown) => void

const listeners = new Set<Listener>()
const last = new Map<string, number>()
/** the most recent events, newest last (the automated play-through reads this) */
export const busLog: { name: string; at: number }[] = []

export function emit(name: string, detail?: unknown): void {
  const at = Date.now()
  last.set(name, at)
  busLog.push({ name, at })
  if (busLog.length > 1200) busLog.splice(0, busLog.length - 1200)
  for (const l of [...listeners]) l(name, detail)
}

export function onBus(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Milliseconds since an event last fired, or null if it never has. */
export function since(name: string): number | null {
  const at = last.get(name)
  return at === undefined ? null : Date.now() - at
}

export function forgetBus(): void {
  last.clear()
}
