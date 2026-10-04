export type BlendMode = 'add' | 'subtract' | 'multiply' | 'max' | 'min' | 'screen' | 'replace'

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Combines a new layer value into the running accumulator, using `opacity` (the layer's
// amplitude) the same way a layer opacity slider works in image editors.
export function blend(accum: number, value: number, mode: BlendMode, opacity: number): number {
  switch (mode) {
    case 'add':
      return accum + value * opacity
    case 'subtract':
      return accum - value * opacity
    case 'multiply':
      return mix(accum, accum * value, opacity)
    case 'max':
      return mix(accum, Math.max(accum, value), opacity)
    case 'min':
      return mix(accum, Math.min(accum, value), opacity)
    case 'screen':
      return mix(accum, 1 - (1 - accum) * (1 - value), opacity)
    case 'replace':
      return mix(accum, value, opacity)
    default:
      return accum
  }
}
