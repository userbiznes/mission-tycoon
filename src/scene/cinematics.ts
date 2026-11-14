import * as THREE from 'three'
import { CAMERA_HOME } from '../data/layout'
import { rig, type CinematicFn } from './cameraRig'
import { CAMERA_YAW, uvToWorld } from './world'

const _target = new THREE.Vector3()

/**
 * Title shot: a low, slow drift across the whole island, rocket on the right,
 * sea and sky behind.
 */
export function titleShot(): CinematicFn {
  const [cx, cz] = uvToWorld(0, 4)
  return (camera, _dt, t) => {
    const yaw = CAMERA_YAW + Math.sin(t * 0.08) * 0.1
    const tilt = THREE.MathUtils.degToRad(11 + Math.sin(t * 0.06 + 1) * 1.2)
    const dist = 88
    _target.set(cx, 2, cz)
    camera.position.set(
      _target.x + Math.sin(yaw) * Math.cos(tilt) * dist,
      _target.y + Math.sin(tilt) * dist,
      _target.z + Math.cos(yaw) * Math.cos(tilt) * dist,
    )
    camera.lookAt(_target.x, _target.y + 7.5, _target.z)
  }
}

export function startTitleShot() {
  rig.locked = true
  rig.startCinematic(titleShot())
}

/** Glide from the title shot down into the normal diorama view. */
export function arriveAtBase(seconds = 3.2) {
  rig.snap(CAMERA_HOME.u, CAMERA_HOME.v, CAMERA_HOME.width)
  rig.stopCinematic(seconds)
  rig.locked = false
}
