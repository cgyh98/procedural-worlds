import { mulberry32 } from './random'

// All noises here are *seeded*: same seed → same noise → reproducible worlds.

// A shuffled list of 0..255 decides which gradient / random value each grid point
// gets. Shuffling with a seeded random means the same seed gives the same noise.
// Doubled to 512 entries so lookups like perm[a + 1] never run off the end.
function buildPermutation(seed: number) {
  const rand = mulberry32(seed)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    // Fisher–Yates shuffle
    const j = Math.floor(rand() * (i + 1))
    const tmp = p[i]
    p[i] = p[j]
    p[j] = tmp
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  return perm
}

// 3D Perlin noise (Ken Perlin's "improved noise", 2002), seeded.
//
// The idea: imagine a grid of integer points filling space. Each grid point gets a
// pseudo-random gradient (a direction). To get the noise value at any point p:
//   1. find the 8 grid corners of the cube p sits in,
//   2. for each corner, take the dot product of its gradient with the vector corner→p
//      (how much p lies "in the direction" that corner points),
//   3. blend the 8 results smoothly based on where p sits inside the cube.
// The result is smooth, continuous "random hills" in the range ≈ [-1, 1]:
// nearby points get similar values, far-apart points are unrelated.
//
// Used by the currents (curl noise) and the seafloor map.
export function createPerlin3D(seed: number) {
  const perm = buildPermutation(seed)

  // Smoothstep-like curve 6t⁵ − 15t⁴ + 10t³: eases in/out so there are no visible
  // creases at the grid cell borders.
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (t: number, a: number, b: number) => a + t * (b - a)

  // Picks one of 12 gradient directions (cube edge midpoints) from the hash
  // and returns its dot product with (x, y, z).
  const grad = (hash: number, x: number, y: number, z: number) => {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  return function noise3D(x: number, y: number, z: number) {
    // Which grid cube are we in? (wrapped to 0..255)
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    const X = xi & 255
    const Y = yi & 255
    const Z = zi & 255
    // Position inside that cube, 0..1 on each axis
    x -= xi
    y -= yi
    z -= zi
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)

    // Hash the 8 corners
    const A = perm[X] + Y
    const AA = perm[A] + Z
    const AB = perm[A + 1] + Z
    const B = perm[X + 1] + Y
    const BA = perm[B] + Z
    const BB = perm[B + 1] + Z

    // Blend the 8 corner contributions: first along x, then y, then z
    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z)),
        lerp(u, grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z)),
      ),
      lerp(
        v,
        lerp(u, grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1)),
      ),
    )
  }
}

// A 2D noise function: (x, y) → value in ≈ [-1, 1].
export type Noise2D = (x: number, y: number) => number

// 2D Perlin: a slice through the 3D noise. The z offset avoids an integer plane,
// where part of the gradient information would cancel out.
export function createPerlin2D(seed: number): Noise2D {
  const n3 = createPerlin3D(seed)
  return (x, y) => n3(x, y, 0.37)
}

// 2D Simplex noise (Ken Perlin 2001; this follows Stefan Gustavson's explanation).
//
// Same idea as Perlin (random gradients at grid points, blended), but on a grid of
// *triangles* instead of squares:
//   - a point touches 3 corners (a triangle) instead of 4 (a square), so it's cheaper,
//   - each corner's influence is a smooth radial bump (0.5 − d²)⁴ instead of an
//     axis-aligned blend, so there are fewer square, grid-aligned artifacts.
// The "skew" trick: squashing the plane along its diagonal turns the triangle grid
// into a square grid, where finding the containing cell is just Math.floor.
export function createSimplex2D(seed: number): Noise2D {
  const perm = buildPermutation(seed)
  // 8 gradient directions
  const GX = [1, -1, 1, -1, 1, -1, 0, 0]
  const GY = [1, 1, -1, -1, 0, 0, 1, -1]
  const F2 = 0.5 * (Math.sqrt(3) - 1) // skew: triangles → squares
  const G2 = (3 - Math.sqrt(3)) / 6 // unskew: squares → triangles

  // Contribution of one corner: radial falloff × (gradient · offset)
  const corner = (gi: number, x: number, y: number) => {
    let t = 0.5 - x * x - y * y
    if (t < 0) return 0
    t *= t
    return t * t * (GX[gi] * x + GY[gi] * y)
  }

  return (xin, yin) => {
    // Which skewed cell are we in?
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    // Offset from the cell's first corner, back in normal (unskewed) space
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    // Each square cell holds two triangles: upper or lower one?
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    // Offsets to the other two corners
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    // Pick a gradient for each corner from the permutation table
    const ii = i & 255
    const jj = j & 255
    const g0 = perm[ii + perm[jj]] & 7
    const g1 = perm[ii + i1 + perm[jj + j1]] & 7
    const g2 = perm[ii + 1 + perm[jj + 1]] & 7
    // Sum the three corners; 70 scales the result to ≈ [-1, 1]
    return 70 * (corner(g0, x0, y0) + corner(g1, x1, y1) + corner(g2, x2, y2))
  }
}

// 2D Worley noise (Steven Worley 1996), a.k.a. cellular noise.
//
// Scatter one random "feature point" inside every grid cell. The noise value at p is
// the distance from p to the *nearest* feature point (called F1). Close to a point →
// low; between points → high. The result looks like cells, scales, or pockmarks.
// Only the 3×3 neighbouring cells can hold the nearest point, so we only check those.
export function createWorley2D(seed: number): Noise2D {
  // A small integer hash → float in [0, 1): a random number for each (cell, k) that is
  // always the same for the same inputs. (Math.imul = 32-bit integer multiply.)
  const hash = (i: number, j: number, k: number) => {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed + k, 1442695041)
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    n ^= n >>> 16
    return (n >>> 0) / 4294967296
  }

  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    let best = Infinity
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ci = xi + di
        const cj = yi + dj
        // The feature point of cell (ci, cj), somewhere inside that cell
        const px = ci + hash(ci, cj, 0)
        const py = cj + hash(ci, cj, 1)
        const d = (px - x) * (px - x) + (py - y) * (py - y)
        if (d < best) best = d
      }
    // F1 is in [0, ~1.1]; map to ≈ [-1, 1] like the other noises
    return Math.min(Math.sqrt(best), 1) * 2 - 1
  }
}
