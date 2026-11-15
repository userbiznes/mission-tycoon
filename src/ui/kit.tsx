import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from 'react'
import { useGame } from '../state/game'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { Icon, type IconName } from './icons'
import { sfx } from './sound'

/**
 * The component kit: every menu is built from these parts, so they all look
 * and behave alike. Styles live in styles/kit.css.
 *
 * Every interactive element carries a stable `data-ui` id ("market.buy.camWide",
 * "hud.settings"), so a tutorial or a test can point at it.
 */

type Tone = 'green' | 'yellow' | 'blue' | 'red' | 'teal' | 'cream'

// ------------------------------------------------------------------ where the last tap landed: windows pop open from there
const lastTap = { x: -1, y: -1 }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastTap.x = e.clientX
      lastTap.y = e.clientY
    },
    true,
  )
}

/** Make an element's pop-in grow out of the building or button that opened it. */
export function usePopOrigin(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current
    const host = el?.offsetParent as HTMLElement | null
    if (!el || !host || lastTap.x < 0) return
    const hr = host.getBoundingClientRect()
    el.style.setProperty('--ox', `${Math.round(lastTap.x - hr.left - el.offsetLeft)}px`)
    el.style.setProperty('--oy', `${Math.round(lastTap.y - hr.top - el.offsetTop)}px`)
  }, [ref])
}

// ------------------------------------------------------------------ Esc closes whatever is on top
const escStack: (() => void)[] = []
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !escStack.length) return
    e.preventDefault()
    escStack[escStack.length - 1]()
  })
}
export function useEsc(onClose: (() => void) | null | undefined) {
  const fn = useRef(onClose)
  fn.current = onClose
  const active = !!onClose
  useEffect(() => {
    if (!active) return
    const h = () => fn.current?.()
    escStack.push(h)
    return () => {
      const i = escStack.indexOf(h)
      if (i >= 0) escStack.splice(i, 1)
    }
  }, [active])
}

/** True when animation should be kept to a minimum (the setting, or the system preference). */
export function reducedMotion(): boolean {
  if (useSettings.getState().reduceMotion) return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// ------------------------------------------------------------------ buttons
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  round?: boolean
  /** sound played on tap; `null` for silent */
  sound?: Parameters<typeof sfx>[0] | null
  /** stable id for tutorials and tests */
  ui?: string
}

/** Chunky button: a darker bottom edge it sinks into, a gloss on top, a blip and a squash on every tap. */
export function Btn({ tone = 'green', size = 'md', block, round, sound = 'tap', ui, className = '', onClick, children, ...rest }: BtnProps) {
  const cls = ['btn', tone !== 'green' ? `btn-${tone}` : '', size !== 'md' ? `btn-${size}` : '', block ? 'btn-block' : '', round ? 'btn-round' : '', className].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={cls}
      data-ui={ui}
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

/** A price shown inside a button; red when the bank can't cover it. */
export function Cost({ amount, shake }: { amount: number; shake?: number }) {
  const coins = useGame((s) => s.coins)
  return (
    <span key={shake} className={`cost${coins < amount ? ' short' : ''}${shake ? ' shake' : ''}`}>
      <Icon.coin />
      {amount.toLocaleString('en-US')}
    </span>
  )
}

/**
 * A button that spends coins. When the bank is short it stays tappable: the
 * price shakes red and a toast says why, instead of a dead grey button.
 */
export function PayBtn({ price, onPay, tone = 'yellow', children, className = '', ...rest }: Omit<BtnProps, 'onClick'> & { price: number; onPay: (e: ReactMouseEvent<HTMLButtonElement>) => void }) {
  const coins = useGame((s) => s.coins)
  const [shake, setShake] = useState(0)
  const short = coins < price
  return (
    <Btn
      tone={tone}
      sound={null}
      className={`${className}${short && !rest.disabled ? ' cant' : ''}`}
      aria-disabled={short || undefined}
      onClick={(e) => {
        if (short) {
          sfx('error')
          setShake((n) => n + 1)
          useUi.getState().toast(`Not enough coins: ${(price - coins).toLocaleString('en-US')} short`, 'bad')
          return
        }
        onPay(e)
      }}
      {...rest}
    >
      {children}
      <Cost amount={price} shake={shake} />
    </Btn>
  )
}

/** A stand-alone price tag (on a card, not in a button). */
export function Tag({ amount, twine, className = '' }: { amount: number; twine?: boolean; className?: string }) {
  const coins = useGame((s) => s.coins)
  return (
    <span className={`tag${coins < amount ? ' short' : ''}${twine ? ' twine' : ''} ${className}`}>
      <Icon.coin />
      {amount.toLocaleString('en-US')}
    </span>
  )
}

/** The coin counter, as it appears in the HUD and on a window's top edge. Rewards fly to it. */
export function CoinPill() {
  const coins = useGame((s) => s.coins)
  const bump = useUi((s) => s.bump.coins)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !bump) return
    el.classList.remove('bump')
    void el.offsetWidth
    el.classList.add('bump')
  }, [bump])
  return (
    <div className="pill" ref={ref} data-hud="coins" data-ui="coins">
      <Icon.coin />
      <Ticker value={coins} />
    </div>
  )
}

