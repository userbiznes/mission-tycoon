import { useEffect, useState, type ReactNode } from 'react'
import { BUILDINGS } from '../data/buildings'
import type { BuildingId } from '../data/layout'
import { startConstruction } from '../state/actions'
import { useGame } from '../state/game'
import { useUi } from '../state/ui'
import { Icon, type IconName } from './icons'
import { Btn, Meter, Sheet, Tabs, formatTime, useNow } from './kit'

export const BUILDING_ICON: Record<BuildingId, IconName> = {
  missionControl: 'clipboard',
  partsMarket: 'market',
  integrationBay: 'satellite',
  commsCenter: 'dish',
  launchPad: 'rocket',
  scienceLab: 'flask',
  engineeringLab: 'wrench',
  crewQuarters: 'bed',
}

type Tab = 'status' | 'crew' | 'upgrade' | 'tasks'

export function Price({ amount }: { amount: number }) {
  const coins = useGame((s) => s.coins)
  return (
    <span className={`price${coins < amount ? ' short' : ''}`}>
      <Icon.coin />
      {amount.toLocaleString('en-US')}
    </span>
  )
}

/** Countdown row with a meter, used for construction and other timers. */
export function TimerRow({ label, start, end, icon }: { label: string; start: number; end: number; icon?: ReactNode }) {
  const now = useNow(200)
  const k = Math.min(1, (now - start) / Math.max(1, end - start))
  return (
    <div className="b-row card">
      {icon}
      <div className="grow">
        <b>{label}</b>
        <Meter value={k} tone="blue" />
      </div>
      <span className="chip blue">
        <Icon.clock /> {formatTime(end - now)}
      </span>
    </div>
  )
}

function UpgradeTab({ id }: { id: BuildingId }) {
  const b = useGame((s) => s.buildings[id])
  const level = useGame((s) => s.level)
  const coins = useGame((s) => s.coins)
  const toast = useUi((s) => s.toast)
  const def = BUILDINGS[id]
  const next = def.upgrades.find((u) => u.level === b.level + 1)
  if (b.buildEnd && b.buildStart) {
    return <TimerRow label={`Upgrading to level ${b.buildTo}`} start={b.buildStart} end={b.buildEnd} icon={<Icon.hammer className="ic" />} />
  }
  if (!next) return <p className="empty-note">Fully upgraded. Looking sharp!</p>
  const locked = level < next.needsLevel
  return (
    <div className="b-status">
      <div className="b-row card">
        <Icon.up className="ic" />
        <div className="grow">
          <b>Level {next.level}</b>
          <small>{next.perk}</small>
        </div>
      </div>
      <div className="b-row">
        <span className="chip">
          <Icon.clock /> {next.seconds}s
        </span>
        <span className="grow" />
        {locked ? (
          <span className="chip warn">
            <Icon.lock /> Needs agency level {next.needsLevel}
          </span>
        ) : (
          <Btn
            tone="yellow"
            disabled={coins < next.cost}
            onClick={() => {
              const err = startConstruction(id)
              if (err) toast(err, 'bad')
            }}
          >
            Upgrade <Price amount={next.cost} />
          </Btn>
        )}
      </div>
    </div>
  )
}

/**
 * Bottom sheet for a tapped building: Status, Crew, Upgrade, Tasks.
 * `status`, `crew` and `tasks` content is supplied per building by the caller.
 */
export function BuildingSheet({
  id,
  status,
  crew,
  tasks,
  onAction,
  actionDisabled,
}: {
  id: BuildingId
  status?: ReactNode
  crew?: ReactNode
  tasks?: ReactNode
  onAction?: () => void
  actionDisabled?: boolean
}) {
  const close = useUi((s) => s.close)
  const b = useGame((s) => s.buildings[id])
  const def = BUILDINGS[id]
  const [tab, setTab] = useState<Tab>('status')
  const I = Icon[BUILDING_ICON[id]]
  return (
    <Sheet
      title={def.name}
      subtitle={`Level ${b.level} · ${def.role}`}
      icon={<I />}
      onClose={close}
      clearScrim
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'status', label: 'Status' },
            { id: 'crew', label: 'Crew' },
            { id: 'upgrade', label: 'Upgrade' },
            { id: 'tasks', label: 'Tasks' },
          ]}
        />
      }
      foot={
        tab === 'status' && onAction ? (
          <Btn block size="lg" onClick={onAction} disabled={actionDisabled}>
            {def.action}
          </Btn>
        ) : undefined
      }
    >
      {tab === 'status' && (
        <div className="b-status">
          <p className="b-blurb">{def.blurb}</p>
          {status}
        </div>
      )}
      {tab === 'crew' && (crew ?? <p className="empty-note">No crew posted here yet. Build the Crew Quarters to hire people.</p>)}
      {tab === 'upgrade' && <UpgradeTab id={id} />}
      {tab === 'tasks' && (tasks ?? <p className="empty-note">Nothing running here right now.</p>)}
    </Sheet>
  )
}

/** Sheet for an empty plot: pick the blueprint and build. */
export function BuildSheet({ id }: { id: BuildingId }) {
  const close = useUi((s) => s.close)
  const showTip = useUi((s) => s.showTip)
  useEffect(() => showTip('construction'), [showTip])
  const toast = useUi((s) => s.toast)
  const level = useGame((s) => s.level)
  const coins = useGame((s) => s.coins)
  const b = useGame((s) => s.buildings[id])
  const def = BUILDINGS[id]
  const I = Icon[BUILDING_ICON[id]]
  const locked = level < def.needsLevel
  const building = !!b.buildEnd
  return (
    <Sheet title={building ? `Building: ${def.name}` : 'Build here'} subtitle={building ? 'The crew is on it' : 'An empty plot, ready for a blueprint'} icon={<Icon.hammer />} onClose={close} clearScrim>
      {building && b.buildStart && b.buildEnd ? (
        <TimerRow label="Construction" start={b.buildStart} end={b.buildEnd} icon={<Icon.hammer className="ic" />} />
      ) : (
        <div className="b-status">
          <div className="b-row card">
            <I className="ic" />
            <div className="grow">
              <b>{def.name}</b>
              <small>{def.blurb}</small>
            </div>
          </div>
          <div className="b-row">
            <span className="chip">
              <Icon.clock /> {def.buildSeconds}s
            </span>
            <span className="grow" />
            {locked ? (
              <span className="chip warn">
                <Icon.lock /> Needs agency level {def.needsLevel}
              </span>
            ) : (
              <Btn
                tone="yellow"
                disabled={coins < def.buildCost}
                onClick={() => {
                  const err = startConstruction(id)
                  if (err) toast(err, 'bad')
                  else close()
                }}
              >
                Build <Price amount={def.buildCost} />
              </Btn>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
