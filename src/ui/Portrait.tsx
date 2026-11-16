import { useState, type ReactNode } from 'react'

const missing = new Set<string>()

/**
 * A character portrait from `public/characters/<id>.png`. If the file isn't
 * there yet, the built-in drawing is shown instead. (The label that used to
 * sit under each portrait was removed at the user's request; the Crew sheet's
 * footnote still says the portraits are AI-generated.)
 */
export function Portrait({ id, fallback, className = '' }: { id: string; fallback: ReactNode; className?: string }) {
  const [failed, setFailed] = useState(missing.has(id))
  if (failed) return <>{fallback}</>
  return (
    <span className={`portrait ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}characters/${id}.png`}
        alt=""
        draggable={false}
        onError={() => {
          missing.add(id)
          setFailed(true)
        }}
      />
    </span>
  )
}
