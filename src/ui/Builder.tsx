import { useMemo, useRef, useState } from 'react'
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
import { Btn, Meter, Modal } from './kit'
import { CATEGORY_ICON, PartIcon, partStats } from './parts'
import { RoccoBust } from './Rocco'
import { sfx } from './sound'
import { Turntable } from './Turntable'

export const BAR_ICON: Record<ResourceKey, IconName> = {
  mass: 'mass',
  power: 'bolt',
  budget: 'budget',
  data: 'data',
  comms: 'comms',
  time: 'time',
}

function BarTile({ bar, onWhy }: { bar: ResourceBar; onWhy: () => void }) {
  const I = Icon[BAR_ICON[bar.key as ResourceKey]]
  const subs = bar.sub?.length ? bar.sub : [bar]
  return (
    <button type="button" className={`bar-tile ${bar.status}`} onClick={onWhy}>
      <I className="ic" />
      <div className="grow">
        <b>
          {bar.label}
          <span className="why">Why?</span>
        </b>
        {subs.map((s) => (
          <Meter key={s.key} value={s.fill} tone={s.status} />
        ))}
        <small>{bar.detail}</small>
      </div>
    </button>
  )
}

export function WhyModal({ bar, onClose }: { bar: ResourceBar; onClose: () => void }) {
  const why = WHY[bar.key as ResourceKey]
  const I = Icon[BAR_ICON[bar.key as ResourceKey]]
  return (
    <Modal onClose={onClose}>
      <div className="why-head">
        <I />
        <h2>{why.title}</h2>
      </div>
      <p className="why-now">
        <b>Right now:</b> {bar.detail}
        {bar.reason ? `. ${bar.reason}.` : '.'}
      </p>
      <p className="why-rule">{why.rule}</p>
      <p>{why.basis}</p>
      <p className="muted why-src">{why.source}</p>
      <Btn block onClick={onClose}>
        Got it
      </Btn>
    </Modal>
  )
}

export function Stars({ n, big }: { n: number; big?: boolean }) {
  return (
    <div className={`stars${big ? ' big' : ''}`}>
      {[0, 1, 2].map((i) => (i < n ? <Icon.star key={i} style={{ animationDelay: `${i * 0.18}s` }} className="on" /> : <Icon.starEmpty key={i} />))}
    </div>
  )
}

export function ReasonList({ result }: { result: MissionResult }) {
  return (
    <div className="reasons">
      {result.reasons.map((r, i) => (
        <div key={r.id + i} className={`reason ${r.tone}`}>
          <span className="n">{i + 1}</span>
          <div>
            <p>{r.text}</p>
            {r.fix && <small>{r.fix}</small>}
          </div>
        </div>
      ))}
    </div>
  )
}

