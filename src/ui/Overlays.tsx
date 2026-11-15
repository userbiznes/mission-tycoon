import { useEffect, useRef } from 'react'
import { useUi, type Flyer } from '../state/ui'
import { Icon } from './icons'
import { reducedMotion } from './kit'
import { sfx } from './sound'

/** Toasts: a strip of paper that slides down from the top, says one thing, and leaves. */
export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone ?? ''}`}>
          <span className="t-ico">{t.tone === 'good' ? <Icon.check /> : t.tone === 'bad' ? <Icon.close /> : <Icon.info />}</span>
          {t.text}
        </div>
      ))}
    </div>
  )
}

function FlyerSprite({ f }: { f: Flyer }) {
  const ref = useRef<HTMLDivElement>(null)
  const remove = useUi((s) => s.removeFlyer)
  const bumpHud = useUi((s) => s.bumpHud)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const land = () => {
      sfx(f.kind === 'coin' ? 'coin' : 'star')
      bumpHud(f.kind === 'coin' ? 'coins' : 'xp')
      remove(f.id)
    }
    if (reducedMotion()) {
      const id = setTimeout(land, f.delay)
      return () => clearTimeout(id)
    }
    const frame = el.parentElement!.getBoundingClientRect()
    // the counter on top: a window's own coin counter when one is open, the HUD's otherwise
    const targets = el.parentElement!.parentElement!.querySelectorAll<HTMLElement>(`[data-hud="${f.kind === 'coin' ? 'coins' : 'xp'}"]`)
    const targetEl = targets[targets.length - 1]
    const tr = targetEl?.getBoundingClientRect()
    const tx = tr ? tr.left + tr.width * (f.kind === 'coin' ? 0.22 : 0.5) - frame.left : frame.width / 2
    const ty = tr ? tr.top + tr.height / 2 - frame.top : 30
    // pop outwards, then swoop to the counter
    const midX = f.x + (Math.random() - 0.5) * 70
    const midY = f.y - 40 - Math.random() * 40
    const anim = el.animate(
      [
        { transform: `translate(${f.x}px, ${f.y}px) scale(0.2)`, opacity: 0 },
        { transform: `translate(${midX}px, ${midY}px) scale(1.15)`, opacity: 1, offset: 0.28 },
        { transform: `translate(${tx}px, ${ty}px) scale(0.7)`, opacity: 1 },
      ],
      { duration: 720, delay: f.delay, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'both' },
    )
    anim.onfinish = land
    return () => anim.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const I = f.kind === 'coin' ? Icon.coin : f.kind === 'xp' ? Icon.xp : Icon.star
  return (
    <div className="flyer" ref={ref} style={{ left: 0, top: 0 }}>
      <I />
    </div>
  )
}

/** Coins and stars that fly from where they were earned to the counters. */
export function Flyers() {
  const flyers = useUi((s) => s.flyers)
  return (
    <div className="flyers">
      {flyers.map((f) => (
        <FlyerSprite key={f.id} f={f} />
      ))}
    </div>
  )
}
