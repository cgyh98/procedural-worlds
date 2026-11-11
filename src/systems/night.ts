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
  // Play mode's overrides (set while a night is being played, reset after):
  minDarkness: 0, // the darkness slider can't go below this (play: 1 = pitch black at new moon)
  waterFloor: 0.3, // the water colour never drops below this fraction (play: almost black)
}
