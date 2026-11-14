import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon } from './icons'
import { sfx } from './sound'

type Tone = 'green' | 'yellow' | 'blue' | 'red' | 'teal' | 'cream'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  round?: boolean
  /** sound played on tap; `null` for silent */
  sound?: Parameters<typeof sfx>[0] | null
}

/** Chunky button: every tap gets a blip and a squish. */
export function Btn({ tone = 'green', size = 'md', block, round, sound = 'tap', className = '', onClick, children, ...rest }: BtnProps) {
  const cls = [
    'btn',
    tone !== 'green' ? `btn-${tone}` : '',
    size !== 'md' ? `btn-${size}` : '',
    block ? 'btn-block' : '',
    round ? 'btn-round' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      className={cls}
      onClick={(e) => {
        if (sound) sfx(sound)
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Bottom sheet that slides up with a bounce. Tap the scrim or the X to close. */
export function Sheet({
  title,
  subtitle,
  icon,
  onClose,
  children,
  foot,
  tabs,
  tall,
  clearScrim,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  foot?: ReactNode
  tabs?: ReactNode
  tall?: boolean
  clearScrim?: boolean
}) {
  useEffect(() => {
    sfx('open')
  }, [])
  return (
    <>
      <div
        className={`scrim${clearScrim ? ' clear' : ''}`}
        onClick={() => {
          sfx('close')
          onClose()
        }}
      />
      <section className={`sheet${tall ? ' tall' : ''}`} role="dialog" aria-label={typeof title === 'string' ? title : undefined}>
        <header className="sheet-head">
          {icon && <div className="icon">{icon}</div>}
          <h2>
            {title}
            {subtitle && <small>{subtitle}</small>}
          </h2>
          <Btn tone="red" round className="sheet-close" sound="close" onClick={onClose} aria-label="Close">
            <Icon.close />
          </Btn>
        </header>
        {tabs}
        <div className="sheet-body">{children}</div>
        {foot && <footer className="sheet-foot">{foot}</footer>}
      </section>
    </>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void }) {
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab${t.id === value ? ' on' : ''}`}
          onClick={() => {
            sfx('tap')
            onChange(t.id)
          }}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export function Modal({ children, onClose, className = '' }: { children: ReactNode; onClose?: () => void; className?: string }) {
  useEffect(() => {
    sfx('pop')
  }, [])
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className={`modal panel ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function Meter({ value, tone, className = '' }: { value: number; tone?: 'ok' | 'warn' | 'bad' | 'blue'; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`meter ${tone && tone !== 'ok' ? tone : ''} ${className}`}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

/** A number that ticks up or down to its new value. */
export function Ticker({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    const delta = value - start
    if (delta === 0) return
    const dur = Math.min(900, 250 + Math.abs(delta) * 0.6)
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      const v = Math.round(start + delta * e)
      from.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format ? format(shown) : shown.toLocaleString('en-US')}</>
}

/** Re-render on an interval while something is counting down. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${String(s % 60).padStart(2, '0')}s`
}
