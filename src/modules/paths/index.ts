import type { WorldModule } from '../types'
import { PathsScene } from './Scene'

// Networks: nodes and paths between them (class modules 21–22).
export const pathsModule: WorldModule = {
  id: 'paths',
  title: 'Reef paths',
  syllabus: [21, 22],
  about:
    'Reef colonies are the nodes (placed with Poisson disk sampling). A graph rule decides which reefs connect: ' +
    'minimum spanning tree, Gabriel graph or k nearest neighbours. Each connection becomes a migration route ' +
    'found on a grid over the seafloor, where every step costs its distance plus a penalty for climbing, so ' +
    'routes bend around ridges and follow valleys. Dijkstra explores outward evenly; A* adds the distance to ' +
    'the goal as a guide and finds the same route exploring fewer cells. Debug shows the raw graph and every ' +
    'explored cell. Sparks travel the routes: creatures migrating between reefs.',
  Scene: PathsScene,
  inWorld: true,
  camera: [0, 24, 30],
}
