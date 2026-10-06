import { Color } from 'three'
import { createWorley2D } from '../../lib/noise'
import type { SeafloorSampler } from '../seafloor/useSeafloor'

// ─────────────────────────────────────────────────────────────────────────────
// Biomes (class module 11)
//
// A biome map gives every cell of the heightmap a category, using rules on the data
// we already have (height, slope, extra noise fields). Two classifiers to compare.
// ─────────────────────────────────────────────────────────────────────────────

export type Classifier = 'zones' | 'habitats'

export type Biome = { name: string; color: Color }

// The ocean's real vertical layers, named by how much light reaches them.
export const ZONES: Biome[] = [
  { name: 'sunlit', color: new Color('#6cc4e4') }, // epipelagic: light for photosynthesis
  { name: 'twilight', color: new Color('#1f64a8') }, // mesopelagic: faint blue light
  { name: 'midnight', color: new Color('#143a7a') }, // bathypelagic: only bioluminescence
  { name: 'abyss', color: new Color('#0a1c4a') }, // abyssopelagic
  { name: 'hadal trench', color: new Color('#120a2e') }, // the deepest trenches
]

// Habitats: depth + slope + a vent field. Palette from the cosmos board; the vents get
// its rare warm amber accent.
export const HABITATS: Biome[] = [
  { name: 'reef', color: new Color('#5fe0a0') },
  { name: 'kelp forest', color: new Color('#2f9f8c') },
  { name: 'cliff', color: new Color('#3a4f6e') },
  { name: 'slope', color: new Color('#143a7a') },
  { name: 'abyssal plain', color: new Color('#0a1c4a') },
  { name: 'vent field', color: new Color('#f0a640') },
]

// Returns one biome index per heightmap cell.
export function classify(
  classifier: Classifier,
  heights: Float32Array,
  n: number,
  size: number,
  sampler: SeafloorSampler,
  seed: number,
): Uint8Array {
  const out = new Uint8Array(n * n)
  const cell = size / (n - 1)
  const worley = createWorley2D(seed + 99)

  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const h = heights[k] // −1 (deepest) … 1 (highest)

      if (classifier === 'zones') {
        // Pure thresholds on depth: the simplest classifier
        out[k] = h > 0.5 ? 0 : h > 0 ? 1 : h > -0.5 ? 2 : h > -0.85 ? 3 : 4
        continue
      }

      // Habitats: combine several fields. Order matters: the first rule that matches wins.
      const x = -size / 2 + i * cell
      const z = -size / 2 + j * cell
      const slope = sampler.slope(x, z) // degrees
      // Vents: deep places close to a Worley feature point (F1 small = near a "vent")
      const ventField = worley(x / 6, z / 6) // ≈ −1 near a point … 1 far away
      if (h < -0.35 && ventField < -0.7) out[k] = 5
      else if (slope > 38) out[k] = 2 // too steep for anything to settle: cliff
      else if (h > 0.35 && slope < 22) out[k] = 0 // shallow, gentle, lit: reef
      else if (h > 0.05) out[k] = 1 // shallow-ish: kelp forest
      else if (h < -0.35 && slope < 15) out[k] = 4 // deep and flat: abyssal plain
      else out[k] = 3 // everything in between: slope
    }
  return out
}
