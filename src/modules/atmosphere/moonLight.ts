import { Color } from 'three'
import { PALETTE, color } from '../../style/palette'

// ─────────────────────────────────────────────────────────────────────────────
// The moon decides how bright the painted ocean is.
//
// One palette (src/style/palette.ts), two ends of the night:
//   new moon  (0): the blues pushed down to deep navy/ultramarine. Dark water, so
//                  the bioluminescence is what you see. (Never pure black.)
//   full moon (1): the art-direction look. Turquoise towards the surface, cobalt
//                  below, god rays, caustics. The glow gets washed out, as in real
//                  bays where moonlight hides bioluminescence.
// Everything in between is a blend. These helpers turn moonPhase into colours.
// ─────────────────────────────────────────────────────────────────────────────

const NEW_SURFACE = new Color('#0d1a5c') // a faint ultramarine glow above, even with no moon
const NEW_DEEP = new Color('#03061c') // the darkest value: deep navy
const FULL_SURFACE = color(PALETTE.cyan)
const FULL_DEEP = color(PALETTE.cobalt)

/** Colour towards the surface (looking up) for a given moon phase. */
export function surfaceColor(moon: number, out: Color) {
  return out.copy(NEW_SURFACE).lerp(FULL_SURFACE, moon)
}

/** Colour of the deep water (looking down / far away) for a given moon phase. */
export function deepColor(moon: number, out: Color) {
  return out.copy(NEW_DEEP).lerp(FULL_DEEP, moon * 0.85)
}

/** How lit the scene is, 0.35 at new moon → 1 at full moon (scales the hero's paint). */
export const exposure = (moon: number) => 0.35 + 0.65 * moon
