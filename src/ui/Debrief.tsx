import { useEffect, useMemo, useRef } from 'react'
import { RAW_UNIT_MB } from '../data/lab'
import { RAW_DATA_WORDS } from '../data/rules'
import type { RawDataType } from '../data/types'
import { currentResult, endMission, settleMission } from '../state/mission'
import { useUi } from '../state/ui'
import { yearsWords } from '../sim'
import { ReasonList, Stars } from './Builder'
import { Icon } from './icons'
import { Btn, Ticker } from './kit'
import { sfx } from './sound'

const HEADLINE = ['Tough flight', 'Mission complete', 'Good mission!', 'Perfect mission!']

/**
 * The debrief: a mission report in a folder. The stars are stamped in one by
 * one, then the three reasons why, then the money, and last a rubber stamp:
 * MISSION COMPLETE or MISSION FAILED.
 */
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
    // one thump per star as it lands
    for (let i = 0; i < result.stars; i++) setTimeout(() => sfx('star'), 420 + i * 420)
    const el = document.querySelector('.phone')!.getBoundingClientRect()
    if (p.feePaid + p.sciencePay > 0) setTimeout(() => fly('coin', 8, el.width * 0.72, el.height * 0.5), 2600)
    if (result.xp > 0) setTimeout(() => fly('xp', Math.min(6, result.stars * 2), el.width * 0.28, el.height * 0.3), 1700)
    setTimeout(() => sfx('snap'), 3500)
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
  const failed = result.stars === 0

  return (
    <div className="flow debrief" data-ui="debrief">
      <div className="folder">
        <span className="folder-tab">Mission report · {result.evaluation.contract.title}</span>
        <div className="folder-pages">
          <section className="sheet-page" data-ui="debrief.result">
            <h1 className="headline">{HEADLINE[result.stars]}</h1>
            <div data-ui="debrief.stars">
              <Stars n={result.stars} big stamp />
            </div>
            <div className="chips star-notes reveal r1">
              {result.starList.map((s) => (
                <span key={s.id} className={`chip ${s.earned ? 'good' : 'bad'}`} title={s.note}>
                  {s.earned ? <Icon.star /> : <Icon.starEmpty />} {s.label}
                </span>
              ))}
            </div>
            <div className="reveal r2">
              <p className="eyebrow">Why it went this way</p>
              <ReasonList result={result} ui="debrief.reason" />
            </div>
          </section>

          <section className="sheet-page" data-ui="debrief.money">
            <div className="reveal r3">
              <p className="eyebrow">The money</p>
              <div className="payout">
                {rows.map(([label, v]) => (
                  <div key={label} className="row">
                    <span>{label}</span>
                    <b className={v < 0 ? 'neg' : ''}>
                      {v < 0 ? '−' : '+'}
                      {Math.abs(v).toLocaleString('en-US')}
                    </b>
                  </div>
                ))}
                <div className="row total" data-ui="debrief.profit">
                  <span>Profit</span>
                  <b className={p.profit < 0 ? 'neg' : 'pos'}>
                    {p.profit < 0 ? '−' : '+'}
                    <Ticker value={Math.abs(p.profit)} />
                  </b>
                </div>
                <div className="row">
                  <span>Agency XP</span>
                  <b className="xp">+{result.xp}</b>
                </div>
                <span className={`stamp verdict in ${failed ? '' : 'go'}`}>{failed ? 'Mission failed' : 'Mission complete'}</span>
              </div>
            </div>

            <div className="reveal r4">
              <p className="eyebrow">Closest real NASA mission</p>
              <div className="card lrow match" data-ui="debrief.match">
                <Icon.satellite className="ic" />
                <div className="grow">
                  <b className="t-label">
                    {result.match.mission.name} <i>({result.match.mission.year})</i>
                  </b>
                  <p className="t-small">{result.match.mission.about}</p>
                  {result.match.shared.length > 0 && <small className="t-small">Like yours: {result.match.shared.join(', ')}.</small>}
                </div>
              </div>

              <p className="eyebrow">Still up there</p>
              <div className="card lrow match">
                <Icon.globe className="ic" />
                <div className="grow">
                  {raw.length ? (
                    <p className="t-small">
                      Your satellite stays in orbit for about <b>{yearsWords(result.lifetimeYears)}</b> and keeps sending {raw.map(([k, v]) => `${Math.max(1, Math.round(v / RAW_UNIT_MB[k]))} ${RAW_DATA_WORDS[k].item}${v / RAW_UNIT_MB[k] >= 1.5 ? 's' : ''} a day`).join(' and ')} to the Comms Center.
                    </p>
                  ) : (
                    <p className="t-small">This satellite can't send anything home, so it won't feed the lab.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <footer className="flow-foot">
        <Btn tone="blue" ui="debrief.relaunch" onClick={() => endMission(true)}>
          <Icon.wrench /> Fix and relaunch
        </Btn>
        <Btn ui="debrief.home" onClick={() => endMission(false)}>
          Collect and go home <Icon.home />
        </Btn>
      </footer>
    </div>
  )
}
