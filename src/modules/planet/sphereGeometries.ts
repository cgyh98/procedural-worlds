import { BoxGeometry, IcosahedronGeometry, SphereGeometry, Vector3, type BufferGeometry } from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'

// ─────────────────────────────────────────────────────────────────────────────
// Four ways to build a sphere out of triangles (data-structure requirement)
//
// A computer can't draw a perfect sphere, only a mesh of flat triangles. HOW those
// triangles are laid out matters: uneven triangles mean uneven detail, stretched
// textures, and visible artifacts.
//
//   UV sphere:   a latitude/longitude grid. Simple, matches 2D maps directly, but
//                every column meets at the poles, so triangles there get tiny and
//                thin ("pinching").
//   Cube sphere: subdivide a cube, push every vertex out to radius 1. No poles, but
//                triangles near the cube's corners get smaller than at face centres.
//   Icosphere:   subdivide an icosahedron (20 triangles). The most uniform triangles.
//   Fibonacci:   N points spiralled with the golden angle so each takes an equal share
//                of the surface, then connected by their convex hull. Very even points,
//                but irregular triangles.
//
// Each builder is sized from one detail number k so all four get ≈ 4k² triangles,
// which keeps the comparison fair.
// ─────────────────────────────────────────────────────────────────────────────

export type SphereType = 'uv' | 'cube' | 'ico' | 'fibonacci'

// Returns triangle-soup positions on the unit sphere (3 vertices per triangle).
export function unitSphere(type: SphereType, k: number): Float32Array {
  let geo: BufferGeometry
  switch (type) {
    case 'uv':
      geo = new SphereGeometry(1, 2 * k, k) // 2k columns × k rows ≈ 4k² triangles
      break
    case 'cube': {
      const s = Math.max(1, Math.round(k * 0.577)) // 6 faces × 2s² ≈ 4k²
      geo = new BoxGeometry(2, 2, 2, s, s, s)
      // "Normalize": push each vertex out along its direction to radius 1
      const p = geo.attributes.position
      const v = new Vector3()
      for (let i = 0; i < p.count; i++) p.setXYZ(i, ...v.fromBufferAttribute(p, i).normalize().toArray())
      break
    }
    case 'ico':
      // three.js splits each of the 20 edges into (detail + 1) pieces: 20(d+1)² triangles
      geo = new IcosahedronGeometry(1, Math.max(0, Math.round(k * 0.447) - 1))
      break
    case 'fibonacci':
      geo = new ConvexGeometry(fibonacciPoints(2 * k * k)) // a hull of N points has 2N − 4 triangles
      break
  }
  const soup = geo.index ? geo.toNonIndexed() : geo
  const out = new Float32Array(soup.attributes.position.array)
  // Make sure everything is exactly on the unit sphere
  for (let i = 0; i < out.length; i += 3) {
    const len = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1
    out[i] /= len
    out[i + 1] /= len
    out[i + 2] /= len
  }
  geo.dispose()
  if (soup !== geo) soup.dispose()
  return out
}

// The Fibonacci (golden spiral) sphere: point i sits at height y evenly spaced from
// +1 to −1, and turns by the golden angle (≈137.5°) from the previous point. The
// golden angle never lines up with itself, so points never form rows: even coverage.
export function fibonacciPoints(n: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const pts: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    pts.push(new Vector3(Math.cos(i * golden) * r, y, Math.sin(i * golden) * r))
  }
  return pts
}

// Stats for the panel: unique vertices, triangles, and how uneven the triangle areas
// are (max/min ratio, and the coefficient of variation = std / mean).
export function sphereStats(pos: Float32Array) {
  const unique = new Set<string>()
  for (let i = 0; i < pos.length; i += 3) unique.add(`${pos[i].toFixed(4)},${pos[i + 1].toFixed(4)},${pos[i + 2].toFixed(4)}`)
  const areas = triangleAreas(pos)
  let min = Infinity
  let max = 0
  let sum = 0
  for (const a of areas) {
    if (a < 1e-9) continue // skip degenerate pole slivers
    min = Math.min(min, a)
    max = Math.max(max, a)
    sum += a
  }
  const mean = sum / areas.length
  let v = 0
  for (const a of areas) v += (a - mean) ** 2
  return { vertices: unique.size, triangles: areas.length, ratio: max / min, cv: Math.sqrt(v / areas.length) / mean }
}

export function triangleAreas(pos: Float32Array) {
  const areas = new Float32Array(pos.length / 9)
  for (let t = 0; t < areas.length; t++) {
    const o = t * 9
    const ax = pos[o + 3] - pos[o]
    const ay = pos[o + 4] - pos[o + 1]
    const az = pos[o + 5] - pos[o + 2]
    const bx = pos[o + 6] - pos[o]
    const by = pos[o + 7] - pos[o + 1]
    const bz = pos[o + 8] - pos[o + 2]
    // Half the length of the cross product = triangle area
    areas[t] = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx)
  }
  return areas
}
