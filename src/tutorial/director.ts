import { create } from 'zustand'
import type { BuildingId } from '../data/layout'
import { HARBOUR_VIEW } from '../scene/grid'
import { rig } from '../scene/cameraRig'
import { juice } from '../scene/juice'
import { planMission } from '../sim/simulate'
import { evaluateDesign } from '../sim'
import { focusBuilding } from '../state/actions'
import { LEVEL_XP, useGame } from '../state/game'
import { useLaunch } from '../state/launch'
import { acceptContract, endMission, evalInputFor, setDraft, useMission } from '../state/mission'
import { focusRegion } from '../state/regions'
import { useUi } from '../state/ui'
import { marketStart } from '../ui/MarketSheet'
import { sfx } from '../ui/sound'
import { anchorElement, isWorldAnchor, worldProbe } from './anchors'
import { emit, forgetBus, onBus, since } from './bus'
import { tourHooks } from './hooks'
import { FIRST_STEP, STARTER_COINS, STARTER_FITTED, STARTER_STORE, STEPS, STEP_BY_ID, TUTORIAL_CONTRACT, TUTORIAL_ORDER_SECONDS, type CameraTarget, type Ctx, type Step } from './steps'

/**
 * The TutorialDirector: a small state machine that walks the script in
 * steps.ts. It decides which step is up, when it is finished (a bus event or
 * a condition), what must be open for it, and where to pick up again after a
 * reload. How a step looks is the interface's business (ui/Tutorial.tsx).
 *
 * Progress is saved after every step in the save's free-form bag
 * (`ext.tutorial`), so a reload resumes at the start of the current step.
 */

interface Saved {
  step?: string
  done?: 'finished' | 'skipped'
  collapsed?: boolean
  /** the starter parts have been handed over */
  kit?: boolean
  /** the first-flight XP bonus has been paid */
  bonus?: boolean
  /** a level-up earned during the flight, waiting for the graduation */
  held?: { level: number; unlocks: string[] }
  startedAt?: number
  finishedAt?: number
}

interface TutState {
  active: boolean
  stepId: string | null
  /** Esc: the tutorial waits, with Resume and Skip */
  paused: boolean
  /** counts wrong clicks and idle prods: the hand jabs again when it changes */
  nudge: number
  /** one passing line from Rocco ("Over here, Maya!"), shown instead of the step's line for a moment */
  note: string | null
  /** 0 fresh · 1 the hand has clicked again (8 s) · 2 Rocco has rephrased (20 s) */
  idle: 0 | 1 | 2
  /** the spotlight is on the step's "via" (a tab that has to be opened first) */
  via: boolean
  /** a way out has appeared on a step that is taking too long */
  escape: boolean
  collapsed: boolean
  /** when the tutorial was finished in this session: the checklist shows its stamp for a while */
  completedAt: number | null
  /** "Show me" from the goal tracker: the hand points at this for a few seconds */
  pointer: { anchor: string; until: number } | null
}

export const useTutorial = create<TutState>(() => ({
  active: false,
  stepId: null,
  paused: false,
  nudge: 0,
  note: null,
  idle: 0,
  via: false,
  escape: false,
  collapsed: false,
  completedAt: null,
  pointer: null,
}))

// ------------------------------------------------------------------ run-time notes (not saved)
let stepStart = 0
let lastAction = 0
let camAt = { u: 0, v: 0, width: 0 }
let wrongClicks = 0
let camSaid = { moved: false, zoomed: false }
let noteTimer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null

const saved = (): Saved => (useGame.getState().ext.tutorial as Saved | undefined) ?? {}
const save = (patch: Partial<Saved>) => useGame.getState().setExt('tutorial', { ...saved(), ...patch })

export const currentStep = (): Step | null => {
  const t = useTutorial.getState()
  return t.active && t.stepId ? (STEP_BY_ID[t.stepId] ?? null) : null
}
const targetsOf = (s: Step | null): string[] => (!s?.target ? [] : Array.isArray(s.target) ? s.target : [s.target])

/** Is this anchor on screen right now? */
function has(anchor: string): boolean {
  if (isWorldAnchor(anchor)) return worldProbe.rects.has(anchor)
  const el = anchorElement(anchor)
  return !!el && el.getBoundingClientRect().width > 1
}

