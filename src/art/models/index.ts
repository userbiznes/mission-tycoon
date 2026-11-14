import { registerModel } from '../registry'
import { createCommsCenter } from './commsCenter'
import { createLaunchPad } from './launchPad'
import { createMissionControl } from './missionControl'
import { createRocket } from './rocket'

/** Every model the game can show. Swap a factory here to replace a model. */
registerModel('launchPad', createLaunchPad)
registerModel('rocket', createRocket)
registerModel('missionControl', createMissionControl)
registerModel('commsCenter', createCommsCenter)
