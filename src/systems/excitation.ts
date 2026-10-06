import { player } from './player'

// ─────────────────────────────────────────────────────────────────────────────
// Excitation: the one rule every glowing thing follows ("You are the disturbance")
//
// Every glowing thing keeps a single number, `excitation`. Each frame:
//
//   excitation += disturbance(distance to player) × dt    ← stirred up
//   excitation *= e^(−recovery × dt)                       ← fades back to dark
//   brightness  = excitation (+ any resting glow)
//
// This mirrors real dinoflagellates: they flash when the water around them is
// disturbed, then recover. One rule for everything keeps the world consistent.
// ─────────────────────────────────────────────────────────────────────────────

// How much a glowing thing at squared distance `d2` from the player gets excited,
// per second. Scales with player speed: swimming fast makes a bigger burst of light.
//
// The falloff is a Gaussian, e^(−d² / 2r²): 1 right at the player, ~0.6 at distance r,
// ~0.01 at 3r. Smooth, with no hard edge. Beyond 3r we skip it entirely (it's ~0),
// which also saves the Math.exp for most plankton.
export function disturbance(d2: number) {
  if (!player.active || player.speed < 1e-3) return 0
  const r2 = player.radius * player.radius
  if (d2 > 9 * r2) return 0
  return player.speed * player.strength * Math.exp(-d2 / (2 * r2))
}

// Fraction of excitation left after `dt` seconds with recovery rate `rate`.
// Exponential decay is frame-rate independent: two frames of dt/2 decay exactly as
// much as one frame of dt (e^(−a)·e^(−b) = e^(−(a+b))). With a fixed "lose 5% per
// frame", the glow would fade faster on a 120 Hz screen than on a 60 Hz one.
export function decayFactor(rate: number, dt: number) {
  return Math.exp(-rate * dt)
}