// ------------------------------------------------------------------ the window frame
export type WinVariant = 'side' | 'wide' | 'mid'

/**
 * The frame every menu opens in: cream paper with a stitched border, a wooden
 * plaque with the menu's icon and name on the top edge, and a round close badge
 * on the corner. `side` leaves the island in view (building menus), `wide` is
 * for the big tools, `mid` is a small card in the middle.
 */
export function Win({
  id,
  title,
  icon,
  subtitle,
  onClose,
  children,
  foot,
  tabs,
  variant = 'side',
  theme,
  coins,
  clearScrim,
  paged,
  className = '',
  bodyClass = '',
  style,
}: {
  /** stable id: also the prefix for the ids inside */
  id: string
  title: ReactNode
  icon?: ReactNode
  subtitle?: ReactNode
  onClose?: () => void
  children: ReactNode
  foot?: ReactNode
  tabs?: ReactNode
  variant?: WinVariant
  /** the material this menu is made of: 'cork', 'market', 'notebook', … */
  theme?: string
  /** show the coin counter on the top edge (the HUD is hidden behind big windows) */
  coins?: boolean
  clearScrim?: boolean
  /** put the body on a tabbed page even without tabs */
  paged?: boolean
  className?: string
  bodyClass?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)
  usePopOrigin(ref)
  const close = onClose
    ? () => {
        sfx('close')
        onClose()
      }
    : undefined
  useEsc(close)
  useEffect(() => {
    sfx('open')
  }, [])
  return (
    <>
      <div className={`scrim${clearScrim ? ' clear' : ''}`} onClick={close} data-ui={`${id}.scrim`} />
      <section ref={ref} className={`win win-${variant}${theme ? ` theme-${theme}` : ''} ${className}`} role="dialog" aria-label={typeof title === 'string' ? title : undefined} data-ui={id} style={style}>
        <header className="win-head">
          <div className="plaque">
            {icon && <span className="plaque-icon">{icon}</span>}
            <h2>{title}</h2>
          </div>
          {subtitle && <p className="win-sub">{subtitle}</p>}
          {coins && <CoinPill />}
        </header>
        {close && (
          <button type="button" className="x-badge" onClick={close} aria-label="Close" data-ui={`${id}.close`}>
            <Icon.close />
          </button>
        )}
        {tabs}
        <div className={`${tabs || paged ? 'page' : 'win-body'} ${bodyClass}`}>{children}</div>
        {foot && <footer className="win-foot">{foot}</footer>}
      </section>
    </>
  )
}

/** A small window in the middle of the screen, over a dark scrim: explanations, results, confirmations. */
export function Modal({ id, title, icon, children, onClose, foot, className = '', theme }: { id: string; title: ReactNode; icon?: ReactNode; children: ReactNode; onClose?: () => void; foot?: ReactNode; className?: string; theme?: string }) {
  return (
    <div className="modal-wrap">
      <Win id={id} title={title} icon={icon} onClose={onClose} foot={foot} variant="mid" theme={theme} className={className}>
        {children}
      </Win>
    </div>
  )
}

