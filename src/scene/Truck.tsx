import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createModel, disposeModel, type ModelUserData } from '../art/registry'
import '../art/models'
import { GATE_SPOT } from '../data/layout'
import { useGame } from '../state/game'
import { CELL, roadNetwork } from './grid'
import { ISLAND_V, uvToWorld } from './world'

const DRIVE_IN_MS = 7000
const WAIT_MS = 1400
const DRIVE_OUT_MS = 5000

/** The delivery truck: drives up the road so it reaches the market just as an order is due. */
export function DeliveryTruck() {
  const truck = useMemo(() => createModel('truck', { level: 1 }), [])
  useEffect(() => () => disposeModel(truck), [truck])

  // from the far end of the pier, up the road the game grew, to the market's front door
  const placed = useGame((s) => s.placed)
  const cleared = useGame((s) => s.cleared)
  const path = useMemo(() => {
    const route = roadNetwork(placed, cleared).routes.partsMarket ?? []
    const [gx, gz] = uvToWorld(GATE_SPOT[0], GATE_SPOT[1])
    const world: THREE.Vector3[] = []
    for (const d of [34, 20, 6]) world.push(new THREE.Vector3(gx - ISLAND_V.x * d, 0.02, gz - ISLAND_V.y * d))
    for (const c of route) world.push(new THREE.Vector3((c.i + 0.5) * CELL, 0.07, (c.j + 0.5) * CELL))
    if (world.length < 2) world.push(world[0].clone().add(new THREE.Vector3(1, 0, 0)))
    const lens = [0]
    for (let i = 1; i < world.length; i++) lens.push(lens[i - 1] + world[i].distanceTo(world[i - 1]))
    return { world, lens, total: lens[lens.length - 1] }
  }, [placed, cleared])

  const st = useRef({ arrivedAt: 0, lastCount: 0, k: -1 })

  useFrame((state, dt) => {
    const now = Date.now()
    const deliveries = useGame.getState().deliveries
    const s = st.current
    const next = deliveries.reduce((m, d) => Math.min(m, d.end), Infinity)
    // a delivery just landed: park, then head home
    if (deliveries.length < s.lastCount) s.arrivedAt = now
    s.lastCount = deliveries.length

    let k = -1
    let forward = true
    if (next - now < DRIVE_IN_MS) {
      k = 1 - Math.max(0, next - now) / DRIVE_IN_MS
    } else if (s.arrivedAt && now - s.arrivedAt < WAIT_MS) {
      k = 1
    } else if (s.arrivedAt && now - s.arrivedAt < WAIT_MS + DRIVE_OUT_MS) {
      k = 1 - (now - s.arrivedAt - WAIT_MS) / DRIVE_OUT_MS
      forward = false
    }
    truck.visible = k >= 0
    if (k < 0) return
    // ease in and out so it doesn't teleport to speed
    const e = k * k * (3 - 2 * k)
    const dist = e * path.total
    let i = 1
    while (i < path.lens.length - 1 && path.lens[i] < dist) i++
    const a = path.world[i - 1]
    const b = path.world[i]
    const t = (dist - path.lens[i - 1]) / Math.max(1e-4, path.lens[i] - path.lens[i - 1])
    truck.position.lerpVectors(a, b, Math.min(1, Math.max(0, t)))
    // a little engine bounce
    truck.position.y += Math.abs(Math.sin(state.clock.elapsedTime * 16)) * 0.02 * (k < 1 ? 1 : 0)
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) + (forward ? 0 : Math.PI)
    let d = yaw - truck.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    truck.rotation.y += d * Math.min(1, dt * 8)
    ;(truck.userData as ModelUserData & { setSpeed?: (v: number) => void }).setSpeed?.(k < 1 ? (forward ? 4 : -4) : 0)
    ;(truck.userData as ModelUserData).tick?.(state.clock.elapsedTime, dt)
  })

  return <primitive object={truck} visible={false} />
}
