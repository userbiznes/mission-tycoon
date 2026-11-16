import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGame } from '../state/game'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { anchorName, anchorRect, isWorldAnchor, type Rect } from '../tutorial/anchors'
import { advance, clearPointer, currentStep, setCollapsed, setPaused, showMe, skipTutorial, tutorialCtx, useTutorial, wrongClick } from '../tutorial/director'
import { currentGoal } from '../tutorial/goals'
import { CHECKLIST, STEPS, type Line, type Step } from '../tutorial/steps'
import { Icon } from './icons'
import { Btn, reducedMotion } from './kit'
import { Portrait } from './Portrait'
import { RoccoBust, RoccoFigure } from './Rocco'
import { sfx } from './sound'

/**
 * How the tutorial looks. The script and the state machine live in
 * src/tutorial; this file draws them:
 *
 *  - Rocco's dock: a strip along the bottom that is his alone. His head in a
 *    round frame, his words in a bubble beside it. The interface is resized
 *    to sit above the strip, so he never covers anything;
 *  - the stage: full-size Rocco over a dimmed screen (welcome and graduation);
 *  - the spotlight: everything dimmed except the target, a pointing hand,
 *    a name label over 3D buildings, and only the target accepting clicks.
 *    Nothing is drawn around the target itself;
 *  - the First Flight checklist and, afterwards, the Next Goal tracker;
 *  - Rocco's tips, which speak from the same dock and never block the game.
 */

// ------------------------------------------------------------------ Rocco's lines: words, and button chips
interface Token {
  text: string
  /** a tiny copy of a real button: its tone */
  chip?: string
}

function tokens(line: string): Token[] {
  const out: Token[] = []
  const re = /\[\[([^\]|]+)(?:\|([a-z]+))?\]\]/g
  let at = 0
  const words = (s: string) => {
    for (const w of s.split(/\s+/)) if (w) out.push({ text: w })
  }
  for (let m = re.exec(line); m; m = re.exec(line)) {
    words(line.slice(at, m.index))
    out.push({ text: m[1], chip: m[2] ?? 'cream' })
    at = m.index + m[0].length
  }
  words(line.slice(at))
  return out
}