export function tutorialCtx(): Ctx {
  const game = useGame.getState()
  const ui = useUi.getState()
  return {
    name: game.player.name || 'Chief',
    agency: game.player.agency || 'the agency',
    game,
    screen: ui.screen,
    sheet: ui.sheet?.kind ?? null,
    has,
    since,
    moved: Math.hypot(rig.goalU - camAt.u, rig.goalV - camAt.v) > 1.2,
    zoomed: Math.abs(rig.goalWidth - camAt.width) > camAt.width * 0.06,
    launchPhase: useLaunch.getState().phase,
    elapsed: Date.now() - stepStart,
  }
}

// ------------------------------------------------------------------ the starter kit and other help
/** The parts the old crew left in the storeroom, and enough coins to finish. */
function grantKit() {
  const g = useGame.getState()
  const inventory = { ...g.inventory }
  for (const [id, n] of Object.entries(STARTER_STORE)) inventory[id] = Math.max(inventory[id] ?? 0, n)
  useGame.setState({ inventory, coins: Math.max(g.coins, STARTER_COINS) })
  save({ kit: true })
}

/** Make sure the mission on the bench exists, with at least the parts the old crew left fitted. */
function ensureDraft(screen: 'builder' | 'launchPrep' | null) {
  if (useGame.getState().draft) return
  acceptContract(TUTORIAL_CONTRACT)
  setDraft({ design: { busId: 'bus3u', parts: [...STARTER_FITTED] } })
  useUi.getState().setScreen(screen)
}

/** After a reload in the middle of a flight: put back the parts and the coins the lost launch used up. */
function topUpForLaunch() {
  ensureDraft(null)
  const g = useGame.getState()
  const draft = g.draft
  if (!draft) return
  const need: Record<string, number> = {}
  if (draft.design.busId) need[draft.design.busId] = 1
  for (const id of draft.design.parts) need[id] = (need[id] ?? 0) + 1
  const inventory = { ...g.inventory }
  for (const [id, n] of Object.entries(need)) inventory[id] = Math.max(inventory[id] ?? 0, n)
  useGame.setState({ inventory })
  const cash = evaluateDesign(evalInputFor(draft)).cost.cashNeeded
  if (useGame.getState().coins < cash + 100) useGame.setState({ coins: cash + 100 })
}

// ------------------------------------------------------------------ scene and camera
function sceneOk(step: Step): boolean {
  const s = step.scene
  if (!s) return true
  const ui = useUi.getState()
  if ('screen' in s && ui.screen !== s.screen) return false
  if ('sheet' in s && (ui.sheet?.kind ?? null) !== s.sheet) return false
  if (s.prepStep !== undefined && ui.prepStep !== s.prepStep) return false
  return true
}

/** Open what the step needs. Returns false when it cannot be restored (a flight that is no longer running). */
function ensureScene(step: Step): boolean {
  const s = step.scene
  if (!s) return true
  const ui = useUi.getState()
  // (closing a region card also closes any sheet, so it goes first)
  if (ui.regionCard) ui.openRegion(null)
  if ('screen' in s && ui.screen !== s.screen) {
    if (s.screen === 'launch' || s.screen === 'ops' || s.screen === 'debrief') return false
    if (s.screen === 'builder' || s.screen === 'launchPrep') {
      ensureDraft(s.screen)
      ui.close()
    }
    useUi.getState().setScreen(s.screen ?? null)
  }
  if ('sheet' in s && (useUi.getState().sheet?.kind ?? null) !== s.sheet) {
    if (s.sheet === 'market') {
      marketStart.tab = (s.marketTab as typeof marketStart.tab) ?? null
      useUi.getState().open({ kind: 'market' })
    } else if (s.sheet === 'contracts') useUi.getState().open({ kind: 'contracts' })
    else useUi.getState().close()
  }
  // the launch board opens on the page this step talks about
  if (s.prepStep !== undefined) useUi.getState().setPrepStep(s.prepStep)
  return true
}

const FRAME: Partial<Record<BuildingId, number>> = { missionControl: 36, partsMarket: 38, integrationBay: 36 }

function moveCamera(target: CameraTarget | undefined) {
  if (!target) return
  rig.stopCinematic(0)
  if (target === 'home') rig.home()
  else if (target === 'harbour') rig.flyTo(HARBOUR_VIEW[0], HARBOUR_VIEW[1], 34)
  else if ('building' in target) focusBuilding(target.building, 0, FRAME[target.building] ?? 36, 0)
  else focusRegion(target.region, 0)
}

// ------------------------------------------------------------------ walking the script
function say(text: string, ms = 2600) {
  if (noteTimer) clearTimeout(noteTimer)
  useTutorial.setState({ note: text })
  noteTimer = setTimeout(() => useTutorial.setState({ note: null }), ms)
}

