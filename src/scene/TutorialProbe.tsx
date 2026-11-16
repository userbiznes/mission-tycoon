import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { worldBox, worldProbe } from '../tutorial/anchors'

const _v = new THREE.Vector3()

/**
 * Projects the bounds of the buildings and places the tutorial wants to point
 * at onto the screen, every frame, so the spotlight can ring them. Does
 * nothing (and costs nothing) when the tutorial is not asking.
 */
export function TutorialProbe() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    if (!worldProbe.wanted.size) {
      if (worldProbe.rects.size) worldProbe.rects.clear()
      return
    }
    for (const key of worldProbe.wanted) {
      const box = worldBox(key)
      if (!box) {
        worldProbe.rects.delete(key)
        continue
      }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      let behind = false
      for (let i = 0; i < 8; i++) {
        _v.set(box.x + (i & 1 ? box.half : -box.half), i & 2 ? box.y1 : box.y0, box.z + (i & 4 ? box.half : -box.half)).project(camera)
        if (_v.z > 1) behind = true
        const sx = (_v.x * 0.5 + 0.5) * size.width
        const sy = (-_v.y * 0.5 + 0.5) * size.height
        if (sx < x0) x0 = sx
        if (sx > x1) x1 = sx
        if (sy < y0) y0 = sy
        if (sy > y1) y1 = sy
      }
      if (behind || x1 < 0 || y1 < 0 || x0 > size.width || y0 > size.height) worldProbe.rects.delete(key)
      else worldProbe.rects.set(key, { x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: Math.min(x1 - x0, y1 - y0) * 0.28 })
    }
    // ask again next frame: anything no longer wanted drops out
    worldProbe.wanted.clear()
    // after the camera rig, before the frame is drawn
  }, -40)
  return null
}
