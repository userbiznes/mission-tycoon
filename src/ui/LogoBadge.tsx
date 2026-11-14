import { layerTransform, logoLayers, type LogoSpec } from '../art/logo'

/** The agency logo as crisp SVG, for the HUD, builder and reports. */
export function LogoBadge({ spec, className }: { spec: LogoSpec; className?: string }) {
  return (
    <svg viewBox="-3 -3 106 106" className={className} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {logoLayers(spec).map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill={l.fill ?? 'none'}
          stroke={l.stroke}
          strokeWidth={l.width}
          opacity={l.opacity}
          transform={layerTransform(l)}
        />
      ))}
    </svg>
  )
}
