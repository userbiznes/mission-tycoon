import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { HalfFloatType } from 'three'
import { palette } from '../art/palette'

/**
 * Post stack: soft ambient occlusion to ground the toys, a gentle bloom that only
 * catches emissive lights and screens, then filmic tone mapping.
 */
const tm = new URLSearchParams(window.location.search).get('tm')
const MODE = tm === 'agx' ? ToneMappingMode.AGX : tm === 'aces' ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.NEUTRAL

export function Effects() {
  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      <N8AO
        halfRes
        quality="medium"
        aoRadius={1.6}
        distanceFalloff={1.2}
        intensity={2.6}
        color={palette.navyDark}
      />
      <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.2} intensity={0.55} radius={0.7} />
      <ToneMapping mode={MODE} />
      <SMAA />
    </EffectComposer>
  )
}
