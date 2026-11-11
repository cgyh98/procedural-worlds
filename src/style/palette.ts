import { Color } from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Art direction palette (one place to tune the look)
//
// Near-monochrome blue: deep ultramarine shadows → periwinkle midtones → pale aqua
// near the light, with ONE warm accent (peach) only on the lit side of the hero.
// No pure black anywhere: the darkest value is deep navy.
// See vault/claude/hero-art-direction.md.
// ─────────────────────────────────────────────────────────────────────────────

export const PALETTE = {
  // Deep water / shadows
  ultramarine: '#1a2a9c',
  cobalt: '#2236b8',
  // Midtones
  periwinkle: '#6f7fd6',
  softViolet: '#9aa6e8',
  // Shallow water / near the light
  cyan: '#5ec8e8',
  paleAqua: '#bfeef7',
  // The warm accent (lit skin only)
  peach: '#f2a48a',
  // The darkest value in the frame (instead of black)
  navy: '#0b1240',
} as const

export const color = (hex: string) => new Color(hex)
