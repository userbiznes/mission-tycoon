import { registerModel } from '../registry'
import { createLaunchPad } from './launchPad'
import { createRocket } from './rocket'

/** Every model the game can show. Swap a factory here to replace a model. */
registerModel('launchPad', createLaunchPad)
registerModel('rocket', createRocket)
