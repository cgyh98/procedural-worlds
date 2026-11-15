import type { WorldModule } from '../types'
import { DisturbanceScene } from './Scene'

// The core design mechanic (not a syllabus module): the player and excitation.
export const disturbanceModule: WorldModule = {
  id: 'disturbance',
  title: 'Disturbance',
  syllabus: [],
  about:
    'You are the disturbance: you swim as a procedural jellyfish (Player body: glow or painted-illustration ' +
    'style; the moon child is an alternative body). Every plankton has one value, excitation: each frame it ' +
    'is boosted when you swim close, then decays back toward zero; brightness = excitation, so you leave a ' +
    'trail of light that fades to black. The stirred zone is a wake: a Gaussian stretched out behind you, ' +
    'longer the faster you swim (switch to Sphere to compare). The jellyfish bell pulses faster as you swim and ' +
    'tilts bell-first; its tentacles are chains of points that follow the leader, so they trail behind. ' +
    'The painted style reuses the illustration shader: soft-stepped toon light, blue shadows, rim, ink outline. ' +
    'Keys: W/S swim · A/D turn · E/Q up/down · Shift burst.',
  Scene: DisturbanceScene,
  inWorld: true,
  controlsCamera: true,
}
