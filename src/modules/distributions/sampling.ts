import { mulberry32 } from '../../lib/random'

// ─────────────────────────────────────────────────────────────────────────────
// Point distributions (class modules 15–16)
//
// "Where do I put things?" Three answers, from worst to best for natural scenes.
// All return points in a size × size square centred on the origin, as flat
// [x0, z0, x1, z1, …] arrays.
// ─────────────────────────────────────────────────────────────────────────────

export type SamplingMethod = 'random' | 'jittered' | 'poisson'

export function samplePoints(method: SamplingMethod, size: number, spacing: number, seed: number): number[] {
  const rand = mulberry32(seed)
  switch (method) {
    case 'random':
      // Same expected count as the jittered grid, so the comparison is fair.
      return randomPoints(size, Math.round((size / spacing) ** 2), rand)
    case 'jittered':
      return jitteredGrid(size, spacing, rand)
    case 'poisson':
      return poissonDisk(size, spacing, rand)
  }
}

// ── Random (white noise) ─────────────────────────────────────────────────────
// Every point independent and uniform. Sounds fair, but independent points clump
// and leave gaps by pure chance, which looks unnatural for plants.
function randomPoints(size: number, count: number, rand: () => number) {
  const pts: number[] = []
  for (let i = 0; i < count; i++) pts.push((rand() - 0.5) * size, (rand() - 0.5) * size)
  return pts
}

// ── Jittered grid (stratified sampling) ──────────────────────────────────────
// Split the square into cells of side `spacing` and put exactly one random point in
// each. Every cell gets one, so no big gaps; but two neighbours can still land side
// by side at a shared border, and the grid can faintly show through.
function jitteredGrid(size: number, spacing: number, rand: () => number) {
  const pts: number[] = []
  const cells = Math.floor(size / spacing)
  const cell = size / cells
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++)
      pts.push(-size / 2 + (i + rand()) * cell, -size / 2 + (j + rand()) * cell)
  return pts
}

// ── Poisson disk sampling (Robert Bridson, 2007) ─────────────────────────────
// Points as close together as possible, but never closer than r. The result is
// even but irregular ("blue noise"), like plants competing for space.
//
// Bridson's algorithm:
//   1. Start with one random point; put it on an "active" list.
//   2. Pick a random active point. Try k = 30 random candidates in the ring between
//      r and 2r around it. Keep the first candidate that is at least r from every
//      existing point, and make it active too.
//   3. If none of the k candidates fit, that point is surrounded: retire it.
//   4. Repeat until nothing is active.
//
// The trick that makes it fast: a background grid with cells of side r/√2. A cell
// that small can hold at most one point (its diagonal is r), so "is anything within
// r of this candidate?" only needs the 5×5 nearby cells instead of every point.
function poissonDisk(size: number, r: number, rand: () => number, k = 30) {
  const cell = r / Math.SQRT2
  const gw = Math.ceil(size / cell)
  const grid = new Int32Array(gw * gw).fill(-1) // index of the point in each cell, or −1
  const xs: number[] = []
  const zs: number[] = []
  const active: number[] = []

  // Points live in [0, size) here; shifted to be centred at the end.
  const add = (x: number, z: number) => {
    const id = xs.length
    xs.push(x)
    zs.push(z)
    active.push(id)
    grid[Math.floor(z / cell) * gw + Math.floor(x / cell)] = id
  }

  const farEnough = (x: number, z: number) => {
    const gi = Math.floor(x / cell)
    const gj = Math.floor(z / cell)
    for (let j = Math.max(gj - 2, 0); j <= Math.min(gj + 2, gw - 1); j++)
      for (let i = Math.max(gi - 2, 0); i <= Math.min(gi + 2, gw - 1); i++) {
        const id = grid[j * gw + i]
        if (id >= 0 && (xs[id] - x) ** 2 + (zs[id] - z) ** 2 < r * r) return false
      }
    return true
  }

  add(rand() * size, rand() * size)
  while (active.length > 0) {
    const a = Math.floor(rand() * active.length)
    const p = active[a]
    let placed = false
    for (let t = 0; t < k; t++) {
      // Random point in the ring r…2r around p
      const angle = rand() * Math.PI * 2
      const dist = r * (1 + rand())
      const x = xs[p] + Math.cos(angle) * dist
      const z = zs[p] + Math.sin(angle) * dist
      if (x < 0 || z < 0 || x >= size || z >= size) continue
      if (farEnough(x, z)) {
        add(x, z)
        placed = true
        break
      }
    }
    if (!placed) {
      // Retire p: swap it with the last active point and pop (O(1) removal)
      active[a] = active[active.length - 1]
      active.pop()
    }
  }

  const pts: number[] = []
  for (let i = 0; i < xs.length; i++) pts.push(xs[i] - size / 2, zs[i] - size / 2)
  return pts
}
