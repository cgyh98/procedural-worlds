import type { WorldModule } from '../types'
import { DisturbanceScene } from './Scene'

// The core design mechanic (not a syllabus module): the player and excitation.
export const disturbanceModule: WorldModule = {
  id: 'disturbance',
  title: 'Disturbance',
  syllabus: [],
  about:
    'You are the disturbance. Every plankton has one value, excitation: each frame it is boosted when you ' +
    'swim close (scaled by your speed and a Gaussian falloff with distance), then decays back toward zero. ' +
    'Brightness = excitation, so you leave a trail of light that fades to black. Swim fast for a bigger burst. ' +
    'The plankton box travels with you and wraps, so the water is endless. ' +
    'Keys: W/S swim · A/D turn · E/Q up/down · Shift burst.',
  Scene: DisturbanceScene,
  inWorld: true,
  controlsCamera: true,
}
