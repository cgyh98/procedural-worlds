import type { WorldModule } from '../types'
import { PlanetScene } from './Scene'

// The ocean planet: spherical mapping (class module 6) and the atlas cover.
export const planetModule: WorldModule = {
  id: 'planet',
  title: 'Ocean planet',
  syllabus: [6],
  about:
    'The atlas cover: an ocean planet and its moon. A sphere is drawn as triangles, and the layout matters: ' +
    'a UV sphere pinches at the poles, a cube sphere shrinks at the corners, an icosphere is the most even, ' +
    'a Fibonacci sphere spirals points by the golden angle (debug colours triangles by size). Heights come ' +
    'from 3D noise sampled on the sphere, or from the 2D seafloor map wrapped by longitude/latitude, which ' +
    'shows a seam and pole stretching. Switch the view to unwrap the planet into a flat map. The moon orbits; ' +
    'its phase (sun–planet–moon angle) sets the global moon phase every other system will use.',
  Scene: PlanetScene,
  camera: [0, 3, 21],
}
