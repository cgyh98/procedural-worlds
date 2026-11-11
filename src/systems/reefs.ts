// Shared reef state: how many reef colonies the player has woken up so far.
// Written by the reef network (paths module) every frame, read by play mode's story
// (the moon rises as reefs wake). A plain object, like systems/player.ts, so per-frame
// values never trigger React re-renders.
export const reefs = {
  awake: 0,
  total: 0,
  // The sleeping reef closest to the player (play mode's beacon points at it).
  // hasNearest = false when every reef is awake (or there are none).
  nearest: { x: 0, y: 0, z: 0 },
  hasNearest: false,
  // Presenter shortcut: set to true to wake the nearest sleeping reef on the next frame.
  wakeRequest: false,
}