function TestRunModal({ result, onClose, onPad }: { result: MissionResult; onClose: () => void; onPad: () => void }) {
  const blocked = !result.evaluation.canLaunch
  return (
    <Modal onClose={onClose}>
      <p className="eyebrow">Test run · free · nothing is spent</p>
      <h2>Predicted result</h2>
      <Stars n={result.stars} big />
      <div className="star-notes">
        {result.starList.map((s) => (
          <span key={s.id} className={`chip ${s.earned ? 'good' : 'bad'}`}>
            {s.earned ? <Icon.star /> : <Icon.starEmpty />} {s.label}
          </span>
        ))}
      </div>
      <p className="eyebrow">Why</p>
      <ReasonList result={result} />
      {blocked && <p className="blocker">Can't launch yet: {result.evaluation.blockers[0]}</p>}
      <div className="modal-actions">
        <Btn tone="cream" onClick={onClose}>
          Keep building
        </Btn>
        <Btn onClick={onPad} disabled={blocked}>
          To the pad
        </Btn>
      </div>
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
    if (TIPS[id] && markTip(id)) setTip(id)
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

  return (
    <div className="builder" ref={rootRef}>
      <header className="b-head">
        <Btn tone="cream" round sound="close" onClick={() => setScreen(null)} aria-label="Back to base">
          <Icon.back style={{ filter: 'invert(0.75)' }} />
        </Btn>
        <div className="grow">
          <b>{contract.title}</b>
          <small>{contract.objective}</small>
        </div>
        <span className="chip blue">
          <Icon.target /> {contract.scienceTarget.toLocaleString('en-US')}
        </span>
      </header>

      <div className="bars">
        {ev.barList.map((b) => (
          <BarTile key={b.key} bar={b} onWhy={() => setWhy(b.key as ResourceKey)} />
        ))}
      </div>
      <p className={`issue ${worst ? worst.status : 'ok'}`}>{worst ? worst.text : draft.design.parts.length ? 'Every bar is green. Try a test run!' : 'Drag parts onto the satellite. Start with power.'}</p>

      <div className="stage3d" ref={stageRef}>
        <Turntable design={draft.design} />
        <span className="slots chip">
          {ev.slots.used}/{ev.slots.total} slots
        </span>
        <div className="installed">
          {Object.keys(counts).map((id) => (
            <button key={id} type="button" className="chip" onClick={() => remove(id)}>
              {PART_BY_ID[id].name}
              {counts[id] > 1 ? ` ×${counts[id]}` : ''} <i>×</i>
            </button>
          ))}
        </div>
      </div>

      <div className="tray">
        <nav className="stalls">
          {PART_CATEGORIES.map((c) => {
            const CI = Icon[CATEGORY_ICON[c.id]]
            return (
              <button key={c.id} type="button" className={`stall${cat === c.id ? ' on' : ''}`} onClick={() => { sfx('tap'); setCat(c.id) }} aria-label={c.name}>
                <CI />
                <span>{c.name}</span>
              </button>
            )
          })}
        </nav>
        <div className="tray-cards">
          {partsInCategory(cat).map((p) => {
            const lock = lockOf(p)
            const owned = (inventory[p.id] ?? 0) - (counts[p.id] ?? 0) - (draft.design.busId === p.id ? 1 : 0)
            const isBus = draft.design.busId === p.id
            return (
              <div
                key={p.id}
                className={`tray-card${lock ? ' locked' : ''}${isBus ? ' current' : ''}`}
                onPointerDown={(e) => onCardDown(e, p)}
                onPointerMove={onCardMove}
                onPointerUp={onCardUp}
                onPointerCancel={() => { drag.current = null; setGhost(null) }}
              >
                <PartIcon part={p} />
                <b>{p.name}</b>
                <small>{partStats(p).slice(1, 3).join(' · ') || partStats(p)[0]}</small>
                {lock ? (
                  <span className="lock">
                    <Icon.lock /> {lock}
                  </span>
                ) : owned > 0 ? (
                  <span className="have">In stock ×{owned}</span>
                ) : (
                  <span className="cost">
                    <Icon.coin /> {stockPrice(p.id)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="b-foot">
          <Btn tone="blue" onClick={() => { setTest(testRun(evalInputFor(draft))); if (markTip('testrun')) setTip('testrun') }}>
            <Icon.play /> Test run
          </Btn>
          <Btn onClick={() => setScreen('launchPrep')}>
            To the pad <Icon.rocket />
          </Btn>
        </div>
      </div>

      {ghost && (
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <PartIcon part={ghost.part} />
        </div>
      )}
      {why && <WhyModal bar={ev.bars[why]} onClose={() => setWhy(null)} />}
      {test && !tip && <TestRunModal result={test} onClose={() => setTest(null)} onPad={() => { setTest(null); setScreen('launchPrep') }} />}
      {tip && (
        <div className="tip-pop" onClick={() => setTip(null)}>
          <div className="panel">
            <RoccoBust mood={TIPS[tip].mood} />
            <p>{TIPS[tip].text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
