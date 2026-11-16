import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rig } from './cameraRig'

/** Wires pointer / wheel input on the canvas into the camera rig and drives it every frame. */
export function CameraControls() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  const last = useRef({ w: 0, h: 0 })
  useEffect(() => {
    const was = last.current
    last.current = { w: size.width, h: size.height }
    rig.aspect = size.width / size.height
    rig.viewportH = size.height
    // same width, a different height: a strip came or went along the bottom
    if (was.h && was.w === size.width && was.h !== size.height) rig.holdPicture((was.h - size.height) / 2)
  }, [size])

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDist = 0
    let moved = 0

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      moved = 0
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (pointers.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy)
        // a small dead zone keeps taps crisp
        if (moved > 6) rig.panPixels(dx, dy)
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist > 0 && dist > 0) rig.zoomBy(pinchDist / dist)
        pinchDist = dist
        rig.panPixels(dx / 2, dy / 2)
      }
    }
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size === 0) rig.release()
      pinchDist = 0
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      rig.zoomBy(Math.exp(e.deltaY * 0.0012))
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  // run before everything else so lights and props see the fresh camera
  useFrame((_, dt) => {
    rig.update(camera, dt)
  }, -100)

  return null
}
