import type { WorldModule } from '../types'
import { DisturbanceScene } from './Scene'

// The core design mechanic (not a syllabus module): the player and excitation.
export const disturbanceModule: WorldModule = {
  id: 'disturbance',
  title: 'Disturbance',
  syllabus: [],
  about:
    'You are the disturbance: the moon child, a small being fallen from the moon (switch Player body to the ' +
    'jellyfish to compare). Every plankton has one value, excitation: each frame it ' +
    'is boosted when you swim close, then decays back toward zero; brightness = excitation, so you leave a ' +
    'trail of light that fades to black. The stirred zone is a wake: a Gaussian stretched out behind you, ' +
    'longer the faster you swim (switch to Sphere to compare). The moon child is a joint skeleton posed by ' +
    'sine waves (a floating idle blended into a swim stroke by speed), drawn as a silhouette with a rim shader; ' +
    'its hair, like the jellyfish tentacles, is chains of points that follow the leader, so it trails behind. ' +
    'Keys: W/S swim · A/D turn · E/Q up/down · Shift burst.',
  Scene: DisturbanceScene,
  inWorld: true,
  controlsCamera: true,
}
