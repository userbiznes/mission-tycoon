import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Pins: HTML elements that stay glued to a point in the 3D world
 * (timers over buildings, tutorial arrows, "ready" bubbles).
 * The UI layer renders <Pin>, the canvas runs <PinProjector>.
 */
interface PinEntry {
  pos: THREE.Vector3
  el: HTMLElement
}
const entries = new Set<PinEntry>()
const _v = new THREE.Vector3()

export function PinProjector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    for (const e of entries) {
      _v.copy(e.pos).project(camera)
      const x = (_v.x * 0.5 + 0.5) * size.width
      const y = (-_v.y * 0.5 + 0.5) * size.height
      const visible = _v.z < 1 && x > -80 && x < size.width + 80 && y > -80 && y < size.height + 120
      e.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      e.el.style.visibility = visible ? 'visible' : 'hidden'
    }
    // negative priority: after the camera rig (-100), before render; a positive one would take over rendering
  }, -50)
  return null
}

export function Pin({ at, children, className = '' }: { at: [number, number, number]; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useRef(new THREE.Vector3())
  pos.current.set(at[0], at[1], at[2])
  useEffect(() => {
    const entry: PinEntry = { pos: pos.current, el: ref.current! }
    entries.add(entry)
    return () => {
      entries.delete(entry)
    }
  }, [])
  return (
    <div ref={ref} className={`pin ${className}`} style={{ visibility: 'hidden' }}>
      {children}
    </div>
  )
}