function enter(id: string) {
  const step = STEP_BY_ID[id]
  if (!step) return finish('finished')
  stepStart = lastAction = Date.now()
  camAt = { u: rig.goalU, v: rig.goalV, width: rig.goalWidth }
  if (noteTimer) clearTimeout(noteTimer)
  useTutorial.setState({ active: true, stepId: id, idle: 0, via: false, escape: false, note: null, paused: false })
  save({ step: id })
  if (!ensureScene(step) && step.resume) return enter(step.resume)
  moveCamera(step.camera)
  rig.locked = !(step.allow === 'camera' || step.allow === 'all')
  // chapter by chapter side effects
  camSaid = { moved: false, zoomed: false }
  if (id === 'c8.levelup') {
    // every box is ticked: fold the list away (one click opens it again)
    setCollapsed(true)
    const held = saved().held
    if (held) {
      save({ held: undefined, bonus: true })
      setTimeout(() => useUi.getState().showLevelUp(held.level, held.unlocks), 700)
    } else if (!saved().bonus) {
      save({ bonus: true })
      const g = useGame.getState()
      // the first-flight bonus: enough XP to reach level 2, so the level-up plays
      if (g.level < 2) g.addXp(Math.max(0, LEVEL_XP[1] - g.xp))
    }
  }
  step.enter?.(tutorialCtx())
  emit(`tutorial.step:${id}`)
}

/** The step after this one that applies right now. */
function nextId(id: string): string | null {
  let i = STEPS.findIndex((s) => s.id === id)
  const c = tutorialCtx()
  for (i += 1; i < STEPS.length; i++) if (!STEPS[i].skipIf?.(c)) return STEPS[i].id
  return null
}

/** Finish the current step and move on. */
export function advance() {
  const t = useTutorial.getState()
  if (!t.active || !t.stepId) return
  const next = nextId(t.stepId)
  if (next) enter(next)
  else finish('finished')
}

function finish(how: 'finished' | 'skipped') {
  if (ticker) clearInterval(ticker)
  ticker = null
  rig.locked = false
  useTutorial.setState({ active: false, stepId: null, paused: false, note: null, via: false, completedAt: how === 'finished' ? Date.now() : null })
  useGame.getState().setTourStep(-1)
  save({ done: how, finishedAt: Date.now() })
  emit(`tutorial.${how}`)
}

function tick() {
  const t = useTutorial.getState()
  const step = currentStep()
  if (!step || t.paused) return
  const c = tutorialCtx()
  if (c.moved && !camSaid.moved) {
    camSaid.moved = true
    emit('camera.moved')
  }
  if (c.zoomed && !camSaid.zoomed) {
    camSaid.zoomed = true
    emit('camera.zoomed')
  }
  if (step.doneWhen?.(c)) return advance()
  // wandered off, or closed something early: one line, and back to it
  if (!sceneOk(step) && c.elapsed > 500) {
    if (!ensureScene(step)) {
      if (step.resume) enter(step.resume)
      return
    }
    say(`Let's get back to it, ${c.name}.`)
  }
  const idleFor = Date.now() - Math.max(stepStart, lastAction)
  if (step.type === 'do') {
    if (idleFor > 20000 && t.idle < 2) useTutorial.setState({ idle: 2 })
    else if (idleFor > 8000 && t.idle < 1) useTutorial.setState({ idle: 1, nudge: t.nudge + 1 })
  }
  if (step.escapeAfter && c.elapsed > step.escapeAfter && !t.escape) useTutorial.setState({ escape: true })
  if (t.pointer && Date.now() > t.pointer.until) useTutorial.setState({ pointer: null })
}

function run(id: string) {
  if (ticker) clearInterval(ticker)
  ticker = setInterval(tick, 150)
  enter(id)
}

// ------------------------------------------------------------------ what the player and the settings can do
/**
 * The agency levelled up. During the first flight the banner waits for the
 * graduation, so it never lands on top of the debrief. Returns true when the
 * tutorial is holding it.
 */
export function holdLevelUp(level: number, unlocks: string[]): boolean {
  const step = currentStep()
  if (!step || step.chapter >= 8) return false
  save({ held: { level, unlocks } })
  return true
}

/** A click that missed the target during a do step. */
export function wrongClick() {
  const t = useTutorial.getState()
  const step = currentStep()
  if (!step || step.type !== 'do') return
  lastAction = Date.now()
  wrongClicks += 1
  sfx('tap')
  useTutorial.setState({ nudge: t.nudge + 1 })
  if (wrongClicks === 1 || wrongClicks % 4 === 0) say(`Over here, ${tutorialCtx().name}!`, 2200)
}

