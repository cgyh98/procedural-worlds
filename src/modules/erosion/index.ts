import type { WorldModule } from '../types'
import { ErosionScene } from './Scene'

// Particle erosion on the seafloor (class module 10).
export const erosionModule: WorldModule = {
  id: 'erosion',
  title: 'Erosion',
  syllabus: [10],
  about:
    'Underwater, avalanches of sediment-laden water (turbidity currents) rush down slopes, carving submarine ' +
    'canyons and spreading sediment fans below. Each "droplet" is one such flow: it runs downhill, picks up ' +
    'sediment while fast on a steep slope, and drops it where it slows down. Tens of thousands of them, step by ' +
    'step, carve channels along the paths they share. Debug colours the change: amber = carved away, cyan = ' +
    'deposited, white dots = the latest flows. Press reset to start again from the original seafloor.',
  Scene: ErosionScene,
  camera: [0, 20, 30],
}
