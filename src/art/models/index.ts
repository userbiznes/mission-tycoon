import { registerModel } from '../registry'
import { createCommsCenter } from './commsCenter'
import { createIntegrationBay } from './integrationBay'
import { createLaunchPad } from './launchPad'
import { createMissionControl } from './missionControl'
import { createPartsMarket } from './partsMarket'
import { createPlot } from './plot'
import { createRocket } from './rocket'

/** Every model the game can show. Swap a factory here to replace a model. */
registerModel('launchPad', createLaunchPad)
registerModel('rocket', createRocket)
registerModel('missionControl', createMissionControl)
registerModel('commsCenter', createCommsCenter)
registerModel('integrationBay', createIntegrationBay)
registerModel('partsMarket', createPartsMarket)
registerModel('plot', createPlot)
