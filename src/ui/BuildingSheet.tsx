import { type ReactNode } from 'react'
import { BUILDINGS } from '../data/buildings'
import { type BuildingId } from '../data/layout'
import { startConstruction } from '../state/actions'
import { useGame } from '../state/game'
import { usePlacement } from '../state/placement'
import { useUi } from '../state/ui'
import { Icon, type IconName } from './icons'
import { Btn, Empty, LockBadge, PayBtn, TimerRow, Win } from './kit'
import { Thumb } from './thumbs'

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

/** What the next level of a building brings, what it costs, or how far along it is. */
function UpgradeBox({ id }: { id: BuildingId }) {
  const b = useGame((s) => s.buildings[id])
  const level = useGame((s) => s.level)
  const toast = useUi((s) => s.toast)
  const def = BUILDINGS[id]
  const next = def.upgrades.find((u) => u.level === b.level + 1)
  if (b.buildEnd && b.buildStart) {
    return <TimerRow label={`Upgrading to level ${b.buildTo}`} start={b.buildStart} end={b.buildEnd} icon={<Icon.hammer />} />
  }
  if (!next) {
    return (
      <div className="card">
        <Empty icon="check" row>
          Fully upgraded. Looking sharp!
        </Empty>
      </div>
    )
  }
  const locked = level < next.needsLevel
  return (
    <div className={`card upgrade-box${locked ? ' locked' : ''}`} data-ui={`building.${id}.upgrade`}>
      <span className="up-ico">
        <Icon.up />
      </span>
      <div className="grow">
        <b className="t-label">Upgrade to level {next.level}</b>
        <p className="t-small">{next.perk}</p>
        <span className="chip">
          <Icon.clock /> takes {next.seconds}s
        </span>
      </div>
      {locked ? (
        <LockBadge level={next.needsLevel} />
      ) : (
        <PayBtn
          price={next.cost}
          ui={`building.${id}.upgrade.pay`}
          onPay={() => {
            const err = startConstruction(id)
            if (err) toast(err, 'bad')
          }}
        >
          Upgrade
        </PayBtn>
      )}
    </div>
  )
}

/**
 * A building's own menu: a large panel on one side, with the island still in
 * view beside it. The picture is the building itself, drawn from its 3D model.
 * `status` is supplied per building (the Comms Center's console, for one).
 */
export function BuildingSheet({ id, status, onAction, actionDisabled }: { id: BuildingId; status?: ReactNode; onAction?: () => void; actionDisabled?: boolean }) {
  const close = useUi((s) => s.close)
  const b = useGame((s) => s.buildings[id])
  const def = BUILDINGS[id]
  const I = Icon[BUILDING_ICON[id]]
  return (
    <Win
      id={`building.${id}`}
      title={def.name}
      icon={<I />}
      subtitle={def.role}
      onClose={close}
      clearScrim
      coins
      variant="side"
      theme={id === 'commsCenter' ? 'console' : 'building'}
      foot={
        <>
          <Btn tone="cream" className="fit" ui={`building.${id}.move`} onClick={() => usePlacement.getState().begin(id, false)}>
            <Icon.move /> Move
          </Btn>
          {onAction && (
            <Btn tone="yellow" onClick={onAction} disabled={actionDisabled} ui={`building.${id}.action`}>
              {def.action}
            </Btn>
          )}
        </>
      }
    >
      <div className="b-hero">
        <Thumb model={`building:${id}:${Math.max(1, b.level)}`} icon={BUILDING_ICON[id]} size="big" />
        <div className="grow">
          <span className="level-chip">
            Level <b>{b.level}</b>
          </span>
          <b className="t-small role">{def.role}</b>
          <p className="t-body">{def.blurb}</p>
        </div>
      </div>
      <div className="b-stack stagger">
        {status}
        <UpgradeBox id={id} />
      </div>
    </Win>
  )
}
