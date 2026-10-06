import type { WorldModule } from '../types'
import { DisturbanceScene } from './Scene'

// The core design mechanic (not a syllabus module): the player and excitation.
export const disturbanceModule: WorldModule = {
  id: 'disturbance',
  title: 'Disturbance',
  syllabus: [],
  about:
    'You are the disturbance: a procedural jellyfish. Every plankton has one value, excitation: each frame it ' +
    'is boosted when you swim close, then decays back toward zero; brightness = excitation, so you leave a ' +
    'trail of light that fades to black. The stirred zone is a wake: a Gaussian stretched out behind you, ' +
    'longer the faster you swim (switch to Sphere to compare). The bell pulses and tilts towards where you go; ' +
    'the tentacles are chains of points that follow the leader, so they trail behind. ' +
    'Keys: W/S swim · A/D turn · E/Q up/down · Shift burst.',
  Scene: DisturbanceScene,
  inWorld: true,
  controlsCamera: true,
}
