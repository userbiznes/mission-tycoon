/**
 * The rules engine: pure TypeScript, no DOM, no rendering. The UI only calls
 * what is exported here.
 */
export * from './design'
export * from './evaluate'
export * from './locks'
export * from './gonogo'
export * from './crew'
export * from './events'
export * from './match'
export * from './simulate'
export * from './lab'
export { makeRng, hashString } from './rng'
export { num, pct, fractionWords, yearsWords, monthsWords } from './format'