export function setPaused(paused: boolean) {
  if (useTutorial.getState().active) useTutorial.setState({ paused })
}

export function setCollapsed(collapsed: boolean) {
  useTutorial.setState({ collapsed })
  save({ collapsed })
}

export function skipTutorial() {
  if (!useTutorial.getState().active) {
    // not started yet, or between sessions: mark it done all the same
    useGame.getState().setTourStep(-1)
    save({ done: 'skipped' })
    return
  }
  finish('skipped')
}

/** Start again from the welcome, whatever the agency has been up to since. */
export function replayTutorial() {
  const ui = useUi.getState()
  if (ui.screen) endMission(false)
  useUi.getState().openRegion(null)
  useUi.getState().close()
  useGame.setState({ draft: null })
  useGame.getState().setTourStep(0)
  useGame.getState().setExt('tutorial', { startedAt: Date.now() } satisfies Saved)
  wrongClicks = 0
  forgetBus()
  useTutorial.setState({ completedAt: null, collapsed: false })
  grantKit()
  run(FIRST_STEP)
}

/** "Show me" from the goal tracker: go there and point the hand at the thing for a few seconds. */
export function showMe(target: { camera?: CameraTarget; open?: 'contracts' | 'market' | 'lab' | 'crew'; marketTab?: string; anchor: string }) {
  const ui = useUi.getState()
  if (ui.regionCard) ui.openRegion(null)
  if (target.open === 'market') marketStart.tab = (target.marketTab as typeof marketStart.tab) ?? null
  if (target.open) ui.open({ kind: target.open })
  else ui.close()
  rig.locked = false
  moveCamera(target.camera)
  useTutorial.setState({ pointer: { anchor: target.anchor, until: Date.now() + 7000 } })
  if (!ticker) ticker = setInterval(tick, 150)
}
export function clearPointer() {
  if (useTutorial.getState().pointer) useTutorial.setState({ pointer: null })
}

/** Pick up where the save left off (called when the game reaches the base). */
function resume() {
  const g = useGame.getState()
  if (useTutorial.getState().active || g.phase !== 'play') return
  const s = saved()
  if (g.tourStep < 0) return
  if (s.done) {
    g.setTourStep(-1)
    return
  }
  useTutorial.setState({ collapsed: !!s.collapsed })
  if (!s.kit) grantKit()
  if (!s.startedAt) save({ startedAt: Date.now() })
  let id = s.step && STEP_BY_ID[s.step] ? s.step : FIRST_STEP
  const step = STEP_BY_ID[id]
  // a flight cannot be picked up after a reload: go back to the last place that can
  const flying = !!useMission.getState().plan
  if (step.resume && !flying) {
    if (step.resume === 'c8.levelup') useGame.setState({ draft: null })
    else topUpForLaunch()
    id = step.resume
  }
  if (step.chapter >= 2 && step.chapter <= 4) ensureDraft(null)
  wrongClicks = 0
  run(id)
}

