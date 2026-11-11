import { useEffect, useMemo } from 'react'
import { useControls } from 'leva'
import { generateHeightmap, type HeightStyle, type NoiseType } from './heightmap'
import { seafloor } from '../../systems/seafloor'

export const MAP_SIZE = 40 // world units across
export const FLOOR_Y = -6 // the seafloor sits below the origin, so open water is above it

// Answers questions about the seafloor at any world position (x, z).
// Other systems (kelp, reefs, paths…) use this to place things on the terrain.
export type SeafloorSampler = {
  height: (x: number, z: number) => number // normalized, −1 (trench) … 1 (ridge)
  worldY: (x: number, z: number) => number // actual y of the surface in the 3D scene
  slope: (x: number, z: number) => number // steepness in degrees, 0 = flat, 90 = vertical
}

// The seafloor's sliders + generated heightmap, as a reusable hook.
// The Seafloor tab uses it to draw the terrain; other tabs (Distributions…) use it to
// get the same terrain *and* a sampler to place things on it.
export function useSeafloor() {
  const map = useControls('Seafloor map', {
    noise: {
      value: 'simplex' as NoiseType,
      options: { Perlin: 'perlin', Simplex: 'simplex', 'Worley (cellular)': 'worley' } as Record<string, NoiseType>,
      hint: 'Which noise algorithm fills the heightmap. Perlin: smooth square-grid hills. Simplex: triangle grid, fewer grid artifacts. Worley: distance to random points, giving cells and pits (vent fields).',
    },
    style: {
      value: 'fbm' as HeightStyle,
      options: { 'Smooth (fBm)': 'fbm', 'Ridged (mid-ocean ridges)': 'ridged' } as Record<string, HeightStyle>,
      hint: 'Smooth stacks noise as is. Ridged uses 1 − |noise|, turning soft hills into sharp crests like mid-ocean ridges.',
    },
    scale: {
      value: 14, min: 2, max: 40, step: 0.5,
      hint: 'Feature size in world units: how wide the biggest basins and ridges are.',
    },
    octaves: {
      value: 5, min: 1, max: 8, step: 1,
      hint: 'How many noise layers are stacked (fBm). 1 = only big smooth shapes; more = finer and finer detail on top.',
    },
    persistence: {
      value: 0.5, min: 0.1, max: 0.9, step: 0.01,
      hint: 'How much each finer octave counts compared to the previous one (amplitude × persistence). Low = smooth, high = rough.',
    },
    lacunarity: {
      value: 2, min: 1.5, max: 3.5, step: 0.05,
      hint: 'How much finer each octave is than the previous one (frequency × lacunarity). 2 = each layer has twice the detail.',
    },
    depth: {
      value: 4, min: 0.5, max: 10, step: 0.1,
      hint: 'Height of the relief in world units: the distance from the deepest trench to the highest ridge.',
    },
    seed: {
      value: 7, min: 1, max: 999, step: 1,
      hint: 'Seed for the noise. Same seed = same seafloor every time.',
    },
    edge: {
      label: 'edge falloff',
      value: 0.35, min: 0, max: 0.8, step: 0.01,
      hint: 'Island mask: the outer ring of the map slopes down into the abyss, so the seafloor reads as an underwater mountain instead of a slab with a cut edge. The value is how wide that ring is, as a fraction of the map radius. 0 = off (raw noise up to the edge).',
    },
    resolution: {
      value: 160, min: 32, max: 256, step: 16,
      hint: 'Vertices per side of the heightmap grid. More = finer detail, but slower to rebuild (resolution² samples × octaves).',
    },
  })

  const view = useControls('View', {
    mode: {
      label: 'view',
      value: '3D relief',
      options: ['3D relief', '2D map'],
      hint: 'Animate between the 2D map (heights as colours only) and the 3D terrain (heights pushed up). Same data, two views.',
    },
  })

  // Regenerate the heightmap only when a generation parameter changes.
  // (depth and view don't need a rebuild: they only scale the finished mesh.)
  const raw = useMemo(
    () =>
      generateHeightmap({
        resolution: map.resolution,
        size: MAP_SIZE,
        noise: map.noise,
        style: map.style,
        scale: map.scale,
        octaves: map.octaves,
        persistence: map.persistence,
        lacunarity: map.lacunarity,
        seed: map.seed,
      }),
    [map.resolution, map.noise, map.style, map.scale, map.octaves, map.persistence, map.lacunarity, map.seed],
  )

  // The edge falloff is a cheap separate pass, so sliding it never re-runs the noise.
  const heights = useMemo(() => applyEdgeFalloff(raw, map.resolution, map.edge), [raw, map.resolution, map.edge])

  const sampler = useMemo(
    () => createSampler(heights, map.resolution, MAP_SIZE, map.depth),
    [heights, map.resolution, map.depth],
  )

  // Share the sampler with per-frame systems (the player uses it as solid ground).
  // In the 2D map view the relief is flat, so there is nothing to collide with.
  const is2D = view.mode === '2D map'
  useEffect(() => {
    seafloor.sampler = is2D ? null : sampler
    return () => {
      if (seafloor.sampler === sampler) seafloor.sampler = null
    }
  }, [sampler, is2D])

  return {
    heights,
    resolution: map.resolution,
    size: MAP_SIZE,
    depth: map.depth,
    is2D,
    sampler,
  }
}

