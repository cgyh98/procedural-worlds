import type { WorldModule } from '../types'
import { DistributionsScene } from './Scene'

// Populations: distributing things over the landscape (class modules 15–16).
export const distributionsModule: WorldModule = {
  id: 'distributions',
  title: 'Kelp distribution',
  syllabus: [15, 16],
  about:
    'Where do things go? Random points clump and leave gaps; a jittered grid puts one point per cell; ' +
    'Poisson disk sampling (Bridson) keeps every pair at least r apart, so it looks natural, like plants ' +
    'competing for space. Candidates are then filtered by the seafloor map: kelp needs light, so it grows ' +
    'only in a height band near the top, and only where the slope is gentle enough to hold on. ' +
    'Debug shows accepted (amber) and rejected (red) points, with rings of radius r/2 that never overlap ' +
    'under Poisson disk. The 2D map view shows the distribution as a map.',
  Scene: DistributionsScene,
  inWorld: true,
  camera: [0, 20, 30],
}
