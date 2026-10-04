export type ShapingType = 'none' | 'power' | 'smoothstep' | 'terrace' | 'invert' | 'clamp'

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function smoothstepOnce(t: number): number {
  return t * t * (3 - 2 * t)
}

// Applies a shaping curve to a normalized [0,1] noise value, driven by a single "amount" slider
// whose meaning depends on the selected shaping type.
export function applyShaping(value01: number, type: ShapingType, amount: number): number {
  const v = clamp01(value01)
  switch (type) {
    case 'none':
      return v
    case 'power':
      // amount 0..5, exponent below 1 brightens, above 1 darkens/contrasts
      return Math.pow(v, Math.max(0.01, amount))
    case 'smoothstep': {
      // amount controls how many smoothstep passes to apply (more passes = sharper contrast)
      const passes = Math.max(1, Math.round(amount))
      let out = v
      for (let i = 0; i < passes; i++) out = smoothstepOnce(out)
      return out
    }
    case 'terrace': {
      // amount is number of discrete height steps
      const steps = Math.max(2, Math.round(amount))
      return Math.round(v * steps) / steps
    }
    case 'invert': {
      // amount 0..1 mixes between original and fully inverted
      const t = clamp01(amount)
      return v + (1 - v - v) * t
    }
    case 'clamp': {
      // amount 0..1 is a floor: raises everything below it up to that floor (flattens low areas)
      return Math.max(v, clamp01(amount))
    }
    default:
      return v
  }
}
