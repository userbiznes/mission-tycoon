import * as THREE from 'three'
import { PLOTS } from '../data/layout'
import { rig, type CinematicFn } from './cameraRig'
import { CAMERA_YAW, uvToWorld } from './world'

const _target = new THREE.Vector3()

/**
 * Title shot: a low, slow drift looking up the island towards the pad,
 * with the sea and sky behind the rocket.
 */
export function titleShot(): CinematicFn {
  const pad = PLOTS.launchPad
  const [px, pz] = uvToWorld(pad.u - 0.6, pad.v - 3.5)
  return (camera, _dt, t) => {
    const yaw = CAMERA_YAW + 0.1 + Math.sin(t * 0.09) * 0.16
    const tilt = THREE.MathUtils.degToRad(15 + Math.sin(t * 0.07 + 1) * 1.5)
    const dist = 74
    _target.set(px, 4.6, pz)
    camera.position.set(
      _target.x + Math.sin(yaw) * Math.cos(tilt) * dist,
      _target.y + Math.sin(tilt) * dist,
      _target.z + Math.cos(yaw) * Math.cos(tilt) * dist,
    )
    camera.lookAt(_target.x, _target.y + 6.5, _target.z)
  }
}

export function startTitleShot() {
  rig.locked = true
  rig.startCinematic(titleShot())
}

/** Glide from the title shot down into the normal diorama view. */
export function arriveAtBase(seconds = 3.2) {
  rig.snap(0, 3.5, 25)
  rig.stopCinematic(seconds)
  rig.locked = false
}
