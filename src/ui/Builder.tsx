import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CONTRACT_BY_ID } from '../data/contracts'
import { PART_BY_ID, PART_CATEGORIES, partsInCategory } from '../data/parts'
import { TIPS } from '../data/tutorial'
import type { PartCategory, PartDef, ResourceKey } from '../data/types'
import { WHY } from '../data/why'
import { stockPrice } from '../state/actions'
import { useGame } from '../state/game'
import { evalInputFor, setDraft } from '../state/mission'
import { useUi } from '../state/ui'
import { addPart, evaluateDesign, partLock, removePart, testRun, type MissionResult, type ResourceBar } from '../sim'
import { Icon, type IconName } from './icons'
import { Bar, Btn, LockBadge, Modal, Tabs, Tip, useEsc } from './kit'
import { CATEGORY_ICON, PartIcon, partStats } from './parts'
import { emit } from '../tutorial/bus'
import { tourHooks } from '../tutorial/hooks'
import { sfx } from './sound'
import { Turntable } from './Turntable'
import { CoachTip } from './Tutorial'

export const BAR_ICON: Record<ResourceKey, IconName> = {
  mass: 'mass',
  power: 'bolt',
  budget: 'budget',
  data: 'data',
  comms: 'comms',
  time: 'time',
}

/** Each resource has its own colour as well as its own icon. */
const BAR_TINT: Record<ResourceKey, string> = {
  mass: '#e6dcc8',
  power: '#ffe27a',
  budget: '#c9efb0',
  data: '#e0d3ff',
  comms: '#c5e4fb',
  time: '#ffd9b0',
}

/** One of the six resource bars: icon, name, the bar itself, the numbers, and a "Why?" button. Red when the design breaks it. */
function BarTile({ bar, onWhy }: { bar: ResourceBar; onWhy: () => void }) {
  const key = bar.key as ResourceKey
  // pointed out after "Fix it" on the launch board or the report
  const focus = useUi((s) => s.builderFocus) === key
  useEffect(() => {
    if (!focus) return
    const t = setTimeout(() => useUi.getState().setBuilderFocus(null), 6000)
    return () => clearTimeout(t)
  }, [focus])
  const I = Icon[BAR_ICON[key]]
  const subs = bar.sub?.length ? bar.sub : [bar]
  return (
    <button type="button" className={`rbar ${bar.status}${focus ? ' focus' : ''}`} data-ui={`builder.bar.${key}`} onClick={onWhy} aria-label={`${bar.label}: ${bar.detail}. Why?`}>
      <span className="rbar-top">
        <span className="rbar-ico" style={{ background: BAR_TINT[key] }}>
          <I />
        </span>
        <b>{bar.label}</b>
        {bar.status === 'bad' && <i className="rbar-alert">!</i>}
        <span className="rbar-why">Why?</span>
      </span>
      {subs.map((s) => (
        <Bar key={s.key} value={s.fill} tone={s.status} />
      ))}
      <small>{bar.detail}</small>
    </button>
  )
}

export function WhyModal({ bar, onClose }: { bar: ResourceBar; onClose: () => void }) {
  const why = WHY[bar.key as ResourceKey]
  const I = Icon[BAR_ICON[bar.key as ResourceKey]]
  return (
    <Modal
      id="why"
      title={why.title}
      icon={<I />}
      onClose={onClose}
      foot={
        <Btn ui="why.ok" onClick={onClose}>
          Got it
        </Btn>
      }
    >
      <p className={`why-now ${bar.status}`}>
        <b>Right now:</b> {bar.detail}
        {bar.reason ? `. ${bar.reason}.` : '.'}
      </p>
      <p className="t-label why-rule">{why.rule}</p>
      <p className="t-body">{why.basis}</p>
      <p className="t-small why-src">{why.source}</p>
    </Modal>
  )
}

