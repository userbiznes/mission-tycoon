import { registerModel } from '../registry'
import { createCommsCenter } from './commsCenter'
import { createConstruction } from './construction'
import { createCrew } from './crew'
import { createCrewQuarters } from './crewQuarters'
import { createEngineeringLab } from './engineeringLab'
import { createIntegrationBay } from './integrationBay'
import { createLaunchPad } from './launchPad'
import { createMissionControl } from './missionControl'
import { createPartsMarket } from './partsMarket'
import { createPlot } from './plot'
import { createRocket } from './rocket'
import { createScienceLab } from './scienceLab'
import { createTruck } from './truck'

/** Every model the game can show. Swap a factory here to replace a model. */
registerModel('launchPad', createLaunchPad)
registerModel('rocket', createRocket)
registerModel('missionControl', createMissionControl)
registerModel('commsCenter', createCommsCenter)
registerModel('integrationBay', createIntegrationBay)
registerModel('partsMarket', createPartsMarket)
registerModel('plot', createPlot)
registerModel('scienceLab', createScienceLab)
registerModel('engineeringLab', createEngineeringLab)
registerModel('crewQuarters', createCrewQuarters)
registerModel('construction', createConstruction)
registerModel('truck', createTruck)
registerModel('crew', createCrew)
