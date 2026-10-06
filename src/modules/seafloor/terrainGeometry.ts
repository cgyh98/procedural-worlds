import { PlaneGeometry } from 'three'

// Builds the seafloor mesh shape from a heightmap. Shared by the terrain itself and by
// layers drawn exactly on top of it (the caustics shader).
//
// A PlaneGeometry with (resolution − 1)² squares has exactly resolution² vertices, in
// the same row-by-row order as the heightmap, so vertex k gets height heights[k].
// Heights stay in [-1, 1]; the parent group's scale.y stretches them to the real depth.
export function buildTerrainGeometry(heights: Float32Array, resolution: number, size: number) {
  const geo = new PlaneGeometry(size, size, resolution - 1, resolution - 1)
  geo.rotateX(-Math.PI / 2) // lay it flat: the plane is built standing up (in XY)
  const pos = geo.attributes.position
  for (let k = 0; k < pos.count; k++) pos.setY(k, heights[k])
  // Normals (which way each vertex faces) drive lighting; recompute after moving vertices.
  geo.computeVertexNormals()
  return geo
}
