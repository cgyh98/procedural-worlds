import { createNoiseFn } from './generators'
import { applyShaping } from './shaping'
import { blend } from './blend'
import type { NoiseLayer } from './layer'

// How many noise "features" a frequency of 1 spans across the sampled grid.
const BASE_SCALE = 3

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// Evaluates a single layer's shaped noise (post-shaping, pre-blend) across a resolution x
// resolution grid, normalized to [0, 1]. Used both by the composite pass and by the
// per-layer preview mode.
export function computeLayerMap(layer: NoiseLayer, resolution: number) {
  const out = new Float32Array(resolution * resolution)
  const noiseFn = createNoiseFn(layer)
  const denom = Math.max(1, resolution - 1)

  for (let j = 0; j < resolution; j++) {
    const v = j / denom
    for (let i = 0; i < resolution; i++) {
      const u = i / denom
      const sx = u * BASE_SCALE * layer.frequency + layer.offsetX
      const sy = v * BASE_SCALE * layer.frequency + layer.offsetY
      const raw = noiseFn(sx, sy)
      const norm = clamp01(raw * 0.5 + 0.5)
      out[j * resolution + i] = applyShaping(norm, layer.shapingType, layer.shapingAmount)
    }
  }
  return out
}

// Composites all enabled layers, in order, into a single [0, 1] heightmap.
export function computeHeightmap(layers: NoiseLayer[], resolution: number) {
  const result = new Float32Array(resolution * resolution)
  const enabled = layers.filter((l) => l.enabled)
  if (enabled.length === 0) return result

  enabled.forEach((layer, index) => {
    const layerMap = computeLayerMap(layer, resolution)
    if (index === 0) {
      result.set(layerMap)
      return
    }
    for (let p = 0; p < result.length; p++) {
      result[p] = clamp01(blend(result[p], layerMap[p], layer.blendMode, layer.amplitude))
    }
  })

  return result
}
