import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Portrait } from './Portrait'
import { sfx } from './sound'

const INK = '#4b2f1c'

/**
 * Chief Rocco: retired flight director, gray mustache, cap and headset.
 * An original character drawn as a chunky SVG bust.
 */
export function RoccoBust({ talking = false, mood = 'happy' }: { talking?: boolean; mood?: 'happy' | 'worried' | 'proud' }) {
  const brow = mood === 'worried' ? 3 : mood === 'proud' ? -2 : 0
  return (
    <svg viewBox="0 0 120 122" className={`rocco-bust${talking ? ' talking' : ''}`} aria-label="Chief Rocco">
      <g stroke={INK} strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="round">
        {/* jacket */}
        <path d="M10 124 C10 98 30 87 60 87 C90 87 110 98 110 124 Z" fill="#2d4a6b" />
        <path d="M45 88 L60 106 L75 88 Z" fill="#fff1d6" />
        <path d="M33 92 L49 118 M87 92 L71 118" stroke="#f6963a" strokeWidth={5} />
        <circle cx="86" cy="106" r="4.500" fill="#fcc840" strokeWidth={2.600} />
        {/* neck */}
        <path d="M49 72 h22 v13 a11 11 0 0 1 -22 0 Z" fill="#e8b48b" />
        <g className="rocco-head">
          {/* ears */}
          <circle cx="30" cy="59" r="7" fill="#f2c39b" />
          <circle cx="90" cy="59" r="7" fill="#f2c39b" />
          {/* head */}
          <path d="M32 50 C32 33 45 26 60 26 C75 26 88 33 88 50 V62 C88 77 76 87 60 87 C44 87 32 77 32 62 Z" fill="#f2c39b" />
          {/* gray hair at the temples */}
          <path d="M33 48 C33 55 34 60 37 64 L40 50 Z" fill="#cfcfd6" strokeWidth={2.600} />
          <path d="M87 48 C87 55 86 60 83 64 L80 50 Z" fill="#cfcfd6" strokeWidth={2.600} />
          {/* headset band */}
          <path d="M25 58 C17 14 103 14 95 58" fill="none" stroke="#3b3f47" strokeWidth={6.500} />
          {/* cap */}
          <path d="M30 47 C29 25 44 15 60 15 C76 15 91 25 90 47 Z" fill="#2d4a6b" />
          <path d="M30.500 40 H89.500 V47 H30.500 Z" fill="#f6963a" strokeWidth={2.800} />
          <path d="M25 47 C40 41 82 41 102 51 C97 57 84 54 60 53 C40 53 30 53 25 47 Z" fill="#1f3550" />
          <circle cx="60" cy="29" r="6" fill="#fcc840" strokeWidth={2.800} />
          {/* ear cups */}
          <rect x="18" y="50" width="13" height="20" rx="5.500" fill="#3b3f47" />
          <rect x="89" y="50" width="13" height="20" rx="5.500" fill="#3b3f47" />
          {/* mic boom */}
          <path d="M25 69 C25 84 34 90 44 87" fill="none" stroke="#3b3f47" strokeWidth={3.600} />
          <ellipse cx="46" cy="86.500" rx="5.500" ry="4.200" fill="#3b3f47" strokeWidth={2.600} />
          {/* brows */}
          <path d={`M40 ${56 + brow} q7 -6 13 -1`} fill="none" stroke="#bdbdc6" strokeWidth={4.600} />
          <path d={`M67 55 q6 -5 13 ${1 + brow}`} fill="none" stroke="#bdbdc6" strokeWidth={4.600} />
          {/* eyes */}
          <g className="rocco-eyes" stroke="none">
            <ellipse cx="47.500" cy="62" rx="3.300" ry="4" fill={INK} />
            <ellipse cx="72.500" cy="62" rx="3.300" ry="4" fill={INK} />
            <circle cx="48.600" cy="60.600" r="1.200" fill="#fff" />
            <circle cx="73.600" cy="60.600" r="1.200" fill="#fff" />
          </g>
          {/* mouth, hidden behind the mustache until he talks */}
          <ellipse className="rocco-mouth" cx="60" cy="79" rx="5.500" ry="3.500" fill="#7a2f22" strokeWidth={2.400} />
          {/* mustache */}
          <path
            d="M60 70 C54 65 43 67 38 76 C45 81 55 80 60 75.500 C65 80 75 81 82 76 C77 67 66 65 60 70 Z"
            fill="#dcdce2"
            strokeWidth={3}
          />
          {/* nose */}
          <ellipse cx="60" cy="67" rx="5.200" ry="4.600" fill="#e9a981" strokeWidth={2.800} />
        </g>
      </g>
    </svg>
  )
}

/** Text that types itself out; tap once to finish it, tap again to continue. */
export function useTypewriter(text: string, cps = 46): { shown: string; done: boolean; finish: () => void } {
  const [n, setN] = useState(0)
  const last = useRef(0)
  useEffect(() => {
    setN(0)
    last.current = 0
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const count = Math.min(text.length, Math.floor(((now - t0) / 1000) * cps))
      if (count !== last.current) {
        // a soft blip every few letters
        if (count - last.current >= 1 && count % 3 === 0 && text[count - 1] !== ' ') sfx('talk')
        last.current = count
        setN(count)
      }
      if (count < text.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text, cps])
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) }
}

/**
 * Rocco with a speech bubble across the bottom of the screen.
 * `onNext` fires when the player taps after the line has finished typing.
 */
export function RoccoSays({
  text,
  onNext,
  mood,
  hint,
  children,
  blockWorld = true,
}: {
  text: string
  onNext?: () => void
  mood?: 'happy' | 'worried' | 'proud'
  /** small prompt under the text, e.g. "Tap the market" */
  hint?: ReactNode
  children?: ReactNode
  /** when true, taps anywhere on the screen advance the line */
  blockWorld?: boolean
}) {
  const { shown, done, finish } = useTypewriter(text)
  const tap = () => {
    if (!done) {
      finish()
      return
    }
    if (onNext) {
      sfx('tap')
      onNext()
    }
  }
  return (
    <>
      {blockWorld && <div className="rocco-catch" onClick={tap} />}
      <div className="rocco" onClick={tap}>
        <div className="rocco-portrait">
          <Portrait id="rocco" className={!done ? 'talking' : ''} fallback={<RoccoBust talking={!done} mood={mood} />} />
        </div>
        <div className="rocco-bubble panel">
          <span className="rocco-name">Chief Rocco</span>
          <p>
            {shown}
            <span className="ghost">{text.slice(shown.length)}</span>
          </p>
          {done && hint && <div className="rocco-hint">{hint}</div>}
          {done && children}
          {done && onNext && <i className="rocco-next" />}
        </div>
      </div>
    </>
  )
}
