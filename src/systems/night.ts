// Shared night light: how much "resting" light the world has right now (0…1).
//
// The design rule is "nothing glows unless you disturb it". So everything that is lit
// or glowing WITHOUT the player (the seafloor's moonlight, the caustic web, calm
// plankton, resting kelp) is multiplied by this one number, while the glow that comes
// from disturbance (excitation) is NOT. Dark night → the world sinks into the dark and
// your trail is what you see; full moon → the world is lit and your glow is washed out.
//
// Written each frame by <Atmosphere> (from the moon phase and its darkness slider),
// read by the systems above. 1 = untouched, so lab tabs without an atmosphere look
// the same as before.
export const night = {
  light: 1,
}
