import * as THREE from 'three'
import { CAMERA_BOUNDS, CAMERA_HOME } from '../data/layout'
import { CAMERA_FOV, CAMERA_TILT, CAMERA_YAW, FWD, RIGHT, uvToWorld, worldToUv } from './world'

/**
 * Fixed-angle diorama camera. One-finger pan, pinch / wheel zoom (clamped),
 * smooth fly-to, optional cinematic override and screen shake.
 * Zoom is expressed as "visible world width" so framing is the same on any screen.
 */

const TO_CAMERA = new THREE.Vector3(
  Math.sin(CAMERA_YAW) * Math.cos(CAMERA_TILT),
  Math.sin(CAMERA_TILT),
  Math.cos(CAMERA_YAW) * Math.cos(CAMERA_TILT),
)

export type CinematicFn = (camera: THREE.PerspectiveCamera, dt: number, t: number) => void

class CameraRig {
  /** current, smoothed state (island frame) */
  u = CAMERA_HOME.u
  v = CAMERA_HOME.v
  width = CAMERA_HOME.width
  /** where we're heading */
  goalU = CAMERA_HOME.u
  goalV = CAMERA_HOME.v
  goalWidth = CAMERA_HOME.width
  /** higher = snappier follow */
  stiffness = 12
  /** when true the player can't pan or zoom (tour, cinematics) */
  locked = false
  /** extra height the camera looks at (to frame tall things) */
  lift = 0
  goalLift = 0
  shake = 0
  cinematic: CinematicFn | null = null
  private cinematicT = 0
  private velU = 0
  private velV = 0
  private coasting = false
  aspect = 0.46
  viewportH = 800
  /** set when user input moved the camera this frame (cancels fly-to) */
  userMoved = false

  /** Distance from target for the current width. */
  distanceFor(width: number, aspect = this.aspect): number {
    const vfov = THREE.MathUtils.degToRad(CAMERA_FOV)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    return width / 2 / Math.tan(hfov / 2)
  }

  /** World units per screen pixel at the target. */
  unitsPerPixel(): number {
    const vfov = THREE.MathUtils.degToRad(CAMERA_FOV)
    return (2 * this.distanceFor(this.width) * Math.tan(vfov / 2)) / this.viewportH
  }

  private clampGoal() {
    const b = CAMERA_BOUNDS
    this.goalWidth = THREE.MathUtils.clamp(this.goalWidth, b.widthMin, b.widthMax)
    this.goalU = THREE.MathUtils.clamp(this.goalU, b.uMin, b.uMax)
    this.goalV = THREE.MathUtils.clamp(this.goalV, b.vMin, b.vMax)
  }

  /** Drag by screen pixels. */
  panPixels(dx: number, dy: number) {
    if (this.locked) return
    const upp = this.unitsPerPixel()
    const du = -dx * upp
    const dv = (dy * upp) / Math.sin(CAMERA_TILT)
    this.goalU += du
    this.goalV += dv
    this.velU = du
    this.velV = dv
    this.stiffness = 22
    this.coasting = false
    this.userMoved = true
    this.clampGoal()
  }

  /** Called when the finger lifts: keep a little momentum. */
  release() {
    this.coasting = true
  }

  zoomBy(factor: number) {
    if (this.locked) return
    this.goalWidth *= factor
    this.stiffness = 16
    this.userMoved = true
    this.clampGoal()
  }

  /** Smoothly travel to a spot (island frame). */
  flyTo(u: number, v: number, width?: number, lift = 0) {
    this.goalU = u
    this.goalV = v
    if (width) this.goalWidth = width
    this.goalLift = lift
    this.stiffness = 3.2
    this.coasting = false
    this.velU = this.velV = 0
    this.clampGoal()
  }
  flyToWorld(x: number, z: number, width?: number, lift = 0) {
    const [u, v] = worldToUv(x, z)
    this.flyTo(u, v, width, lift)
  }
  home() {
    this.flyTo(CAMERA_HOME.u, CAMERA_HOME.v, CAMERA_HOME.width, 0)
  }
  /** Jump with no animation. */
  snap(u: number, v: number, width: number, lift = 0) {
    this.u = this.goalU = u
    this.v = this.goalV = v
    this.width = this.goalWidth = width
    this.lift = this.goalLift = lift
  }

  startCinematic(fn: CinematicFn) {
    this.cinematic = fn
    this.cinematicT = 0
  }
  stopCinematic() {
    this.cinematic = null
  }

  update(camera: THREE.PerspectiveCamera, dt: number) {
    dt = Math.min(dt, 0.05)
    if (this.cinematic) {
      this.cinematicT += dt
      this.cinematic(camera, dt, this.cinematicT)
      this.applyShake(camera, dt)
      return
    }
    if (this.coasting) {
      // momentum after a flick
      const friction = Math.exp(-dt * 6)
      this.velU *= friction
      this.velV *= friction
      this.goalU += this.velU * dt * 28
      this.goalV += this.velV * dt * 28
      this.clampGoal()
      if (Math.abs(this.velU) + Math.abs(this.velV) < 0.0005) this.coasting = false
    }
    const k = 1 - Math.exp(-dt * this.stiffness)
    this.u += (this.goalU - this.u) * k
    this.v += (this.goalV - this.v) * k
    this.width += (this.goalWidth - this.width) * k
    this.lift += (this.goalLift - this.lift) * k

    const [x, z] = uvToWorld(this.u, this.v)
    const dist = this.distanceFor(this.width)
    camera.position.set(x + TO_CAMERA.x * dist, this.lift + TO_CAMERA.y * dist, z + TO_CAMERA.z * dist)
    camera.lookAt(x, this.lift, z)
    this.applyShake(camera, dt)
  }

  private applyShake(camera: THREE.PerspectiveCamera, dt: number) {
    if (this.shake > 0.001) {
      const s = this.shake
      camera.position.x += (Math.random() - 0.5) * s
      camera.position.y += (Math.random() - 0.5) * s
      camera.position.z += (Math.random() - 0.5) * s
      this.shake *= Math.exp(-dt * 3)
    } else this.shake = 0
  }

  /** Centre of view on the ground, in world space. */
  targetWorld(out = new THREE.Vector3()): THREE.Vector3 {
    const [x, z] = uvToWorld(this.u, this.v)
    return out.set(x, 0, z)
  }
}

export const rig = new CameraRig()
export { RIGHT, FWD, TO_CAMERA }
