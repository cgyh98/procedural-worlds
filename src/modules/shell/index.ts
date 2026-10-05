import type { WorldModule } from '../types'
import { ShellScene } from './Scene'

// Placeholder tab for the scene shell itself (class modules 2–3: React + three.js).
export const shellModule: WorldModule = {
  id: 'shell',
  title: 'Scene shell',
  syllabus: [2, 3],
  about:
    'React builds the page out of components; three.js draws the 3D scene. ' +
    'React Three Fiber lets us describe three.js objects as React components, ' +
    'so each tab is just a component swapped into the same <Canvas>. ' +
    'The fog is exponential (fogExp2): visibility drops off fast with distance, like light in water.',
  Scene: ShellScene,
}
