import type { WorldModule } from '../types'
import { BiomesScene } from './Scene'

// Biomes and flood fill (class module 11).
export const biomesModule: WorldModule = {
  id: 'biomes',
  title: 'Biomes & tides',
  syllabus: [11],
  about:
    'Every cell of the seafloor map gets a biome from simple rules: depth zones (sunlit → hadal) or habitats ' +
    '(depth + slope + a Worley vent field). The tide sets a water level: ground above it becomes islands. ' +
    'Flood fill spreads from the map edges through the water, like the open sea flowing in; water it cannot ' +
    'reach is enclosed, a bay. Real bioluminescent bays are enclosed waters, so the bays glow. Lower the tide ' +
    'and bays close off; 8-neighbour fill leaks through diagonals. Debug colours every connected biome region.',
  Scene: BiomesScene,
  camera: [0, 34, 16], // high and steep: reads like a map, islands and bays visible
}
