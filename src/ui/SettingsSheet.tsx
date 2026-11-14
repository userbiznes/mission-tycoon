import { useState } from 'react'
import { useGame } from '../state/game'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { Icon } from './icons'
import { Btn, Sheet } from './kit'
import { sfx } from './sound'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        onChange(!on)
        sfx('tap')
      }}
    />
  )
}

export function SettingsSheet() {
  const close = useUi((s) => s.close)
  const settings = useSettings()
  const reset = useGame((s) => s.reset)
  const [confirm, setConfirm] = useState(false)
  return (
    <Sheet title="Settings" icon={<Icon.gear />} onClose={close}>
      <div className="setting card">
        <Icon.fast style={{ width: '2em', height: '2em', background: '#3e9fe8', borderRadius: '0.5em', padding: '0.2em' }} />
        <div className="grow">
          <b>Fast mode</b>
          <small>All timers run 4× faster. Handy for judges.</small>
        </div>
        <Toggle on={settings.fastMode} onChange={(v) => settings.set({ fastMode: v })} label="Fast mode" />
      </div>
      <div className="setting card">
        <Icon.sound style={{ width: '2em', height: '2em' }} />
        <div className="grow">
          <b>Sound</b>
          <small>Blips, pops and rocket rumble.</small>
        </div>
        <Toggle on={settings.sound} onChange={(v) => settings.set({ sound: v })} label="Sound" />
      </div>
      <div className="setting card">
        <Icon.bolt style={{ width: '2em', height: '2em' }} />
        <div className="grow">
          <b>Low quality</b>
          <small>Turns off soft shading and glow for slower phones.</small>
        </div>
        <Toggle on={settings.lowQuality} onChange={(v) => settings.set({ lowQuality: v })} label="Low quality" />
      </div>
      <div className="setting card">
        <div className="grow">
          <b>Reset game</b>
          <small>{confirm ? 'This wipes your agency. Sure?' : 'Start over from the title screen.'}</small>
        </div>
        {confirm ? (
          <>
            <Btn tone="cream" size="sm" onClick={() => setConfirm(false)}>
              Keep
            </Btn>
            <Btn
              tone="red"
              size="sm"
              onClick={() => {
                reset()
                close()
              }}
            >
              Wipe
            </Btn>
          </>
        ) : (
          <Btn tone="red" size="sm" onClick={() => setConfirm(true)}>
            Reset
          </Btn>
        )}
      </div>
      <p className="muted center" style={{ fontSize: '0.8em', padding: '0.4em 0 0.2em' }}>
        Mission Tycoon · built with Claude Code for Space Apps 2026
      </p>
    </Sheet>
  )
}