/** Folder tabs along the top edge of a page. With `icons`, only the open tab spells out its name. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ui,
  icons,
}: {
  tabs: { id: T; label: string; icon?: IconName; count?: number }[]
  value: T
  onChange: (id: T) => void
  /** id prefix: each tab is `${ui}.${id}` */
  ui: string
  icons?: boolean
}) {
  return (
    <nav className={`ftabs${icons ? ' icons' : ''}`} role="tablist">
      {tabs.map((t) => {
        const I = t.icon ? Icon[t.icon] : null
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === value}
            aria-label={t.label}
            title={t.label}
            className={`ftab${t.id === value ? ' on' : ''}`}
            data-ui={`${ui}.${t.id}`}
            onClick={() => {
              sfx('tap')
              onChange(t.id)
            }}
          >
            {I && <I />}
            <span>{t.label}</span>
            {!!t.count && <i className="nbadge red">{t.count}</i>}
          </button>
        )
      })}
    </nav>
  )
}

// ------------------------------------------------------------------ bars, rings, timers
export function Bar({ value, tone, className = '' }: { value: number; tone?: 'ok' | 'warn' | 'bad' | 'blue' | 'gold'; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`bar ${tone && tone !== 'ok' ? tone : ''} ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

/** A round progress ring with a little picture in the middle. */
export function Ring({ p, color, children }: { p: number; color?: string; children?: ReactNode }) {
  return (
    <span className="ring" style={{ '--p': Math.max(0, Math.min(1, p)), ...(color ? { '--ring': color } : {}) } as CSSProperties}>
      {children ?? <Icon.clock />}
    </span>
  )
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

/** A countdown: the ring fills as the time runs, the seconds tick beside it. */
export function Timer({ start, end, icon, color }: { start: number; end: number; icon?: ReactNode; color?: string }) {
  const now = useNow(200)
  return (
    <span className="timer">
      <Ring p={(now - start) / Math.max(1, end - start)} color={color}>
        {icon}
      </Ring>
      {formatTime(end - now)}
    </span>
  )
}

/** Something in progress, as a row: what it is, a bar, and the countdown. */
export function TimerRow({ label, start, end, icon, note }: { label: ReactNode; start: number; end: number; icon?: ReactNode; note?: ReactNode }) {
  const now = useNow(200)
  const k = Math.min(1, (now - start) / Math.max(1, end - start))
  return (
    <div className="card lrow progress-row">
      <Ring p={k}>{icon}</Ring>
      <div className="grow">
        <b className="t-label">{label}</b>
        <Bar value={k} tone="blue" />
        {note && <small className="t-small">{note}</small>}
      </div>
      <span className="t-num">{formatTime(end - now)}</span>
    </div>
  )
}

// ------------------------------------------------------------------ badges, tips, states
/** Locked: the padlock, and the agency level that opens it in the HUD's blue roundel. */
export function LockBadge({ level, text }: { level?: number; text?: ReactNode }) {
  return (
    <span className="lockb">
      <Icon.lock />
      {text ?? 'Level'}
      {level !== undefined && <b>{level}</b>}
    </span>
  )
}

/** A speech-bubble tooltip over its children: shown on hover, on focus, or while `show` is set. */
export function Tip({ text, children, show, below, className = '' }: { text: ReactNode; children: ReactNode; show?: boolean; below?: boolean; className?: string }) {
  return (
    <span className={`has-tip${show ? ' show' : ''} ${className}`}>
      {children}
      <span className={`tip${below ? ' below' : ''}`} role="tooltip">
        {text}
      </span>
    </span>
  )
}

/** Nothing here yet: a small picture and one friendly line. */
export function Empty({ icon = 'box', children, row, error }: { icon?: IconName; children: ReactNode; row?: boolean; error?: boolean }) {
  const I = Icon[icon]
  return (
    <div className={`empty${row ? ' row' : ''}${error ? ' error' : ''}`}>
      <span className="art">
        <I />
      </span>
      <p>{children}</p>
    </div>
  )
}

export function Toggle({ on, onChange, label, ui }: { on: boolean; onChange: (v: boolean) => void; label: string; ui?: string }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-ui={ui}
      onClick={() => {
        onChange(!on)
        sfx('tap')
      }}
    />
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
    if (reducedMotion()) {
      from.current = value
      setShown(value)
      return
    }
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

/** Where a tap landed, in the game surface's own pixels (rewards fly from there). */
export function tapPoint(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = document.querySelector('.phone')!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
