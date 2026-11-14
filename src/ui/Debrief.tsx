import { useEffect, useMemo, useRef } from 'react'
import { RAW_UNIT_MB } from '../data/lab'
import { RAW_DATA_WORDS } from '../data/rules'
import type { RawDataType } from '../data/types'
import { currentResult, endMission, settleMission } from '../state/mission'
import { useUi } from '../state/ui'
import { yearsWords } from '../sim'
import { ReasonList, Stars } from './Builder'
import { Icon } from './icons'
import { Btn } from './kit'
import { sfx } from './sound'

const HEADLINE = ['Tough flight', 'Mission complete', 'Good mission!', 'Perfect mission!']

/** The debrief: stars, the top three reasons why, the money, and the closest real mission. */
export function Debrief() {
  const result = useMemo(() => currentResult()!, [])
  const settled = useRef(false)
  const fly = useUi((s) => s.fly)
  const p = result.payout

  useEffect(() => {
    if (settled.current) return
    settled.current = true
    settleMission(result)
    sfx(result.stars >= 2 ? 'success' : 'pop')
    const el = document.querySelector('.phone')!.getBoundingClientRect()
    if (p.feePaid + p.sciencePay > 0) fly('coin', 8, el.width / 2, el.height * 0.55)
    if (result.xp > 0) setTimeout(() => fly('xp', Math.min(6, result.stars * 2), el.width / 2, el.height * 0.3), 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows: [string, number][] = [
    ['Base fee' + (p.feeKept < 1 ? ` (${Math.round(p.feeKept * 100)}% paid)` : ''), p.feePaid],
    ['Science delivered', p.sciencePay],
    ['Grant', p.grant],
    ['Parts', -p.parts],
    ['Launch', -p.launch],
  ]
  if (p.stations) rows.push(['Ground stations', -p.stations])
  if (p.salaries) rows.push(['Crew salaries', -p.salaries])
  if (p.eventCosts) rows.push(['Decisions', -p.eventCosts])
  const raw = Object.entries(result.production.mbPerDay).filter(([, v]) => (v ?? 0) > 0) as [RawDataType, number][]

  return (
    <div className="flow debrief">
      <div className="flow-body">
        <p className="eyebrow center">{result.evaluation.contract.title} · debrief</p>
        <h1 className="headline">{HEADLINE[result.stars]}</h1>
        <Stars n={result.stars} big />
        <div className="star-notes">
          {result.starList.map((s) => (
            <span key={s.id} className={`chip ${s.earned ? 'good' : 'bad'}`} title={s.note}>
              {s.earned ? <Icon.star /> : <Icon.starEmpty />} {s.label}
            </span>
          ))}
        </div>

        <p className="eyebrow">Why it went this way</p>
        <ReasonList result={result} />

        <p className="eyebrow">The money</p>
        <div className="payout card">
          {rows.map(([label, v]) => (
            <div key={label} className="row">
              <span>{label}</span>
              <b className={v < 0 ? 'neg' : ''}>
                {v < 0 ? '−' : '+'}
                {Math.abs(v).toLocaleString('en-US')}
              </b>
            </div>
          ))}
          <div className="row total">
            <span>Profit</span>
            <b className={p.profit < 0 ? 'neg' : 'pos'}>
              {p.profit < 0 ? '−' : '+'}
              {Math.abs(p.profit).toLocaleString('en-US')}
            </b>
          </div>
          <div className="row">
            <span>Agency XP</span>
            <b className="xp">+{result.xp}</b>
          </div>
        </div>

        <p className="eyebrow">Closest real NASA mission</p>
        <div className="match card">
          <Icon.satellite className="ic" />
          <div>
            <b>
              {result.match.mission.name} <i>({result.match.mission.year})</i>
            </b>
            <p>{result.match.mission.about}</p>
            {result.match.shared.length > 0 && <small>Like yours: {result.match.shared.join(', ')}.</small>}
          </div>
        </div>

        <p className="eyebrow">Still up there</p>
        <div className="match card">
          <Icon.globe className="ic" />
          <div>
            {raw.length ? (
              <p>
                Your satellite stays in orbit for about <b>{yearsWords(result.lifetimeYears)}</b> and keeps sending{' '}
                {raw.map(([k, v]) => `${Math.max(1, Math.round(v / RAW_UNIT_MB[k]))} ${RAW_DATA_WORDS[k].item}${v / RAW_UNIT_MB[k] >= 1.5 ? 's' : ''} a day`).join(' and ')} to the Comms Center.
              </p>
            ) : (
              <p>This satellite can't send anything home, so it won't feed the lab.</p>
            )}
          </div>
        </div>
      </div>
      <footer className="flow-foot">
        <Btn tone="blue" onClick={() => endMission(true)}>
          <Icon.wrench /> Fix and relaunch
        </Btn>
        <Btn onClick={() => endMission(false)}>Back to base</Btn>
      </footer>
    </div>
  )
}
