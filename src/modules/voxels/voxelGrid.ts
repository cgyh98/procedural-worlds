import { createPerlin3D } from '../../lib/noise'
import { mulberry32 } from '../../lib/random'

// ─────────────────────────────────────────────────────────────────────────────
// Voxels (class modules 7–8)
//
// A voxel is a 3D pixel: one little cube in a regular 3D grid. Each voxel stores one
// thing here: rock (1) or water (0). Unlike a heightmap (one height per (x, z)), a
// voxel grid can have rock above water above rock in the same column, which is
// exactly what caves, tunnels, overhangs and arches need.
//
// Storage: one flat array, layer by layer (y), row by row (z), cell by cell (x):
//   index(x, y, z) = (y · nz + z) · nx + x
// ─────────────────────────────────────────────────────────────────────────────

export type VoxelShape = 'seabed' | 'caves' | 'spheres'

export type VoxelParams = {
  shape: VoxelShape
  n: number // voxels along x and z (y gets n / 2)
  scale: number // noise feature size, in voxels
  threshold: number // density above this → rock
  ground: number // seabed only: height of the ground surface, 0 (bottom) … 1 (top)
  seed: number
}

export type VoxelGrid = {
  nx: number
  ny: number
  nz: number
  solid: Uint8Array // 1 = rock, 0 = water
}

export const voxelIndex = (g: VoxelGrid, x: number, y: number, z: number) => (y * g.nz + z) * g.nx + x

export function generateVoxels(p: VoxelParams): VoxelGrid {
  const nx = p.n
  const nz = p.n
  const ny = Math.max(4, Math.round(p.n / 2))
  const solid = new Uint8Array(nx * ny * nz)
  const density = densityFunction(p, nx, ny, nz)

  for (let y = 0; y < ny; y++)
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) solid[(y * nz + z) * nx + x] = density(x, y, z) > p.threshold ? 1 : 0

  return { nx, ny, nz, solid }
}

// Each shape is a "density function": a number for every point in the box. Rock
// wherever it's above the threshold. Changing the function changes the world.
function densityFunction(p: VoxelParams, nx: number, ny: number, nz: number) {
  const noise = createPerlin3D(p.seed)
  // 3 octaves of 3D noise (fBm, as for the seafloor, but in 3D)
  const fbm3 = (x: number, y: number, z: number) => {
    const f = 1 / p.scale
    return (
      noise(x * f, y * f, z * f) +
      0.5 * noise(x * f * 2, y * f * 2, z * f * 2) +
      0.25 * noise(x * f * 4, y * f * 4, z * f * 4)
    ) / 1.75
  }

  switch (p.shape) {
    // Solid below the ground surface, empty above it, MINUS 3D noise. The ground
    // gradient makes a seabed; the noise carves caves into it and leaves overhangs
    // and arches standing above it. A heightmap could never make these.
    case 'seabed':
      // (The ×1.2 sets how strongly "below ground = rock" wins against the noise:
      // weaker means more caves breaking through and more arches above the ground.)
      return (x: number, y: number, z: number) => (p.ground - y / ny) * 1.2 + fbm3(x, y, z)

    // Pure 3D noise: rock wherever the noise is high. Floating, Swiss-cheese reef
    // chunks with holes right through them.
    case 'caves':
      return (x: number, y: number, z: number) => fbm3(x, y, z)

    // The simplest possible rule: rock inside any of a few random balls.
    // Density = how far inside the nearest ball (positive inside, negative outside).
    case 'spheres': {
      const rand = mulberry32(p.seed)
      const balls = Array.from({ length: 7 }, () => ({
        x: rand() * nx,
        y: rand() * ny * 0.8,
        z: rand() * nz,
        r: 3 + rand() * nx * 0.15,
      }))
      return (x: number, y: number, z: number) => {
        let best = -Infinity
        for (const b of balls) best = Math.max(best, 1 - Math.hypot(x - b.x, y - b.y, z - b.z) / b.r)
        return best
      }
    }
  }
}
