import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fredoka'
import './styles/base.css'
import { App } from './App'
import { rig } from './scene/cameraRig'

createRoot(document.getElementById('root')!).render(<App />)

// handy for screenshots and debugging
;(window as unknown as { __rig: typeof rig }).__rig = rig
