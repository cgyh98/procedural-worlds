import { useMemo } from 'react'
import { useControls } from 'leva'
import type { ModuleSceneProps } from '../types'
import { useSeafloor, FLOOR_Y } from '../seafloor/useSeafloor'
import { SeafloorView } from '../seafloor/Scene'
import { mulberry32 } from '../../lib/random'
import { samplePoints, type SamplingMethod } from './sampling'
import { Kelp, type Strand } from './Kelp'
import { SamplePoints } from './SamplePoints'

// Distributions = the seafloor + kelp placed on it.
export function DistributionsScene({ debug }: ModuleSceneProps) {
  const seafloor = useSeafloor()
  const { sampler, size, is2D } = seafloor

  const dist = useControls('Distribution', {
    method: {
      value: 'poisson' as SamplingMethod,
      options: { 'Poisson disk': 'poisson', 'Jittered grid': 'jittered', Random: 'random' } as Record<string, SamplingMethod>,
      hint: 'How candidate positions are chosen. Random clumps and leaves gaps; jittered grid puts one point per cell; Poisson disk keeps every pair at least "spacing" apart, which looks natural.',
    },
    spacing: {
      value: 1, min: 0.4, max: 4, step: 0.05,
      hint: 'Minimum distance between kelp (Poisson disk), or the grid cell size (jittered grid). Random uses the same number of points as the grid.',
    },
    habitat: {
      value: [-0.2, 1] as [number, number], min: -1, max: 1, step: 0.01,
      hint: 'Height band where kelp can grow (−1 = deepest trench, 1 = highest ridge). Real kelp needs sunlight or moonlight, so it lives in the shallows.',
    },
    maxSlope: {
      label: 'max slope',
      value: 40, min: 0, max: 90, step: 1,
      hint: 'Steepest ground (degrees) kelp can hold on to. Steeper slopes are rejected.',
    },
    seed: {
      value: 3, min: 1, max: 999, step: 1,
      hint: 'Seed for the sampling and the kelp variation.',
    },
  })

  const kelp = useControls('Kelp', {
    length: {
      value: 2.2, min: 0.5, max: 6, step: 0.1,
      hint: 'Average kelp height in world units (each strand varies ±40%).',
    },
    sway: {
      value: 0.35, min: 0, max: 1.5, step: 0.01,
      hint: 'How far the tips wave in the water.',
    },
    glow: {
      value: 0.8, min: 0, max: 2, step: 0.01,
      hint: 'Resting brightness of the kelp. Swimming past (World tab) excites it further.',
    },
    recovery: {
      value: 0.6, min: 0.1, max: 4, step: 0.05,
      hint: 'How fast excited kelp fades back after you pass (per second).',
    },
  })

  // 1. Sample candidate positions over the whole map (depends only on method/spacing/seed)
  const candidates = useMemo(
    () => samplePoints(dist.method, size, dist.spacing, dist.seed),
    [dist.method, size, dist.spacing, dist.seed],
  )

  // 2. Filter them with the seafloor "custom maps" (module 16): height band + slope.
  const [minH, maxH] = dist.habitat
  const { accepted, rejected } = useMemo(() => {
    const accepted: number[] = []
    const rejected: number[] = []
    for (let p = 0; p < candidates.length; p += 2) {
      const x = candidates[p]
      const z = candidates[p + 1]
      const h = sampler.height(x, z)
      const ok = h >= minH && h <= maxH && sampler.slope(x, z) <= dist.maxSlope
      // Lift the markers a hair above the ground so they don't flicker into it
      ;(ok ? accepted : rejected).push(x, sampler.worldY(x, z) + 0.05, z)
    }
    return { accepted, rejected }
  }, [candidates, sampler, minH, maxH, dist.maxSlope])

  // 3. Give each accepted point a kelp strand with seeded random variation.
  const strands = useMemo<Strand[]>(() => {
    const rand = mulberry32(dist.seed + 77)
    const out: Strand[] = []
    for (let p = 0; p < accepted.length; p += 3)
      out.push({
        x: accepted[p],
        z: accepted[p + 2],
        baseY: accepted[p + 1] - 0.05,
        length: kelp.length * (0.6 + rand() * 0.8),
        phase: rand() * Math.PI * 2,
      })
    return out
  }, [accepted, kelp.length, dist.seed])

  // In the 2D map view the terrain is flat, so draw the points flat on it.
  const flatAccepted = useMemo(() => flatten(accepted), [accepted])
  const flatRejected = useMemo(() => flatten(rejected), [rejected])

  return (
    <>
      {/* The terrain draws normally here: this tab's debug view is about the points. */}
      <SeafloorView seafloor={seafloor} debug={false} />
      {is2D ? (
        // 2D map: the distribution itself, as markers on the map
        <SamplePoints accepted={flatAccepted} rejected={flatRejected} spacing={dist.spacing} showRings={debug} />
      ) : (
        <>
          <Kelp strands={strands} sway={kelp.sway} glow={kelp.glow} recovery={kelp.recovery} />
          {debug && <SamplePoints accepted={accepted} rejected={rejected} spacing={dist.spacing} showRings />}
        </>
      )}
    </>
  )
}

// Same points, but with every y set to the flat map's height.
function flatten(xyz: number[]) {
  return xyz.map((v, i) => (i % 3 === 1 ? FLOOR_Y + 0.02 : v))
}
