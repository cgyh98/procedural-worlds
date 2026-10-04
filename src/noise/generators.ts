import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from './prng'

export type NoiseType = 'simplex' | 'value' | 'worley' | 'fbm'

export type Noise2DFn = (x: number, y: number) => number

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function quintic(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// Smoothly interpolated noise sampled from a lattice of random values per integer coordinate.
function createValueNoise2D(seed: number): Noise2DFn {
  const size = 256
  const rand = mulberry32(seed)
  const lattice = new Float32Array(size * size)
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand() * 2 - 1

  const hash = (x: number, y: number) => {
    const xi = ((x % size) + size) % size
    const yi = ((y % size) + size) % size
    return lattice[yi * size + xi]
  }

  return (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const sx = quintic(x - x0)
    const sy = quintic(y - y0)
    const n00 = hash(x0, y0)
    const n10 = hash(x0 + 1, y0)
    const n01 = hash(x0, y0 + 1)
    const n11 = hash(x0 + 1, y0 + 1)
    return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy)
  }
}

// Cellular/Worley noise: distance from each sample point to the nearest random feature point.
function createWorleyNoise2D(seed: number): Noise2DFn {
  const pointCache = new Map<string, [number, number]>()

  const featurePoint = (cx: number, cy: number): [number, number] => {
    const key = `${cx},${cy}`
    let pt = pointCache.get(key)
    if (!pt) {
      const localSeed = (seed ^ Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263)) >>> 0
      const rand = mulberry32(localSeed)
      pt = [cx + rand(), cy + rand()]
      pointCache.set(key, pt)
    }
    return pt
  }

  return (x, y) => {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    let minDist = Infinity
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const [px, py] = featurePoint(cx + ox, cy + oy)
        const dx = px - x
        const dy = py - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist) minDist = dist
      }
    }
    // Typical nearest-neighbour distance is ~0..1.2; rescale roughly into [-1, 1].
    return Math.min(1, minDist / 0.6) * 2 - 1
  }
}

// Fractal Brownian Motion: sums multiple octaves of a base noise function.
function fbm(
  base: Noise2DFn,
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
): number {
  let total = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0
  for (let i = 0; i < octaves; i++) {
    total += base(x * frequency, y * frequency) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  return maxValue === 0 ? 0 : total / maxValue
}

export interface NoiseParams {
  noiseType: NoiseType
  seed: number
  octaves: number
  persistence: number
  lacunarity: number
}

// Builds a raw noise sampling function (roughly in [-1, 1]) for the given layer params.
export function createNoiseFn(params: NoiseParams): Noise2DFn {
  switch (params.noiseType) {
    case 'simplex': {
      const noise2D = createNoise2D(mulberry32(params.seed))
      return (x, y) => noise2D(x, y)
    }
    case 'value':
      return createValueNoise2D(params.seed)
    case 'worley':
      return createWorleyNoise2D(params.seed)
    case 'fbm': {
      const noise2D = createNoise2D(mulberry32(params.seed))
      return (x, y) =>
        fbm(noise2D, x, y, params.octaves, params.persistence, params.lacunarity)
    }
    default:
      return () => 0
  }
}