// ------------------------------------------------------------------ wiring: hooks into the game, and game changes onto the bus
let wired = false
export function initTutorial() {
  if (wired) return
  wired = true

  // --- the game asks the tutorial
  tourHooks.onBuildingTap = (id) => {
    const step = currentStep()
    if (!step) return false
    if (step.type === 'do' && targetsOf(step).includes(`building:${id}`)) {
      lastAction = Date.now()
      sfx('pop')
      juice(id, 'wobble')
      if (id === 'missionControl') useUi.getState().open({ kind: 'contracts' })
      else if (id === 'partsMarket') {
        marketStart.tab = 'instrument'
        useUi.getState().open({ kind: 'market' })
      } else if (id === 'integrationBay') {
        ensureDraft('builder')
        focusBuilding('integrationBay', 0, 22)
        useUi.getState().setScreen('builder')
      }
      emit(`building.clicked:${id}`)
    }
    // while the tutorial runs, buildings do nothing else
    return true
  }
  tourHooks.onTakeJob = (contractId) => {
    const step = currentStep()
    if (!step || step.id !== 'c1.accept' || contractId !== TUTORIAL_CONTRACT) return false
    // take the job, but stay at the board: the bench comes later, after the shopping
    acceptContract(contractId)
    setDraft({ design: { busId: 'bus3u', parts: [...STARTER_FITTED] } })
    useUi.getState().setScreen(null)
    useUi.getState().open({ kind: 'contracts' })
    return true
  }
  tourHooks.orderSeconds = (partId) => (useTutorial.getState().active && partId === 'deployPanels' ? TUTORIAL_ORDER_SECONDS : undefined)
  tourHooks.opsPaused = () => {
    const t = useTutorial.getState()
    return t.active && (t.paused || !!currentStep()?.holdOps)
  }
  tourHooks.tipsMuted = () => useTutorial.getState().active

  // --- the bus finishes steps
  onBus((name) => {
    const step = currentStep()
    if (!step?.done || useTutorial.getState().paused) return
    if (step.done.includes(name)) {
      // let the click that caused it finish first
      const id = step.id
      setTimeout(() => {
        if (useTutorial.getState().stepId === id) advance()
      }, 0)
    }
  })

  // --- anything the player does counts as not being idle
  const acted = () => {
    lastAction = Date.now()
    const t = useTutorial.getState()
    if (t.active && t.idle === 1) useTutorial.setState({ idle: 0 })
  }
  window.addEventListener('pointerdown', acted, true)
  window.addEventListener('keydown', acted, true)
  window.addEventListener('wheel', acted, { capture: true, passive: true })

  // --- game changes become bus events
  const arrived = new Set<string>()
  useGame.subscribe((s, p) => {
    if (s.phase !== p.phase && s.phase === 'play') setTimeout(resume, 0)
    if (!p.draft && s.draft) emit('contract.accepted')
    if (s.deliveries !== p.deliveries) {
      for (const d of s.deliveries) if (!p.deliveries.some((x) => x.id === d.id)) emit(`part.ordered:${d.partId}`)
      for (const d of p.deliveries)
        if (!s.deliveries.some((x) => x.id === d.id)) {
          arrived.add(d.partId)
          emit('delivery.arrived', d.partId)
        }
    }
    if (s.inventory !== p.inventory) {
      for (const id of Object.keys(s.inventory)) {
        if ((s.inventory[id] ?? 0) <= (p.inventory[id] ?? 0)) continue
        if (arrived.delete(id)) continue
        emit(`part.bought:${id}`)
      }
    }
    if (s.draft && p.draft && s.draft.design !== p.draft.design) {
      const count = (list: string[]) => list.reduce<Record<string, number>>((m, id) => ((m[id] = (m[id] ?? 0) + 1), m), {})
      const a = count(s.draft.design.parts)
      const b = count(p.draft.design.parts)
      for (const id of Object.keys(a)) if (a[id] > (b[id] ?? 0)) emit(`part.fitted:${id}`)
      for (const id of Object.keys(b)) if (b[id] > (a[id] ?? 0)) emit(`part.removed:${id}`)
    }
  })
  useUi.subscribe((s, p) => {
    const kind = s.sheet?.kind ?? null
    const was = p.sheet?.kind ?? null
    if (kind !== was) emit(kind ? `sheet.opened:${kind}` : 'sheet.closed')
    if (s.screen !== p.screen) {
      emit(`screen:${s.screen ?? 'base'}`)
      if (s.screen === 'launch') {
        if (useTutorial.getState().active) scriptTheFlight()
        emit('launch.started')
      }
      if (p.screen === 'debrief') emit('debrief.collected')
    }
    if (s.levelUp !== p.levelUp) emit(s.levelUp ? 'levelup.shown' : 'levelup.closed')
  })
  useLaunch.subscribe((s, p) => {
    if (s.phase !== p.phase && s.phase === 'orbit') emit('orbit.reached')
  })
  useMission.subscribe((s, p) => {
    if (Object.keys(s.choices).length > Object.keys(p.choices).length) emit('event.resolved')
  })

  // the game may already be at the base (a reload)
  setTimeout(resume, 0)
}

/**
 * The tutorial's flight: Autopilot flies it, and the first thing to go wrong
 * is rain at the station (when the design has one dish, as the tutorial's
 * does), so Rocco's line about it always fits.
 */
function scriptTheFlight() {
  useLaunch.getState().setAutopilot(true)
  const m = useMission.getState()
  if (!m.input || !m.plan || m.plan.events[0]?.id === 'stationRain') return
  for (let seed = 1; seed <= 80; seed++) {
    const plan = planMission({ ...m.input, seed })
    if (plan.events[0]?.id === 'stationRain') {
      m.set({ plan, input: { ...m.input, seed } as typeof m.input })
      return
    }
  }
}
