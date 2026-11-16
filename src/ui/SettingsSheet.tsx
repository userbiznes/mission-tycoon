import { useState, type ReactNode } from 'react'
import { useGame } from '../state/game'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { replayTutorial, skipTutorial } from '../tutorial/director'
import { Icon } from './icons'
import { Btn, Toggle, Win } from './kit'

function Row({ icon, tint, title, note, children }: { icon: ReactNode; tint: string; title: string; note: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <span className="set-ico" style={{ background: tint }}>
        {icon}
      </span>
      <div className="grow">
        <b className="t-label">{title}</b>
        <p className="t-small">{note}</p>
      </div>
      {children}
    </div>
  )
}

/** Settings: a tidy notebook page with chunky switches. */
export function SettingsSheet() {
  const close = useUi((s) => s.close)
  const settings = useSettings()
  const reset = useGame((s) => s.reset)
  const [confirm, setConfirm] = useState(false)
  const touring = useGame((s) => s.tourStep >= 0)
  return (
    <Win id="settings" title="Settings" icon={<Icon.gear />} onClose={close} variant="mid" theme="notebook">
      <div className="notebook stagger">
        <Row icon={<Icon.fast />} tint="#bfe3ff" title="Fast mode" note="All timers run 4× faster. Handy for judges.">
          <Toggle on={settings.fastMode} onChange={(v) => settings.set({ fastMode: v })} label="Fast mode" ui="settings.fast" />
        </Row>
        <Row icon={<Icon.sound />} tint="#ffe6a3" title="Sound" note="Blips, pops and rocket rumble.">
          <Toggle on={settings.sound} onChange={(v) => settings.set({ sound: v })} label="Sound" ui="settings.sound" />
        </Row>
        <Row icon={<Icon.music />} tint="#ffd9ec" title="Music" note="A quiet tune in the background.">
          <Toggle on={settings.music} onChange={(v) => settings.set({ music: v })} label="Music" ui="settings.music" />
        </Row>
        <Row icon={<Icon.wind />} tint="#d9f4c6" title="Reduce motion" note="No bouncing or sliding: menus just appear.">
          <Toggle on={settings.reduceMotion} onChange={(v) => settings.set({ reduceMotion: v })} label="Reduce motion" ui="settings.motion" />
        </Row>
        <Row icon={<Icon.bolt />} tint="#ffd9cf" title="Low quality" note="Turns off soft shading and glow.">
          <Toggle on={settings.lowQuality} onChange={(v) => settings.set({ lowQuality: v })} label="Low quality" ui="settings.low" />
        </Row>
        <Row icon={<Icon.crew />} tint="#e6dcff" title="Tutorial" note={touring ? "Chief Rocco's first flight is under way." : "Chief Rocco's first flight, from the top."}>
          <span className="set-actions">
            {touring && (
              <Btn
                tone="cream"
                size="sm"
                ui="settings.tutorial.skip"
                onClick={() => {
                  skipTutorial()
                  close()
                }}
              >
                Skip
              </Btn>
            )}
            <Btn
              tone="blue"
              size="sm"
              ui="settings.tutorial.replay"
              onClick={() => {
                close()
                replayTutorial()
              }}
            >
              Replay
            </Btn>
          </span>
        </Row>
        <Row icon={<Icon.alert />} tint="#ffd5cb" title="Reset game" note={confirm ? 'This wipes your agency. Sure?' : 'Start over from the title screen.'}>
          {confirm ? (
            <span className="set-confirm">
              <Btn tone="cream" size="sm" ui="settings.reset.keep" onClick={() => setConfirm(false)}>
                Keep
              </Btn>
              <Btn
                tone="red"
                size="sm"
                ui="settings.reset.wipe"
                onClick={() => {
                  reset()
                  close()
                }}
              >
                Wipe
              </Btn>
            </span>
          ) : (
            <Btn tone="red" size="sm" ui="settings.reset" onClick={() => setConfirm(true)}>
              Reset
            </Btn>
          )}
        </Row>
      </div>
      <p className="t-small center" style={{ paddingTop: '0.1em' }}>
        Mission Tycoon · built with Claude Code for Space Apps 2026
      </p>
    </Win>
  )
}
