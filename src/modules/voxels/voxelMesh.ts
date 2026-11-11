import { BufferAttribute, BufferGeometry, Color, Float32BufferAttribute } from 'three'
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

  const stats: VoxelMeshStats = { rock: 0, drawn: 0, skipped: 0 }

  // Pass 1: count the visible faces, so the arrays can be allocated once at the exact
  // size. (Growing JavaScript arrays number by number is slow for ~100k faces.)
  for (let y = 0; y < maxY; y++)
    for (let z = 0; z < g.nz; z++)
      for (let x = 0; x < g.nx; x++) {
        if (!isRock(x, y, z)) continue
        stats.rock++
        for (const face of FACES) {
          if (isRock(x + face.d[0], y + face.d[1], z + face.d[2])) stats.skipped++ // buried
          else stats.drawn++
        }
      }

  // Pass 2: fill typed arrays: 4 corners per face, 2 triangles (6 indices) per face
  const positions = new Float32Array(stats.drawn * 12)
  const normals = new Float32Array(stats.drawn * 12)
  const colors = new Float32Array(stats.drawn * 12)
  const indices = new Uint32Array(stats.drawn * 6)
  const c = new Color()
  // The grid is centred on x/z; its bottom sits at y = 0 of the parent group.
  const ox = (-g.nx / 2) * voxelSize
  const oz = (-g.nz / 2) * voxelSize
  let v = 0 // vertices written
  let t = 0 // indices written

  for (let y = 0; y < maxY; y++)
    for (let z = 0; z < g.nz; z++)
      for (let x = 0; x < g.nx; x++) {
        if (!isRock(x, y, z)) continue
        // Colour by height, with a small per-voxel variation so single cubes read
        c.copy(BOTTOM).lerp(TOP, y / (g.ny - 1))
        c.multiplyScalar(0.85 + 0.3 * hash3(x, y, z))

        for (const face of FACES) {
          if (isRock(x + face.d[0], y + face.d[1], z + face.d[2])) continue
          const base = v
          for (const [cx, cy, cz] of face.corners) {
            const o = v * 3
            positions[o] = ox + (x + cx) * voxelSize
            positions[o + 1] = (y + cy) * voxelSize
            positions[o + 2] = oz + (z + cz) * voxelSize
            normals[o] = face.d[0]
            normals[o + 1] = face.d[1]
            normals[o + 2] = face.d[2]
            colors[o] = c.r
            colors[o + 1] = c.g
            colors[o + 2] = c.b
            v++
          }
          // Two triangles per square face
          indices[t++] = base
          indices[t++] = base + 1
          indices[t++] = base + 2
          indices[t++] = base
          indices[t++] = base + 2
          indices[t++] = base + 3
        }
      }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geo.setIndex(new BufferAttribute(indices, 1))
  return { geometry: geo, stats }
}

// Cheap repeatable "random" in [0, 1) from integer coordinates
export function hash3(x: number, y: number, z: number) {
  let n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}
