import { useState } from 'react'
import { ORDER_TEMPLATES } from '../data/lab'
import { RAW_DATA_WORDS } from '../data/rules'
import type { ContractDef } from '../data/types'
import { canFillOrder } from '../state/economy'
import { useGame } from '../state/game'
import { acceptContract, boardContracts } from '../state/mission'
import { useUi } from '../state/ui'
import { Stars } from './Builder'
import { OrdersList } from './EconomySheets'
import { Icon } from './icons'
import { Bar, Btn, Empty, LockBadge, Tabs, Win, useNow } from './kit'
import { CONTRACT_BY_ID } from '../data/contracts'

const DIFFICULTY = [
  { word: 'Easy', ink: 'go' },
  { word: 'Medium', ink: 'amber' },
  { word: 'Stretch', ink: '' },
] as const

/** The client's seal: their initials in a ring of ink. */
function Seal({ client, ink }: { client: string; ink: string }) {
  const initials = client
    .split(/\s+/)
    .filter((w) => /^[A-Z0-9]/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
  return (
    <span className={`seal ${ink}`} aria-hidden>
      {initials}
    </span>
  )
}

function ContractNote({ c, stars, locked, why }: { c: ContractDef; stars: number | null; locked: boolean; why: string | null }) {
  const draft = useGame((s) => s.draft)
  const inProgress = draft?.contractId === c.id
  const d = DIFFICULTY[c.difficulty - 1]
  return (
    <article className={`note contract${locked ? ' locked' : ''}`} data-ui={`contracts.note.${c.id}`}>
      <Seal client={c.client} ink={d.ink} />
      <b className="t-label">{c.title}</b>
      <small className="t-small">
        {c.client} · {c.region}
      </small>
      <p className="t-body">{c.brief}</p>
      <div className="chips">
        <span className={`chip ${c.difficulty === 1 ? 'good' : c.difficulty === 2 ? 'warn' : 'bad'}`}>{d.word}</span>
        <span className="chip blue">
          <Icon.target /> {c.scienceTarget.toLocaleString('en-US')} science
        </span>
        <span className="chip">
          <Icon.camera /> {RAW_DATA_WORDS[c.acceptedData[0]].plural}
        </span>
        <span className="chip">
          <Icon.time /> {c.deadlineMonths} months
        </span>
      </div>
      <div className="chips rewards">
        <span className="chip gold">
          <Icon.coin /> {c.baseFee.toLocaleString('en-US')} + {c.payPerScience} per science
        </span>
        <span className="chip good">
          <Icon.budget /> {c.grant.toLocaleString('en-US')} grant
        </span>
      </div>
      <footer>
        {stars !== null ? <Stars n={stars} /> : <span className="t-small">Not flown yet</span>}
        {locked ? (
          why && !/^Agency level/.test(why) ? (
            <LockBadge text={why} />
          ) : (
            <LockBadge level={c.unlockLevel} />
          )
        ) : (
          <Btn sound={null} ui={`contracts.accept.${c.id}`} onClick={() => acceptContract(c.id)}>
            {inProgress ? 'Keep building' : stars !== null ? 'Fly again' : 'Take the job'}
          </Btn>
        )}
      </footer>
    </article>
  )
}

/** The clipboard beside the board: the mission on the bench and the satellites still working. */
function ActiveClipboard() {
  const draft = useGame((s) => s.draft)
  const sats = useGame((s) => s.satellites)
  return (
    <aside className="mini-clipboard" data-ui="contracts.active">
      <span className="clip" aria-hidden />
      <p className="eyebrow">On the bench</p>
      {draft ? (
        <div className="slip">
          <b className="t-label">{CONTRACT_BY_ID[draft.contractId].title}</b>
          <small className="t-small">{draft.design.parts.length} parts fitted</small>
          <Btn tone="yellow" size="sm" block sound={null} ui="contracts.active.resume" onClick={() => acceptContract(draft.contractId)}>
            <Icon.satellite /> Keep building
          </Btn>
        </div>
      ) : (
        <Empty icon="clipboard">No mission in the works. Take a job from the board.</Empty>
      )}
      <p className="eyebrow">In orbit</p>
      {sats.length === 0 ? (
        <p className="t-small">No satellites up there yet.</p>
      ) : (
        sats.slice(0, 3).map((s) => (
          <div key={s.id} className="slip sat">
            <b className="t-small">{s.name}</b>
            <Bar value={s.daysLeft / s.daysTotal} tone="blue" />
          </div>
        ))
      )}
    </aside>
  )
}

/** Mission Control's corkboard: big contracts and small orders, pinned up as paper notes. */
export function ContractBoard() {
  const close = useUi((s) => s.close)
  const [tab, setTab] = useState<'contracts' | 'orders'>('contracts')
  // re-read when progress changes
  useGame((s) => s.bestStars)
  useGame((s) => s.level)
  const orders = useGame((s) => s.orders)
  const items = useGame((s) => s.items)
  const now = useNow(1000)
  const ready = orders.filter((o) => o.readyAt <= now && canFillOrder(ORDER_TEMPLATES.find((t) => t.id === o.templateId)!, items)).length
  return (
    <Win
      id="contracts"
      title="Mission Control"
      subtitle={tab === 'contracts' ? 'Pick a job, then design the satellite for it' : 'Quick jobs, filled from the Science Lab'}
      icon={<Icon.clipboard />}
      onClose={close}
      variant="wide"
      theme="cork"
      coins
      tabs={
        <Tabs
          ui="contracts.tab"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'contracts', label: 'Contracts', icon: 'rocket' },
            { id: 'orders', label: 'Small orders', icon: 'bag', count: ready },
          ]}
        />
      }
    >
      <div className="board">
        <ActiveClipboard />
        {tab === 'contracts' ? (
          <div className="notes stagger">
            {boardContracts().map(({ contract, stars, locked, why }) => (
              <ContractNote key={contract.id} c={contract} stars={stars} locked={locked} why={why} />
            ))}
          </div>
        ) : (
          <OrdersList />
        )}
      </div>
    </Win>
  )
}
