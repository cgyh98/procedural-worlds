import { Vector3 } from 'three'

// The player's live state, shared with every system that reacts to it
// (plankton now; jellyfish, coral, creatures later).
//
// This is a plain mutable object, not React or zustand state, on purpose:
// it changes every frame, and per-frame values must never trigger React re-renders.
// The Player component writes it in useFrame; other systems read it in theirs.
export const player = {
  active: false, // true while a Player is mounted (only some tabs have one)
  position: new Vector3(),
  velocity: new Vector3(),
  speed: 0, // |velocity|, cached once per frame

  // How the player disturbs the water (set from the Disturbance sliders)
  radius: 1, // r in the Gaussian falloff: how far the disturbance reaches
  strength: 0.6, // how strongly nearby glowing things get excited
}
