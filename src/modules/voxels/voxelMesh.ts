import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { voxelIndex, type VoxelGrid } from './voxelGrid'

// ─────────────────────────────────────────────────────────────────────────────
// From voxels to a mesh: only draw the faces you can see
//
// Every rock voxel is a cube with 6 faces. But a face that touches another rock
// voxel is buried inside the rock: nobody can ever see it. So for each face we look
// at the neighbour on that side: rock → skip the face, water (or outside) → draw it.
// In a solid reef most faces are buried, so this usually skips 80–90% of them.
// ─────────────────────────────────────────────────────────────────────────────

// The 6 face directions: neighbour offset, normal, and the face's 4 corners (in a unit
// cube) ordered counter-clockwise as seen from outside, which is how three.js knows
// which side of a triangle is the front.
const FACES = [
  { d: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] }, // +x
  { d: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] }, // −x
  { d: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] }, // +y (top)
  { d: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // −y (bottom)
  { d: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, // +z
  { d: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }, // −z
] as const

// Depth colours (cobalt palette from the cosmos board): dark at the bottom, icy at the top.
const BOTTOM = new Color('#0a1c4a')
const TOP = new Color('#4fa3d8')

export type VoxelMeshStats = { rock: number; drawn: number; skipped: number }

// `visibleLayers`: only layers y < visibleLayers count as rock (the build animation
// reveals the reef layer by layer). `slice`: layers above it are cut away, so faces
// at the cut become visible and you can look inside the caves.
export function buildVoxelMesh(g: VoxelGrid, voxelSize: number, visibleLayers: number, slice: number) {
  const maxY = Math.min(visibleLayers, slice)
  const isRock = (x: number, y: number, z: number) =>
    x >= 0 && y >= 0 && z >= 0 && x < g.nx && z < g.nz && y < maxY && g.solid[voxelIndex(g, x, y, z)] === 1

  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const stats: VoxelMeshStats = { rock: 0, drawn: 0, skipped: 0 }
  const c = new Color()
  // The grid is centred on x/z; its bottom sits at y = 0 of the parent group.
  const ox = (-g.nx / 2) * voxelSize
  const oz = (-g.nz / 2) * voxelSize

  for (let y = 0; y < maxY; y++)
    for (let z = 0; z < g.nz; z++)
      for (let x = 0; x < g.nx; x++) {
        if (!isRock(x, y, z)) continue
        stats.rock++
        // Colour by height, with a small per-voxel variation so single cubes read
        c.copy(BOTTOM).lerp(TOP, y / (g.ny - 1))
        c.multiplyScalar(0.85 + 0.3 * hash3(x, y, z))

        for (const face of FACES) {
          if (isRock(x + face.d[0], y + face.d[1], z + face.d[2])) {
            stats.skipped++ // buried: touching rock on this side
            continue
          }
          stats.drawn++
          const base = positions.length / 3
          for (const [cx, cy, cz] of face.corners) {
            positions.push(ox + (x + cx) * voxelSize, (y + cy) * voxelSize, oz + (z + cz) * voxelSize)
            normals.push(face.d[0], face.d[1], face.d[2])
            colors.push(c.r, c.g, c.b)
          }
          // Two triangles per square face
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
        }
      }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  return { geometry: geo, stats }
}

// Cheap repeatable "random" in [0, 1) from integer coordinates
export function hash3(x: number, y: number, z: number) {
  let n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}
