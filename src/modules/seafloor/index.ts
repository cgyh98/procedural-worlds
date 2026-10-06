import type { WorldModule } from '../types'
import { SeafloorScene } from './Scene'

// The seafloor (class modules 5 and 9: noise, heightmaps, 2D maps).
export const seafloorModule: WorldModule = {
  id: 'seafloor',
  title: 'Seafloor map',
  syllabus: [5, 9],
  about:
    'A heightmap is a 2D grid with one height per cell: drawn with colours it is a map, pushed up it is terrain. ' +
    'Noise fills it with natural shapes; fBm stacks several octaves, each finer (× lacunarity) and weaker ' +
    '(× persistence), so there are big basins and small bumps. Ridged noise (1 − |n|) makes mid-ocean ridges, ' +
    'Worley noise makes pits like vent fields. Switch the view to see the same data as a 2D map. ' +
    'Debug shows the raw noise values in grayscale.',
  Scene: SeafloorScene,
  // Not in the World directly: it joins through Distributions, which draws it with the kelp.
  camera: [0, 20, 30], // high up, looking down over the whole map
}
