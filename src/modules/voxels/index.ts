import type { WorldModule } from '../types'
import { VoxelScene } from './Scene'

// Voxel structures (class modules 7–8).
export const voxelsModule: WorldModule = {
  id: 'voxels',
  title: 'Voxel reef',
  syllabus: [7, 8],
  about:
    'A voxel is a 3D pixel: one cube in a 3D grid that stores rock or water. A heightmap has one height per ' +
    'spot, so it can only make hills; voxels can stack rock above water above rock, which caves, tunnels and ' +
    'arches need. A density function decides each voxel: here solid ground minus 3D noise. To draw it, only ' +
    'faces between rock and water are built; faces touching other rock are buried and skipped (debug shows ' +
    'how many). Use the build animation to watch the grid fill layer by layer, and slice to look inside the caves.',
  Scene: VoxelScene,
  camera: [18, 10, 22],
}
