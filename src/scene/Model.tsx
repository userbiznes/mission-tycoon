import { useEffect, useMemo } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { createModel, disposeModel, type ModelOptions, type ModelUserData } from '../art/registry'
import '../art/models'

type Props = Omit<ThreeElements['group'], 'id'> & {
  model: string
  options?: ModelOptions
}

/** Drops a registered model into the scene and runs its per-frame `tick`. */
export function Model({ model, options, ...rest }: Props) {
  const key = JSON.stringify(options ?? {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const object = useMemo(() => createModel(model, options ?? {}), [model, key])
  useEffect(() => () => disposeModel(object), [object])
  useFrame((state, dt) => {
    ;(object.userData as ModelUserData).tick?.(state.clock.elapsedTime, dt)
  })
  return (
    <group {...rest}>
      <primitive object={object} />
    </group>
  )
}
