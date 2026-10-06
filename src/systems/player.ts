import { Vector3 } from 'three'

// The player's live state, shared with every system that reacts to it
// (plankton, kelp; creatures later).
//
// This is a plain mutable object, not React or zustand state, on purpose:
// it changes every frame, and per-frame values must never trigger React re-renders.
// The Player component writes it in useFrame; other systems read it in theirs.
export type DisturbanceShape = 'wake' | 'sphere'

export const player = {
  active: false, // true while a Player is mounted (only some tabs have one)
  position: new Vector3(),
  velocity: new Vector3(),
  speed: 0, // |velocity|, cached once per frame

  // How the player disturbs the water (set from the Disturbance sliders)
  shape: 'wake' as DisturbanceShape,
  radius: 1, // r: the base size of the disturbance
  strength: 0.6, // how strongly nearby glowing things get excited
  wake: 1, // how much the zone stretches out behind you as you speed up
  width: 0.8, // sideways size of the wake, as a fraction of r
}
