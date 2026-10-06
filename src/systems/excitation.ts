import { player } from './player'

// ─────────────────────────────────────────────────────────────────────────────
// Excitation: the one rule every glowing thing follows ("You are the disturbance")
//
// Every glowing thing keeps a single number, `excitation`. Each frame:
//
//   excitation += disturbance(offset from player) × dt    ← stirred up
//   excitation *= e^(−recovery × dt)                       ← fades back to dark
//   brightness  = excitation (+ any resting glow)
//
// This mirrors real dinoflagellates: they flash when the water around them is
// disturbed, then recover. One rule for everything keeps the world consistent.
// ─────────────────────────────────────────────────────────────────────────────

// How much a glowing thing at offset (dx, dy, dz) from the player gets excited, per
// second. Scales with player speed: swimming fast makes a bigger burst of light.
//
// SPHERE: a Gaussian of distance, e^(−d² / 2r²): 1 at the player, ~0.6 at distance r,
// ~0.01 at 3r. Distance is the same in every direction ("isotropic"), so the zone of
// equal stirring is a sphere.
//
// WAKE: a stretched Gaussian, like the churned water behind a swimmer. Split the offset
// into two parts relative to the swim direction:
//   along = offset · direction   (+ ahead of you, − behind you)
//   side² = d² − along²          (Pythagoras: what's left is sideways)
// and give each its own size:
//   behind: r × stretch, where stretch = 1 + wake × (speed / 5, capped at 2)
//           → the faster you swim, the longer the wake
//   ahead:  r × 0.7 (water is pushed aside, but less)
//   sides:  r × width
//   falloff = e^(−along² / 2ra² − side² / 2rs²)
// Equal stirring now forms an egg shape trailing behind you.
//
// Beyond 3× the largest size we skip it (it's ~0), which saves the Math.exp for
// most plankton.
export function disturbance(dx: number, dy: number, dz: number) {
  if (!player.active || player.speed < 1e-3) return 0
  const r = player.radius
  const d2 = dx * dx + dy * dy + dz * dz
  const amount = player.speed * player.strength

  if (player.shape === 'sphere') {
    if (d2 > 9 * r * r) return 0
    return amount * Math.exp(-d2 / (2 * r * r))
  }

  const v = player.velocity
  const along = (dx * v.x + dy * v.y + dz * v.z) / player.speed // dot with the unit direction
  const side2 = Math.max(d2 - along * along, 0)
  const stretch = wakeStretch()
  const ra = along < 0 ? r * stretch : r * 0.7
  const rs = r * player.width
  const reach = 3 * Math.max(r * stretch, rs)
  if (d2 > reach * reach) return 0
  return amount * Math.exp(-(along * along) / (2 * ra * ra) - side2 / (2 * rs * rs))
}

// How many times longer than r the wake reaches behind you at the current speed.
// Shared with the debug view so the drawn shape always matches the rule.
export function wakeStretch() {
  return 1 + player.wake * Math.min(player.speed / 5, 2)
}

// Fraction of excitation left after `dt` seconds with recovery rate `rate`.
// Exponential decay is frame-rate independent: two frames of dt/2 decay exactly as
// much as one frame of dt (e^(−a)·e^(−b) = e^(−(a+b))). With a fixed "lose 5% per
// frame", the glow would fade faster on a 120 Hz screen than on a 60 Hz one.
export function decayFactor(rate: number, dt: number) {
  return Math.exp(-rate * dt)
}