/** Text arrives a whole word at a time, about 60 characters a second. `finish` shows the rest at once. */
function useReveal(list: Token[], key: string) {
  const still = useSettings((s) => s.reduceMotion) || reducedMotion()
  const [n, setN] = useState(still ? list.length : 0)
  const stop = useRef<() => void>(() => {})
  useEffect(() => {
    if (still) {
      setN(list.length)
      return
    }
    setN(0)
    // a word appears when the typing would have reached its first letter
    const starts: number[] = []
    let acc = 0
    for (const t of list) {
      starts.push(acc)
      acc += t.text.length + 1
    }
    let raf = 0
    let shown = 0
    let off = false
    const t0 = performance.now()
    const step = (now: number) => {
      if (off) return
      const chars = ((now - t0) / 1000) * 60
      let k = shown
      while (k < list.length && starts[k] <= chars) k++
      if (k !== shown) {
        shown = k
        setN(k)
        if (k % 2 === 1) sfx('talk')
      }
      if (k < list.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    stop.current = () => {
      off = true
      cancelAnimationFrame(raf)
      setN(list.length)
    }
    return () => {
      off = true
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, still])
  return { n, done: n >= list.length, finish: () => stop.current() }
}

/** A line with its words and button chips. Words not yet revealed keep their place, so nothing jumps or is cut off. */
function RichLine({ list, shown }: { list: Token[]; shown?: number }) {
  return (
    <>
      {list.map((t, i) => {
        const hidden = shown !== undefined && i >= shown
        return (
          <span key={i}>
            {t.chip ? <span className={`btn-chip ${t.chip}${hidden ? ' hid' : ''}`}>{t.text}</span> : <span className={hidden ? 'hid' : undefined}>{t.text}</span>}
            {i < list.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </>
  )
}

const say = (line: Line | undefined, step: Step | null): string => (!line || !step ? '' : typeof line === 'function' ? line(tutorialCtx()) : line)

/** Enter and Space: show all the text, then move on (when the step has a Next). */
function useNextKeys(onKey: () => void, active: boolean) {
  const fn = useRef(onKey)
  fn.current = onKey
  useEffect(() => {
    if (!active) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const el = document.activeElement as HTMLElement | null
      // a focused button or field handles its own keys
      if (el && (el.tagName === 'BUTTON' || el.tagName === 'INPUT')) return
      e.preventDefault()
      fn.current()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [active])
}

/** The small "Skip tutorial" link, which asks before it does anything. */
function SkipLink() {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button type="button" className="coach-skip" data-ui="coach.skip" onClick={() => setAsking(true)}>
        Skip tutorial
      </button>
    )
  return (
    <span className="coach-confirm" role="group" aria-label="Skip the tutorial?">
      <b>Skip the tutorial?</b>
      <button type="button" className="coach-skip" data-ui="coach.skip.no" onClick={() => setAsking(false)}>
        Keep going
      </button>
      <button type="button" className="coach-skip yes" data-ui="coach.skip.yes" onClick={skipTutorial}>
        Yes, skip
      </button>
    </span>
  )
}

// ------------------------------------------------------------------ Rocco's dock
/**
 * Rocco's dock: a strip along the bottom of the window that is his alone.
 * While it is up the whole game surface, the 3D view and the interface, ends
 * where the strip begins, so nothing he says can ever cover a menu, a button
 * or the thing he is talking about.
 */
function Dock({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null)
  // tell the game surface to make room (counted, in case two docks ever overlap in time)
  useLayoutEffect(() => {
    const host = ref.current?.closest<HTMLElement>('.phone')
    if (!host) return
    host.dataset.docked = String((Number(host.dataset.docked) || 0) + 1)
    return () => {
      const n = (Number(host.dataset.docked) || 1) - 1
      if (n > 0) host.dataset.docked = String(n)
      else delete host.dataset.docked
    }
  }, [])
  return (
    <div ref={ref} className={`dock ${className}`} {...rest}>
      {children}
    </div>
  )
}

/** How many characters of a line are actually read (chip markup taken out). */
const plainLength = (line: string) => line.replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, '$1').length

/**
 * The dock has a fixed height, so a bubble must fit it. If what Rocco says
 * would come out taller (a long line in a narrow window), step the type down
 * a notch instead of clipping a word.
 */
function useFit(key: string) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const dock = el?.parentElement
    if (!el || !dock) return
    const fit = () => {
      delete el.dataset.fit
      const ds = getComputedStyle(dock)
      const bs = getComputedStyle(el)
      const px = (v: string) => parseFloat(v) || 0
      // the tallest a line of the bubble may be: the dock, less its padding and the bubble's own edge
      const room = dock.clientHeight - px(ds.paddingTop) - px(ds.paddingBottom) - px(bs.paddingTop) - px(bs.paddingBottom) - px(bs.borderTopWidth) - px(bs.borderBottomWidth)
      if ([...el.children].some((c) => (c as HTMLElement).offsetHeight > room + 1)) el.dataset.fit = 'small'
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(dock)
    return () => ro.disconnect()
  }, [key])
  return ref
}

function Coach({ step, paused = false }: { step: Step; paused?: boolean }) {
  const note = useTutorial((s) => s.note)
  const idle = useTutorial((s) => s.idle)
  const via = useTutorial((s) => s.via)
  const escape = useTutorial((s) => s.escape)
  // the line: a passing remark, the idle rephrasing, or the step's own
  const line = note ?? (idle === 2 && step.idleHint ? say(step.idleHint, step) : say(step.line, step))
  const list = useMemo(() => tokens(line), [line])
  const reveal = useReveal(list, `${step.id}|${line}`)
  const instruction = via && step.viaHint ? say(step.viaHint, step) : step.type === 'do' ? say(step.instruction, step) : ''
  const doList = useMemo(() => tokens(instruction), [instruction])
  const canNext = (step.type === 'talk' && !via) || escape
  const next = () => {
    if (!reveal.done) reveal.finish()
    else if (canNext) {
      sfx('tap')
      advance()
    }
  }
  useNextKeys(next, !paused)
  const bubble = useFit(`${line}|${instruction}|${canNext}`)
  const chapter = step.chapter
  return (
    <Dock data-tut="coach" data-ui="coach" data-step={step.id} data-type={step.type}>
      <div className="dock-face">
        <Portrait id="rocco-face" fallback={<RoccoBust talking={!reveal.done} />} />
      </div>
      <div className="dock-bubble" ref={bubble} onClick={() => !reveal.done && reveal.finish()}>
        <span className="rocco-name">Chief Rocco</span>
        {line && (
          <p className="coach-text" data-ui="coach.text">
            <RichLine list={list} shown={reveal.n} />
          </p>
        )}
        {instruction && (
          <p className={`coach-do${plainLength(instruction) <= 30 ? ' short' : ''}`} data-ui="coach.do">
            <Icon.play />
            <span>
              <RichLine list={doList} />
            </span>
          </p>
        )}
        {(step.type === 'wait' || step.type === 'cinematic') && !escape && <i className="coach-dots" aria-label="Waiting" />}
        {canNext && (
          <Btn tone="green" sound={null} ui="coach.next" onClick={next}>
            {step.type === 'do' ? 'Got it' : 'Next'}
          </Btn>
        )}
      </div>
      <div className="dock-side">
        <b className="coach-step">{chapter <= 0 ? 'Welcome' : chapter > CHECKLIST.length ? 'Graduation' : `Step ${chapter} of ${CHECKLIST.length}`}</b>
        {chapter > 0 && chapter <= CHECKLIST.length && <span className="coach-chapter">{CHECKLIST[chapter - 1]}</span>}
        <span className="dock-pips" aria-hidden>
          {CHECKLIST.map((_, k) => (
            <i key={k} className={k + 1 < chapter ? 'done' : k + 1 === chapter ? 'now' : ''} />
          ))}
        </span>
        <SkipLink />
      </div>
    </Dock>
  )
}

// ------------------------------------------------------------------ the stage: full-size Rocco, twice
function Stage({ step }: { step: Step }) {
  const line = say(step.line, step)
  const list = useMemo(() => tokens(line), [line])
  const reveal = useReveal(list, step.id)
  const next = () => {
    if (!reveal.done) reveal.finish()
    else {
      sfx('tap')
      advance()
    }
  }
  useNextKeys(next, true)
  return (
    <div className="rocco-stage" data-ui="rocco.stage" data-step={step.id} onClick={() => !reveal.done && reveal.finish()}>
      <div className="stage-char">
        <Portrait id="rocco" className={!reveal.done ? 'talking' : ''} fallback={<RoccoFigure talking={!reveal.done} />} />
      </div>
      <div className="stage-bubble">
        <span className="rocco-name">Chief Rocco</span>
        <p className="stage-text" data-ui="coach.text">
          <RichLine list={list} shown={reveal.n} />
        </p>
        <div className="coach-foot">
          <SkipLink />
          <Btn tone="green" sound={null} ui="coach.next" onClick={next}>
            Next
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ the spotlight
const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
}
const inside = (a: Rect, b: Rect) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1
const overlap = (a: Rect, b: { x: number; y: number; w: number; h: number }) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

/**
 * Where the pointing hand comes from. Its fingertip touches the target from
 * one of eight sides and its body stays outside; of the sides that fit on
 * screen, the one that covers the least of the interface wins.
 * (The glove is drawn pointing up and to the left, its body down and right.)
 */
type HandSpot = { fx: number; fy: number; ix: number; iy: number; sx: number; sy: number; rot: number }
const HAND_SIDES: HandSpot[] = [
  { fx: 1, fy: 1, ix: -1, iy: -1, sx: 1, sy: 1, rot: 0 }, // from below right
  { fx: 0, fy: 1, ix: 1, iy: -1, sx: -1, sy: 1, rot: 0 }, // from below left
  { fx: 1, fy: 0.5, ix: -1, iy: 0, sx: 1, sy: 1, rot: -45 }, // from the right
  { fx: 0, fy: 0.5, ix: 1, iy: 0, sx: -1, sy: 1, rot: 45 }, // from the left
  { fx: 0.5, fy: 1, ix: 0, iy: -1, sx: 1, sy: 1, rot: 45 }, // from below
  { fx: 1, fy: 0, ix: -1, iy: 1, sx: 1, sy: -1, rot: 0 }, // from above right
  { fx: 0, fy: 0, ix: 1, iy: 1, sx: -1, sy: -1, rot: 0 }, // from above left
  { fx: 0.5, fy: 0, ix: 0, iy: 1, sx: 1, sy: -1, rot: -45 }, // from above
]
const HAND_BODY = [
  [0.3, 0.3],
  [0.55, 0.55],
  [0.85, 0.85],
  [0.82, 0.45],
  [0.45, 0.82],
]
const HAND_REACH = [
  [0.95, 0.95],
  [0.88, 0.5],
  [0.5, 0.88],
]
const handTip = (spot: HandSpot, r: Rect, inset: number) => ({ x: r.x + spot.fx * r.w + spot.ix * inset, y: r.y + spot.fy * r.h + spot.iy * inset })
function placeHand(r: Rect, lit: Rect[], host: DOMRect, size: number, inset: number, margin: number): HandSpot | null {
  let best: HandSpot | null = null
  let least = Infinity
  for (const spot of HAND_SIDES) {
    const tip = handTip(spot, r, inset)
    const a = (spot.rot * Math.PI) / 180
    const at = ([lx, ly]: number[]) => {
      const x = lx * size * spot.sx
      const y = ly * size * spot.sy
      return { x: tip.x + x * Math.cos(a) - y * Math.sin(a), y: tip.y + x * Math.sin(a) + y * Math.cos(a) }
    }
    if (HAND_REACH.map(at).some((q) => q.x < margin || q.y < margin || q.x > host.width - margin || q.y > host.height - margin)) continue
    let cost = 0
    for (const q of HAND_BODY.map(at)) {
      // on something lit (the thing being read, or its neighbours): the worst place to be
      if (lit.some((o) => q.x > o.x && q.x < o.x + o.w && q.y > o.y && q.y < o.y + o.h)) cost += 4
      else {
        // on the 3D view: free. On any other part of the interface: a little
        const under = document.elementsFromPoint(host.left + q.x, host.top + q.y).find((el) => !el.closest('.tut-spot'))
        if (under && under.tagName !== 'CANVAS' && under.closest('.ui')) cost += 1
      }
    }
    if (cost < least) {
      least = cost
      best = spot
    }
  }
  return best
}

const HOLES = 6

function Spotlight() {
  const root = useRef<HTMLDivElement>(null)
  const shade = useRef<SVGSVGElement>(null)
  const softHoles = useRef<(SVGRectElement | null)[]>([])
  const crispHoles = useRef<(SVGRectElement | null)[]>([])
  const blurs = useRef<(SVGFEGaussianBlurElement | null)[]>([])
  const block = useRef<HTMLDivElement>(null)
  const hand = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLDivElement>(null)
  const handSpot = useRef<{ key: string; at: number; frame: number; spot: HandSpot | null }>({ key: '', at: 0, frame: 0, spot: null })
  const worldHoles = useRef<Rect[]>([])
  const seen = useRef({ step: '', nudge: 0, scrolled: '', shade: '' })

  useEffect(() => {
    let raf = 0
    const layout = () => {
      raf = requestAnimationFrame(layout)
      const el = root.current
      const host = el?.parentElement
      if (!el || !host || !shade.current || !block.current || !hand.current || !label.current) return
      const hr = host.getBoundingClientRect()
      const em = parseFloat(getComputedStyle(host).fontSize) || 16
      const t = useTutorial.getState()
      const step = t.paused ? null : currentStep()
      const pointing = !step && t.pointer ? t.pointer.anchor : null

      // --- what is lit, and what takes the click
      const click: { a: string; r: Rect }[] = []
      const look: { a: string; r: Rect }[] = []
      let via = false
      const pad = (a: string, r: Rect, go = false): Rect => {
        // the light sits close around a thing to click; a thing to look at gets a little air
        const p = isWorldAnchor(a) ? em * 0.2 : go ? em * 0.14 : em * 0.36
        // the resource tiles carry their "Why?" tag above the top edge
        const top = a.startsWith('builder.bar') ? em * 0.85 : p
        return { x: r.x - p, y: r.y - top, w: r.w + p * 2, h: r.h + p + top, r: r.r + p }
      }
      if (step) {
        const scroll = seen.current.scrolled !== step.id
        const targets = !step.target ? [] : Array.isArray(step.target) ? step.target : [step.target]
        const found = targets.map((a) => ({ a, r: anchorRect(a, hr, scroll) })).filter((x): x is { a: string; r: Rect } => !!x.r)
        if (found.length) seen.current.scrolled = step.id
        if (!found.length && step.via) {
          const r = anchorRect(step.via, hr)
          if (r) {
            click.push({ a: step.via, r: pad(step.via, r, true) })
            via = true
          }
        } else if (step.type === 'do') for (const f of found) click.push({ a: f.a, r: pad(f.a, f.r, true) })
        else for (const f of found) look.push({ a: f.a, r: pad(f.a, f.r) })
        for (const a of step.highlight ?? []) {
          const r = anchorRect(a, hr)
          if (r) look.push({ a, r: pad(a, r) })
        }
      } else if (pointing) {
        const r = anchorRect(pointing, hr)
        if (r) click.push({ a: pointing, r: pad(pointing, r, true) })
      }
      if (via !== t.via && step) useTutorial.setState({ via })
      worldHoles.current = click.filter((c) => isWorldAnchor(c.a)).map((c) => c.r)

      // --- the shade (what is dimmed) and the block (what swallows clicks)
      const staged = !!step?.stage
      const free = !step || staged || step.allow === 'camera' || step.allow === 'all'
      const dimmed = !!step && !staged && (step.dim ?? (step.type === 'do' || (step.type === 'talk' && !!step.target))) && click.length + look.length > 0
      const frame = `M0 0H${hr.width}V${hr.height}H0Z`
      // what is lit: a pool of light with a soft edge around a thing to look at, a closer one around a thing to click
      const lit = [...look.map((x) => ({ r: x.r, soft: true })), ...click.map((x) => ({ r: x.r, soft: false }))]
      const holes = lit.filter((h, i) => !lit.some((o, j) => j !== i && inside(h.r, o.r) && !(inside(o.r, h.r) && j > i)))
      shade.current.style.display = dimmed ? 'block' : 'none'
      if (dimmed) {
        const key = `${em}|${holes.map((h) => `${h.soft ? 's' : 'c'}${h.r.x.toFixed(1)},${h.r.y.toFixed(1)},${h.r.w.toFixed(1)},${h.r.h.toFixed(1)}`).join('|')}`
        if (key !== seen.current.shade) {
          seen.current.shade = key
          blurs.current[0]?.setAttribute('stdDeviation', (em * 0.6).toFixed(2))
          blurs.current[1]?.setAttribute('stdDeviation', (em * 0.14).toFixed(2))
          for (const [list, soft] of [[softHoles.current, true], [crispHoles.current, false]] as const) {
            const mine = holes.filter((h) => h.soft === soft)
            // the light reaches a little past the thing itself, so the fade happens outside it
            const grow = soft ? em * 0.7 : em * 0.16
            list.forEach((rect, i) => {
              const h = mine[i]
              if (!rect) return
              if (!h) return rect.setAttribute('width', '0')
              rect.setAttribute('x', (h.r.x - grow).toFixed(1))
              rect.setAttribute('y', (h.r.y - grow).toFixed(1))
              rect.setAttribute('width', (h.r.w + grow * 2).toFixed(1))
              rect.setAttribute('height', (h.r.h + grow * 2).toFixed(1))
              rect.setAttribute('rx', (h.r.r + grow).toFixed(1))
            })
          }
        }
      }
      block.current.style.display = free ? 'none' : 'block'
      if (!free) block.current.style.clipPath = `path(evenodd, "${frame}${click.map((c) => roundRect(c.r.x, c.r.y, c.r.w, c.r.h, c.r.r)).join('')}")`

      // nothing is drawn around a target: the light and the hand are the whole signal
      const all = [...click, ...look]
      // a click that missed, or an idle prod: the hand jabs again
      const flash = t.nudge !== seen.current.nudge
      seen.current.nudge = t.nudge

      // --- the pointing hand: it clicks on a do step, and only points on a talk step
      const aim = click.length === 1 ? click[0] : !click.length && look.length ? look[0] : null
      const showHand = !!aim && !staged && (!!pointing || (!!step && step.type !== 'wait' && step.type !== 'cinematic'))
      hand.current.style.display = showHand ? 'block' : 'none'
      if (aim && showHand) {
        const size = em * 4.2
        const clicking = click.length === 1
        let px: number, py: number
        let sx = 1, sy = 1, rot = 0
        if (isWorldAnchor(aim.a)) {
          // a building: the fingertip lands on it
          px = aim.r.x + aim.r.w * 0.56
          py = aim.r.y + aim.r.h * 0.6
          if (px + size > hr.width - em * 0.4) sx = -1
          if (py + size > hr.height - em * 0.4) sy = -1
        } else {
          // a click lands just inside the target; pointing only touches its edge.
          // Either way the hand stays off what is being read.
          const inset = clicking ? Math.min(em * 0.9, aim.r.w * 0.3, aim.r.h * 0.35) : Math.min(em * 0.45, aim.r.w * 0.2, aim.r.h * 0.2)
          const spots = handSpot.current
          const key = `${step?.id ?? pointing}|${clicking}|${Math.round(aim.r.x / 8)}|${Math.round(aim.r.y / 8)}|${Math.round(aim.r.w / 8)}|${Math.round(aim.r.h / 8)}|${Math.round(hr.width)}x${Math.round(hr.height)}`
          spots.frame++
          // choose again when the target moves (not more than ten times a second) and now and then, as panels settle
          if ((key !== spots.key && spots.frame - spots.at > 6) || spots.frame - spots.at > 50 || !spots.at) {
            spots.spot = placeHand(aim.r, all.map((x) => x.r), hr, size, inset, em * 0.3)
            spots.key = key
            spots.at = spots.frame
          }
          const spot = spots.spot
          if (spot) {
            const tip = handTip(spot, aim.r, inset)
            px = tip.x
            py = tip.y
            sx = spot.sx
            sy = spot.sy
            rot = spot.rot
          } else {
            // nowhere outside fits (the target fills the screen): rest on its middle
            px = aim.r.x + aim.r.w * 0.5
            py = aim.r.y + aim.r.h * 0.5
          }
        }
        hand.current.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${rot}deg) scale(${sx}, ${sy})`
        hand.current.dataset.mode = clicking ? 'click' : 'point'
        if (flash) {
          hand.current.classList.remove('prod')
          void hand.current.offsetWidth
          hand.current.classList.add('prod')
        }
      }

      // --- the name over a building
      const named = all.find((x) => isWorldAnchor(x.a))
      const name = named && !staged ? anchorName(named.a) : null
      label.current.style.display = name ? 'block' : 'none'
      if (named && name) {
        if (label.current.textContent !== name) label.current.textContent = name
        // above the building when there is room under the HUD, otherwise just under it
        const above = named.r.y > em * 6.4
        label.current.style.transform = `translate3d(${(named.r.x + named.r.w / 2).toFixed(1)}px, ${(above ? named.r.y - em * 2.5 : named.r.y + named.r.h + em * 0.5).toFixed(1)}px, 0)`
      }

      seen.current.step = step?.id ?? ''
    }
    raf = requestAnimationFrame(layout)

    // the cursor turns into a pointer over a building that wants a click
    const move = (e: PointerEvent) => {
      const canvas = document.querySelector<HTMLElement>('.world canvas')
      const host = root.current?.parentElement
      if (!canvas || !host) return
      const hr = host.getBoundingClientRect()
      const x = e.clientX - hr.left
      const y = e.clientY - hr.top
      const over = worldHoles.current.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
      canvas.style.cursor = over ? 'pointer' : ''
    }
    // "Show me" is over as soon as the player clicks anything
    const down = () => {
      const p = useTutorial.getState().pointer
      if (p && Date.now() > p.until - 6500) clearPointer()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down, true)
      const canvas = document.querySelector<HTMLElement>('.world canvas')
      if (canvas) canvas.style.cursor = ''
    }
  }, [])

  return (
    <div className="tut-spot" ref={root} aria-hidden>
      {/* the dimming, drawn so the light around a target fades out softly instead of ending at a hard edge */}
      <svg className="tut-shade" ref={shade}>
        <defs>
          {['tut-soft', 'tut-crisp'].map((id, k) => (
            <filter key={id} id={id} filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
              <feGaussianBlur
                stdDeviation="8"
                ref={(el) => {
                  blurs.current[k] = el
                }}
              />
            </filter>
          ))}
          <mask id="tut-light" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="#fff" />
            {(['tut-soft', 'tut-crisp'] as const).map((id) => (
              <g key={id} filter={`url(#${id})`}>
                {Array.from({ length: HOLES }, (_, i) => (
                  <rect
                    key={i}
                    width="0"
                    height="0"
                    fill="#000"
                    ref={(el) => {
                      ;(id === 'tut-soft' ? softHoles : crispHoles).current[i] = el
                    }}
                  />
                ))}
              </g>
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(24, 14, 6, 0.55)" mask="url(#tut-light)" />
      </svg>
      <div
        className="tut-block"
        ref={block}
        onPointerDown={(e) => {
          e.stopPropagation()
          wrongClick()
        }}
        onWheel={(e) => e.stopPropagation()}
      />
      <div className="tut-label" ref={label} />
      <div className="tut-hand" ref={hand}>
        <svg viewBox="0 0 64 64">
          <g stroke="#4b2f1c" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
            {/* a chunky cartoon glove, fingertip at the top left */}
            <path d="M9 6c3-2.600 7-1.600 9 1.600l10 16 2.600-1.800c3-2 7-1.200 9 1.600l1.400 2 1.400-.9c3-1.900 6.800-1 8.700 1.900l.9 1.500c3.400 5.300 4.400 11.800 2.400 17.800-2.600 8-9.800 13.800-18.200 14.700-7.200.8-14.200-2.400-18.300-8.300L8 39c-1.900-2.800-1.200-6.600 1.600-8.500 2.200-1.500 5-1.400 7 .1L7.300 14.500C5.500 11.500 6.200 8 9 6z" fill="#fffdf5" />
            <path d="M31.500 22.800l4.500 7M40.800 26l3.400 5.500" fill="none" strokeWidth="2.600" />
            <path d="M38 55.500c7.500-1.200 13.600-6.500 15.600-13.500" fill="none" stroke="#e9c583" strokeWidth="3" />
          </g>
        </svg>
        <i className="tut-tap" />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Esc: the tutorial waits
function PauseMenu() {
  return (
    <div className="tut-pause" data-ui="tutorial.pause" role="dialog" aria-label="Tutorial paused">
      <div className="tut-pause-card">
        <h2>Tutorial paused</h2>
        <p>Take your time. Rocco will wait.</p>
        <div className="tut-pause-actions">
          <Btn tone="cream" ui="tutorial.pause.skip" onClick={skipTutorial}>
            Skip tutorial
          </Btn>
          <Btn tone="green" ui="tutorial.pause.resume" onClick={() => setPaused(false)}>
            Resume
          </Btn>
        </div>
      </div>
    </div>
  )
}

/** Everything the tutorial draws over the game. */
export function TutorialLayer() {
  const active = useTutorial((s) => s.active)
  const stepId = useTutorial((s) => s.stepId)
  const paused = useTutorial((s) => s.paused)
  const pointer = useTutorial((s) => s.pointer)
  const step = active && stepId ? currentStep() : null
  // Esc pauses the tutorial (and never closes a menu underneath it)
  useEffect(() => {
    if (!active) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      setPaused(!useTutorial.getState().paused)
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [active])
  if (!step && !pointer) return null
  return (
    <>
      <Spotlight />
      {step && (step.stage ? !paused && <Stage key={step.id} step={step} /> : <Coach step={step} paused={paused} />)}
      {step && paused && <PauseMenu />}
    </>
  )
}

// ------------------------------------------------------------------ the First Flight checklist
/** Pinned under the coins: the seven chapters, the one in hand, and a stamp on the ones done. */
export function Checklist() {
  const active = useTutorial((s) => s.active)
  const stepId = useTutorial((s) => s.stepId)
  const collapsed = useTutorial((s) => s.collapsed)
  const completedAt = useTutorial((s) => s.completedAt)
  const [, tick] = useState(0)
  // the "complete" stamp stays up for a little while, then makes way for the goal tracker
  useEffect(() => {
    if (!completedAt) return
    const id = setTimeout(() => tick((n) => n + 1), Math.max(0, completedAt + 7000 - Date.now()) + 50)
    return () => clearTimeout(id)
  }, [completedAt])
  const step = active && stepId ? currentStep() : null
  if (!step) {
    if (!completedAt || Date.now() > completedAt + 7000) return null
    return (
      <div className="checklist complete" data-ui="checklist">
        <span className="stamp go in">First Flight complete</span>
      </div>
    )
  }
  const chapter = step.chapter
  const total = CHECKLIST.length
  const head = chapter <= 0 ? 'Getting started' : chapter > total ? 'All done' : `Step ${chapter} of ${total}`
  return (
    <div className={`checklist${collapsed ? ' collapsed' : ''}`} data-ui="checklist">
      <button type="button" className="checklist-head" data-ui="checklist.toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
        <Icon.clipboard />
        <b>First Flight</b>
        <span className="checklist-step">{head}</span>
        <i className="chev" aria-hidden />
      </button>
      {!collapsed && (
        <ol>
          {CHECKLIST.map((text, i) => {
            const n = i + 1
            const state = n < chapter ? 'done' : n === chapter ? 'now' : 'todo'
            return (
              <li key={text} className={state} aria-current={state === 'now' ? 'step' : undefined}>
                <span className="tick">{state === 'done' ? <Icon.check /> : n}</span>
                <span>{text}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ the Next Goal tracker
/** After the tutorial: one goal at a time, its progress, and "Show me". */
export function GoalTracker() {
  const active = useTutorial((s) => s.active)
  const stepId = useTutorial((s) => s.stepId)
  const tour = useGame((s) => s.tourStep)
  // a short string, so this only re-draws when the goal or its count changes
  const view = useGame((s) => {
    const goal = currentGoal(s)
    if (!goal) return ''
    const p = goal.progress?.(s)
    return `${goal.id}|${p ? `${p[0]}/${p[1]}` : ''}`
  })
  const sheet = useUi((s) => s.sheet)
  const graduating = active && !!stepId && STEPS.findIndex((s) => s.id === stepId) >= STEPS.findIndex((s) => s.id === 'c8.goal')
  if (!(tour < 0 || graduating) || !view || sheet?.kind === 'buildmenu') return null
  const goal = currentGoal(useGame.getState())
  if (!goal) return null
  const count = view.split('|')[1]
  return (
    <div className="goal" data-ui="goal">
      <span className="goal-flag">
        <Icon.target />
      </span>
      <div className="goal-words">
        <small>Next goal</small>
        <b>
          {goal.text}
          {count && <i className="goal-count">{count}</i>}
        </b>
      </div>
      <Btn tone="blue" size="sm" ui="goal.show" disabled={active} onClick={() => showMe(goal.show)}>
        Show me
      </Btn>
    </div>
  )
}

// ------------------------------------------------------------------ Rocco's tips, from the same dock
/**
 * A tip from Rocco: he speaks from his dock, so the tip covers nothing and
 * the game stays fully usable. It leaves by itself after about eight seconds
 * (or at "Got it").
 */
export function CoachTip({ text, onDone, children }: { text: string; onDone: () => void; children?: ReactNode }) {
  const list = useMemo(() => tokens(text), [text])
  const reveal = useReveal(list, text)
  const [leaving, setLeaving] = useState(false)
  const fit = useFit(text)
  const done = useRef(onDone)
  done.current = onDone
  const hover = useRef(false)
  useEffect(() => {
    sfx('pop')
    let left = 8000
    let last = Date.now()
    // the eight seconds only run while the pointer is elsewhere
    const id = setInterval(() => {
      const now = Date.now()
      if (!hover.current) left -= now - last
      last = now
      if (left <= 0) {
        clearInterval(id)
        setLeaving(true)
        setTimeout(() => done.current(), 280)
      }
    }, 200)
    return () => clearInterval(id)
  }, [text])
  return (
    <Dock className={`rocco-tip${leaving ? ' leaving' : ''}`} data-ui="rocco.tip" onPointerEnter={() => (hover.current = true)} onPointerLeave={() => (hover.current = false)}>
      <div className="dock-face">
        <Portrait id="rocco-face" fallback={<RoccoBust talking={!reveal.done} />} />
      </div>
      <div className="dock-bubble" ref={fit} onClick={() => !reveal.done && reveal.finish()}>
        <span className="rocco-name">Chief Rocco</span>
        <p className="coach-text">
          <RichLine list={list} shown={reveal.n} />
        </p>
        {children}
        <Btn tone="green" sound="tap" ui="rocco.tip.ok" onClick={() => done.current()}>
          Got it
        </Btn>
      </div>
      <div className="dock-side">
        <b className="coach-step">Tip</b>
      </div>
    </Dock>
  )
}
