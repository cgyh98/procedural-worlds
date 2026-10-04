import type { NoiseType } from './generators'
import type { ShapingType } from './shaping'
import type { BlendMode } from './blend'

export interface NoiseLayer {
  id: string
  name: string
  enabled: boolean
  noiseType: NoiseType
  seed: number
  frequency: number
  offsetX: number
  offsetY: number
  octaves: number
  persistence: number
  lacunarity: number
  shapingType: ShapingType
  shapingAmount: number
  blendMode: BlendMode
  amplitude: number
}

let layerCounter = 0

export function createDefaultLayer(isFirst: boolean): NoiseLayer {
  layerCounter += 1
  return {
    id: `layer-${layerCounter}`,
    name: `Layer ${layerCounter}`,
    enabled: true,
    noiseType: 'simplex',
    seed: Math.floor(Math.random() * 10000),
    frequency: 1,
    offsetX: 0,
    offsetY: 0,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    shapingType: 'none',
    shapingAmount: 1,
    blendMode: 'add',
    amplitude: isFirst ? 1 : 0.5,
  }
}
