import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fredoka'
import './styles/base.css'
import './styles/ui.css'
import './styles/screens.css'
import './styles/mission.css'
import './styles/landscape.css'
import './styles/regions.css'
import { App } from './App'
import { rig } from './scene/cameraRig'
import { useGame } from './state/game'
import { useUi } from './state/ui'
import { useLaunch } from './state/launch'
import { flight } from './state/launch'
import * as mission from './state/mission'
import { usePlacement } from './state/placement'

createRoot(document.getElementById('root')!).render(<App />)

// handy for screenshots and debugging
;Object.assign(window, { __rig: rig, __game: useGame, __ui: useUi, __launch: useLaunch, __flight: flight, __m: mission, __place: usePlacement })
