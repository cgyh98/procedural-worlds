import type { WorldModule } from '../types'
import { CurrentsScene } from './Scene'

// Ocean currents (class modules 12–14: vector fields, ocean systems).
export const currentsModule: WorldModule = {
  id: 'currents',
  title: 'Currents',
  syllabus: [12, 14],
  about:
    'A vector field gives every point in space an arrow: which way and how fast the water flows there. ' +
    'Each plankton asks the field for the arrow under it and takes a small step along it every frame ' +
    '(advection: position += velocity × dt). Curl noise takes the "rotation" of smooth noise, which ' +
    'has no sources or sinks, so plankton swirl without piling up, like real water. ' +
    'Faster water glows brighter: moving water stirs the glow. Turn on debug to see the arrows.',
  Scene: CurrentsScene,
  // Not in the World directly: it joins through the Disturbance module, which reuses it.
}