export type Seafloor = ReturnType<typeof useSeafloor>

// Bilinear sampling: a world position usually falls *between* grid vertices, so we
// blend the 4 surrounding heights by how close the point is to each.
function createSampler(heights: Float32Array, n: number, size: number, depth: number): SeafloorSampler {
  const cell = size / (n - 1)
  const clampIdx = (k: number) => Math.min(Math.max(k, 0), n - 1)
  const at = (i: number, j: number) => heights[clampIdx(j) * n + clampIdx(i)]

  const height = (x: number, z: number) => {
    // World → grid coordinates (fractional)
    const u = (x + size / 2) / cell
    const v = (z + size / 2) / cell
    const i = Math.floor(u)
    const j = Math.floor(v)
    const fu = u - i
    const fv = v - j
    // Blend along x on both rows, then along z between the rows
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fu
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fu
    return top + (bottom - top) * fv
  }

  return {
    height,
    worldY: (x, z) => FLOOR_Y + height(x, z) * depth,
    // Slope from the height gradient (central differences, one cell each way),
    // in world units so it matches what you see: angle = atan(rise / run).
    slope: (x, z) => {
      const dhdx = ((height(x + cell, z) - height(x - cell, z)) * depth) / (2 * cell)
      const dhdz = ((height(x, z + cell) - height(x, z - cell)) * depth) / (2 * cell)
      return (Math.atan(Math.hypot(dhdx, dhdz)) * 180) / Math.PI
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge falloff (an "island mask")
//
// A heightmap is finite: past its border there is simply nothing, and a cut edge is
// easy to spot. The classic trick (used for procedural islands) is to multiply in a
// MASK that depends on the distance from the centre: 0 in the middle (heights
// untouched), rising to 1 at the border. Here the mask pushes heights DOWN, so the
// terrain slopes away into the deep and fades into the fog: an underwater mountain
// (a seamount) surrounded by abyss.
//
//   d    = distance from the centre / map radius     (0 centre … 1 edge … 1.41 corner)
//   mask = smoothstep(1 − width, 1, d)               (0 inside, smooth ramp, 1 outside)
//   h'   = h − mask × DROP
//
// Heights may now go below −1 (deeper than any trench): that's the abyss.
// TEMPORARY: the stand-in for an infinite ocean until chunk streaming (module 24)
// replaces it after the 2026-11-11 presentation (vault/decisions/infinite-seafloor.md).
// ─────────────────────────────────────────────────────────────────────────────
const DROP = 3 // how far the rim sinks, in normalized height units (× depth in world units)

function applyEdgeFalloff(raw: Float32Array, n: number, width: number): Float32Array {
  if (width <= 0) return raw
  const out = new Float32Array(raw.length)
  const inner = 1 - width
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      // grid index → −1…1 on each axis, then the radial distance
      const x = (i / (n - 1)) * 2 - 1
      const z = (j / (n - 1)) * 2 - 1
      const d = Math.hypot(x, z)
      const t = Math.min(Math.max((d - inner) / width, 0), 1)
      const mask = t * t * (3 - 2 * t) // smoothstep
      out[j * n + i] = raw[j * n + i] - mask * DROP
    }
  }
  return out
}
