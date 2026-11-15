import type { ReactNode, SVGProps } from 'react'

/**
 * Hand-drawn icon set: 24×24, thick ink outlines, flat warm fills.
 * All original artwork.
 */

const INK = '#4b2f1c'

type P = SVGProps<SVGSVGElement>

function Svg({ children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  )
}

export const Icon = {
  coin: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.2" fill="#fcc840" />
      <circle cx="12" cy="12" r="6" fill="#ffe27a" stroke="#d9941f" strokeWidth={1.4} />
      <path d="M12 8.6v6.8M10 10.4c0-1 4-1.2 4 .3 0 1.600-4 1-4 2.700 0 1.400 4 1.200 4 .1" stroke="#b9770f" strokeWidth={1.5} />
    </Svg>
  ),
  xp: (p: P) => (
    <Svg {...p}>
      <path
        d="M12 2.6l2.700 5.700 6.200.8-4.600 4.300 1.200 6.200L12 16.600 6.500 19.600l1.200-6.200L3.100 9.100l6.200-.8z"
        fill="#6fc7ff"
      />
      <path d="M12 6.800l1.300 2.900" stroke="#fff" strokeWidth={1.4} />
    </Svg>
  ),
  star: (p: P) => (
    <Svg {...p}>
      <path
        d="M12 2.6l2.700 5.700 6.200.8-4.600 4.300 1.200 6.200L12 16.600 6.500 19.600l1.200-6.200L3.100 9.100l6.200-.8z"
        fill="#fcc840"
      />
    </Svg>
  ),
  starEmpty: (p: P) => (
    <Svg {...p}>
      <path
        d="M12 2.6l2.700 5.700 6.200.8-4.600 4.300 1.200 6.200L12 16.600 6.500 19.600l1.200-6.200L3.100 9.100l6.200-.8z"
        fill="#e6d2a4"
        stroke="#b39a6c"
      />
    </Svg>
  ),
  gear: (p: P) => (
    <Svg {...p}>
      <path
        d="M10.300 2.800h3.400l.5 2.300 1.700.9 2.200-.9 1.700 2.900-1.700 1.600v2l1.700 1.600-1.700 2.900-2.200-.9-1.700.9-.5 2.300h-3.400l-.5-2.300-1.700-.9-2.200.9-1.700-2.900 1.700-1.600v-2L3.200 8l1.700-2.900 2.200.9 1.700-.9z"
        fill="#c9d3db"
        transform="translate(0 1)"
      />
      <circle cx="12" cy="12.600" r="2.800" fill="#fffaf0" />
    </Svg>
  ),
  close: (p: P) => (
    <Svg {...p} strokeWidth={3}>
      <path d="M6.500 6.500l11 11M17.500 6.500l-11 11" stroke="#fff" />
    </Svg>
  ),
  check: (p: P) => (
    <Svg {...p} strokeWidth={3}>
      <path d="M5 12.500l4.500 4.500L19 7.500" stroke="#fff" />
    </Svg>
  ),
  back: (p: P) => (
    <Svg {...p} strokeWidth={3}>
      <path d="M14.500 5.500L8 12l6.500 6.500" stroke="#fff" />
    </Svg>
  ),
  info: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.200" fill="#6fc7ff" />
      <path d="M12 11v5.500" stroke="#fff" strokeWidth={2.600} />
      <circle cx="12" cy="7.600" r="1.300" fill="#fff" stroke="none" />
    </Svg>
  ),
  lock: (p: P) => (
    <Svg {...p}>
      <path d="M7.500 10.500V8a4.500 4.500 0 019 0v2.500" />
      <rect x="5" y="10.500" width="14" height="10" rx="2.500" fill="#c9d3db" />
      <circle cx="12" cy="15.500" r="1.500" fill={INK} stroke="none" />
    </Svg>
  ),
  rocket: (p: P) => (
    <Svg {...p}>
      <path d="M8.500 14.500L5 20l5-1.500zM15.500 14.500L19 20l-5-1.500z" fill="#e9523b" />
      <path d="M12 2.500c3.500 2.700 4.700 7.500 3.800 13.500H8.200C7.300 10 8.500 5.200 12 2.500z" fill="#fff1d6" />
      <path d="M12 2.500c1.800 1.400 3 3.300 3.600 5.700H8.400C9 5.800 10.200 3.900 12 2.500z" fill="#e9523b" />
      <circle cx="12" cy="11" r="1.900" fill="#8fdcff" />
      <path d="M10.500 18.500h3l-1.500 3z" fill="#fcc840" />
    </Svg>
  ),
  satellite: (p: P) => (
    <Svg {...p}>
      <g transform="rotate(-35 12 12)">
        <rect x="1.500" y="9.500" width="6" height="5" rx="0.800" fill="#4ba4e3" />
        <rect x="16.500" y="9.500" width="6" height="5" rx="0.800" fill="#4ba4e3" />
        <rect x="8.500" y="7.500" width="7" height="9" rx="1.500" fill="#fcc840" />
        <path d="M12 7.500V4.500" />
        <circle cx="12" cy="3.600" r="1.200" fill="#e9523b" />
      </g>
    </Svg>
  ),
  dish: (p: P) => (
    <Svg {...p}>
      <path d="M12 21v-6M8 21h8" />
      <path d="M4 5.500c0 6 4.500 10.500 10.500 10.500z" fill="#fff1d6" />
      <path d="M9.200 10.800l4.300-4.300" />
      <circle cx="14.300" cy="5.700" r="1.500" fill="#e9523b" />
      <path d="M17.500 2.500c2 .5 3.500 2 4 4M16.500 5.500c.9.300 1.700 1.100 2 2" stroke="#3e9fe8" />
    </Svg>
  ),
  market: (p: P) => (
    <Svg {...p}>
      <path d="M4 10v10h16V10" fill="#fff1d6" />
      <path d="M3 5h18l1 5a2.400 2.400 0 01-4.800 0 2.400 2.400 0 01-4.800 0 2.400 2.400 0 01-4.800 0A2.400 2.400 0 012 10z" fill="#e9523b" />
      <path d="M7.200 5v5M12 5v5M16.800 5v5" stroke="#fff1d6" strokeWidth={1.400} />
      <rect x="9.500" y="13.500" width="5" height="6.500" rx="0.600" fill="#2fb7aa" />
    </Svg>
  ),
  clipboard: (p: P) => (
    <Svg {...p}>
      <rect x="4.500" y="4" width="15" height="17.500" rx="2.200" fill="#c08a55" />
      <rect x="6.800" y="6.800" width="10.400" height="12.400" rx="1" fill="#fffaf0" />
      <rect x="8.500" y="2.300" width="7" height="4" rx="1.300" fill="#c9d3db" />
      <path d="M9 11h6M9 14h6M9 17h3.500" stroke="#b39a6c" strokeWidth={1.400} />
    </Svg>
  ),
  flask: (p: P) => (
    <Svg {...p}>
      <path d="M9.500 3h5M10.300 3v6L4.800 18.500A1.800 1.800 0 006.400 21h11.200a1.800 1.800 0 001.600-2.500L13.700 9V3" fill="#fffaf0" />
      <path d="M7.300 15.500h9.400l2 3.500a1 1 0 01-.9 1.500H6.200a1 1 0 01-.9-1.500z" fill="#2fb7aa" stroke="none" />
      <circle cx="10.500" cy="17.500" r="0.900" fill="#fff" stroke="none" />
      <circle cx="13.500" cy="18.600" r="0.600" fill="#fff" stroke="none" />
    </Svg>
  ),
  wrench: (p: P) => (
    <Svg {...p}>
      <path
        d="M20.500 6.800l-3.300 3.300-2.800-.5-.5-2.800 3.300-3.300a5 5 0 00-6.300 6.300l-7 7a2.100 2.100 0 003 3l7-7a5 5 0 006.600-6z"
        fill="#c9d3db"
      />
    </Svg>
  ),
  hammer: (p: P) => (
    <Svg {...p}>
      <path d="M13 9l-9.500 9.500a1.800 1.800 0 002.500 2.500L15.500 11.500" fill="#c08a55" />
      <path d="M11 6.500l4-4c2.500.3 5 2 6.500 5l-3 3-1.500-1.500-2 2-4-4z" fill="#c9d3db" />
    </Svg>
  ),
  bed: (p: P) => (
    <Svg {...p}>
      <path d="M3 19v-13M21 19v-6.500H3" />
      <rect x="3" y="12" width="18" height="4.500" fill="#4ba4e3" />
      <rect x="4.500" y="9" width="5.500" height="3.500" rx="1.200" fill="#fffaf0" />
    </Svg>
  ),
  crew: (p: P) => (
    <Svg {...p}>
      <path d="M4.500 21c0-4.500 3.300-7 7.500-7s7.500 2.500 7.500 7z" fill="#4b86c9" />
      <circle cx="12" cy="9.500" r="4.500" fill="#f2c39b" />
      <path d="M6.500 8.500a5.500 5.500 0 0111 0z" fill="#fcc840" />
      <path d="M5.500 8.500h13" />
    </Svg>
  ),
  truck: (p: P) => (
    <Svg {...p}>
      <rect x="2" y="6.500" width="11.500" height="9.500" rx="1.200" fill="#fff1d6" />
      <path d="M13.500 9.500h4.300l3.700 3.500v3h-8z" fill="#e9523b" />
      <circle cx="6.500" cy="17.500" r="2.200" fill="#3b3f47" />
      <circle cx="17" cy="17.500" r="2.200" fill="#3b3f47" />
    </Svg>
  ),
  clock: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12.500" r="8.800" fill="#fffaf0" />
      <path d="M12 7.500v5l3.300 2" />
      <path d="M9.500 2.500h5" />
    </Svg>
  ),
  bolt: (p: P) => (
    <Svg {...p}>
      <path d="M13.500 2.500L5 13.500h6l-1.500 8L19 10h-6.500z" fill="#fcc840" />
    </Svg>
  ),
  sun: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4.600" fill="#fcc840" />
      <path d="M12 2.500v2.300M12 19.200v2.300M2.500 12h2.300M19.200 12h2.300M5.300 5.300l1.600 1.600M17.100 17.100l1.600 1.600M5.300 18.700l1.600-1.600M17.100 6.900l1.600-1.600" stroke="#e0a524" />
    </Svg>
  ),
  moon: (p: P) => (
    <Svg {...p}>
      <path d="M19.500 14.500A8.500 8.500 0 019.500 4.500a8.500 8.500 0 1010 10z" fill="#8d6fd1" />
    </Svg>
  ),
  mass: (p: P) => (
    <Svg {...p}>
      <path d="M7.300 8.500h9.400l3 11.500a1 1 0 01-1 1.300H5.300a1 1 0 01-1-1.300z" fill="#a7b4bf" />
      <circle cx="12" cy="5.800" r="2.800" fill="#fffaf0" />
      <path d="M9.500 15h5" stroke="#fff" strokeWidth={2} />
    </Svg>
  ),
  budget: (p: P) => (
    <Svg {...p}>
      <path d="M4 8.500h16v11.500H4z" fill="#63bf4f" />
      <path d="M4 8.500l12-4.500v4.500" fill="#8be05f" />
      <circle cx="12" cy="14.200" r="2.600" fill="#d6f3c2" />
    </Svg>
  ),
  data: (p: P) => (
    <Svg {...p}>
      <ellipse cx="12" cy="6" rx="7.500" ry="3.200" fill="#8d6fd1" />
      <path d="M4.500 6v6c0 1.800 3.400 3.200 7.500 3.200s7.500-1.400 7.500-3.200V6" fill="#8d6fd1" />
      <path d="M4.500 12v6c0 1.800 3.400 3.200 7.500 3.200s7.500-1.400 7.500-3.200v-6" fill="#a58be0" />
    </Svg>
  ),
  comms: (p: P) => (
    <Svg {...p}>
      <path d="M12 21V11" />
      <path d="M8 21h8" />
      <circle cx="12" cy="9.500" r="2.200" fill="#e9523b" />
      <path d="M7.200 14a6.500 6.500 0 010-9M16.800 14a6.500 6.500 0 000-9" stroke="#3e9fe8" />
      <path d="M4.200 16.500a10.500 10.500 0 010-14M19.800 16.500a10.500 10.500 0 000-14" stroke="#3e9fe8" />
    </Svg>
  ),
  time: (p: P) => (
    <Svg {...p}>
      <path d="M6 2.800h12M6 21.200h12" />
      <path d="M7.200 2.800c0 5 4.800 6 4.800 9.200s-4.800 4.200-4.800 9.200h9.600c0-5-4.800-6-4.800-9.200s4.800-4.200 4.800-9.200z" fill="#fffaf0" />
      <path d="M9 20.500c.5-2 3-2.500 3-4 0 1.500 2.500 2 3 4z" fill="#f6963a" stroke="none" />
    </Svg>
  ),
  camera: (p: P) => (
    <Svg {...p}>
      <path d="M3 8.500h4l1.500-2.500h7L17 8.500h4v11H3z" fill="#3b3f47" />
      <circle cx="12" cy="13.500" r="3.800" fill="#8fdcff" />
    </Svg>
  ),
  cpu: (p: P) => (
    <Svg {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="#63bf4f" />
      <rect x="9.500" y="9.500" width="5" height="5" rx="0.800" fill="#3b3f47" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </Svg>
  ),
  target: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" fill="#fffaf0" />
      <circle cx="12" cy="12" r="5.200" fill="#e9523b" />
      <circle cx="12" cy="12" r="1.800" fill="#fffaf0" />
    </Svg>
  ),
  flame: (p: P) => (
    <Svg {...p}>
      <path d="M12 2.500c1 4 6 6 6 11.500a6 6 0 01-12 0c0-2.500 1.500-4 2.500-5.500.5 2 1.500 2.500 2 2.500-1-3 0-6 1.500-8.500z" fill="#f6963a" />
      <path d="M12 21a3 3 0 003-3c0-2-2-2.500-3-5-1 2.500-3 3-3 5a3 3 0 003 3z" fill="#fcc840" stroke="none" />
    </Svg>
  ),
  globe: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.200" fill="#4ba4e3" />
      <path d="M6.500 6.500c2 .5 3 2 2.500 3.500s-2.500 1-3 3 1.500 3 1.500 4.500M14 3.500c0 2 3 2.500 3 4.500s-2 2-1.500 4 3 1.500 4.500 2.500" fill="none" stroke="#63bf4f" strokeWidth={2.600} />
      <circle cx="12" cy="12" r="9.200" />
    </Svg>
  ),
  bag: (p: P) => (
    <Svg {...p}>
      <path d="M4.500 8.500h15l-1 12.500h-13z" fill="#c08a55" />
      <path d="M8.500 11V7a3.500 3.500 0 017 0v4" />
    </Svg>
  ),
  sound: (p: P) => (
    <Svg {...p}>
      <path d="M3.500 9.500h3.500l5-4.500v14l-5-4.500H3.500z" fill="#fffaf0" />
      <path d="M15.500 9a4.500 4.500 0 010 6M18 6.500a8 8 0 010 11" />
    </Svg>
  ),
  play: (p: P) => (
    <Svg {...p}>
      <path d="M7.500 4.500v15l12-7.500z" fill="#fff" />
    </Svg>
  ),
  fast: (p: P) => (
    <Svg {...p}>
      <path d="M3.500 5.500v13l8.500-6.500zM12.500 5.500v13L21 12z" fill="#fff" />
    </Svg>
  ),
  plus: (p: P) => (
    <Svg {...p} strokeWidth={3}>
      <path d="M12 5v14M5 12h14" stroke="#fff" />
    </Svg>
  ),
  turn: (p: P) => (
    <Svg {...p} strokeWidth={2.600}>
      <path d="M19 12a7 7 0 1 1-2.300-5.200" stroke="#fff" />
      <path d="M19.500 3.500v4.500h-4.500" stroke="#fff" />
    </Svg>
  ),
  boat: (p: P) => (
    <Svg {...p}>
      <path d="M3 14h18l-2.500 5.500h-13z" fill="#e9523b" />
      <path d="M8 14V8.500h6.500L17 14" fill="#fff1d6" />
      <path d="M11 8.500V4.500h3" />
    </Svg>
  ),
  up: (p: P) => (
    <Svg {...p}>
      <path d="M12 3.500l7.500 8h-4.500v9h-6v-9H4.500z" fill="#8be05f" />
    </Svg>
  ),
  box: (p: P) => (
    <Svg {...p}>
      <path d="M3.500 8.200 12 4l8.500 4.200v8.600L12 21l-8.500-4.200z" fill="#e0a868" />
      <path d="M3.500 8.200 12 12.400l8.500-4.200M12 12.400V21" />
      <path d="M7.700 6.100l8.500 4.200v3" stroke="#fff1d6" strokeWidth={1.4} />
    </Svg>
  ),
  map: (p: P) => (
    <Svg {...p}>
      <path d="M3.500 6.500 9 4.500l6 2 5.500-2v13L15 19.500l-6-2-5.500 2z" fill="#fff1d6" />
      <path d="M9 4.500v13M15 6.500v13" />
      <path d="M5.500 12.500c1.200-1.300 1.800.6 3 0" stroke="#3e9fe8" strokeWidth={1.4} />
      <path d="M16.800 10.200l2 2M18.800 10.200l-2 2" stroke="#e9523b" strokeWidth={1.5} />
    </Svg>
  ),
  image: (p: P) => (
    <Svg {...p}>
      <rect x="3.500" y="5" width="17" height="14" rx="2.500" fill="#d5edff" />
      <circle cx="8.500" cy="9.500" r="1.600" fill="#fcc840" />
      <path d="M4 16.800l4.500-4 3.500 3 3-2.600 5 4.200V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="#8be05f" />
    </Svg>
  ),
  thermo: (p: P) => (
    <Svg {...p}>
      <path d="M10 14.200V5.500a2 2 0 0 1 4 0v8.700a4 4 0 1 1-4 0z" fill="#fff" />
      <circle cx="12" cy="17.500" r="2" fill="#e9523b" stroke="none" />
      <path d="M12 16V9.500" stroke="#e9523b" strokeWidth={2} />
    </Svg>
  ),
  question: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.200" fill="#7fd0ff" />
      <path d="M9.300 9.600a2.800 2.800 0 1 1 4.200 2.400c-.9.500-1.500 1.100-1.500 2.100" stroke="#fff" strokeWidth={2.2} />
      <circle cx="12" cy="17.300" r="1.250" fill="#fff" stroke="none" />
    </Svg>
  ),
  alert: (p: P) => (
    <Svg {...p}>
      <path d="M12 3.500 21.500 20h-19z" fill="#fcc840" />
      <path d="M12 9.500v5" strokeWidth={2.2} />
      <circle cx="12" cy="17.300" r="1.100" fill={INK} stroke="none" />
    </Svg>
  ),
  orbit: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4.200" fill="#6fc7ff" />
      <ellipse cx="12" cy="12" rx="9.500" ry="4.200" transform="rotate(-24 12 12)" />
      <circle cx="19.700" cy="8.200" r="1.600" fill="#fcc840" />
    </Svg>
  ),
  zzz: (p: P) => (
    <Svg {...p}>
      <path d="M4.500 9.500h5.500l-5.500 7h5.500" strokeWidth={2} />
      <path d="M13 5h4.500L13 10.500h4.500" />
      <path d="M16 14.500h3.500L16 19h3.500" strokeWidth={1.5} />
    </Svg>
  ),
  wind: (p: P) => (
    <Svg {...p}>
      <path d="M3.500 9.500h10a2.500 2.500 0 1 0-2.500-2.500M3.500 13.500h14a2.500 2.500 0 1 1-2.500 2.500M3.500 17.500h6" strokeWidth={2} />
    </Svg>
  ),
  home: (p: P) => (
    <Svg {...p}>
      <path d="M4 11.500 12 4.500l8 7v8h-5v-5h-6v5H4z" fill="#fff1d6" />
      <path d="M3 12l9-8 9 8" stroke="#e9523b" strokeWidth={2} />
    </Svg>
  ),
  move: (p: P) => (
    <Svg {...p}>
      <path d="M12 3v18M3 12h18M12 3l-2.500 2.500M12 3l2.500 2.500M12 21l-2.500-2.500M12 21l2.500-2.500M3 12l2.500-2.500M3 12l2.500 2.500M21 12l-2.500-2.500M21 12l-2.500 2.500" strokeWidth={2} />
    </Svg>
  ),
}

export type IconName = keyof typeof Icon