/** Up to three stars. With `stamp` they land one by one. */
export function Stars({ n, big, stamp }: { n: number; big?: boolean; stamp?: boolean }) {
  return (
    <div className={`stars${big ? ' big' : ''}${stamp ? ' stamp-in' : ''}`} role="img" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (i < n ? <Icon.star key={i} style={{ animationDelay: `${0.25 + i * 0.42}s` }} className="on" /> : <Icon.starEmpty key={i} style={{ animationDelay: `${0.25 + i * 0.42}s` }} />))}
    </div>
  )
}

export function ReasonList({ result, ui, onFix, replay }: { result: MissionResult; ui?: string; /** offer "Fix this" on a reason; return false for ones with nothing to fix */ onFix?: (id: string) => (() => void) | null; replay?: ReactNode }) {
  return (
    <div className="reasons">
      {result.reasons.map((r, i) => {
        const fix = r.tone !== 'good' && onFix ? onFix(r.id) : null
        return (
          <div key={r.id + i} className={`reason ${r.tone}`} data-ui={ui ? `${ui}.${i}` : undefined}>
            <span className="n">{i + 1}</span>
            <div className="grow">
              <p className="t-body">{r.text}</p>
              {r.fix && <small className="t-small">{r.fix}</small>}
              {fix && (
                <button type="button" className="fix-this" data-ui={ui ? `${ui}.${i}.fix` : undefined} onClick={fix}>
                  <Icon.wrench /> Fix this
                </button>
              )}
            </div>
            {i === 0 && replay}
          </div>
        )
      })}
    </div>
  )
}

function TestRunModal({ result, onClose, onPad }: { result: MissionResult; onClose: () => void; onPad: () => void }) {
  const blocked = !result.evaluation.canLaunch
  return (
    <Modal
      id="testrun"
      title="Test run"
      icon={<Icon.play />}
      onClose={onClose}
      className="testrun"
      foot={
        <>
          <Btn tone="cream" ui="testrun.back" onClick={onClose}>
            Keep building
          </Btn>
          <Btn tone="yellow" ui="testrun.pad" onClick={onPad} disabled={blocked}>
            To the pad <Icon.rocket />
          </Btn>
        </>
      }
    >
      <p className="eyebrow center">Free · nothing is spent · predicted result</p>
      <Stars n={result.stars} big stamp />
      <div className="chips star-notes">
        {result.starList.map((s) => (
          <span key={s.id} className={`chip ${s.earned ? 'good' : 'bad'}`}>
            {s.earned ? <Icon.star /> : <Icon.starEmpty />} {s.label}
          </span>
        ))}
      </div>
      <p className="eyebrow">Why</p>
      <ReasonList result={result} />
      {blocked && (
        <p className="blocker">
          <Icon.alert /> Can't launch yet: {result.evaluation.blockers[0]}
        </p>
      )}
    </Modal>
  )
}

