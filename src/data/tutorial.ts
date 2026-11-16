/**
 * Chief Rocco's contextual tips, each shown once. (His first-flight tutorial
 * lives in src/tutorial/steps.ts.)
 */
export const TIPS: Record<string, { text: string; mood?: 'happy' | 'worried' | 'proud' }> = {
  shadow: { text: "We're in Earth's shadow about 35 minutes every orbit. No battery, no satellite.", mood: 'worried' },
  bottleneck: {
    text: 'A satellite is a pipeline: camera, storage, radio, dish. The slowest link sets how much comes home.',
  },
  overweight: { text: "She's too heavy for that rocket. Drop a part or book a bigger ride.", mood: 'worried' },
  construction: { text: 'Empty plots are for new buildings. The Science Lab turns raw data into things clients pay for.' },
  lab: { text: 'Raw data is Level 0. The lab calibrates it (Level 1) and turns it into maps on a grid (Level 3). Maps sell best.' },
  order: { text: 'Small orders come in all the time. Fill them from the lab for quick coins.' },
  storage: { text: 'The Comms Center only holds so much raw data. When it is full, new data is lost. Keep the lab busy!', mood: 'worried' },
  testrun: { text: 'Test runs are free. Try the design, read why it failed, fix it, then commit.' },
  reserve: { text: 'Keep at least 10% of the budget in reserve. Real missions always meet surprises.', mood: 'worried' },
}
