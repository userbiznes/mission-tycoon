import { RAW_DATA_WORDS } from '../data/rules'
import type { ContractDef } from '../data/types'
import { useGame } from '../state/game'
import { acceptContract, boardContracts } from '../state/mission'
import { useUi } from '../state/ui'
import { Stars } from './Builder'
import { Icon } from './icons'
import { useState } from 'react'
import { OrdersList } from './EconomySheets'
import { Btn, Sheet, Tabs } from './kit'

function ContractCard({ c, stars, locked, why }: { c: ContractDef; stars: number | null; locked: boolean; why: string | null }) {
  const draft = useGame((s) => s.draft)
  const inProgress = draft?.contractId === c.id
  return (
    <div className={`contract card${locked ? ' locked' : ''}`}>
      <div className="pin" aria-hidden />
      <div className="c-top">
        <div className="grow">
          <b>{c.title}</b>
          <small>
            {c.client} · {c.region}
          </small>
        </div>
        <span className={`chip ${c.difficulty === 1 ? 'good' : c.difficulty === 2 ? 'warn' : 'bad'}`}>{['Easy', 'Medium', 'Stretch'][c.difficulty - 1]}</span>
      </div>
      <p>{c.brief}</p>
      <div className="c-facts">
        <span className="chip blue">
          <Icon.target /> {c.scienceTarget.toLocaleString('en-US')} science
        </span>
        <span className="chip">
          <Icon.camera /> {RAW_DATA_WORDS[c.acceptedData[0]].plural}
        </span>
        <span className="chip">
          <Icon.coin /> {c.baseFee.toLocaleString('en-US')} + {c.payPerScience}/science
        </span>
        <span className="chip">
          <Icon.time /> {c.deadlineMonths} months
        </span>
        <span className="chip good">
          <Icon.budget /> {c.grant.toLocaleString('en-US')} grant
        </span>
      </div>
      <div className="c-foot">
        {stars !== null ? <Stars n={stars} /> : <span className="muted">Not flown yet</span>}
        {locked ? (
          <span className="chip warn">
            <Icon.lock /> {why ?? `Agency level ${c.unlockLevel}`}
          </span>
        ) : (
          <Btn size="sm" sound={null} onClick={() => acceptContract(c.id)}>
            {inProgress ? 'Keep building' : stars !== null ? 'Fly again' : 'Take the job'}
          </Btn>
        )}
      </div>
    </div>
  )
}

/** Mission Control's boards: big contracts and small orders. */
export function ContractBoard() {
  const close = useUi((s) => s.close)
  const [tab, setTab] = useState<'contracts' | 'orders'>('contracts')
  // re-read when progress changes
  useGame((s) => s.bestStars)
  useGame((s) => s.level)
  return (
    <Sheet
      title="Mission Control"
      subtitle={tab === 'contracts' ? 'Pick a job, then design the satellite for it' : 'Quick jobs, filled from the Science Lab'}
      icon={<Icon.clipboard />}
      onClose={close}
      tall
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'contracts', label: 'Contracts' },
            { id: 'orders', label: 'Small orders' },
          ]}
        />
      }
    >
      {tab === 'contracts' ? (
        <div className="contracts">
          {boardContracts().map(({ contract, stars, locked, why }) => (
            <ContractCard key={contract.id} c={contract} stars={stars} locked={locked} why={why} />
          ))}
        </div>
      ) : (
        <OrdersList />
      )}
    </Sheet>
  )
}