/** Integration Bay: build the satellite part by part and watch the six bars react. */
export function Builder() {
  const draft = useGame((s) => s.draft)!
  const coins = useGame((s) => s.coins)
  const inventory = useGame((s) => s.inventory)
  const level = useGame((s) => s.level)
  const bayLevel = useGame((s) => s.buildings.integrationBay.level)
  const markTip = useGame((s) => s.markTip)
  const setScreen = useUi((s) => s.setScreen)
  const toast = useUi((s) => s.toast)
  const [cat, setCat] = useState<PartCategory>('power')
  // after "Fix this": open the shelf at the part that would fix it, and point it out
  const pointAt = useUi((s) => s.builderPart)
  useEffect(() => {
    const part = pointAt ? PART_BY_ID[pointAt] : null
    if (!part) return
    setCat(part.category)
    const t = setTimeout(() => useUi.getState().setBuilderPart(null), 7000)
    return () => clearTimeout(t)
  }, [pointAt])
  const [why, setWhy] = useState<ResourceKey | null>(null)
  const [test, setTest] = useState<MissionResult | null>(null)
  const [tip, setTip] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ part: PartDef; x: number; y: number } | null>(null)
  const drag = useRef<{ part: PartDef; x0: number; y0: number; moved: boolean } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const contract = CONTRACT_BY_ID[draft.contractId]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ev = useMemo(() => evaluateDesign(evalInputFor(draft)), [draft, coins, inventory, level])
  const worst = ev.issues[0]

  const showTip = (id: string) => {
    // tips wait until the tutorial is over, so Rocco never talks over himself
    if (tourHooks.tipsMuted?.()) return
    if (TIPS[id] && markTip(id)) setTip(id)
  }
  const openWhy = (key: ResourceKey | null) => {
    setWhy(key)
    emit(key ? 'why.opened' : 'why.closed')
  }
  const openTest = (result: MissionResult | null) => {
    setTest(result)
    emit(result ? 'testrun.done' : 'testrun.closed')
  }

  const lockOf = (p: PartDef): string | null => {
    if (p.category === 'bus') {
      if (level < p.unlockLevel) return `Unlocks at agency level ${p.unlockLevel}`
      if (p.id === 'bus6u' && bayLevel < 2) return 'Upgrade the Integration Bay to build 6U satellites'
      return null
    }
    return partLock(p.id, { design: draft.design, contractId: draft.contractId, level })
  }

  const add = (p: PartDef) => {
    const lock = lockOf(p)
    if (lock) {
      sfx('error')
      toast(lock, 'bad')
      return
    }
    if (p.category === 'bus') {
      setDraft({ design: { ...draft.design, busId: p.id } })
      sfx('snap')
      return
    }
    if (ev.slots.free <= 0) {
      sfx('error')
      toast('No free slots. Remove a part or use a bigger bus.', 'bad')
      return
    }
    const next = addPart(draft.design, p.id)
    setDraft({ design: next })
    sfx('snap')
    // contextual lessons, once each
    const after = evaluateDesign({ ...evalInputFor({ ...draft, design: next }) })
    const shadow = after.bars.power.sub?.find((b) => b.key === 'powerShadow')
    if (after.power.loadW > 0 && shadow?.status === 'bad' && after.power.solarW > 0) showTip('shadow')
    else if (after.bars.mass.status === 'bad') showTip('overweight')
    else if (after.pipeline.losing && after.summary.radio && after.pipeline.madePerDay > 0) showTip('bottleneck')
  }

  const remove = (id: string) => {
    setDraft({ design: removePart(draft.design, id) })
    sfx('close')
  }

  // drag a tray card up onto the satellite (or just tap it)
  const onCardDown = (e: React.PointerEvent, part: PartDef) => {
    drag.current = { part, x0: e.clientX, y0: e.clientY, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onCardMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = d.y0 - e.clientY
    if (!d.moved && dy > 14 && dy > Math.abs(e.clientX - d.x0)) d.moved = true
    if (d.moved) {
      const r = rootRef.current!.getBoundingClientRect()
      setGhost({ part: d.part, x: e.clientX - r.left, y: e.clientY - r.top })
    }
  }
  const onCardUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    setGhost(null)
    if (!d) return
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 10) add(d.part)
      return
    }
    const s = stageRef.current!.getBoundingClientRect()
    if (e.clientY < s.bottom + 20) add(d.part)
  }

  const counts: Record<string, number> = {}
  for (const id of draft.design.parts) counts[id] = (counts[id] ?? 0) + 1

  // Esc steps back to the base (a modal or a tip on top takes the key first)
  useEsc(() => setScreen(null))
  const slotCount = Math.max(ev.slots.total, draft.design.parts.length)
  const lockView = (lock: string) => {
    const m = /level (\d+)/i.exec(lock)
    return m ? <LockBadge level={Number(m[1])} /> : <span className="chip warn lock-why">{lock}</span>
  }

  return (
    <div className="builder" ref={rootRef} data-ui="builder">
      <div className="bench-top">
        <div className="rbars" data-ui="builder.bars">
          {ev.barList.map((b) => (
            <BarTile key={b.key} bar={b} onWhy={() => openWhy(b.key as ResourceKey)} />
          ))}
        </div>
      </div>

      <div className="stage3d" ref={stageRef}>
        <Turntable design={draft.design} />
        <Btn tone="cream" round sound="close" className="back" ui="builder.back" onClick={() => setScreen(null)} aria-label="Back to base">
          <Icon.back style={{ filter: 'invert(0.75)' }} />
        </Btn>
        <div className="blueprint-label">
          <b className="t-label">{contract.title}</b>
          <small className="t-small">{contract.objective}</small>
          <span className="chip blue">
            <Icon.target /> {contract.scienceTarget.toLocaleString('en-US')} science
          </span>
        </div>
        <div className="stage-bottom">
          <p className={`issue ${worst ? worst.status : 'ok'}`} role="status">
            {worst ? <Icon.alert /> : <Icon.check />}
            {worst ? worst.text : draft.design.parts.length ? 'Every bar is green. Try a test run!' : 'Drag parts onto the satellite. Start with power.'}
          </p>
          <div className={`slots${slotCount > 6 ? ' many' : ''}`} aria-label={`${ev.slots.used} of ${ev.slots.total} slots used`}>
            {Array.from({ length: slotCount }, (_, n) => {
              const id = draft.design.parts[n]
              if (!id) return <span key={n} className="slot empty" />
              const part = PART_BY_ID[id]
              return (
                <Tip key={n} text={`${part.name}: click to take it off`}>
                  <button type="button" className={`slot${n >= ev.slots.total ? ' over' : ''}`} data-ui={`builder.slot.${n}`} onClick={() => remove(id)} aria-label={`Remove ${part.name}`}>
                    <PartIcon part={part} size="sm" />
                    <i className="x">×</i>
                  </button>
                </Tip>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bench">
        <Tabs<PartCategory>
          ui="builder.tab"
          icons
          value={cat}
          onChange={setCat}
          tabs={PART_CATEGORIES.map((c) => ({ id: c.id, label: c.name, icon: CATEGORY_ICON[c.id] }))}
        />
        <div className="page tray-cards stagger" key={cat}>
          {partsInCategory(cat).map((p) => {
            const lock = lockOf(p)
            const owned = (inventory[p.id] ?? 0) - (counts[p.id] ?? 0) - (draft.design.busId === p.id ? 1 : 0)
            const isBus = draft.design.busId === p.id
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className={`card tray-card${lock ? ' locked' : ''}${isBus ? ' on' : ''}${pointAt === p.id ? ' focus' : ''}`}
                data-ui={`builder.part.${p.id}`}
                onPointerDown={(e) => onCardDown(e, p)}
                onPointerMove={onCardMove}
                onPointerUp={onCardUp}
                onPointerCancel={() => { drag.current = null; setGhost(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') add(p) }}
              >
                <PartIcon part={p} />
                <span className="words">
                  <b className="t-label">{p.name}</b>
                  <small className="t-small">{partStats(p).slice(1, 3).join(' · ') || partStats(p)[0]}</small>
                  {lock ? (
                    lockView(lock)
                  ) : owned > 0 ? (
                    <span className="chip good">In stock ×{owned}</span>
                  ) : (
                    <span className="tag">
                      <Icon.coin /> {stockPrice(p.id)}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        <div className="bench-foot">
          <Btn tone="blue" ui="builder.test" onClick={() => { openTest(testRun(evalInputFor(draft))); showTip('testrun') }}>
            <Icon.play /> Test run
          </Btn>
          <Btn tone="yellow" ui="builder.pad" onClick={() => setScreen('launchPrep')}>
            To the pad <Icon.rocket />
          </Btn>
        </div>
      </div>

      {ghost && (
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <PartIcon part={ghost.part} />
        </div>
      )}
      {why && <WhyModal bar={ev.bars[why]} onClose={() => openWhy(null)} />}
      {test && <TestRunModal result={test} onClose={() => openTest(null)} onPad={() => { openTest(null); setScreen('launchPrep') }} />}
      {tip && <CoachTip key={tip} text={TIPS[tip].text} onDone={() => setTip(null)} />}
    </div>
  )
}
