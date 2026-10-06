import { createPerlin2D, createSimplex2D, createWorley2D, type Noise2D } from '../../lib/noise'

// ─────────────────────────────────────────────────────────────────────────────
// Heightmaps (class modules 5 and 9)
//
// A heightmap is a 2D grid of numbers, one height per cell, stored row by row in a
// flat array: the value for cell (i, j) lives at heights[j * resolution + i].
// Drawn flat with colours it's a map; pushed up per vertex it's terrain.
// ─────────────────────────────────────────────────────────────────────────────

export type NoiseType = 'perlin' | 'simplex' | 'worley'
export type HeightStyle = 'fbm' | 'ridged'

export type HeightmapParams = {
  resolution: number // vertices per side
  size: number // width of the map in world units
  noise: NoiseType
  style: HeightStyle
  scale: number // feature size in world units (bigger = broader shapes)
  octaves: number // how many noise layers are stacked
  persistence: number // amplitude multiplier per octave (how much each finer layer counts)
  lacunarity: number // frequency multiplier per octave (how much finer each layer is)
  seed: number
}

const NOISES: Record<NoiseType, (seed: number) => Noise2D> = {
  perlin: createPerlin2D,
  simplex: createSimplex2D,
  worley: createWorley2D,
}

// Returns heights normalized to [-1, 1]: −1 = deepest trench, +1 = highest ridge.
export function generateHeightmap(p: HeightmapParams): Float32Array {
  const n = p.resolution
  const heights = new Float32Array(n * n)
  // Each octave gets its own seed, so layers aren't copies of each other.
  const layers = Array.from({ length: p.octaves }, (_, o) => NOISES[p.noise](p.seed + o * 1013))

  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      // Grid cell → world position → noise space. Dividing by `scale` (in world units)
      // means the map looks the same at any resolution; resolution only adds detail.
      const x = ((i / (n - 1)) * p.size) / p.scale
      const y = ((j / (n - 1)) * p.size) / p.scale
      const h = fbm(layers, x, y, p)
      heights[j * n + i] = h
      if (h < min) min = h
      if (h > max) max = h
    }

  // Normalize: stretch whatever range we got to exactly [-1, 1], so the colour ramp
  // and the depth slider mean the same thing for every seed and noise type.
  const range = max - min || 1
  for (let k = 0; k < heights.length; k++) heights[k] = ((heights[k] - min) / range) * 2 - 1
  return heights
}

// fBm (fractal Brownian motion): stack octaves of noise.
//
//   height = Σ  amplitudeₒ × noise(frequencyₒ × p)
//   amplitude *= persistence  (e.g. 0.5: each layer counts half as much)
//   frequency *= lacunarity   (e.g. 2:   each layer is twice as fine)
//
// The first octave makes the big shapes (basins, plateaus), later ones add detail.
// Real terrain is like this: similar-looking bumps at every scale ("fractal").
//
// Ridged style: each octave uses (1 − |noise|)². |noise| has a sharp V at zero;
// flipping it turns that V into a sharp crest, like mid-ocean ridges.
function fbm(layers: Noise2D[], x: number, y: number, p: HeightmapParams) {
  let sum = 0
  let amp = 1
  let freq = 1
  let ampSum = 0
  for (const noise of layers) {
    let v = noise(x * freq, y * freq)
    if (p.style === 'ridged') {
      v = 1 - Math.abs(v)
      v = v * v * 2 - 1 // back to ≈ [-1, 1]
    }
    sum += v * amp
    ampSum += amp
    amp *= p.persistence
    freq *= p.lacunarity
  }
  return sum / ampSum // divide by total amplitude to stay in ≈ [-1, 1]
}
